/**
 * Budget domain logic — pure functions for reserve/spend/release.
 * All values in integer paise (BigInt). Never use floats.
 */

export interface BudgetSnapshot {
  totalPaise: bigint
  reservedPaise: bigint
  spentPaise: bigint
}

/** Return remaining (unallocated) budget */
export function remaining(b: BudgetSnapshot): bigint {
  return b.totalPaise - b.reservedPaise - b.spentPaise
}

/** Check if we can reserve `amount` paise */
export function canReserve(b: BudgetSnapshot, amount: bigint): boolean {
  if (amount <= 0n) return false
  return remaining(b) >= amount
}

/** Return new state after reserving (does NOT mutate — caller persists) */
export function reserve(b: BudgetSnapshot, amount: bigint): BudgetSnapshot {
  if (!canReserve(b, amount)) {
    throw new Error('BUDGET_EXHAUSTED')
  }
  return { ...b, reservedPaise: b.reservedPaise + amount }
}

/** Move from reserved → spent (finalise the reward) */
export function spend(b: BudgetSnapshot, amount: bigint): BudgetSnapshot {
  if (b.reservedPaise < amount) throw new Error('BUDGET_RESERVE_UNDERFLOW')
  return {
    ...b,
    reservedPaise: b.reservedPaise - amount,
    spentPaise: b.spentPaise + amount,
  }
}

/** Release a reservation without spending (claim expired/rejected) */
export function release(b: BudgetSnapshot, amount: bigint): BudgetSnapshot {
  if (b.reservedPaise < amount) throw new Error('BUDGET_RESERVE_UNDERFLOW')
  return { ...b, reservedPaise: b.reservedPaise - amount }
}

/** Invariant check — must hold before any mutation */
export function assertInvariant(b: BudgetSnapshot): void {
  if (b.reservedPaise + b.spentPaise > b.totalPaise) {
    throw new Error('BUDGET_INVARIANT_VIOLATED')
  }
  if (b.reservedPaise < 0n || b.spentPaise < 0n || b.totalPaise < 0n) {
    throw new Error('BUDGET_NEGATIVE_VALUE')
  }
}
