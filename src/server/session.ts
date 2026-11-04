import { cookies } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/server/db'
import { normalizeRole, type AppRole } from '@/server/domain/roles'
import { isStaffUsername } from '@/server/domain/username'
import {
  signSessionJwt,
  verifySessionJwt,
  COOKIE_NAME,
  MAX_AGE,
  getTokenFromRequest,
  type EdgeSessionPayload,
} from '@/server/sessionToken'

export type { EdgeSessionPayload as SessionPayload }
export { COOKIE_NAME, MAX_AGE, getTokenFromRequest }

/**
 * Creates a server-side DB session row and returns a secure token for the cookie.
 */
export async function createSession(
  user: {
    id: string
    email: string
    username?: string | null
    displayName?: string | null
  },
  roles: string[],
  partnerIds: string[] = [],
  preferredRole?: string
): Promise<string> {
  const isAdmin =
    roles.includes('ADMIN') || isStaffUsername(user.username ?? '')

  const normalizedRoles = Array.from(
    new Set(
      isAdmin
        ? (['CITIZEN', 'SHOPKEEPER', 'PLUMBER', 'REVIEWER', 'FOOD_PARTNER', 'SPONSOR', 'ADMIN'] as AppRole[])
        : roles.map(normalizeRole).concat(['CITIZEN'])
    )
  ) as AppRole[]

  // Pick initial active role
  let initialRole: AppRole = 'CITIZEN'
  if (preferredRole && normalizedRoles.includes(normalizeRole(preferredRole))) {
    initialRole = normalizeRole(preferredRole)
  } else if (normalizedRoles.length === 1 && !isStaffUsername(user.username ?? '')) {
    initialRole = normalizedRoles[0]
  }

  let effectivePartnerIds = partnerIds
  if (isAdmin && effectivePartnerIds.length === 0) {
    effectivePartnerIds = ['partner-quickfix', 'partner-freshmart', 'partner-greenhands', 'partner-ecobrand']
  }

  const token = await signSessionJwt({
    userId: user.id,
    email: user.email,
    username: user.username,
    displayName: user.displayName,
    activeRole: initialRole,
    roles: normalizedRoles,
    partnerIds: effectivePartnerIds,
  })

  const expiresAt = new Date(Date.now() + MAX_AGE * 1000)

  // Persist session row in database
  await prisma.session.create({
    data: {
      userId: user.id,
      token,
      activeRole: initialRole,
      expiresAt,
    },
  })

  return token
}

/**
 * Verifies token and resolves the server-side session row.
 * Re-validates activeRole against live DB role grants; falls back to CITIZEN if revoked.
 */
export async function verifySession(token: string): Promise<EdgeSessionPayload | null> {
  try {
    const edgeSession = await verifySessionJwt(token)
    if (!edgeSession) return null

    let dbSession = await prisma.session.findUnique({
      where: { token },
    })

    // If not found by exact token (e.g. JWT re-issued or refreshed), find active session for user and sync token
    if (!dbSession) {
      dbSession = await prisma.session.findFirst({
        where: { userId: edgeSession.userId, expiresAt: { gt: new Date() } },
        orderBy: { createdAt: 'desc' },
      })
      if (dbSession) {
        await prisma.session.update({
          where: { id: dbSession.id },
          data: { token },
        }).catch(() => {})
      } else {
        // Self-heal: JWT is cryptographically valid, restore DB session row
        dbSession = await prisma.session.create({
          data: {
            userId: edgeSession.userId,
            token,
            activeRole: edgeSession.activeRole,
            expiresAt: new Date(Date.now() + MAX_AGE * 1000),
          },
        }).catch(() => null)
      }
    }

    if (!dbSession || dbSession.expiresAt < new Date()) {
      return null
    }

    const user = await prisma.user.findUnique({
      where: { id: edgeSession.userId },
      include: {
        roleGrants: {
          where: { revokedAt: null },
          select: { role: true, partnerId: true },
        },
      },
    })

    if (!user || user.isSuspended) return null

    const isAdmin =
      user.roleGrants.some(g => normalizeRole(g.role) === 'ADMIN') ||
      isStaffUsername(user.username ?? '')

    const validRoles = Array.from(
      new Set(
        isAdmin
          ? (['CITIZEN', 'SHOPKEEPER', 'PLUMBER', 'REVIEWER', 'FOOD_PARTNER', 'SPONSOR', 'ADMIN'] as AppRole[])
          : user.roleGrants.map(g => normalizeRole(g.role)).concat(['CITIZEN'])
      )
    ) as AppRole[]

    let partnerIds = user.roleGrants
      .map(g => g.partnerId)
      .filter((id): id is string => Boolean(id))

    if (isAdmin && partnerIds.length === 0) {
      partnerIds = ['partner-quickfix', 'partner-freshmart', 'partner-greenhands', 'partner-ecobrand']
    }

    // Re-check activeRole: if grant was revoked, fall back to CITIZEN immediately
    let effectiveActiveRole = normalizeRole(dbSession.activeRole)
    if (!validRoles.includes(effectiveActiveRole)) {
      effectiveActiveRole = 'CITIZEN'
      // Persist fallback to DB session
      await prisma.session.update({
        where: { id: dbSession.id },
        data: { activeRole: 'CITIZEN' },
      }).catch(() => {})
    }

    const isAdminStaff = isStaffUsername(user.username ?? '') || isAdmin

    return {
      userId: user.id,
      email: user.email,
      username: user.username,
      displayName: user.displayName,
      activeRole: effectiveActiveRole,
      roles: validRoles,
      partnerIds,
      isAdminStaff,
    }
  } catch {
    return null
  }
}

/**
 * Retrieves the current session from request cookies.
 */
export async function getSession(): Promise<EdgeSessionPayload | null> {
  const cookieStore = await cookies()
  const token = cookieStore.get(COOKIE_NAME)?.value
  if (!token) return null
  return verifySession(token)
}

/**
 * Switches the active role in the server-side session.
 * Rejects if user does not hold the grant (Admins have universal portal access).
 */
export async function switchSessionActiveRole(
  userId: string,
  targetRole: string,
  newToken?: string
): Promise<{ success: boolean; activeRole?: AppRole; error?: string }> {
  const normalized = normalizeRole(targetRole)

  // Query user's current valid grants
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      roleGrants: {
        where: { revokedAt: null },
        select: { role: true },
      },
    },
  })

  if (!user) return { success: false, error: 'USER_NOT_FOUND' }

  const isAdmin =
    user.roleGrants.some(g => normalizeRole(g.role) === 'ADMIN') ||
    isStaffUsername(user.username ?? '')

  const validRoles = Array.from(
    new Set(
      isAdmin
        ? (['CITIZEN', 'SHOPKEEPER', 'PLUMBER', 'REVIEWER', 'FOOD_PARTNER', 'SPONSOR', 'ADMIN'] as AppRole[])
        : user.roleGrants.map(g => normalizeRole(g.role)).concat(['CITIZEN'])
    )
  ) as AppRole[]

  if (!validRoles.includes(normalized)) {
    return { success: false, error: 'ROLE_NOT_GRANTED' }
  }

  // Update most recent active session for this user
  const latestSession = await prisma.session.findFirst({
    where: { userId, expiresAt: { gt: new Date() } },
    orderBy: { createdAt: 'desc' },
  })

  if (latestSession) {
    await prisma.session.update({
      where: { id: latestSession.id },
      data: {
        activeRole: normalized,
        ...(newToken ? { token: newToken } : {}),
      },
    })
  } else if (newToken) {
    await prisma.session.create({
      data: {
        userId,
        token: newToken,
        activeRole: normalized,
        expiresAt: new Date(Date.now() + MAX_AGE * 1000),
      },
    })
  }

  return { success: true, activeRole: normalized }
}

export function setSessionCookie(response: NextResponse, token: string): void {
  response.cookies.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: MAX_AGE,
    path: '/',
  })
}

export function clearSessionCookie(response: NextResponse): void {
  response.cookies.delete(COOKIE_NAME)
}
