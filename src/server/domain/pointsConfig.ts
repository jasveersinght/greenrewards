/**
 * Canonical Green Points earning rules and caps.
 * Points are not currency/money and cannot be cashed out or transferred.
 */

export const POINTS_CONFIG = {
  EARNING: {
    REUSE_STAMP: 10,
    REUSE_CARD_BONUS: 40, // 5-stamp card completion
    STAMP_CARD_BONUS: 40,
    LEAK_REPORT_ACCEPTED: 50,
    LEAK_REPAIR_VERIFIED: 100, // Awarded to the original reporter
    FOOD_PICKUP_COMPLETED: 15,
    TRANSIT_TRIP_REVIEWED: 5,
    TRANSIT_STREAK_BONUS: 25, // 5 trips in 7 days
    ELECTRICITY_REDUCTION_10PCT: 150,
    ELECTRICITY_10PCT_REDUCTION: 150,
    HOUSEHOLD_WATER_REPAIR_VERIFIED: 75,
  },
  CAPS: {
    REUSE_STAMPS_PER_SHOP_PER_DAY: 2,
    LEAK_REPORTS_ACCEPTED_PER_USER_PER_MONTH: 3,
    TRANSIT_TRIPS_PER_USER_PER_DAY: 2,
    GLOBAL_MAX_EARNED_POINTS_PER_USER_PER_MONTH: 500,
  },
  LIFECYCLE: {
    // Normal pending period: 7 days. If DEMO_FAST_SETTLE=true, 1 minute.
    PENDING_PERIOD_MS: 7 * 24 * 60 * 60 * 1000,
    DEMO_PENDING_PERIOD_MS: 60 * 1000, // 1 minute
    POINTS_EXPIRY_MONTHS: 12,
  },
} as const;

export function getPendingDurationMs(): number {
  if (process.env.DEMO_FAST_SETTLE === 'true' || process.env.NEXT_PUBLIC_DEMO_FAST_SETTLE === 'true') {
    return POINTS_CONFIG.LIFECYCLE.DEMO_PENDING_PERIOD_MS;
  }
  return POINTS_CONFIG.LIFECYCLE.PENDING_PERIOD_MS;
}

export function computeAvailableAt(from: Date = new Date()): Date {
  const durationMs = getPendingDurationMs();
  return new Date(from.getTime() + durationMs);
}

export function computeExpiryDate(from: Date = new Date()): Date {
  const d = new Date(from);
  d.setFullYear(d.getFullYear() + 1);
  return d;
}
