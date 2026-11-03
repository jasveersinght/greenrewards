import { describe, it, expect } from 'vitest'
import {
  canReserve,
  reserve,
  spend,
  release,
  remaining,
  assertInvariant,
  type BudgetSnapshot,
} from '@/server/domain/budget'

const base: BudgetSnapshot = {
  totalPaise: 10_000n,
  reservedPaise: 0n,
  spentPaise: 0n,
}

describe('remaining', () => {
  it('returns full total when nothing reserved or spent', () => {
    expect(remaining(base)).toBe(10_000n)
  })

  it('subtracts reserved and spent', () => {
    const b: BudgetSnapshot = { ...base, reservedPaise: 3_000n, spentPaise: 2_000n }
    expect(remaining(b)).toBe(5_000n)
  })
})

describe('canReserve', () => {
  it('returns true when enough budget remains', () => {
    expect(canReserve(base, 5_000n)).toBe(true)
  })

  it('returns false when amount would exceed total', () => {
    expect(canReserve(base, 11_000n)).toBe(false)
  })

  it('returns false for 0 or negative amount', () => {
    expect(canReserve(base, 0n)).toBe(false)
  })
})

describe('reserve', () => {
  it('increments reservedPaise', () => {
    const result = reserve(base, 3_000n)
    expect(result.reservedPaise).toBe(3_000n)
    expect(result.spentPaise).toBe(0n)
  })

  it('throws when budget exhausted', () => {
    expect(() => reserve(base, 15_000n)).toThrow('BUDGET_EXHAUSTED')
  })
})

describe('spend', () => {
  it('moves paise from reserved to spent', () => {
    const b: BudgetSnapshot = { ...base, reservedPaise: 5_000n }
    const result = spend(b, 3_000n)
    expect(result.reservedPaise).toBe(2_000n)
    expect(result.spentPaise).toBe(3_000n)
  })

  it('throws on underflow', () => {
    expect(() => spend(base, 1n)).toThrow('BUDGET_RESERVE_UNDERFLOW')
  })
})

describe('release', () => {
  it('decrements reservedPaise', () => {
    const b: BudgetSnapshot = { ...base, reservedPaise: 5_000n }
    const result = release(b, 2_000n)
    expect(result.reservedPaise).toBe(3_000n)
  })

  it('throws when releasing more than reserved', () => {
    expect(() => release(base, 1n)).toThrow('BUDGET_RESERVE_UNDERFLOW')
  })
})

describe('assertInvariant', () => {
  it('does not throw for a valid budget', () => {
    expect(() => assertInvariant({ totalPaise: 10_000n, reservedPaise: 3_000n, spentPaise: 2_000n })).not.toThrow()
  })

  it('throws when reserved + spent exceeds total', () => {
    expect(() => assertInvariant({ totalPaise: 5_000n, reservedPaise: 3_000n, spentPaise: 3_000n })).toThrow('BUDGET_INVARIANT_VIOLATED')
  })
})
