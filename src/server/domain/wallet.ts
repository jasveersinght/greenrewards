/**
 * Wallet / Ledger domain logic — pure helpers.
 * NEVER update balances in-place; balances are DERIVED from ledger entries.
 */
import type { LedgerEntry } from '@/generated/prisma'

export interface WalletBalance {
  stamps: number
  pendingPaise: bigint
  availablePaise: bigint
  voucherPaise: bigint
}

/** Derive balances from an array of ledger entries (the source of truth) */
export function deriveBalance(
  entries: {
    account: string
    amountPaise?: number | bigint | null
    stamps?: number | null
    type?: string
  }[]
): WalletBalance {
  let stamps = 0
  let pendingPaise = 0n
  let availablePaise = 0n
  let voucherPaise = 0n

  for (const e of entries) {
    const amount = e.amountPaise != null ? BigInt(e.amountPaise) : 0n
    switch (e.account) {
      case 'STAMPS':
        stamps += e.stamps ?? 0
        break
      case 'PENDING':
        pendingPaise += amount
        break
      case 'AVAILABLE':
        availablePaise += amount
        break
      case 'VOUCHER':
        voucherPaise += amount
        break
    }
  }

  return { stamps, pendingPaise, availablePaise, voucherPaise }
}

/** Build a ledger entry record (caller persists it) */
export function buildEntry(params: {
  userId: string
  account: string
  type: string
  refType: string
  refId: string
  amountPaise?: number | bigint | null
  stamps?: number | null
  campaignId?: string | null
  note?: string | null
}): Omit<LedgerEntry, 'id' | 'createdAt' | 'campaign' | 'user'> {
  return {
    userId: params.userId,
    campaignId: params.campaignId ?? null,
    account: params.account,
    amountPaise: params.amountPaise != null ? (params.amountPaise as any) : null,
    stamps: params.stamps ?? null,
    type: params.type,
    refType: params.refType,
    refId: params.refId,
    note: params.note ?? null,
  }
}
