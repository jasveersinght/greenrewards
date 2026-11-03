import { describe, it, expect } from 'vitest'
import { deriveBalance, buildEntry } from '@/server/domain/wallet'

// Minimal ledger entry shape matching Pick<LedgerEntry, 'account' | 'amountPaise' | 'stamps' | 'type'>
function entry(account: string, type: string, amountPaise: bigint | null = null, stamps: number | null = null) {
  return { account, amountPaise, stamps, type } as Parameters<typeof deriveBalance>[0][number]
}

describe('deriveBalance', () => {
  it('sums available credits correctly', () => {
    const entries = [
      entry('AVAILABLE', 'APPROVE_PENDING', 5_000n),
      entry('AVAILABLE', 'APPROVE_PENDING', 3_000n),
    ]
    const balance = deriveBalance(entries)
    expect(balance.availablePaise).toBe(8_000n)
  })

  it('subtracts negative amounts for redemptions', () => {
    const entries = [
      entry('AVAILABLE', 'APPROVE_PENDING', 10_000n),
      entry('AVAILABLE', 'RESERVE_REDEMPTION', -2_000n),
    ]
    const balance = deriveBalance(entries)
    expect(balance.availablePaise).toBe(8_000n)
  })

  it('sums stamps correctly', () => {
    const entries = [
      entry('STAMPS', 'EARN_STAMP', null, 3),
      entry('STAMPS', 'EARN_STAMP', null, 2),
    ]
    const balance = deriveBalance(entries)
    expect(balance.stamps).toBe(5)
  })

  it('counts pending paise', () => {
    const entries = [
      entry('PENDING', 'EARN_PENDING', 1_000n),
      entry('PENDING', 'EARN_PENDING', 500n),
    ]
    const balance = deriveBalance(entries)
    expect(balance.pendingPaise).toBe(1_500n)
  })

  it('returns zero balance for empty entries', () => {
    const balance = deriveBalance([])
    expect(balance.availablePaise).toBe(0n)
    expect(balance.pendingPaise).toBe(0n)
    expect(balance.stamps).toBe(0)
  })
})

describe('buildEntry', () => {
  it('constructs a valid ledger entry shape', () => {
    const e = buildEntry({
      userId: 'u1',
      account: 'AVAILABLE',
      type: 'APPROVE_PENDING',
      refType: 'Claim',
      refId: 'c1',
      amountPaise: 500n,
    })
    expect(e.userId).toBe('u1')
    expect(e.account).toBe('AVAILABLE')
    expect(e.amountPaise).toBe(500n)
    expect(e.stamps).toBeNull()
    expect(e.campaignId).toBeNull()
  })
})
