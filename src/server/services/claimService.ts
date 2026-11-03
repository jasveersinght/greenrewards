/**
 * Claim Service — transactional orchestrator for QR claims, merchant verification,
 * stamp increments, voucher generation, and merchant milestone tracking.
 * Concurrency-safe using atomic conditional updates and double-entry points.
 */
import { prisma } from '@/server/db';
import {
  generateClaimCode,
  claimExpiryDate,
  validateClaimForConfirmation,
} from '@/server/domain/claims';
import {
  calculateStampProgress,
  checkDailyLimit,
  shouldFlagMerchantForAudit,
} from '@/server/domain/rewards';
import { appendDoubleEntry } from './walletService';
import { computeAvailableAt, POINTS_CONFIG } from '@/server/domain/pointsConfig';
import { evaluateDailyReuseCap } from '@/server/domain/caps';
import crypto from 'crypto';

export interface CreateClaimResult {
  claim: {
    id: string;
    opaqueId: string;
    code: string;
    expiresAt: Date;
    status: string;
  };
  offer: {
    id: string;
    name: string;
    partnerName: string;
    stampsNeeded: number;
    voucherValuePaise: number;
  };
  currentStamps: number;
  qrPayload: string;
}

export async function createClaim(userId: string, offerId: string): Promise<CreateClaimResult> {
  const offer = await prisma.offer.findUnique({
    where: { id: offerId },
    include: {
      partner: { select: { id: true, name: true } },
      campaign: { select: { id: true, status: true, limits: true } },
    },
  });

  if (!offer || !offer.active) {
    throw new Error('OFFER_NOT_FOUND_OR_INACTIVE');
  }

  if (offer.campaign.status !== 'ACTIVE') {
    throw new Error('CAMPAIGN_NOT_ACTIVE');
  }

  // Check daily limit (max 2 stamps per shop per day)
  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);

  const confirmedTodayCount = await prisma.claim.count({
    where: {
      userId,
      offerId,
      status: 'CONFIRMED',
      usedAt: { gte: startOfDay },
    },
  });

  const dailyCap = evaluateDailyReuseCap(confirmedTodayCount);
  if (!dailyCap.allowed) {
    throw new Error('DAILY_LIMIT_REACHED: Max 2 stamps per shop per day');
  }

  // Check for an existing unexpired pending claim to avoid duplicate creation
  const existingPending = await prisma.claim.findFirst({
    where: {
      userId,
      offerId,
      status: 'PENDING',
      expiresAt: { gt: new Date() },
    },
    orderBy: { createdAt: 'desc' },
  });

  const stampCard = await prisma.stampCard.findUnique({
    where: { userId_offerId: { userId, offerId } },
  });
  const currentStamps = stampCard?.stamps ?? 0;

  if (existingPending) {
    // The QR contains ONLY the random opaque claimId (never userId or sensitive data)
    return {
      claim: {
        id: existingPending.id,
        opaqueId: existingPending.opaqueId,
        code: existingPending.code,
        expiresAt: existingPending.expiresAt,
        status: existingPending.status,
      },
      offer: {
        id: offer.id,
        name: offer.name,
        partnerName: offer.partner.name,
        stampsNeeded: offer.stampsNeeded,
        voucherValuePaise: offer.voucherValuePaise,
      },
      currentStamps,
      qrPayload: existingPending.opaqueId,
    };
  }

  // Create fresh claim with random unguessable UUID
  const opaqueId = crypto.randomUUID();
  const code = generateClaimCode();
  const expiresAt = claimExpiryDate(120);

  const claim = await prisma.claim.create({
    data: {
      opaqueId,
      code,
      userId,
      offerId,
      expiresAt,
      status: 'PENDING',
    },
  });

  return {
    claim: {
      id: claim.id,
      opaqueId: claim.opaqueId,
      code: claim.code,
      expiresAt: claim.expiresAt,
      status: claim.status,
    },
    offer: {
      id: offer.id,
      name: offer.name,
      partnerName: offer.partner.name,
      stampsNeeded: offer.stampsNeeded,
      voucherValuePaise: offer.voucherValuePaise,
    },
    currentStamps,
    qrPayload: claim.opaqueId,
  };
}

export async function getClaimDetails(opaqueIdOrCode: string, merchantPartnerId?: string | null) {
  let normalized = opaqueIdOrCode.trim();
  try {
    const parsed = JSON.parse(normalized);
    if (parsed.opaqueId) normalized = parsed.opaqueId;
    else if (parsed.code) normalized = parsed.code;
  } catch {
    // Plain string
  }

  const claim = await prisma.claim.findFirst({
    where: {
      OR: [
        { opaqueId: normalized },
        { code: normalized.toUpperCase() },
      ],
    },
    include: {
      offer: {
        include: {
          partner: true,
          campaign: true,
        },
      },
      user: {
        select: {
          id: true,
          displayName: true,
          locality: true,
        },
      },
    },
  });

  if (!claim) {
    return { found: false, error: 'CLAIM_NOT_FOUND' } as const;
  }

  const validation = validateClaimForConfirmation({
    status: claim.status,
    expiresAt: claim.expiresAt,
    offerPartnerId: claim.offer.partnerId,
    merchantPartnerId,
  });

  const stampCard = await prisma.stampCard.findUnique({
    where: { userId_offerId: { userId: claim.userId, offerId: claim.offerId } },
  });

  return {
    found: true,
    claim: {
      id: claim.id,
      opaqueId: claim.opaqueId,
      code: claim.code,
      status: claim.status,
      expiresAt: claim.expiresAt,
      usedAt: claim.usedAt,
      receiptRef: claim.receiptRef,
      createdAt: claim.createdAt,
    },
    user: {
      displayName: claim.user.displayName ?? 'Customer',
      locality: claim.user.locality ?? 'Chennai',
    },
    offer: {
      id: claim.offer.id,
      name: claim.offer.name,
      partnerId: claim.offer.partnerId,
      partnerName: claim.offer.partner.name,
      stampsNeeded: claim.offer.stampsNeeded,
      voucherValuePaise: claim.offer.voucherValuePaise,
    },
    currentStamps: stampCard?.stamps ?? 0,
    validation,
  } as const;
}

export interface ConfirmClaimResult {
  success: boolean;
  error?: string;
  stampsNow?: number;
  pointsAwarded?: number;
  bonusPointsAwarded?: number;
  message?: string;
}

/**
 * Concurrency-safe confirm claim:
 * Uses atomic conditional update `updateMany({ where: { id, usedAt: null, expiresAt: { gt: now } } })`.
 * Exactly 1 confirmation succeeds among parallel requests!
 */
export async function confirmClaim(params: {
  opaqueIdOrCode: string;
  merchantUserId: string;
  receiptRef?: string;
}): Promise<ConfirmClaimResult> {
  const { opaqueIdOrCode, merchantUserId, receiptRef } = params;

  // 1. Resolve merchant partner scope
  const roleGrant = await prisma.roleGrant.findFirst({
    where: {
      userId: merchantUserId,
      role: { in: ['MERCHANT', 'SHOPKEEPER', 'ADMIN'] },
    },
  });

  if (!roleGrant) {
    return { success: false, error: 'NOT_AUTHORIZED_AS_MERCHANT' };
  }

  const merchantPartnerId = roleGrant.role === 'ADMIN' ? null : roleGrant.partnerId;

  return prisma.$transaction(async (tx) => {
    let normalized = opaqueIdOrCode.trim();
    try {
      const parsed = JSON.parse(normalized);
      if (parsed.opaqueId) normalized = parsed.opaqueId;
      else if (parsed.code) normalized = parsed.code;
    } catch {
      // Plain string
    }

    const claim = await tx.claim.findFirst({
      where: {
        OR: [
          { opaqueId: normalized },
          { code: normalized.toUpperCase() },
        ],
      },
      include: {
        offer: {
          include: {
            partner: true,
            campaign: true,
          },
        },
        user: { select: { id: true, displayName: true } },
      },
    });

    if (!claim) {
      return { success: false, error: 'CLAIM_NOT_FOUND' };
    }

    // Prevent merchants from confirming their own claim
    if (claim.userId === merchantUserId) {
      return { success: false, error: 'CANNOT_CONFIRM_OWN_CLAIM' };
    }

    const now = new Date();

    // 2. Atomic Conditional Update: Only one concurrent execution can transition usedAt from null!
    const updateResult = await tx.claim.updateMany({
      where: {
        id: claim.id,
        usedAt: null,
        expiresAt: { gt: now },
      },
      data: {
        status: 'CONFIRMED',
        usedAt: now,
        receiptRef: receiptRef ?? null,
      },
    });

    if (updateResult.count !== 1) {
      return {
        success: false,
        error: claim.usedAt ? 'ALREADY_USED' : 'EXPIRED',
      };
    }

    // Check partner match if merchantPartnerId is set
    if (merchantPartnerId && claim.offer.partnerId !== merchantPartnerId) {
      throw new Error('WRONG_PARTNER: Offer is not valid at this merchant');
    }

    // Fetch or create user StampCard
    let stampCard = await tx.stampCard.findUnique({
      where: { userId_offerId: { userId: claim.userId, offerId: claim.offerId } },
    });

    if (!stampCard) {
      stampCard = await tx.stampCard.create({
        data: {
          userId: claim.userId,
          offerId: claim.offerId,
          stamps: 0,
        },
      });
    }

    const progress = calculateStampProgress(
      stampCard.stamps,
      1,
      claim.offer.stampsNeeded || 5
    );

    // Update stamp card
    await tx.stampCard.update({
      where: { id: stampCard.id },
      data: {
        stamps: progress.nextStamps,
        completedAt: progress.isCompleted ? now : stampCard.completedAt,
      },
    });

    // 1. Award 10 points for the reuse stamp
    const availableAt = computeAvailableAt();
    await appendDoubleEntry(tx, {
      debitAccount: 'SPONSOR_POOL',
      creditAccount: 'USER_PENDING',
      amountPoints: POINTS_CONFIG.EARNING.REUSE_STAMP,
      userId: claim.userId,
      campaignId: claim.offer.campaignId,
      type: 'EARN',
      refType: 'Claim',
      refId: claim.id,
      availableAt,
      note: `Reusable bag confirmed at ${claim.offer.partner.name}${receiptRef ? ` (Receipt: ${receiptRef})` : ''}`,
    });

    let bonusPointsAwarded = 0;

    // 2. If 5-stamp card completed: award 40 bonus points
    if (progress.isCompleted) {
      bonusPointsAwarded = POINTS_CONFIG.EARNING.REUSE_CARD_BONUS;
      await appendDoubleEntry(tx, {
        debitAccount: 'SPONSOR_POOL',
        creditAccount: 'USER_PENDING',
        amountPoints: bonusPointsAwarded,
        userId: claim.userId,
        campaignId: claim.offer.campaignId,
        type: 'EARN',
        refType: 'StampCard',
        refId: stampCard.id,
        availableAt,
        note: `Card Completion Bonus: 5 stamps at ${claim.offer.partner.name}! 40 bonus GP awarded.`,
      });

      await tx.notification.create({
        data: {
          userId: claim.userId,
          title: '🎉 40 Bonus Points Earned!',
          body: `You completed your 5-stamp card at ${claim.offer.partner.name}! 40 bonus Green Points are pending settlement.`,
        },
      });
    } else {
      await tx.notification.create({
        data: {
          userId: claim.userId,
          title: `✅ Stamp earned at ${claim.offer.partner.name}!`,
          body: `Reusable bag confirmed (+10 GP). Progress: ${progress.nextStamps}/${claim.offer.stampsNeeded || 5} stamps.`,
        },
      });
    }

    // Increment merchant milestone
    const milestone = await tx.merchantMilestone.upsert({
      where: {
        partnerId_campaignId: {
          partnerId: claim.offer.partnerId,
          campaignId: claim.offer.campaignId,
        },
      },
      create: {
        partnerId: claim.offer.partnerId,
        campaignId: claim.offer.campaignId,
        count: 1,
      },
      update: {
        count: { increment: 1 },
      },
    });

    if (shouldFlagMerchantForAudit(milestone.count, 1)) {
      await tx.merchantMilestone.update({
        where: { id: milestone.id },
        data: { flaggedForAudit: true },
      });
    }

    // Audit log
    await tx.auditLog.create({
      data: {
        actorId: merchantUserId,
        action: 'CLAIM_CONFIRMED',
        refType: 'Claim',
        refId: claim.id,
        meta: JSON.stringify({
          userId: claim.userId,
          offerId: claim.offerId,
          receiptRef,
          pointsAwarded: POINTS_CONFIG.EARNING.REUSE_STAMP + bonusPointsAwarded,
        }),
      },
    });

    return {
      success: true,
      stampsNow: progress.nextStamps,
      pointsAwarded: POINTS_CONFIG.EARNING.REUSE_STAMP,
      bonusPointsAwarded,
      message: progress.isCompleted
        ? `Card completed! Awarded 10 GP + 40 Bonus Points (Total 50 GP).`
        : `Stamp confirmed! +10 GP pending settlement.`,
    };
  });
}

export async function getUserStampCards(userId: string) {
  const cards = await prisma.stampCard.findMany({
    where: { userId },
    include: {
      offer: {
        include: {
          partner: { select: { id: true, name: true, isSimulated: true } },
          campaign: { select: { id: true, name: true, status: true } },
        },
      },
    },
    orderBy: { updatedAt: 'desc' },
  });
  return cards;
}
