import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { getSession } from '@/server/session'
import { verifyRepairAndClose } from '@/server/services/leakService'

const verifySchema = z.object({
  note: z.string().optional(),
})

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const session = await getSession()

  if (!session?.userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const isReviewerOrAdmin = session.roles.includes('REVIEWER') || session.roles.includes('ADMIN')
  if (!isReviewerOrAdmin) {
    return NextResponse.json(
      { error: 'Forbidden: Reviewer role required' },
      { status: 403 }
    )
  }

  const body = await req.json().catch(() => ({}))
  const parsed = verifySchema.safeParse(body)
  const note = parsed.success ? parsed.data.note : undefined

  try {
    const result = await verifyRepairAndClose({
      caseId: id,
      reviewerUserId: session.userId,
      note,
    })

    return NextResponse.json(result)
  } catch (err: any) {
    const status = err.message?.includes('SELF_VERIFICATION_NOT_ALLOWED') ? 403 : 400
    return NextResponse.json(
      { error: err.message ?? 'Failed to verify and close leak' },
      { status }
    )
  }
}
