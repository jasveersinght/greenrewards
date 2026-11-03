import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/server/db'
import { getSession } from '@/server/session'

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const session = await getSession()

  const offer = await prisma.offer.findUnique({
    where: { id },
    include: {
      partner: {
        select: {
          id: true,
          name: true,
          type: true,
          isSimulated: true,
          location: true,
        },
      },
      campaign: {
        select: {
          id: true,
          name: true,
          section: true,
          status: true,
          startsAt: true,
          endsAt: true,
        },
      },
    },
  })

  if (!offer) {
    return NextResponse.json({ error: 'Offer not found' }, { status: 404 })
  }

  let stampCard = null
  if (session?.userId) {
    stampCard = await prisma.stampCard.findUnique({
      where: { userId_offerId: { userId: session.userId, offerId: offer.id } },
    })
  }

  return NextResponse.json({
    ...offer,
    myCard: stampCard,
  })
}
