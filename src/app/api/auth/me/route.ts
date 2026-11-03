import { NextResponse } from 'next/server'
import { getSession } from '@/server/session'
import { prisma } from '@/server/db'

export async function GET() {
  const session = await getSession()
  if (!session) return NextResponse.json({ user: null })

  const user = await prisma.user.findUnique({
    where: { id: session.userId },
    select: {
      id: true,
      email: true,
      username: true,
      displayName: true,
      city: true,
      locality: true,
      roleGrants: {
        where: { revokedAt: null },
        include: { partner: true },
      },
    },
  })

  return NextResponse.json({
    user,
    activeRole: session.activeRole,
    roles: session.roles,
    partnerIds: session.partnerIds,
    isAdminStaff: session.isAdminStaff,
  })
}
