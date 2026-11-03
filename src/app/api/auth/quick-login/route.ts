import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/server/db'
import { getUserWithRoles, normalizeEmail } from '@/server/services/authService'
import { createSession, setSessionCookie, type SessionPayload } from '@/server/session'

const schema = z.object({
  role: z.enum(['CITIZEN', 'USER', 'MERCHANT', 'REVIEWER', 'SPONSOR', 'ADMIN']).optional(),
  email: z.string().optional(),
})

const ROLE_TO_EMAIL: Record<string, string> = {
  CITIZEN: 'user@demo',
  USER: 'user@demo',
  MERCHANT: 'merchant@demo',
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

  // Fallback: if not found by exact email, try finding user whose email starts with the role prefix
  if (!user && parsed.data.role) {
    const fallbackPrefix = parsed.data.role.toLowerCase()
    user = await prisma.user.findFirst({
      where: {
        email: { startsWith: fallbackPrefix === 'citizen' ? 'user' : fallbackPrefix },
      },
    })
  }

  if (!user) {
    // If still not found, fallback to any first user
    user = await prisma.user.findFirst()
  }

  if (!user) {
    return NextResponse.json({ error: 'Demo user not found. Please run seed.' }, { status: 404 })
  }

  const userWithRoles = await getUserWithRoles(user.id)
  const roles = userWithRoles?.roleGrants.map(g => g.role) ?? ['USER']
  const partnerIds = userWithRoles?.roleGrants
    .filter(g => g.partnerId)
    .map(g => g.partnerId!) ?? []

  if (!roles.includes('USER')) roles.unshift('USER')

  const payload: SessionPayload = {
    userId: user.id,
    email: user.email,
    displayName: user.displayName,
    roles: roles as string[],
    partnerIds,
  }

  const token = await createSession(payload)

  const redirectUrl = roles.includes('ADMIN') && parsed.data.role === 'ADMIN'
    ? '/admin'
    : roles.includes('MERCHANT') && parsed.data.role === 'MERCHANT'
    ? '/merchant'
    : roles.includes('REVIEWER') && parsed.data.role === 'REVIEWER'
    ? '/reviewer'
    : roles.includes('SPONSOR') && parsed.data.role === 'SPONSOR'
    ? '/sponsor'
    : '/home'

  const res = NextResponse.json({
    success: true,
    user: payload,
    redirectUrl,
  })

  setSessionCookie(res, token)
  return res
}
