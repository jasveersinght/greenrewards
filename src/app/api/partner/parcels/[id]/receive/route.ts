import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { getSession } from '@/server/session'
import { prisma } from '@/server/db'
import { POINTS_CONFIG } from '@/server/domain/pointsConfig'
import { appendDoubleEntry } from '@/server/services/walletService'

const schema = z.object({
  decision: z.enum(['ACCEPT', 'REJECT']),
  reason: z.string().optional(),
})

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession()
  if (!session || (!session.roles.includes('FOOD_PARTNER') && !session.roles.includes('ADMIN'))) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { id } = await params
  const body = await req.json().catch(() => null)
  const parsed = schema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid input' }, { status: 400 })
  }

  const parcel = await prisma.donationParcel.findUnique({
    where: { id },
    include: {
      mission: {
        include: { volunteer: true },
      },
    },
  })

  if (!parcel) {
    return NextResponse.json({ error: 'Donation parcel not found' }, { status: 404 })
  }

  const { decision, reason } = parsed.data

  if (decision === 'ACCEPT') {
    const updated = await prisma.donationParcel.update({
      where: { id },
      data: {
        status: 'ACCEPTED',
        updatedAt: new Date(),
      },
    })

    // Award volunteer delivery points (15 GP)
    if (parcel.mission?.volunteerId) {
      const volunteerId = parcel.mission.volunteerId
      const points = POINTS_CONFIG.EARNING.FOOD_PICKUP_COMPLETED // 15 points
      const availableAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)

      await appendDoubleEntry(prisma, {
        debitAccount: 'SPONSOR_POOL',
        creditAccount: 'USER_PENDING',
        amountPoints: points,
        userId: volunteerId,
        type: 'EARN',
        refType: 'DonationParcel',
        refId: parcel.id,
        availableAt,
        note: 'Volunteer surplus food parcel delivery verified',
      })

      await prisma.notification.create({
        data: {
          userId: volunteerId,
          title: 'Food Parcel Delivery Verified!',
          body: `The NGO confirmed safe arrival of the surplus food parcel. +${points} Green Points credited to your pending balance!`,
        },
      })
    }

    return NextResponse.json({ success: true, parcel: updated })
  } else {
    // REJECT
    const updated = await prisma.donationParcel.update({
      where: { id },
      data: {
        status: 'REJECTED',
        rejectionReason: reason || 'Food did not meet safety / temperature standards upon arrival',
        updatedAt: new Date(),
      },
    })

    return NextResponse.json({ success: true, parcel: updated })
  }
}
