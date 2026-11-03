import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { getSession } from '@/server/session'
import { confirmClaim } from '@/server/services/claimService'

const confirmSchema = z.object({
  receiptRef: z.string().optional(),
})

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ opaqueId: string }> }
) {
  const { opaqueId } = await params
  const session = await getSession()

  if (!session?.userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  if (!session.roles.includes('MERCHANT') && !session.roles.includes('ADMIN')) {
    return NextResponse.json({ error: 'Forbidden: Merchant role required' }, { status: 403 })
  }

  const body = await req.json().catch(() => ({}))
  const parsed = confirmSchema.safeParse(body)
  const receiptRef = parsed.success ? parsed.data.receiptRef : undefined

  const result = await confirmClaim({
    opaqueIdOrCode: opaqueId,
    merchantUserId: session.userId,
    receiptRef,
  })

  if (!result.success) {
    const statusMap: Record<string, number> = {
      CLAIM_NOT_FOUND: 404,
      EXPIRED: 410,
      ALREADY_USED: 409,
      WRONG_PARTNER: 403,
      DAILY_LIMIT_REACHED: 429,
      NOT_AUTHORIZED_AS_MERCHANT: 403,
    }
    return NextResponse.json(
      { error: result.error ?? 'Failed to confirm claim' },
      { status: statusMap[result.error ?? ''] ?? 400 }
    )
  }

  return NextResponse.json(result)
}
