import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { verifyOtpCode, getUserWithRoles } from '@/server/services/authService'
import { createSession, setSessionCookie } from '@/server/session'
import { normalizeRole, ROLE_HOME_PATHS, type AppRole } from '@/server/domain/roles'
import { isStaffUsername } from '@/server/domain/username'

const schema = z.object({
  email: z.string().trim().min(3).max(100),
  code: z.string().length(6).regex(/^\d{6}$/),
  displayName: z.string().min(2).max(50).optional(),
  locality: z.string().min(2).max(50).optional(),
  preferredRole: z.string().optional(),
})

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null)
  const parsed = schema.safeParse(body)

  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid input', details: parsed.error.flatten() }, { status: 400 })
  }

  const { email, code, displayName, locality, preferredRole } = parsed.data
  const result = await verifyOtpCode(
    email,
    code,
    displayName ? { displayName, locality } : undefined
  )

  if (!result.success || !result.user) {
    const status = result.error === 'LOCKED' ? 429 : result.error === 'EXPIRED' ? 410 : 401
    return NextResponse.json({ error: result.error }, { status })
  }

  const userWithRoles = await getUserWithRoles(result.user.id)
  const rawRoles = userWithRoles?.roleGrants.map(g => g.role) ?? []
  const roles = Array.from(
    new Set(rawRoles.map(normalizeRole).concat(['CITIZEN']))
  ) as AppRole[]

  const partnerIds = userWithRoles?.roleGrants
    .filter(g => g.partnerId)
    .map(g => g.partnerId!) ?? []

  const isAdminStaff = isStaffUsername(result.user.username ?? '')
  const hasMultipleRoles = roles.length >= 2
  const needsChooseRole = (hasMultipleRoles || isAdminStaff) && Boolean(result.user.displayName)

  const redirectUrl = !result.user.displayName
    ? '/onboarding'
    : needsChooseRole
    ? '/choose-role'
    : ROLE_HOME_PATHS[roles[0] || 'CITIZEN']

  const token = await createSession(
    {
      id: result.user.id,
      email: result.user.email,
      username: result.user.username,
      displayName: result.user.displayName,
    },
    roles,
    partnerIds,
    preferredRole
  )

  const response = NextResponse.json({
    user: {
      id: result.user.id,
      email: result.user.email,
      username: result.user.username,
      displayName: result.user.displayName,
      city: result.user.city,
    },
    roles,
    needsOnboarding: !result.user.displayName,
    needsChooseRole,
    redirectUrl,
  })

  setSessionCookie(response, token)
  return response
}
