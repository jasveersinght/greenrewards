import { describe, it, expect } from 'vitest'
import {
  isValidLeakCategory,
  isDuplicateCase,
  canReviewLeak,
  parseLeakBounties,
} from '@/server/domain/leaks'

describe('isValidLeakCategory', () => {
  it('accepts public categories', () => {
    expect(isValidLeakCategory('ROAD')).toBe(true)
    expect(isValidLeakCategory('STATION')).toBe(true)
    expect(isValidLeakCategory('PARK')).toBe(true)
    expect(isValidLeakCategory('OTHER_PUBLIC')).toBe(true)
  })

  it('rejects private residential categories', () => {
    expect(isValidLeakCategory('PRIVATE_HOUSE')).toBe(false)
    expect(isValidLeakCategory('KITCHEN')).toBe(false)
    expect(isValidLeakCategory('')).toBe(false)
  })
})

describe('isDuplicateCase', () => {
  // Base location: 12.8231, 80.0444
  it('detects duplicate within 50 meters (~20m apart)', () => {
    expect(isDuplicateCase(12.8231, 80.0444, 12.8232, 80.0445, 50)).toBe(true)
  })

  it('does not flag reports far apart as duplicate (>500m)', () => {
    expect(isDuplicateCase(12.8231, 80.0444, 12.8189, 80.0478, 50)).toBe(false)
  })
})

describe('canReviewLeak (Self-Review Prevention)', () => {
  it('allows review by a different user', () => {
    expect(canReviewLeak('reviewer-1', 'citizen-1')).toBe(true)
  })

  it('strictly blocks self-review if reviewer is also the reporter', () => {
    expect(canReviewLeak('user-1', 'user-1')).toBe(false)
  })
})

describe('parseLeakBounties', () => {
  it('parses valid json rules', () => {
    const json = JSON.stringify({ acceptedBountyPaise: 8000, verifiedBonusPaise: 12000 })
    const bounties = parseLeakBounties(json)
    expect(bounties.acceptedBountyPaise).toBe(8000)
    expect(bounties.verifiedBonusPaise).toBe(12000)
  })

  it('falls back to default ₹100 + ₹150 for null or invalid JSON', () => {
    expect(parseLeakBounties(null)).toEqual({ acceptedBountyPaise: 10000, verifiedBonusPaise: 15000 })
    expect(parseLeakBounties('invalid-json')).toEqual({ acceptedBountyPaise: 10000, verifiedBonusPaise: 15000 })
  })
})
