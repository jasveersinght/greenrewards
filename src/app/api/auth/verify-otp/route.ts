import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { verifyOtpCode, getUserWithRoles } from '@/server/services/authService'
import { createSession, setSessionCookie } from '@/server/session'
import type { SessionPayload } from '@/server/session'

const schema = z.object({
  email: z.string().trim().toLowerCase().refine(
    e => /^[^\s@]+@[^\s@]+$/.test(e),
    { message: 'Invalid email address' }
  ),
  code: z.string().length(6).regex(/^\d{6}$/),
  displayName: z.string().min(2).max(50).optional(),
  locality: z.string().min(2).max(50).optional(),
})

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null)
  const parsed = schema.safeParse(body)

  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid input', details: parsed.error.flatten() }, { status: 400 })
  }

  const { email, code, displayName, locality } = parsed.data
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
  const roles = userWithRoles?.roleGrants.map(g => g.role) ?? ['USER']
  const partnerIds = userWithRoles?.roleGrants
    .filter(g => g.partnerId)
    .map(g => g.partnerId!) ?? []

  // Ensure USER role is always present
  if (!roles.includes('USER')) roles.unshift('USER')

  const payload: SessionPayload = {
    userId: result.user.id,
    email: result.user.email,
    displayName: result.user.displayName,
    roles: roles as string[],
    partnerIds,
  }

  const token = await createSession(payload)
  const response = NextResponse.json({
    user: {
      id: result.user.id,
      email: result.user.email,
      displayName: result.user.displayName,
      city: result.user.city,
    },
    roles,
    needsOnboarding: !result.user.displayName,
  })

  setSessionCookie(response, token)
  return response
}
