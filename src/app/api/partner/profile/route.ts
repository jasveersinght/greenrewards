import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { getSession } from '@/server/session'
import { prisma } from '@/server/db'

const schema = z.object({
  name: z.string().min(2).optional(),
  registrationNo: z.string().optional(),
  address: z.string().optional(),
  phone: z.string().optional(),
  openingHours: z.string().optional(),
})

export async function GET() {
  const session = await getSession()
  if (!session || (!session.roles.includes('FOOD_PARTNER') && !session.roles.includes('ADMIN'))) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const partnerId = session.partnerIds[0]
  const partner = partnerId
    ? await prisma.partner.findUnique({ where: { id: partnerId } })
    : null

  return NextResponse.json({ partner })
}

export async function PUT(req: NextRequest) {
  const session = await getSession()
  if (!session || (!session.roles.includes('FOOD_PARTNER') && !session.roles.includes('ADMIN'))) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const partnerId = session.partnerIds[0]
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
      ...(parsed.data.registrationNo !== undefined ? { registrationNo: parsed.data.registrationNo } : {}),
      ...(parsed.data.address !== undefined ? { address: parsed.data.address } : {}),
      ...(parsed.data.phone !== undefined ? { phone: parsed.data.phone } : {}),
      ...(parsed.data.openingHours !== undefined ? { openingHours: parsed.data.openingHours } : {}),
    },
  })

  return NextResponse.json({ success: true, partner: updated })
}
