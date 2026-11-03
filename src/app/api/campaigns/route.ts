import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/server/db'
import { getSession } from '@/server/session'

export async function GET(req: NextRequest) {
  const url = new URL(req.url)
  const section = url.searchParams.get('section')
  const status = url.searchParams.get('status')

  const campaigns = await prisma.campaign.findMany({
    where: {
      status: status ? (status as any) : { in: ['ACTIVE', 'COMING_SOON'] },
      section: section ? (section as any) : undefined,
    },
    include: {
      funder: { select: { name: true, type: true, isSimulated: true } },
      budget: true,
    },
    orderBy: { startsAt: 'asc' },
  })

  return NextResponse.json(
    campaigns.map(c => ({
      ...c,
      budget: c.budget
        ? {
            totalPaise: c.budget.totalPaise.toString(),
            reservedPaise: c.budget.reservedPaise.toString(),
            spentPaise: c.budget.spentPaise.toString(),
          }
        : null,
    }))
  )
}

const createSchema = z.object({
  name: z.string().min(3).max(100),
  section: z.enum(['REUSE', 'LEAK', 'FOOD', 'ELECTRICITY', 'WATER', 'COMMUTE']),
  funderPartnerId: z.string().min(1),
  status: z.enum(['DRAFT', 'COMING_SOON', 'ACTIVE']).default('DRAFT'),
  startsAt: z.string().datetime(),
  endsAt: z.string().datetime(),
  rewardRule: z.record(z.string(), z.unknown()),
  limits: z.record(z.string(), z.unknown()),
  description: z.string().min(10),
  evidenceNeeded: z.string().default(''),
  isSimulated: z.boolean().default(false),
  budgetTotalPaise: z.number().int().positive(),
})

export async function POST(req: NextRequest) {
  const session = await getSession()
  if (!session?.roles.includes('ADMIN')) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const body = await req.json().catch(() => null)
  const parsed = createSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid input', details: parsed.error.flatten() }, { status: 400 })
  }

  const { budgetTotalPaise, rewardRule, limits, ...campaignData } = parsed.data

  const campaign = await prisma.$transaction(async tx => {
    const c = await tx.campaign.create({
      data: {
        ...campaignData,
        rewardRule: JSON.stringify(rewardRule),
        limits: JSON.stringify(limits),
        startsAt: new Date(campaignData.startsAt),
        endsAt: new Date(campaignData.endsAt),
      },
    })
    await tx.budget.create({
      data: {
        campaignId: c.id,
        totalPaise: budgetTotalPaise,
      },
    })
    return c
  })

  return NextResponse.json(campaign, { status: 201 })
}
