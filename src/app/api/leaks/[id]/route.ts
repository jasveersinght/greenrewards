import { NextRequest, NextResponse } from 'next/server'
import { getLeakCaseById } from '@/server/services/leakService'

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const leakCase = await getLeakCaseById(id)

  if (!leakCase) {
    return NextResponse.json({ error: 'Leak case not found' }, { status: 404 })
  }

  return NextResponse.json(leakCase)
}
