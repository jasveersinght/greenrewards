/**
 * Wallet / Ledger domain logic — pure helpers.
 * NEVER update balances in-place; balances are DERIVED from ledger entries.
 */
import type { LedgerEntry } from '@/generated/prisma';

export interface WalletBalance {
  stamps: number;
  pendingPaise: bigint;
  availablePaise: bigint;
  voucherPaise: bigint;
  // New Green Points balances
  availablePoints: number;
  pendingPoints: number;
  reservedPoints: number;
  expiringSoonPoints: number;
  pendingLots: Array<{
    amountPoints: number;
    availableAt: Date;
    refType: string;
    refId: string;
  }>;
}

export interface PointsWalletSummary {
  availablePoints: number;
  pendingPoints: number;
  reservedPoints: number;
  expiringSoonPoints: number;
  stamps: number;
  pendingLots: Array<{
    amountPoints: number;
    availableAt: Date;
    refType: string;
    refId: string;
  }>;
}

/** Derive balances from an array of ledger entries (the source of truth) */
export function deriveBalance(
  entries: {
    account: string;
    amountPaise?: number | bigint | null;
    amountPoints?: number | null;
    stamps?: number | null;
    type?: string;
    entrySide?: string | null;
    availableAt?: Date | string | null;
    expiresAt?: Date | string | null;
    refType?: string;
    refId?: string;
  }[]
): WalletBalance {
  let stamps = 0;
  let pendingPaise = 0n;
  let availablePaise = 0n;
  let voucherPaise = 0n;

  let availablePoints = 0;
  let pendingPoints = 0;
  let reservedPoints = 0;
  let expiringSoonPoints = 0;
  const pendingLots: WalletBalance['pendingLots'] = [];

  const now = new Date();
  const thirtyDaysFromNow = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

  for (const e of entries) {
    // Legacy paise calculation
    const paise = e.amountPaise != null ? BigInt(e.amountPaise) : 0n;
    switch (e.account) {
      case 'STAMPS':
        stamps += e.stamps ?? 0;
        break;
      case 'PENDING':
        pendingPaise += paise;
        break;
      case 'AVAILABLE':
        availablePaise += paise;
        break;
      case 'VOUCHER':
        voucherPaise += paise;
        break;
    }

    // Points calculation (Double-entry accounts)
    const points = e.amountPoints ?? 0;
    const isCredit = e.entrySide === 'CREDIT' || (!e.entrySide && points >= 0);
    const multiplier = isCredit ? 1 : -1;
    const netPoints = points * multiplier;

    switch (e.account) {
      case 'USER_AVAILABLE':
        availablePoints += netPoints;
        // Check if expiring soon
        if (e.expiresAt && isCredit) {
          const exp = e.expiresAt instanceof Date ? e.expiresAt : new Date(e.expiresAt);
          if (exp > now && exp <= thirtyDaysFromNow) {
            expiringSoonPoints += points;
          }
        }
        break;
      case 'USER_PENDING':
        pendingPoints += netPoints;
        if (isCredit && points > 0) {
          const availDate = e.availableAt
            ? e.availableAt instanceof Date
              ? e.availableAt
              : new Date(e.availableAt)
            : new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
          if (availDate > now) {
            pendingLots.push({
              amountPoints: points,
              availableAt: availDate,
              refType: e.refType || 'EARN',
              refId: e.refId || '',
            });
          }
        }
        break;
      case 'USER_RESERVED':
        reservedPoints += netPoints;
        break;
    }
  }

  // Safety floor at 0
  availablePoints = Math.max(0, availablePoints);
  pendingPoints = Math.max(0, pendingPoints);
  reservedPoints = Math.max(0, reservedPoints);

  return {
    stamps,
    pendingPaise,
    availablePaise,
    voucherPaise,
    availablePoints,
    pendingPoints,
    reservedPoints,
    expiringSoonPoints,
    pendingLots,
  };
}

/** Build a ledger entry record */
export function buildEntry(params: {
  userId?: string | null;
  account: string;
  type: string;
  refType: string;
  refId: string;
  amountPoints?: number;
  amountPaise?: number | bigint | null;
  stamps?: number | null;
  campaignId?: string | null;
  entrySide?: 'DEBIT' | 'CREDIT';
  transactionId?: string;
  availableAt?: Date | null;
  settledAt?: Date | null;
  expiresAt?: Date | null;
  prevHash?: string | null;
  hash?: string | null;
  reason?: string | null;
  note?: string | null;
}) {
  return {
    userId: params.userId ?? null,
    campaignId: params.campaignId ?? null,
    account: params.account,
    amountPoints: params.amountPoints ?? 0,
    amountPaise: params.amountPaise != null ? params.amountPaise : null,
    stamps: params.stamps ?? null,
    type: params.type,
    refType: params.refType,
    refId: params.refId,
    entrySide: params.entrySide ?? 'CREDIT',
    transactionId: params.transactionId ?? undefined,
    availableAt: params.availableAt ?? null,
    settledAt: params.settledAt ?? null,
    expiresAt: params.expiresAt ?? null,
    prevHash: params.prevHash ?? null,
    hash: params.hash ?? null,
    reason: params.reason ?? null,
    note: params.note ?? null,
  };
}
