import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/server/session'
import { getUserStampCards } from '@/server/services/claimService'

export async function GET(_req: NextRequest) {
  const session = await getSession()
  if (!session?.userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const cards = await getUserStampCards(session.userId)
  return NextResponse.json(cards)
}
