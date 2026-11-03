/**
 * Leaks Domain Logic — pure functions for public leak classification,
 * geospatial duplicate detection, reviewer constraints, and bounty calculation.
 */
import { haversineDistance } from './geo'

export const VALID_LEAK_CATEGORIES = ['ROAD', 'STATION', 'PARK', 'OTHER_PUBLIC'] as const
export type LeakCategory = typeof VALID_LEAK_CATEGORIES[number]

export const DUPLICATE_DISTANCE_THRESHOLD_METERS = 50

/**
 * Validate that leak category is strictly public.
 * Private residential/household leaks must not use the public Leak Hunter flow.
 */
export function isValidLeakCategory(category: string): category is LeakCategory {
  return VALID_LEAK_CATEGORIES.includes(category as LeakCategory)
}

/**
 * Check if a reported location is close enough to an open case to be a duplicate.
 * Default threshold is 50 meters.
 */
export function isDuplicateCase(
  caseLat: number,
  caseLng: number,
  reportLat: number,
  reportLng: number,
  thresholdMeters = DUPLICATE_DISTANCE_THRESHOLD_METERS
): boolean {
  return haversineDistance(caseLat, caseLng, reportLat, reportLng) <= thresholdMeters
}

/**
 * Enforces rule: Reviewers CANNOT review or approve their own submissions.
 */
export function canReviewLeak(reviewerUserId: string, reporterUserId: string): boolean {
  if (!reviewerUserId || !reporterUserId) return false
  return reviewerUserId !== reporterUserId
}

export interface LeakBountyRules {
  acceptedBountyPaise: number
  verifiedBonusPaise: number
}

/**
 * Extract bounty rules from campaign reward rule JSON.
 * Defaults to ₹100 on acceptance, ₹150 on verified repair.
 */
export function parseLeakBounties(rewardRuleJson?: string | null): LeakBountyRules {
  if (!rewardRuleJson) {
    return { acceptedBountyPaise: 10000, verifiedBonusPaise: 15000 }
  }
  try {
    const parsed = typeof rewardRuleJson === 'string' ? JSON.parse(rewardRuleJson) : rewardRuleJson
    return {
      acceptedBountyPaise: Number(parsed.acceptedBountyPaise ?? 10000),
      verifiedBonusPaise: Number(parsed.verifiedBonusPaise ?? 15000),
    }
  } catch {
    return { acceptedBountyPaise: 10000, verifiedBonusPaise: 15000 }
  }
}
