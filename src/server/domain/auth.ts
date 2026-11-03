import crypto from 'crypto'
import bcrypt from 'bcryptjs'

const OTP_EXPIRY = parseInt(process.env.OTP_EXPIRY_SECONDS ?? '600', 10) * 1000
const MAX_ATTEMPTS = parseInt(process.env.OTP_MAX_ATTEMPTS ?? '5', 10)
const RESEND_COOLDOWN = parseInt(process.env.OTP_RESEND_COOLDOWN_SECONDS ?? '60', 10) * 1000

/** Generate a 6-digit OTP string */
export function generateOtp(): string {
  return String(crypto.randomInt(100000, 999999))
}

/** Hash OTP with bcrypt (2^10 rounds; fast enough for 6 digits) */
export async function hashOtp(otp: string): Promise<string> {
  return bcrypt.hash(otp, 10)
}

/** Compare OTP against stored hash */
export async function verifyOtp(otp: string, hash: string): Promise<boolean> {
  return bcrypt.compare(otp, hash)
}

/** Returns expiry Date from now */
export function otpExpiryDate(): Date {
  return new Date(Date.now() + OTP_EXPIRY)
}

/** Check if a new OTP can be sent (resend cooldown) */
export function canResend(lastCreatedAt: Date): boolean {
  return Date.now() - lastCreatedAt.getTime() >= RESEND_COOLDOWN
}

/** Check if attempt count has hit the limit */
export function isLockedOut(attempts: number): boolean {
  return attempts >= MAX_ATTEMPTS
}

export { MAX_ATTEMPTS, OTP_EXPIRY, RESEND_COOLDOWN }
