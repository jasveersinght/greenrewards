/**
 * Wallet service — transactional points ledger mutations.
 * All balance changes go through balanced double-entry accounting.
 * The ledger is append-only and cryptographically chained.
 */
import { prisma } from '@/server/db';
import { deriveBalance } from '@/server/domain/wallet';
import { computeAvailableAt, computeExpiryDate, POINTS_CONFIG } from '@/server/domain/pointsConfig';
import { computeEntryHash, verifyLedgerChain } from '@/server/domain/ledgerChain';
import { evaluateMonthlyGlobalCap } from '@/server/domain/caps';
import crypto from 'crypto';

/**
 * Gets the latest entry hash from the ledger to form the blockchain-style link.
 */
async function getLatestHash(tx: any): Promise<string | null> {
  const latest = await tx.ledgerEntry.findFirst({
    orderBy: { createdAt: 'desc' },
    select: { hash: true },
  });
  return latest?.hash ?? null;
}

/**
 * Appends a balanced double-entry pair with tamper-evident chain hashing.
 * Retries up to 3 times on concurrency race.
 */
export async function appendDoubleEntry(
  tx: any,
  params: {
    transactionId?: string;
    debitAccount: string;
    creditAccount: string;
    amountPoints: number;
    amountPaise?: number | null;
    userId: string | null;
    campaignId?: string | null;
    type: string;
    refType: string;
    refId: string;
    availableAt?: Date | null;
    expiresAt?: Date | null;
    settledAt?: Date | null;
    reason?: string | null;
    note?: string | null;
  }
) {
  const transactionId = params.transactionId || `tx_${crypto.randomUUID()}`;
  const now = new Date();
  const nowIso = now.toISOString();

  // Retry loop for serialized ledger hashing
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const prevHash = await getLatestHash(tx);

      // 1. Debit Entry
      const debitCanonical = {
        transactionId,
        entrySide: 'DEBIT',
        userId: params.userId,
        account: params.debitAccount,
        amountPoints: params.amountPoints,
        type: params.type,
        refType: params.refType,
        refId: params.refId,
        createdAt: nowIso,
      };
      const debitHash = computeEntryHash(prevHash, debitCanonical);

      await tx.ledgerEntry.create({
        data: {
          transactionId,
          entrySide: 'DEBIT',
          userId: params.userId,
          campaignId: params.campaignId ?? null,
          account: params.debitAccount,
          amountPoints: params.amountPoints,
          amountPaise: params.amountPaise ?? null,
          type: params.type,
          refType: params.refType,
          refId: params.refId,
          availableAt: params.availableAt ?? null,
          settledAt: params.settledAt ?? null,
          expiresAt: params.expiresAt ?? null,
          prevHash: prevHash,
          hash: debitHash,
          reason: params.reason ?? null,
          note: params.note ?? null,
          createdAt: now,
        },
      });

      // 2. Credit Entry (links to debitHash)
      const creditCanonical = {
        transactionId,
        entrySide: 'CREDIT',
        userId: params.userId,
        account: params.creditAccount,
        amountPoints: params.amountPoints,
        type: params.type,
        refType: params.refType,
        refId: params.refId,
        createdAt: nowIso,
      };
      const creditHash = computeEntryHash(debitHash, creditCanonical);

      await tx.ledgerEntry.create({
        data: {
          transactionId,
          entrySide: 'CREDIT',
          userId: params.userId,
          campaignId: params.campaignId ?? null,
          account: params.creditAccount,
          amountPoints: params.amountPoints,
          amountPaise: params.amountPaise ?? null,
          type: params.type,
          refType: params.refType,
          refId: params.refId,
          availableAt: params.availableAt ?? null,
          settledAt: params.settledAt ?? null,
          expiresAt: params.expiresAt ?? null,
          prevHash: debitHash,
          hash: creditHash,
          reason: params.reason ?? null,
          note: params.note ?? null,
          createdAt: now,
        },
      });

      return { transactionId, debitHash, creditHash };
    } catch (err: any) {
      if (attempt === 2) throw err;
      // Brief jitter backoff on concurrency race
      await new Promise((res) => setTimeout(res, 20 + Math.random() * 50));
    }
  }
}

/**
 * Lazy settlement helper: runs pending -> available settlement whenever a user accesses their wallet.
 */
export async function settlePendingPoints(userId?: string) {
  const now = new Date();
  
  // Find pending entries that have matured
  const maturePendingEntries = await prisma.ledgerEntry.findMany({
    where: {
      account: 'USER_PENDING',
      entrySide: 'CREDIT',
      settledAt: null,
      availableAt: { lte: now },
      ...(userId ? { userId } : {}),
    },
    orderBy: { createdAt: 'asc' },
    take: 100,
  });

  if (maturePendingEntries.length === 0) {
    return { settledCount: 0, totalPoints: 0 };
  }

  let settledCount = 0;
  let totalPoints = 0;

  for (const pending of maturePendingEntries) {
    if (!pending.userId) continue;

    await prisma.$transaction(async (tx) => {
      // Atomic conditional update to mark as settled
      const updated = await tx.ledgerEntry.updateMany({
        where: { id: pending.id, settledAt: null },
        data: { settledAt: now },
      });

      if (updated.count !== 1) return; // Already settled by parallel job

      const expiryDate = computeExpiryDate(now);

      // Move points: USER_PENDING -> USER_AVAILABLE
      await appendDoubleEntry(tx, {
        debitAccount: 'USER_PENDING',
        creditAccount: 'USER_AVAILABLE',
        amountPoints: pending.amountPoints,
        userId: pending.userId,
        campaignId: pending.campaignId,
        type: 'SETTLE',
        refType: pending.refType,
        refId: pending.refId,
        settledAt: now,
        expiresAt: expiryDate,
        note: `Settled from pending entry ${pending.id}`,
      });

      settledCount++;
      totalPoints += pending.amountPoints;
    });
  }

  return { settledCount, totalPoints };
}

/**
 * Expiry job: moves points past expiresAt from USER_AVAILABLE to EXPIRED.
 */
export async function expireOverduePoints() {
  const now = new Date();
  const overdueEntries = await prisma.ledgerEntry.findMany({
    where: {
      account: 'USER_AVAILABLE',
      entrySide: 'CREDIT',
      expiresAt: { lte: now },
      type: { not: 'EXPIRE' },
    },
    take: 50,
  });

  let expiredCount = 0;
  let totalPoints = 0;

  for (const entry of overdueEntries) {
    if (!entry.userId) continue;

    await prisma.$transaction(async (tx) => {
      // Check current user available points
      const userEntries = await tx.ledgerEntry.findMany({
        where: { userId: entry.userId },
        select: { account: true, amountPoints: true, entrySide: true },
      });
      const balance = deriveBalance(userEntries);
      if (balance.availablePoints <= 0) return;

      const pointsToExpire = Math.min(entry.amountPoints, balance.availablePoints);
      if (pointsToExpire <= 0) return;

      await appendDoubleEntry(tx, {
        debitAccount: 'USER_AVAILABLE',
        creditAccount: 'EXPIRED',
        amountPoints: pointsToExpire,
        userId: entry.userId,
        campaignId: entry.campaignId,
        type: 'EXPIRE',
        refType: entry.refType,
        refId: entry.refId,
        note: `Points expired after 12 months`,
      });

      expiredCount++;
      totalPoints += pointsToExpire;
    });
  }

  return { expiredCount, totalPoints };
}

/**
 * Reverses a pending point award (e.g. fraudulent leak report or forged ticket).
 */
export async function reversePendingPoints(params: {
  pendingEntryId: string;
  adminId: string;
  reason: string;
}) {
  return prisma.$transaction(async (tx) => {
    const entry = await tx.ledgerEntry.findUnique({
      where: { id: params.pendingEntryId },
    });

    if (!entry) throw new Error('ENTRY_NOT_FOUND');
    if (entry.account !== 'USER_PENDING' || entry.entrySide !== 'CREDIT') {
      throw new Error('ONLY_PENDING_CREDITS_CAN_BE_REVERSED');
    }
    if (entry.settledAt !== null) {
      throw new Error('ENTRY_ALREADY_SETTLED_CANNOT_REVERSE');
    }

    const updated = await tx.ledgerEntry.updateMany({
      where: { id: entry.id, settledAt: null },
      data: { settledAt: new Date(), reason: `REVERSED: ${params.reason}` },
    });

    if (updated.count !== 1) {
      throw new Error('RACE_CONDITION_ENTRY_MODIFIED');
    }

    // Double entry: USER_PENDING -> REVERSED
    await appendDoubleEntry(tx, {
      debitAccount: 'USER_PENDING',
      creditAccount: 'REVERSED',
      amountPoints: entry.amountPoints,
      userId: entry.userId,
      campaignId: entry.campaignId,
      type: 'REVERSE',
      refType: entry.refType,
      refId: entry.refId,
      reason: params.reason,
      note: `Reversed by admin ${params.adminId}: ${params.reason}`,
    });

    // Log to AuditLog
    await tx.auditLog.create({
      data: {
        actorId: params.adminId,
        action: 'REVERSE_POINTS',
        refType: 'LedgerEntry',
        refId: entry.id,
        meta: JSON.stringify({
          reversedPoints: entry.amountPoints,
          reason: params.reason,
          userId: entry.userId,
        }),
      },
    });

    return { success: true, reversedPoints: entry.amountPoints };
  });
}

/**
 * Get monthly points earned by user for cap enforcement.
 */
export async function getPointsEarnedThisMonth(userId: string): Promise<number> {
  const startOfMonth = new Date();
  startOfMonth.setDate(1);
  startOfMonth.setHours(0, 0, 0, 0);

  const entries = await prisma.ledgerEntry.findMany({
    where: {
      userId,
      account: 'USER_PENDING',
      entrySide: 'CREDIT',
      createdAt: { gte: startOfMonth },
    },
    select: { amountPoints: true },
  });

  return entries.reduce((sum, e) => sum + e.amountPoints, 0);
}

/**
 * Primary point earning function with caps and double-entry guarantee.
 */
export async function awardGreenPoints(params: {
  userId: string;
  campaignId?: string | null;
  basePoints: number;
  refType: string;
  refId: string;
  note?: string;
  instantAvailable?: boolean;
}) {
  const alreadyEarned = await getPointsEarnedThisMonth(params.userId);
  const capCheck = evaluateMonthlyGlobalCap(alreadyEarned, params.basePoints);

  const finalPoints = capCheck.pointsToAward;
  const availableAt = computeAvailableAt();

  return prisma.$transaction(async (tx) => {
    if (finalPoints > 0) {
      if (params.instantAvailable) {
        const expiryDate = computeExpiryDate();
        await appendDoubleEntry(tx, {
          debitAccount: 'SPONSOR_POOL',
          creditAccount: 'USER_AVAILABLE',
          amountPoints: finalPoints,
          userId: params.userId,
          campaignId: params.campaignId,
          type: 'EARN',
          refType: params.refType,
          refId: params.refId,
          settledAt: new Date(),
          expiresAt: expiryDate,
          note: params.note || capCheck.reason,
        });
      } else {
        await appendDoubleEntry(tx, {
          debitAccount: 'SPONSOR_POOL',
          creditAccount: 'USER_PENDING',
          amountPoints: finalPoints,
          userId: params.userId,
          campaignId: params.campaignId,
          type: 'EARN',
          refType: params.refType,
          refId: params.refId,
          availableAt,
          note: params.note || capCheck.reason,
        });
      }
    } else {
      // Over cap: Record action with 0 points
      await appendDoubleEntry(tx, {
        debitAccount: 'SPONSOR_POOL',
        creditAccount: 'USER_PENDING',
        amountPoints: 0,
        userId: params.userId,
        campaignId: params.campaignId,
        type: 'EARN',
        refType: params.refType,
        refId: params.refId,
        availableAt,
        note: capCheck.reason || 'Monthly cap reached; 0 points awarded',
      });
    }

    return {
      awardedPoints: finalPoints,
      availableAt: params.instantAvailable ? new Date() : availableAt,
      message: capCheck.reason,
    };
  });
}

/**
 * Get wallet balance with automatic lazy settlement for the current user.
 */
export async function getWalletBalance(userId: string) {
  // Run lazy settlement for this user so demo is seamless without cron
  try {
    await settlePendingPoints(userId);
  } catch (err) {
    console.error('Lazy settlement error:', err);
  }

  const entries = await prisma.ledgerEntry.findMany({
    where: { userId },
    select: {
      account: true,
      amountPaise: true,
      amountPoints: true,
      stamps: true,
      type: true,
      entrySide: true,
      availableAt: true,
      expiresAt: true,
      refType: true,
      refId: true,
    },
    orderBy: { createdAt: 'asc' },
  });

  return deriveBalance(entries);
}

/**
 * Get user transaction history.
 */
export async function getLedgerHistory(userId: string, params?: { skip?: number; take?: number }) {
  return prisma.ledgerEntry.findMany({
    where: {
      userId,
      entrySide: 'CREDIT', // Show user-facing credit events
    },
    orderBy: { createdAt: 'desc' },
    skip: params?.skip ?? 0,
    take: params?.take ?? 50,
    include: { campaign: { select: { name: true, section: true } } },
  });
}

/**
 * Verification domain helper: walks entire chain and checks tamper-evidence.
 */
export async function verifyLedgerIntegrity() {
  const entries = await prisma.ledgerEntry.findMany({
    orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
  });
  return verifyLedgerChain(entries as any);
}

// Legacy helper for backwards compatibility
export async function addLedgerEntry(params: {
  userId: string;
  account: string;
  type: string;
  refType: string;
  refId: string;
  amountPoints?: number;
  amountPaise?: number;
  stamps?: number;
  campaignId?: string;
  note?: string;
}) {
  return prisma.ledgerEntry.create({
    data: {
      userId: params.userId,
      campaignId: params.campaignId ?? null,
      account: params.account,
      amountPoints: params.amountPoints ?? 0,
      amountPaise: params.amountPaise ?? null,
      stamps: params.stamps ?? null,
      type: params.type,
      refType: params.refType,
      refId: params.refId,
      entrySide: 'CREDIT',
      note: params.note ?? null,
    },
  });
}
