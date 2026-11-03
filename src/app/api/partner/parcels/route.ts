import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/server/session'
import { prisma } from '@/server/db'

export async function GET() {
  const session = await getSession()
  if (!session || (!session.roles.includes('FOOD_PARTNER') && !session.roles.includes('ADMIN'))) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const partnerId = session.partnerIds[0]

  // Donations waiting & parcels arriving
  const parcels = await prisma.donationParcel.findMany({
    where: partnerId ? { partnerId } : {},
    include: {
      listing: {
        include: {
          partner: { select: { name: true, locality: true, phone: true } },
        },
      },
      mission: {
        include: {
          volunteer: { select: { displayName: true, email: true } },
        },
      },
    },
    orderBy: { createdAt: 'desc' },
  })

  return NextResponse.json({ parcels })
}
