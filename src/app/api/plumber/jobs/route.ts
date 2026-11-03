import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/server/session'
import { prisma } from '@/server/db'

export async function GET() {
  const session = await getSession()
  if (!session || (!session.roles.includes('PLUMBER') && !session.roles.includes('ADMIN'))) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const partnerId = session.partnerIds[0]
  const partner = partnerId ? await prisma.partner.findUnique({ where: { id: partnerId } }) : null
  const serviceArea = partner?.serviceArea?.toLowerCase() || ''

  // 1. Available job requests (not yet assigned or requested in plumber's locality)
  const availableRequests = await prisma.repairClaim.findMany({
    where: {
      status: 'PENDING',
      repairStage: 'REQUESTED',
      plumberPartnerId: null,
    },
    include: {
      user: {
        select: { displayName: true, locality: true },
      },
      household: {
        select: { name: true, memberCount: true },
      },
    },
    orderBy: { createdAt: 'desc' },
    take: 20,
  })

  // Filter or prioritize by service area if specified
  const filteredAvailable = availableRequests.map(job => ({
    ...job,
    // Exact address hidden until accepted
    address: 'Address hidden until job accepted',
    customerName: job.user?.displayName || 'Resident',
    locality: job.locality || job.user?.locality || 'Potheri',
  }))

  // 2. In-progress / My assigned jobs
  const myJobs = await prisma.repairClaim.findMany({
    where: {
      OR: [
        { plumberPartnerId: partnerId || undefined },
        { assignedPlumberId: session.userId },
      ],
    },
    include: {
      user: {
        select: { displayName: true, locality: true, email: true },
      },
      household: {
        select: { name: true },
      },
    },
    orderBy: { updatedAt: 'desc' },
  })

  return NextResponse.json({
    available: filteredAvailable,
    myJobs: myJobs.map(job => ({
      ...job,
      customerName: job.user?.displayName || 'Resident',
      locality: job.locality || job.user?.locality || 'Potheri',
      // Real address shown once assigned/accepted
      address: job.address || `${job.locality || 'Locality'} Community Resident Address`,
    })),
  })
}
