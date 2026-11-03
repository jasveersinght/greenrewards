import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { getSession } from '@/server/session'
import { uploadRepairEvidence } from '@/server/services/leakService'

const repairSchema = z.object({
  repairPhotoUrl: z.string().min(1),
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

  const isMaintenanceOrAdmin =
    session.roles.includes('PLUMBER') ||
    session.roles.includes('REVIEWER') ||
    session.roles.includes('ADMIN')

  if (!isMaintenanceOrAdmin) {
    return NextResponse.json(
      { error: 'Forbidden: Maintenance role required' },
      { status: 403 }
    )
  }

  const body = await req.json().catch(() => null)
  const parsed = repairSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Invalid input', details: parsed.error.flatten() },
      { status: 400 }
    )
  }

  try {
    const result = await uploadRepairEvidence({
      caseId: id,
      actorUserId: session.userId,
      repairPhotoUrl: parsed.data.repairPhotoUrl,
      note: parsed.data.note,
    })

    return NextResponse.json(result)
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message ?? 'Failed to upload repair evidence' },
      { status: 400 }
    )
  }
}
