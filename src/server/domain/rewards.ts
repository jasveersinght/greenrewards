/**
 * Rewards Domain Logic — pure functions for stamps, vouchers, and merchant milestones.
 */

export interface StampCardUpdateResult {
  nextStamps: number
  isCompleted: boolean
  remainingStampsNeeded: number
}

/**
 * Calculate the next stamp count and whether a card is completed.
 * When a card reaches stampsNeeded, isCompleted is true.
 */
export function calculateStampProgress(
  currentStamps: number,
  stampsEarned: number,
  stampsNeeded: number
): StampCardUpdateResult {
  if (stampsNeeded <= 0) {
    throw new Error('STAMPS_NEEDED_MUST_BE_POSITIVE')
  }
  const total = currentStamps + stampsEarned
  const isCompleted = total >= stampsNeeded
  const nextStamps = isCompleted ? total % stampsNeeded : total
  const remainingStampsNeeded = isCompleted ? 0 : stampsNeeded - nextStamps

  return {
    nextStamps,
    isCompleted,
    remainingStampsNeeded,
  }
}

/**
 * Check if user exceeded daily claim limit for an offer.
 * Typically 1 per user per day.
 */
export function checkDailyLimit(claimsTodayCount: number, limitPerDay = 1): boolean {
  return claimsTodayCount < limitPerDay
}

/**
 * Merchant milestone tiers and auditing checks.
 * Flags milestone for audit if confirmed transactions spike unusually.
 */
export function shouldFlagMerchantForAudit(currentCount: number, recentRatePerDay: number): boolean {
  // Flag for audit if more than 50 transactions in a single day at a single partner
  return recentRatePerDay > 50 || currentCount % 100 === 0
}
