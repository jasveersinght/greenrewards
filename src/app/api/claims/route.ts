import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { getSession } from '@/server/session'
import { createClaim } from '@/server/services/claimService'

const claimSchema = z.object({
  offerId: z.string().min(1),
})

export async function POST(req: NextRequest) {
  const session = await getSession()
  if (!session?.userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await req.json().catch(() => null)
  const parsed = claimSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid input', details: parsed.error.flatten() }, { status: 400 })
  }

  try {
    const result = await createClaim(session.userId, parsed.data.offerId)
    return NextResponse.json(result, { status: 201 })
  } catch (err: any) {
    if (err.message === 'DAILY_LIMIT_REACHED') {
      return NextResponse.json({ error: 'You have already earned a stamp for this offer today. Come back tomorrow!' }, { status: 429 })
    }
    if (err.message === 'OFFER_NOT_FOUND_OR_INACTIVE') {
      return NextResponse.json({ error: 'Offer is currently inactive or not found' }, { status: 404 })
    }
    return NextResponse.json({ error: err.message ?? 'Failed to generate claim' }, { status: 500 })
  }
}
