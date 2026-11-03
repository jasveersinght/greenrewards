import { describe, it, expect } from 'vitest'
import {
  generateOtp,
  otpExpiryDate,
  canResend,
  isLockedOut,
  MAX_ATTEMPTS,
  OTP_EXPIRY,
} from '@/server/domain/auth'

describe('generateOtp', () => {
  it('returns a 6-character string of digits', () => {
    const otp = generateOtp()
    expect(otp).toMatch(/^\d{6}$/)
  })

  it('generates unique codes across multiple calls', () => {
    const codes = new Set(Array.from({ length: 100 }, () => generateOtp()))
    expect(codes.size).toBeGreaterThan(90)
  })
})

describe('otpExpiryDate', () => {
  it('returns a Date ~10 minutes in the future (default)', () => {
    const now = Date.now()
    const expiry = otpExpiryDate()
    const diff = expiry.getTime() - now
    expect(diff).toBeGreaterThan(0)
    // OTP_EXPIRY is 10 min by default
    expect(diff).toBeLessThanOrEqual(OTP_EXPIRY + 500)
  })
})

describe('canResend', () => {
  it('returns true when last OTP was far in the past', () => {
    const longAgo = new Date(Date.now() - 120_000) // 2 min ago
    expect(canResend(longAgo)).toBe(true)
  })

  it('returns false when last OTP was just now', () => {
    const justNow = new Date()
    expect(canResend(justNow)).toBe(false)
  })
})

describe('isLockedOut', () => {
  it('returns true at or above MAX_ATTEMPTS', () => {
    expect(isLockedOut(MAX_ATTEMPTS)).toBe(true)
    expect(isLockedOut(MAX_ATTEMPTS + 1)).toBe(true)
  })

  it('returns false below MAX_ATTEMPTS', () => {
    expect(isLockedOut(0)).toBe(false)
    expect(isLockedOut(MAX_ATTEMPTS - 1)).toBe(false)
  })
})
