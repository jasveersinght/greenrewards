import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/server/db'
import { getSession } from '@/server/session'

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const session = await getSession()

  if (!session?.userId) {
    return NextResponse.json({ reminded: false })
  }

  const reminder = await prisma.reminder.findUnique({
    where: {
      userId_campaignId: {
        userId: session.userId,
        campaignId: id,
      },
    },
  })

  return NextResponse.json({ reminded: !!reminder })
}

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const session = await getSession()

  if (!session?.userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const campaign = await prisma.campaign.findUnique({
    where: { id },
  })

  if (!campaign) {
    return NextResponse.json({ error: 'Campaign not found' }, { status: 404 })
  }

  // Toggle reminder
  const existing = await prisma.reminder.findUnique({
    where: {
      userId_campaignId: {
        userId: session.userId,
        campaignId: id,
      },
    },
  })

  if (existing) {
    await prisma.reminder.delete({
      where: { id: existing.id },
    })
    return NextResponse.json({
      reminded: false,
      message: `Reminder removed for ${campaign.name}.`,
    })
  } else {
    await prisma.reminder.create({
      data: {
        userId: session.userId,
        campaignId: id,
        triggerAt: campaign.startsAt,
      },
    })
    return NextResponse.json({
      reminded: true,
      message: `🔔 Reminder set! We will notify you when ${campaign.name} launches.`,
    })
  }
}
