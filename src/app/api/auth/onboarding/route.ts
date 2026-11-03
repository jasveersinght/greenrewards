import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/server/db'
import { getSession } from '@/server/session'
import { createSession, setSessionCookie } from '@/server/session'
import type { SessionPayload } from '@/server/session'

const schema = z.object({
  displayName: z.string().min(2).max(50).trim(),
  city: z.string().min(2).max(100).trim(),
  locality: z.string().min(2).max(100).trim().optional(),
})

export async function POST(req: NextRequest) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json().catch(() => null)
  const parsed = schema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid input', details: parsed.error.flatten() }, { status: 400 })
  }

  const user = await prisma.user.update({
    where: { id: session.userId },
    data: {
      displayName: parsed.data.displayName,
      city: parsed.data.city,
      locality: parsed.data.locality,
    },
  })

  // Ensure CITIZEN role grant exists
  const existingGrant = await prisma.roleGrant.findFirst({
    where: { userId: user.id, role: 'CITIZEN', partnerId: null },
  })
  if (!existingGrant) {
    await prisma.roleGrant.create({
      data: { userId: user.id, role: 'CITIZEN', grantedBy: 'system' },
    })
  }

  // Re-issue session with displayName
  const token = await createSession(
    {
      id: user.id,
      email: user.email,
      username: user.username,
      displayName: user.displayName,
    },
    session.roles,
    session.partnerIds,
    session.activeRole
  )

  const response = NextResponse.json({ user })
  setSessionCookie(response, token)
  return response
}
