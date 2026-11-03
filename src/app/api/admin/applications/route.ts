import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/server/session'
import { prisma } from '@/server/db'

export async function GET(req: NextRequest) {
  const session = await getSession()
  if (!session || !session.roles.includes('ADMIN')) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { searchParams } = new URL(req.url)
  const status = searchParams.get('status')
  const role = searchParams.get('role')

  const where: Record<string, unknown> = {}
  if (status && status !== 'ALL') where.status = status
  if (role && role !== 'ALL') where.role = role

  const applications = await prisma.roleApplication.findMany({
    where,
    include: {
      user: {
        select: {
          id: true,
          email: true,
          username: true,
          displayName: true,
          locality: true,
        },
      },
      decidedByUser: {
        select: {
          id: true,
          displayName: true,
          username: true,
        },
      },
    },
    orderBy: { createdAt: 'desc' },
  })

  return NextResponse.json({ applications })
}
