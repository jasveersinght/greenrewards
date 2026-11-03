/**
 * Claims Domain Logic — pure functions for QR claims, codes, and expiry.
 */

// Avoid ambiguous characters: 0/O, 1/I, 8/B
const SAFE_ALPHABET = '2345679ACDEFGHJKLMNPQRSTUVWXYZ'

/**
 * Generate a 6-character uppercase alphanumeric code.
 * Used as a human-readable fallback when QR scanner is unavailable.
 */
export function generateClaimCode(length = 6): string {
  let result = ''
  for (let i = 0; i < length; i++) {
    const randomIndex = Math.floor(Math.random() * SAFE_ALPHABET.length)
    result += SAFE_ALPHABET[randomIndex]
  }
  return result
}

/**
 * Return claim expiry date from now.
 * Default TTL is 120 seconds (2 minutes).
 */
export function claimExpiryDate(ttlSeconds = 120, now = Date.now()): Date {
  return new Date(now + ttlSeconds * 1000)
}

/**
 * Check if a claim has expired or is invalid.
 */
export function isClaimExpired(expiresAt: Date, now = Date.now()): boolean {
  return expiresAt.getTime() <= now
}

export interface ClaimValidationResult {
  valid: boolean
  error?: 'EXPIRED' | 'ALREADY_USED' | 'REJECTED' | 'NOT_PENDING' | 'WRONG_PARTNER'
}

/**
 * Validate if a claim can be confirmed by a merchant.
 */
export function validateClaimForConfirmation(params: {
  status: string
  expiresAt: Date
  offerPartnerId: string
  merchantPartnerId?: string | null
  now?: number
}): ClaimValidationResult {
  const { status, expiresAt, offerPartnerId, merchantPartnerId, now = Date.now() } = params

  if (status === 'CONFIRMED' || status === 'USED') {
    return { valid: false, error: 'ALREADY_USED' }
  }
  if (status === 'REJECTED') {
    return { valid: false, error: 'REJECTED' }
  }
  if (status !== 'PENDING') {
    return { valid: false, error: 'NOT_PENDING' }
  }
  if (isClaimExpired(expiresAt, now)) {
    return { valid: false, error: 'EXPIRED' }
  }
  if (merchantPartnerId && merchantPartnerId !== offerPartnerId) {
    return { valid: false, error: 'WRONG_PARTNER' }
  }

  return { valid: true }
}
