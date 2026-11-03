/**
 * Coupon Store & Redemption Service.
 * Implements atomic conditional updates for stock claiming, coupon assignment,
 * and double-entry points reservation (USER_AVAILABLE -> USER_RESERVED -> REDEEMED).
 */
import { prisma } from '@/server/db';
import { deriveBalance } from '@/server/domain/wallet';
import { appendDoubleEntry } from './walletService';
import crypto from 'crypto';

export interface CatalogFilterOptions {
  userId?: string;
  category?: 'all' | 'near' | 'online' | 'affordable';
}

/**
 * Public Citizen Catalog: Returns active, in-stock, unexpired coupon catalog items.
 * Funder cost (funderCostPaise) is strictly omitted.
 */
export async function getPublicCouponCatalog(options?: CatalogFilterOptions) {
  const now = new Date();

  // Find all active items with stock and valid date
  const items = await prisma.couponCatalogItem.findMany({
    where: {
      isActive: true,
      validUntil: { gt: now },
      stockRemaining: { gt: 0 },
    },
    include: {
      funder: {
        select: {
          id: true,
          name: true,
          type: true,
          isSimulated: true,
        },
      },
    },
    orderBy: { pointsPrice: 'asc' },
  });

  // Calculate user points if userId is provided
  let userAvailablePoints = 0;
  if (options?.userId) {
    const entries = await prisma.ledgerEntry.findMany({
      where: { userId: options.userId },
      select: { account: true, amountPoints: true, entrySide: true },
    });
    const balance = deriveBalance(entries);
    userAvailablePoints = balance.availablePoints;
  }

  // Filter based on options
  return items
    .filter((item) => {
      if (options?.category === 'affordable') {
        return item.pointsPrice <= userAvailablePoints;
      }
      if (options?.category === 'online') {
        return item.kind === 'IMPORTED_CODE' || item.validMerchantIds === 'online code';
      }
      return true;
    })
    .map((item) => ({
      id: item.id,
      title: item.title,
      description: item.description,
      pointsPrice: item.pointsPrice,
      faceValueText: item.faceValueText,
      minSpendText: item.minSpendText,
      validMerchantIds: item.validMerchantIds,
      stockRemaining: item.stockRemaining,
      perUserLimit: item.perUserLimit,
      validUntil: item.validUntil,
      kind: item.kind,
      funder: item.funder,
      isAffordable: options?.userId ? item.pointsPrice <= userAvailablePoints : true,
    }));
}

/**
 * Redeem Coupon: Atomic transaction claiming stock, assigning code,
 * reserving points (AVAILABLE -> RESERVED), and creating redemption record.
 */
export async function redeemCoupon(params: {
  userId: string;
  catalogItemId: string;
  idempotencyKey?: string;
}) {
  const now = new Date();
  const idempotencyKey = params.idempotencyKey || `idem_${crypto.randomUUID()}`;

  return prisma.$transaction(async (tx) => {
    // 1. Idempotency Check
    const existing = await tx.redemption.findUnique({
      where: { idempotencyKey },
      include: {
        couponCode: true,
        catalogItem: { include: { funder: true } },
      },
    });
    if (existing) {
      return {
        alreadyProcessed: true,
        redemption: existing,
      };
    }

    // 2. Fetch Catalog Item
    const item = await tx.couponCatalogItem.findUnique({
      where: { id: params.catalogItemId },
      include: { funder: true },
    });
    if (!item || !item.isActive || item.validUntil <= now) {
      throw new Error('COUPON_UNAVAILABLE_OR_EXPIRED');
    }

    // 3. Check Per-User Limit
    const userRedemptionCount = await tx.redemption.count({
      where: {
        userId: params.userId,
        catalogItemId: params.catalogItemId,
        status: { in: ['ACTIVE', 'USED'] },
      },
    });
    if (userRedemptionCount >= item.perUserLimit) {
      throw new Error(`PER_USER_LIMIT_REACHED: Max ${item.perUserLimit} per citizen`);
    }

    // 4. Check User Available Points
    const userEntries = await tx.ledgerEntry.findMany({
      where: { userId: params.userId },
      select: { account: true, amountPoints: true, entrySide: true },
    });
    const balance = deriveBalance(userEntries);
    if (balance.availablePoints < item.pointsPrice) {
      throw new Error(`INSUFFICIENT_POINTS: Requires ${item.pointsPrice} GP, you have ${balance.availablePoints} GP`);
    }

    // 5. Atomic Stock Decrement (Count must equal 1)
    const stockUpdate = await tx.couponCatalogItem.updateMany({
      where: {
        id: params.catalogItemId,
        stockRemaining: { gt: 0 },
      },
      data: {
        stockRemaining: { decrement: 1 },
      },
    });
    if (stockUpdate.count !== 1) {
      throw new Error('OUT_OF_STOCK');
    }

    // 6. Atomically Find and Assign an Available Coupon Code
    const availableCode = await tx.couponCode.findFirst({
      where: {
        catalogItemId: params.catalogItemId,
        status: 'AVAILABLE',
      },
      orderBy: { createdAt: 'asc' },
    });
    if (!availableCode) {
      throw new Error('NO_AVAILABLE_CODES_IN_POOL');
    }

    const codeUpdate = await tx.couponCode.updateMany({
      where: {
        id: availableCode.id,
        status: 'AVAILABLE',
      },
      data: {
        status: 'ASSIGNED',
        assignedUserId: params.userId,
        assignedAt: now,
        expiresAt: item.validUntil,
      },
    });
    if (codeUpdate.count !== 1) {
      throw new Error('RACE_CONDITION_CODE_ALREADY_CLAIMED');
    }

    // 7. Move Points: USER_AVAILABLE -> USER_RESERVED
    const txId = `red_${crypto.randomUUID()}`;
    await appendDoubleEntry(tx, {
      transactionId: txId,
      debitAccount: 'USER_AVAILABLE',
      creditAccount: 'USER_RESERVED',
      amountPoints: item.pointsPrice,
      userId: params.userId,
      type: 'REDEEM',
      refType: 'CouponCatalogItem',
      refId: item.id,
      note: `Redeemed ${item.title} (${item.faceValueText})`,
    });

    // 8. Create Redemption Record
    const redemption = await tx.redemption.create({
      data: {
        userId: params.userId,
        catalogItemId: item.id,
        couponCodeId: availableCode.id,
        pointsSpent: item.pointsPrice,
        status: 'ACTIVE',
        idempotencyKey,
      },
      include: {
        couponCode: true,
        catalogItem: { include: { funder: true } },
      },
    });

    return {
      success: true,
      redemption,
      code: availableCode.code,
      kind: item.kind,
      faceValueText: item.faceValueText,
    };
  });
}

/**
 * Get citizen's active & past coupons. Also lazily refunds any expired unused coupons.
 */
export async function getUserCoupons(userId: string) {
  const now = new Date();

  // Find any expired unused coupons that need points refund
  const expiredUnused = await prisma.couponCode.findMany({
    where: {
      assignedUserId: userId,
      status: 'ASSIGNED',
      expiresAt: { lte: now },
    },
    include: { redemption: true, catalogItem: true },
  });

  for (const exp of expiredUnused) {
    if (!exp.redemption) continue;
    try {
      await prisma.$transaction(async (tx) => {
        // Atomic status update
        const codeRes = await tx.couponCode.updateMany({
          where: { id: exp.id, status: 'ASSIGNED' },
          data: { status: 'EXPIRED' },
        });
        if (codeRes.count !== 1) return;

        await tx.redemption.updateMany({
          where: { id: exp.redemption!.id, status: 'ACTIVE' },
          data: { status: 'EXPIRED' },
        });

        // Refund reserved points back to USER_AVAILABLE
        await appendDoubleEntry(tx, {
          debitAccount: 'USER_RESERVED',
          creditAccount: 'USER_AVAILABLE',
          amountPoints: exp.redemption!.pointsSpent,
          userId,
          type: 'REFUND',
          refType: 'CouponCode',
          refId: exp.id,
          note: `Refunded ${exp.redemption!.pointsSpent} GP for expired coupon (${exp.catalogItem.title})`,
        });
      });
    } catch (err) {
      console.error('Failed to refund expired coupon:', err);
    }
  }

  // Fetch updated user redemptions
  return prisma.redemption.findMany({
    where: { userId },
    include: {
      couponCode: true,
      catalogItem: {
        include: { funder: true },
      },
    },
    orderBy: { createdAt: 'desc' },
  });
}

/**
 * Merchant Coupon Verification & Usage.
 * Merchant scans QR token or enters code.
 */
export async function verifyAndUseCoupon(params: {
  code: string;
  merchantPartnerId: string;
}) {
  const now = new Date();
  const trimmedCode = params.code.trim();

  return prisma.$transaction(async (tx) => {
    // Look up code
    const couponCode = await tx.couponCode.findFirst({
      where: { code: trimmedCode },
      include: {
        catalogItem: { include: { funder: true } },
        redemption: true,
      },
    });

    if (!couponCode) {
      throw new Error('COUPON_NOT_FOUND: Invalid code');
    }

    // Check if already used
    if (couponCode.status === 'USED') {
      const usedMerchant = couponCode.usedAtMerchantId
        ? await tx.partner.findUnique({ where: { id: couponCode.usedAtMerchantId }, select: { name: true } })
        : null;
      return {
        alreadyUsed: true,
        usedAt: couponCode.usedAt,
        merchantName: usedMerchant?.name || 'Partner Store',
        message: `Already used on ${couponCode.usedAt?.toLocaleDateString('en-IN')} at ${usedMerchant?.name || 'Partner Store'}`,
      };
    }

    if (couponCode.status === 'EXPIRED' || (couponCode.expiresAt && couponCode.expiresAt <= now)) {
      throw new Error('COUPON_EXPIRED: This coupon has expired and points have been refunded to the user.');
    }

    if (couponCode.status !== 'ASSIGNED') {
      throw new Error(`INVALID_COUPON_STATE: Code is ${couponCode.status}`);
    }

    // Check merchant validity
    const validMerchants = couponCode.catalogItem.validMerchantIds;
    if (validMerchants && validMerchants !== 'online code' && !validMerchants.includes(params.merchantPartnerId)) {
      throw new Error('COUPON_NOT_VALID_AT_THIS_STORE: This coupon is not accepted at your merchant location.');
    }

    // Atomic conditional update to mark as USED
    const updateRes = await tx.couponCode.updateMany({
      where: {
        id: couponCode.id,
        status: 'ASSIGNED',
        expiresAt: { gt: now },
      },
      data: {
        status: 'USED',
        usedAt: now,
        usedAtMerchantId: params.merchantPartnerId,
      },
    });

    if (updateRes.count !== 1) {
      throw new Error('RACE_CONDITION: Coupon was modified concurrently');
    }

    if (couponCode.redemption) {
      await tx.redemption.updateMany({
        where: { id: couponCode.redemption.id, status: 'ACTIVE' },
        data: { status: 'USED' },
      });
    }

    // Move points: USER_RESERVED -> REDEEMED
    const pointsToRedeem = couponCode.redemption?.pointsSpent || couponCode.catalogItem.pointsPrice;
    await appendDoubleEntry(tx, {
      debitAccount: 'USER_RESERVED',
      creditAccount: 'REDEEMED',
      amountPoints: pointsToRedeem,
      userId: couponCode.assignedUserId,
      type: 'REDEEM',
      refType: 'CouponCode',
      refId: couponCode.id,
      note: `Used at merchant ${params.merchantPartnerId}`,
    });

    return {
      success: true,
      title: couponCode.catalogItem.title,
      faceValueText: couponCode.catalogItem.faceValueText,
      minSpendText: couponCode.catalogItem.minSpendText,
      funderName: couponCode.catalogItem.funder.name,
      usedAt: now,
    };
  });
}

/**
 * Sponsor Metrics: calculates coupon utilization and funder analytics.
 * Suppresses any breakdown with fewer than 5 users for privacy.
 */
export async function getSponsorCouponMetrics(funderId?: string) {
  const whereClause = funderId ? { funderId } : {};

  const items = await prisma.couponCatalogItem.findMany({
    where: whereClause,
    include: {
      funder: true,
      codes: { select: { status: true } },
      redemptions: { select: { userId: true, status: true, pointsSpent: true } },
    },
  });

  let totalFundedStock = 0;
  let totalIssued = 0;
  let totalUsed = 0;
  let totalPointsSpent = 0;
  const userSet = new Set<string>();

  for (const item of items) {
    totalFundedStock += item.stockTotal;
    for (const code of item.codes) {
      if (code.status === 'ASSIGNED' || code.status === 'USED') totalIssued++;
      if (code.status === 'USED') totalUsed++;
    }
    for (const r of item.redemptions) {
      userSet.add(r.userId);
      totalPointsSpent += r.pointsSpent;
    }
  }

  const uniqueUsersCount = userSet.size;
  const redemptionRate = totalIssued > 0 ? Math.round((totalUsed / totalIssued) * 100) : 0;

  return {
    totalFundedStock,
    totalIssued,
    totalUsed,
    remainingStock: Math.max(0, totalFundedStock - totalIssued),
    redemptionRatePercent: redemptionRate,
    totalPointsSpent,
    uniqueUsersCount: uniqueUsersCount >= 5 ? uniqueUsersCount : '< 5 users (suppressed)',
  };
}
