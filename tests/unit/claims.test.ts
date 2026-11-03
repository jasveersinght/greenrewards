import { describe, it, expect } from 'vitest'
import {
  generateClaimCode,
  claimExpiryDate,
  isClaimExpired,
  validateClaimForConfirmation,
} from '@/server/domain/claims'

describe('generateClaimCode', () => {
  it('generates a 6-character code', () => {
    const code = generateClaimCode()
    expect(code).toHaveLength(6)
    expect(code).toMatch(/^[2345679ACDEFGHJKLMNPQRSTUVWXYZ]{6}$/)
  })

  it('generates varying codes', () => {
    const codes = new Set(Array.from({ length: 50 }, () => generateClaimCode()))
    expect(codes.size).toBeGreaterThan(45)
  })
})

describe('claimExpiryDate', () => {
  it('defaults to 120 seconds in future', () => {
    const now = 1_000_000
    const expiry = claimExpiryDate(120, now)
    expect(expiry.getTime()).toBe(now + 120_000)
  })
})

describe('isClaimExpired', () => {
  it('returns true when expiry is in the past', () => {
    const past = new Date(1_000)
    expect(isClaimExpired(past, 2_000)).toBe(true)
  })

  it('returns false when expiry is in the future', () => {
    const future = new Date(5_000)
    expect(isClaimExpired(future, 2_000)).toBe(false)
  })
})

describe('validateClaimForConfirmation', () => {
  const future = new Date(Date.now() + 60_000)
  const past = new Date(Date.now() - 10_000)

  it('validates a pending, unexpired claim for the matching partner', () => {
    const res = validateClaimForConfirmation({
      status: 'PENDING',
      expiresAt: future,
      offerPartnerId: 'p-1',
      merchantPartnerId: 'p-1',
    })
    expect(res.valid).toBe(true)
  })

  it('rejects an expired claim', () => {
    const res = validateClaimForConfirmation({
      status: 'PENDING',
      expiresAt: past,
      offerPartnerId: 'p-1',
      merchantPartnerId: 'p-1',
    })
    expect(res.valid).toBe(false)
    expect(res.error).toBe('EXPIRED')
  })

  it('rejects an already confirmed claim', () => {
    const res = validateClaimForConfirmation({
      status: 'CONFIRMED',
      expiresAt: future,
      offerPartnerId: 'p-1',
      merchantPartnerId: 'p-1',
    })
    expect(res.valid).toBe(false)
    expect(res.error).toBe('ALREADY_USED')
  })

  it('rejects when scanned by a different partner', () => {
    const res = validateClaimForConfirmation({
      status: 'PENDING',
      expiresAt: future,
      offerPartnerId: 'p-1',
      merchantPartnerId: 'p-2',
    })
    expect(res.valid).toBe(false)
    expect(res.error).toBe('WRONG_PARTNER')
  })
})
