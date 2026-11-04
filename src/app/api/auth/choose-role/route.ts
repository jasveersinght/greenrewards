import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { getSession, switchSessionActiveRole, setSessionCookie } from '@/server/session'
import { signSessionJwt } from '@/server/sessionToken'
import { getUserWithRoles } from '@/server/services/authService'
import { normalizeRole, ROLE_HOME_PATHS, type AppRole } from '@/server/domain/roles'

const schema = z.object({
  role: z.string().min(1),
  remember: z.boolean().optional(),
})

export async function POST(req: NextRequest) {
  const session = await getSession()
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await req.json().catch(() => null)
  const parsed = schema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid input' }, { status: 400 })
  }

  const normalized = normalizeRole(parsed.data.role)

  // Re-issue updated session cookie so middleware and server components reflect active role immediately
  const userWithRoles = await getUserWithRoles(session.userId)
  const rawRoles = userWithRoles?.roleGrants.map(g => g.role) ?? []
  const isAdmin = rawRoles.includes('ADMIN') || session.isAdminStaff
  const roles = Array.from(
    new Set(isAdmin ? ['CITIZEN', 'SHOPKEEPER', 'PLUMBER', 'REVIEWER', 'FOOD_PARTNER', 'SPONSOR', 'ADMIN'] : rawRoles.map(normalizeRole).concat(['CITIZEN']))
  ) as AppRole[]
  let partnerIds = userWithRoles?.roleGrants.filter(g => g.partnerId).map(g => g.partnerId!) ?? []
  if (isAdmin && partnerIds.length === 0) {
    partnerIds = ['partner-quickfix', 'partner-freshmart', 'partner-greenhands', 'partner-ecobrand']
  }

  const newToken = await signSessionJwt({
    userId: session.userId,
    email: session.email,
    username: session.username,
    displayName: session.displayName,
    activeRole: normalized,
    roles,
    partnerIds,
  })

  // Switch role and update session token in database
  const result = await switchSessionActiveRole(session.userId, normalized, newToken)

  if (!result.success) {
    return NextResponse.json(
      { error: result.error || 'Role not granted' },
      { status: 403 }
    )
  }

  const redirectUrl = ROLE_HOME_PATHS[normalized] || '/home'
  const response = NextResponse.json({
    success: true,
    activeRole: normalized,
    redirectUrl,
  })

  setSessionCookie(response, newToken)

  if (parsed.data.remember) {
    response.cookies.set('gr_preferred_role', normalized, {
      path: '/',
      maxAge: 30 * 24 * 60 * 60, // 30 days
      sameSite: 'lax',
    })
  } else {
    response.cookies.delete('gr_preferred_role')
  }

  return response
}
