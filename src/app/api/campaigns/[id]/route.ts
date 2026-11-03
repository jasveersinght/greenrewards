import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/server/db'
import { getSession } from '@/server/session'

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const campaign = await prisma.campaign.findUnique({
    where: { id },
    include: {
      funder: { select: { name: true, type: true, isSimulated: true } },
      budget: true,
      offers: true,
    },
  })
  if (!campaign) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  return NextResponse.json({
    ...campaign,
    budget: campaign.budget
      ? {
          totalPaise: campaign.budget.totalPaise.toString(),
          reservedPaise: campaign.budget.reservedPaise.toString(),
          spentPaise: campaign.budget.spentPaise.toString(),
        }
      : null,
  })
}
