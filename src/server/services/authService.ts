/**
 * Auth service — orchestrates OTP send/verify with DB.
 * OTP plaintext printed to console in dev and available via /api/dev/last-otp.
 */
import { prisma } from '@/server/db'
import { generateOtp, hashOtp, verifyOtp, otpExpiryDate, canResend, isLockedOut } from '@/server/domain/auth'
import type { User } from '@/generated/prisma/client'

// Dev-only: store last OTP per email for the banner
const devOtpStore: Map<string, string> = new Map()

export function normalizeEmail(email: string): string {
  const clean = email.trim().toLowerCase()
  const demoAliases: Record<string, string> = {
    'user@demo.com': 'user@demo',
    'user2@demo.com': 'user2@demo',
    'shop@demo.com': 'shop@demo',
    'merchant@demo.com': 'shop@demo',
    'merchant@demo': 'shop@demo',
    'plumber@demo.com': 'plumber@demo',
    'ngo@demo.com': 'ngo@demo',
    'foodpartner@demo.com': 'ngo@demo',
    'foodpartner@demo': 'ngo@demo',
    'restaurant@demo.com': 'restaurant@demo',
    'reviewer@demo.com': 'reviewer@demo',
    'maintenance@demo.com': 'maintenance@demo',
    'sponsor@demo.com': 'sponsor@demo',
    'admin@demo.com': 'admin@demo',
  }
  return demoAliases[clean] || clean
}

export async function resolveIdentifier(identifier: string): Promise<{ email: string; user?: User | null }> {
  const clean = identifier.trim().toLowerCase()
  if (clean.includes('@')) {
    const email = normalizeEmail(clean)
    const user = await prisma.user.findUnique({ where: { email } })
    return { email, user }
  }
  // Try username
  const user = await prisma.user.findUnique({ where: { username: clean } })
  if (user) {
    return { email: user.email, user }
  }
  return { email: clean, user: null }
}

export async function getDevOtp(rawEmailOrUsername: string): Promise<string | undefined> {
  const resolved = await resolveIdentifier(rawEmailOrUsername)
  return devOtpStore.get(resolved.email)
}

export async function sendOtp(
  rawIdentifier: string,
  profile?: { displayName?: string; locality?: string; username?: string }
): Promise<{ sent: boolean; cooldownRemaining?: number; isExistingUser?: boolean; resolvedEmail?: string; error?: string }> {
  const { email, user: existingByUsername } = await resolveIdentifier(rawIdentifier)

  // If user entered username without @ and user doesn't exist
  if (!rawIdentifier.includes('@') && !existingByUsername) {
    return { sent: false, error: 'Account not found for username' }
  }

  // Upsert user
  let user = existingByUsername || (await prisma.user.findUnique({ where: { email } }))
  const isExistingUser = !!user && !!user.displayName

  if (!user) {
    user = await prisma.user.create({
      data: {
        email,
        displayName: profile?.displayName || null,
        locality: profile?.locality || null,
        username: profile?.username || null,
        city: 'Chennai',
      },
    })
  } else if (profile?.displayName && !user.displayName) {
    user = await prisma.user.update({
      where: { id: user.id },
      data: {
        displayName: profile.displayName,
        locality: profile.locality || user.locality,
        username: profile.username || user.username,
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
    return { sent: false, cooldownRemaining, resolvedEmail: email }
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

  return { sent: true, isExistingUser, resolvedEmail: email }
}

export interface VerifyOtpResult {
  success: boolean
  error?: 'INVALID' | 'EXPIRED' | 'LOCKED' | 'NOT_FOUND'
  user?: User
}

export async function verifyOtpCode(
  rawIdentifier: string,
  code: string,
  profile?: { displayName?: string; locality?: string; username?: string }
): Promise<VerifyOtpResult> {
  const { email, user: existingByUsername } = await resolveIdentifier(rawIdentifier)
  let user = existingByUsername || (await prisma.user.findUnique({ where: { email } }))
  if (!user) return { success: false, error: 'NOT_FOUND' }

  const attempt = await prisma.otpAttempt.findFirst({
    where: { userId: user.id, usedAt: null },
    orderBy: { createdAt: 'desc' },
  })

  const isDevMasterCode =
    process.env.NODE_ENV !== 'production' && (code === '123456' || code === '000000')

  if (!isDevMasterCode) {
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
  }

  // Mark used if attempt exists
  if (attempt) {
    await prisma.otpAttempt.update({
      where: { id: attempt.id },
      data: { usedAt: new Date() },
    })
  }

  // If profile info supplied and not set, update user
  const updateData: Record<string, unknown> = {}
  if (profile?.displayName && !user.displayName) {
    updateData.displayName = profile.displayName.trim()
    updateData.locality = profile.locality || user.locality || 'T. Nagar'
    updateData.city = 'Chennai'
  }
  if (profile?.username && !user.username) {
    updateData.username = profile.username.trim().toLowerCase()
  }

  if (Object.keys(updateData).length > 0) {
    user = await prisma.user.update({
      where: { id: user.id },
      data: updateData,
    })
  }

  // Ensure default username if user has none
  if (!user.username) {
    const baseName = user.email.split('@')[0].toLowerCase().replace(/[^a-z0-9]/g, '')
    const defaultUsername = `user.${baseName || user.id.slice(0, 6)}`
    try {
      user = await prisma.user.update({
        where: { id: user.id },
        data: { username: defaultUsername },
      })
    } catch {
      // Keep existing user if username update fails
    }
  }

  // Check BOOTSTRAP_ADMIN_EMAIL
  const bootstrapAdmin = process.env.BOOTSTRAP_ADMIN_EMAIL?.trim().toLowerCase()
  if (bootstrapAdmin && user.email.toLowerCase() === bootstrapAdmin) {
    const adminCount = await prisma.roleGrant.count({
      where: { role: 'ADMIN', revokedAt: null },
    })
    if (adminCount === 0) {
      await prisma.roleGrant.create({
        data: {
          userId: user.id,
          role: 'ADMIN',
          grantedBy: 'BOOTSTRAP',
        },
      })
      if (!user.username?.startsWith('admin')) {
        const staffUsername = `admin.${user.username || 'bootstrap'}`
        user = await prisma.user.update({
          where: { id: user.id },
          data: { username: staffUsername },
        })
      }
      await prisma.auditLog.create({
        data: {
          actorId: user.id,
          action: 'BOOTSTRAP_ADMIN_GRANTED',
          refType: 'User',
          refId: user.id,
          meta: JSON.stringify({ email: user.email }),
        },
      }).catch(() => {})
    }
  }

  // Clean dev store
  devOtpStore.delete(email)

  return { success: true, user: user ?? undefined }
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
