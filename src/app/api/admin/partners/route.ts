import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/server/db'
import { getSession } from '@/server/session'

// GET /api/admin/partners — list all partners (admin only)
export async function GET(req: NextRequest) {
  const session = await getSession()
  if (!session?.roles.includes('ADMIN')) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const partners = await prisma.partner.findMany({
    include: { location: true },
    orderBy: { createdAt: 'desc' },
  })

  return NextResponse.json(partners)
}
