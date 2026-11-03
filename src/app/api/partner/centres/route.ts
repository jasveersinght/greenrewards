import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { getSession } from '@/server/session'
import { prisma } from '@/server/db'

const createCentreSchema = z.object({
  name: z.string().min(2).max(100),
  address: z.string().min(5).max(200),
  locality: z.string().min(2).max(100),
  openHours: z.string().optional(),
  contactPhone: z.string().optional(),
})

export async function GET() {
  const session = await getSession()
  if (!session || (!session.roles.includes('FOOD_PARTNER') && !session.roles.includes('ADMIN'))) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const partnerId = session.partnerIds[0]
  const centres = await prisma.collectionCentre.findMany({
    where: partnerId ? { partnerId } : {},
    orderBy: { createdAt: 'desc' },
  })

  return NextResponse.json({ centres })
}

export async function POST(req: NextRequest) {
  const session = await getSession()
  if (!session || (!session.roles.includes('FOOD_PARTNER') && !session.roles.includes('ADMIN'))) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const partnerId = session.partnerIds[0]
  if (!partnerId) {
    return NextResponse.json({ error: 'No partner profile linked' }, { status: 400 })
  }

  const body = await req.json().catch(() => null)
  const parsed = createCentreSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid input' }, { status: 400 })
  }

  const centre = await prisma.collectionCentre.create({
    data: {
      partnerId,
      name: parsed.data.name,
      address: parsed.data.address,
      locality: parsed.data.locality,
      openHours: parsed.data.openHours || '9:00 AM – 7:00 PM',
      contactPhone: parsed.data.contactPhone || null,
      active: true,
    },
  })

  return NextResponse.json({ success: true, centre })
}
