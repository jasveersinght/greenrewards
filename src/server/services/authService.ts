/**
 * Auth service — orchestrates OTP send/verify with DB.
 * OTP plaintext printed to console in dev and available via /api/dev/last-otp.
 */
import { prisma } from '@/server/db'
import { generateOtp, hashOtp, verifyOtp, otpExpiryDate, canResend, isLockedOut } from '@/server/domain/auth'
import type { User } from '@/generated/prisma'

// Dev-only: store last OTP per email for the banner
const devOtpStore: Map<string, string> = new Map()

export function normalizeEmail(email: string): string {
  const clean = email.trim().toLowerCase()
  const demoAliases: Record<string, string> = {
    'user@demo.com': 'user@demo',
    'user2@demo.com': 'user2@demo',
    'merchant@demo.com': 'merchant@demo',
    'restaurant@demo.com': 'restaurant@demo',
    'reviewer@demo.com': 'reviewer@demo',
    'maintenance@demo.com': 'maintenance@demo',
    'foodpartner@demo.com': 'foodpartner@demo',
    'sponsor@demo.com': 'sponsor@demo',
    'admin@demo.com': 'admin@demo',
  }
  return demoAliases[clean] || clean
}

export async function getDevOtp(rawEmail: string): Promise<string | undefined> {
  const email = normalizeEmail(rawEmail)
  return devOtpStore.get(email)
}

export async function sendOtp(
  rawEmail: string,
  profile?: { displayName?: string; locality?: string }
): Promise<{ sent: boolean; cooldownRemaining?: number; isExistingUser?: boolean }> {
  const email = normalizeEmail(rawEmail)
  // Upsert user
  let user = await prisma.user.findUnique({ where: { email } })
  const isExistingUser = !!user && !!user.displayName

  if (!user) {
    user = await prisma.user.create({
      data: {
        email,
        displayName: profile?.displayName || null,
        locality: profile?.locality || null,
        city: 'Chennai',
      },
    })
  } else if (profile?.displayName && !user.displayName) {
    user = await prisma.user.update({
      where: { id: user.id },
      data: {
        displayName: profile.displayName,
        locality: profile.locality || user.locality,
      },
    })
  }

  // Check most recent OTP for cooldown
  const lastOtp = await prisma.otpAttempt.findFirst({
    where: { userId: user.id },
    orderBy: { createdAt: 'desc' },
  })

  if (lastOtp && !canResend(lastOtp.createdAt)) {
    const cooldownRemaining = Math.ceil(
      (60000 - (Date.now() - lastOtp.createdAt.getTime())) / 1000
    )
    return { sent: false, cooldownRemaining }
  }

  const otp = generateOtp()
  const codeHash = await hashOtp(otp)

  await prisma.otpAttempt.create({
    data: {
      userId: user.id,
      codeHash,
      expiresAt: otpExpiryDate(),
    },
  })

  // Dev: print to console and store for banner
  if (process.env.NODE_ENV !== 'production') {
    console.log(`\n🔑 [DEV OTP] ${email}: ${otp}\n`)
    devOtpStore.set(email, otp)
  }

  // TODO: send real email via SMTP when configured
  return { sent: true, isExistingUser }
}

export interface VerifyOtpResult {
  success: boolean
  error?: 'INVALID' | 'EXPIRED' | 'LOCKED' | 'NOT_FOUND'
  user?: User
}

export async function verifyOtpCode(
  rawEmail: string,
  code: string,
  profile?: { displayName?: string; locality?: string }
): Promise<VerifyOtpResult> {
  const email = normalizeEmail(rawEmail)
  let user = await prisma.user.findUnique({ where: { email } })
  if (!user) return { success: false, error: 'NOT_FOUND' }

  const attempt = await prisma.otpAttempt.findFirst({
    where: { userId: user.id, usedAt: null },
    orderBy: { createdAt: 'desc' },
  })

  if (!attempt) return { success: false, error: 'NOT_FOUND' }
  if (isLockedOut(attempt.attempts)) return { success: false, error: 'LOCKED' }
  if (attempt.expiresAt < new Date()) return { success: false, error: 'EXPIRED' }

  const valid = await verifyOtp(code, attempt.codeHash)
  if (!valid) {
    const nextAttempts = attempt.attempts + 1
    const isNowLocked = nextAttempts >= 5
    await prisma.otpAttempt.update({
      where: { id: attempt.id },
      data: {
        attempts: nextAttempts,
        ...(isNowLocked ? { usedAt: new Date() } : {}),
      },
    })
    return { success: false, error: isNowLocked ? 'LOCKED' : 'INVALID' }
  }

  // Mark used
  await prisma.otpAttempt.update({
    where: { id: attempt.id },
    data: { usedAt: new Date() },
  })

  // If profile info supplied and not set, update user
  if (profile?.displayName && !user.displayName) {
    user = await prisma.user.update({
      where: { id: user.id },
      data: {
        displayName: profile.displayName.trim(),
        locality: profile.locality || user.locality || 'T. Nagar',
        city: 'Chennai',
      },
    })
  }

  // Clean dev store
  devOtpStore.delete(email)

  return { success: true, user }
}

export async function getUserWithRoles(userId: string) {
  return prisma.user.findUnique({
    where: { id: userId },
    include: {
      roleGrants: {
        where: { revokedAt: null },
        include: { partner: true },
      },
    },
  })
}
