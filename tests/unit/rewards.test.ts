import { describe, it, expect } from 'vitest'
import {
  calculateStampProgress,
  checkDailyLimit,
  shouldFlagMerchantForAudit,
} from '@/server/domain/rewards'

describe('calculateStampProgress', () => {
  it('increments stamps towards milestone', () => {
    const res = calculateStampProgress(2, 1, 5)
    expect(res.nextStamps).toBe(3)
    expect(res.isCompleted).toBe(false)
    expect(res.remainingStampsNeeded).toBe(2)
  })

  it('detects completed milestone at exactly stampsNeeded', () => {
    const res = calculateStampProgress(4, 1, 5)
    expect(res.nextStamps).toBe(0)
    expect(res.isCompleted).toBe(true)
    expect(res.remainingStampsNeeded).toBe(0)
  })

  it('handles overflow stamps into the next cycle', () => {
    const res = calculateStampProgress(4, 2, 5)
    expect(res.nextStamps).toBe(1)
    expect(res.isCompleted).toBe(true)
    expect(res.remainingStampsNeeded).toBe(0)
  })

  it('throws on non-positive stampsNeeded', () => {
    expect(() => calculateStampProgress(0, 1, 0)).toThrow('STAMPS_NEEDED_MUST_BE_POSITIVE')
  })
})

describe('checkDailyLimit', () => {
  it('allows claim if user made 0 claims today (limit 1)', () => {
    expect(checkDailyLimit(0, 1)).toBe(true)
  })

  it('blocks claim if user already reached daily limit', () => {
    expect(checkDailyLimit(1, 1)).toBe(false)
    expect(checkDailyLimit(2, 1)).toBe(false)
  })
})

describe('shouldFlagMerchantForAudit', () => {
  it('flags when daily rate exceeds threshold', () => {
    expect(shouldFlagMerchantForAudit(10, 55)).toBe(true)
  })

  it('does not flag on normal activity', () => {
    expect(shouldFlagMerchantForAudit(10, 15)).toBe(false)
  })
})
