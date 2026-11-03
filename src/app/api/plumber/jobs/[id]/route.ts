import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { getSession } from '@/server/session'
import { prisma } from '@/server/db'

const schema = z.object({
  action: z.enum(['ACCEPT', 'DECLINE', 'PROGRESS', 'SUBMIT_FOR_REVIEW']),
  stage: z.enum(['ACCEPTED', 'VISITED', 'REPAIRED']).optional(),
  notes: z.string().optional(),
  beforePhotoUrl: z.string().optional(),
  afterPhotoUrl: z.string().optional(),
  meterReading: z.number().optional(),
  invoiceUrl: z.string().optional(),
})

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession()
  if (!session || (!session.roles.includes('PLUMBER') && !session.roles.includes('ADMIN'))) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { id } = await params
  const body = await req.json().catch(() => null)
  const parsed = schema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid input' }, { status: 400 })
  }

  const claim = await prisma.repairClaim.findUnique({
    where: { id },
  })

  if (!claim) {
    return NextResponse.json({ error: 'Repair claim not found' }, { status: 404 })
  }

  const partnerId = session.partnerIds[0] || null
  const { action, stage, notes, beforePhotoUrl, afterPhotoUrl, meterReading, invoiceUrl } = parsed.data

  if (action === 'ACCEPT') {
    const updated = await prisma.repairClaim.update({
      where: { id },
      data: {
        repairStage: 'ACCEPTED',
        plumberPartnerId: partnerId,
        assignedPlumberId: session.userId,
        // When accepted, assign real service street address
        address: claim.address || `Flat 4B, ${claim.locality || 'Green Valley Apt'}, Chennai`,
      },
    })

    await prisma.notification.create({
      data: {
        userId: claim.userId,
        title: 'Plumber Assigned to Your Repair',
        body: 'A certified community plumber has accepted your household pipe repair request. They will visit your location shortly.',
      },
    })

    return NextResponse.json({ success: true, claim: updated })
  }

  if (action === 'DECLINE') {
    return NextResponse.json({ success: true, message: 'Job request declined' })
  }

  if (action === 'PROGRESS') {
    const updated = await prisma.repairClaim.update({
      where: { id },
      data: {
        repairStage: stage || claim.repairStage,
        notes: notes ?? claim.notes,
        beforePhotoUrl: beforePhotoUrl ?? claim.beforePhotoUrl,
        afterPhotoUrl: afterPhotoUrl ?? claim.afterPhotoUrl,
        meterReading: meterReading ?? claim.meterReading,
        invoiceUrl: invoiceUrl ?? claim.invoiceUrl,
      },
    })
    return NextResponse.json({ success: true, claim: updated })
  }

  if (action === 'SUBMIT_FOR_REVIEW') {
    // Plumber finishes the job and submits for Reviewer audit
    const updated = await prisma.repairClaim.update({
      where: { id },
      data: {
        repairStage: 'REPAIRED',
        status: 'PENDING', // Awaiting Reviewer verification
        notes: notes ?? claim.notes,
        beforePhotoUrl: beforePhotoUrl ?? claim.beforePhotoUrl,
        afterPhotoUrl: afterPhotoUrl ?? claim.afterPhotoUrl,
        invoiceUrl: invoiceUrl ?? claim.invoiceUrl,
      },
    })

    await prisma.auditLog.create({
      data: {
        actorId: session.userId,
        action: 'PLUMBER_JOB_SUBMITTED_FOR_REVIEW',
        refType: 'RepairClaim',
        refId: claim.id,
        meta: JSON.stringify({ notes }),
      },
    })

    return NextResponse.json({ success: true, claim: updated })
  }

  return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
}
