import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/server/session'
import { getLedgerHistory, getWalletBalance } from '@/server/services/walletService'

export async function GET(req: NextRequest) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const url = new URL(req.url)
  const skip = parseInt(url.searchParams.get('skip') ?? '0', 10)
  const take = Math.min(parseInt(url.searchParams.get('take') ?? '50', 10), 100)

  const [balance, entries] = await Promise.all([
    getWalletBalance(session.userId),
    getLedgerHistory(session.userId, { skip, take }),
  ])

  return NextResponse.json({
    balance: {
      availablePoints: balance.availablePoints,
      pendingPoints: balance.pendingPoints,
      reservedPoints: balance.reservedPoints,
      expiringSoonPoints: balance.expiringSoonPoints,
      pendingLots: balance.pendingLots,
      stamps: balance.stamps,
      pendingPaise: balance.pendingPaise.toString(),
      availablePaise: balance.availablePaise.toString(),
      voucherPaise: balance.voucherPaise.toString(),
    },
    entries: entries.map(e => ({
      ...e,
      amountPoints: e.amountPoints ?? 0,
      amountPaise: e.amountPaise?.toString() ?? null,
    })),
  })
}
