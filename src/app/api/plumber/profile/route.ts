import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { getSession } from '@/server/session'
import { prisma } from '@/server/db'

const schema = z.object({
  name: z.string().min(2).optional(),
  serviceArea: z.string().optional(),
  phone: z.string().optional(),
  discountOffer: z.string().optional(),
})

export async function GET() {
  const session = await getSession()
  if (!session || (!session.roles.includes('PLUMBER') && !session.roles.includes('ADMIN'))) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const partner = await prisma.partner.findFirst({
    where: {
      id: { in: session.partnerIds },
      type: 'PLUMBER',
    },
  }) || await prisma.partner.findFirst({
    where: { type: 'PLUMBER' },
  })

  return NextResponse.json({ partner })
}

export async function PUT(req: NextRequest) {
  const session = await getSession()
  if (!session || (!session.roles.includes('PLUMBER') && !session.roles.includes('ADMIN'))) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const partner = await prisma.partner.findFirst({
    where: {
      id: { in: session.partnerIds },
      type: 'PLUMBER',
    },
  }) || await prisma.partner.findFirst({
    where: { type: 'PLUMBER' },
  })
  const partnerId = partner?.id
  if (!partnerId) {
    return NextResponse.json({ error: 'No partner profile linked' }, { status: 400 })
  }

  const body = await req.json().catch(() => null)
  const parsed = schema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid input' }, { status: 400 })
  }

  const updated = await prisma.partner.update({
    where: { id: partnerId },
    data: {
      ...(parsed.data.name ? { name: parsed.data.name } : {}),
      ...(parsed.data.serviceArea !== undefined ? { serviceArea: parsed.data.serviceArea } : {}),
      ...(parsed.data.phone !== undefined ? { phone: parsed.data.phone } : {}),
      ...(parsed.data.discountOffer !== undefined ? { discountOffer: parsed.data.discountOffer } : {}),
    },
  })

  return NextResponse.json({ success: true, partner: updated })
}
