import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { getSession } from '@/server/session'
import { reviewLeakCase } from '@/server/services/leakService'

const reviewSchema = z.object({
  decision: z.enum(['APPROVED', 'REJECTED', 'NEEDS_INFO']),
  reason: z.string().optional(),
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

  const isReviewer = session.roles.includes('REVIEWER') || session.roles.includes('ADMIN')
  if (!isReviewer) {
    return NextResponse.json({ error: 'Forbidden: Reviewer role required' }, { status: 403 })
  }

  const body = await req.json().catch(() => null)
  const parsed = reviewSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Invalid input', details: parsed.error.flatten() },
      { status: 400 }
    )
  }

  try {
    const result = await reviewLeakCase({
      caseId: id,
      reviewerUserId: session.userId,
      decision: parsed.data.decision,
      reason: parsed.data.reason,
    })

    return NextResponse.json(result)
  } catch (err: any) {
    const status = err.message === 'SELF_REVIEW_NOT_ALLOWED' ? 403 : 400
    return NextResponse.json(
      { error: err.message ?? 'Failed to review leak case' },
      { status }
    )
  }
}
