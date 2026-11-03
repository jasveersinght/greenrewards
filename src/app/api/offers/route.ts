import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/server/db'
import { getSession } from '@/server/session'

export async function GET(req: NextRequest) {
  const session = await getSession()
  const url = new URL(req.url)
  const partnerId = url.searchParams.get('partnerId')
  const campaignId = url.searchParams.get('campaignId')

  const offers = await prisma.offer.findMany({
    where: {
      active: true,
      partnerId: partnerId ?? undefined,
      campaignId: campaignId ?? undefined,
      campaign: { status: 'ACTIVE' },
    },
    include: {
      partner: { select: { id: true, name: true, type: true, isSimulated: true } },
      campaign: { select: { id: true, name: true, section: true } },
    },
    orderBy: { createdAt: 'desc' },
  })

  // If authenticated, attach user's current stamp count for each offer
  let userStampsMap: Record<string, number> = {}
  if (session?.userId) {
    const userCards = await prisma.stampCard.findMany({
      where: { userId: session.userId },
      select: { offerId: true, stamps: true },
    })
    userStampsMap = Object.fromEntries(userCards.map(c => [c.offerId, c.stamps]))
  }

  const result = offers.map(o => ({
    id: o.id,
    name: o.name,
    description: o.description,
    rewardText: o.rewardText,
    conditions: o.conditions,
    stampsNeeded: o.stampsNeeded,
    voucherValuePaise: o.voucherValuePaise,
    partner: o.partner,
    campaign: o.campaign,
    myStamps: userStampsMap[o.id] ?? 0,
  }))

  return NextResponse.json(result)
}
