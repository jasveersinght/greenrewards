import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/server/db'
import { getUserWithRoles, normalizeEmail } from '@/server/services/authService'
import { createSession, setSessionCookie } from '@/server/session'
import { normalizeRole, ROLE_HOME_PATHS, type AppRole } from '@/server/domain/roles'
import { isStaffUsername } from '@/server/domain/username'

const schema = z.object({
  role: z.enum(['CITIZEN', 'SHOPKEEPER', 'MERCHANT', 'PLUMBER', 'REVIEWER', 'FOOD_PARTNER', 'SPONSOR', 'ADMIN']).optional(),
  email: z.string().optional(),
})

const ROLE_TO_EMAIL: Record<string, string> = {
  CITIZEN: 'user@demo',
  SHOPKEEPER: 'shop@demo',
  MERCHANT: 'shop@demo',
  PLUMBER: 'plumber@demo',
  FOOD_PARTNER: 'ngo@demo',
  REVIEWER: 'reviewer@demo',
  SPONSOR: 'sponsor@demo',
  ADMIN: 'admin@demo',
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}))
  const parsed = schema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid input' }, { status: 400 })
  }

  let targetEmail = parsed.data.email
    ? normalizeEmail(parsed.data.email)
    : parsed.data.role
    ? ROLE_TO_EMAIL[parsed.data.role]
    : 'user@demo'

  let user = await prisma.user.findUnique({
    where: { email: targetEmail },
  })

  // Fallback: search by prefix
  if (!user && parsed.data.role) {
    const fallbackPrefix = parsed.data.role.toLowerCase()
    user = await prisma.user.findFirst({
      where: {
        email: { startsWith: fallbackPrefix === 'citizen' ? 'user' : fallbackPrefix === 'shopkeeper' ? 'shop' : fallbackPrefix },
      },
    })
  }

  if (!user) {
    user = await prisma.user.findFirst()
  }

  if (!user) {
    return NextResponse.json({ error: 'Demo user not found. Please run seed.' }, { status: 404 })
  }

  const userWithRoles = await getUserWithRoles(user.id)
  const rawRoles = userWithRoles?.roleGrants.map(g => g.role) ?? []
  const roles = Array.from(
    new Set(rawRoles.map(normalizeRole).concat(['CITIZEN']))
  ) as AppRole[]

  const partnerIds = userWithRoles?.roleGrants
    .filter(g => g.partnerId)
    .map(g => g.partnerId!) ?? []

  const requestedRole = parsed.data.role ? normalizeRole(parsed.data.role) : undefined
  const isAdminStaff = isStaffUsername(user.username ?? '')

  // If user has 2+ roles or is staff and didn't explicitly pick a role from quick login button, route to /choose-role
  const redirectUrl = requestedRole && roles.includes(requestedRole)
    ? ROLE_HOME_PATHS[requestedRole]
    : roles.length >= 2 || isAdminStaff
    ? '/choose-role'
    : ROLE_HOME_PATHS[roles[0] || 'CITIZEN']

  const activeRole = requestedRole && roles.includes(requestedRole)
    ? requestedRole
    : roles.length === 1 && !isAdminStaff
    ? roles[0]
    : 'CITIZEN'

  const token = await createSession(
    {
      id: user.id,
      email: user.email,
      username: user.username,
      displayName: user.displayName,
    },
    roles,
    partnerIds,
    activeRole
  )

  const res = NextResponse.json({
    success: true,
    user: {
      userId: user.id,
      email: user.email,
      username: user.username,
      displayName: user.displayName,
      activeRole,
      roles,
      partnerIds,
    },
    redirectUrl,
  })

  setSessionCookie(res, token)
  return res
}
