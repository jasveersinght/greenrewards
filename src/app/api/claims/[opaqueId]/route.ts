import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/server/session'
import { getClaimDetails } from '@/server/services/claimService'

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ opaqueId: string }> }
) {
  const { opaqueId } = await params
  const session = await getSession()

  // Merchant partner scope if user is a merchant
  let merchantPartnerId: string | null | undefined = undefined
  if (session?.roles.includes('SHOPKEEPER') && !session.roles.includes('ADMIN')) {
    merchantPartnerId = session.partnerIds[0] ?? null
  }

  const result = await getClaimDetails(opaqueId, merchantPartnerId)
  if (!result.found) {
    return NextResponse.json({ error: 'Claim not found or invalid' }, { status: 404 })
  }

  return NextResponse.json(result)
}
