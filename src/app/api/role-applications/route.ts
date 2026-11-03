import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { getSession } from '@/server/session'
import { prisma } from '@/server/db'
import { isAppliableRole } from '@/server/domain/roles'

const schema = z.object({
  role: z.string().min(1),
  organizationName: z.string().min(2).max(100),
  locality: z.string().min(2).max(100),
  phone: z.string().min(10).max(15),
  description: z.string().min(10).max(500),
  serviceArea: z.string().max(200).optional(),
  shopAddress: z.string().max(200).optional(),
  shopCategory: z.string().max(100).optional(),
  proofUrl: z.string().optional(),
})

export async function GET() {
  const session = await getSession()
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const applications = await prisma.roleApplication.findMany({
    where: { userId: session.userId },
    orderBy: { createdAt: 'desc' },
  })

  return NextResponse.json({ applications })
}

export async function POST(req: NextRequest) {
  const session = await getSession()
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await req.json().catch(() => null)
  const parsed = schema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Invalid input', details: parsed.error.flatten() },
      { status: 400 }
    )
  }

  const {
    role,
    organizationName,
    locality,
    phone,
    description,
    serviceArea,
    shopAddress,
    shopCategory,
    proofUrl,
  } = parsed.data

  if (!isAppliableRole(role)) {
    return NextResponse.json(
      { error: 'Reviewer and Admin roles cannot be applied for; they are granted by administrators only.' },
      { status: 400 }
    )
  }

  // Check if user already has an active pending application for this role
  const existingPending = await prisma.roleApplication.findFirst({
    where: {
      userId: session.userId,
      role,
      status: 'PENDING',
    },
  })

  if (existingPending) {
    return NextResponse.json(
      { error: `You already have a pending application for ${role}. Please await admin review.` },
      { status: 409 }
    )
  }

  const application = await prisma.roleApplication.create({
    data: {
      userId: session.userId,
      role,
      organizationName,
      locality,
      phone,
      description,
      serviceArea: serviceArea || null,
      shopAddress: shopAddress || null,
      shopCategory: shopCategory || null,
      proofUrl: proofUrl || null,
      status: 'PENDING',
    },
  })

  // Create audit log
  await prisma.auditLog.create({
    data: {
      actorId: session.userId,
      action: 'ROLE_APPLICATION_SUBMITTED',
      refType: 'RoleApplication',
      refId: application.id,
      meta: JSON.stringify({ role, organizationName }),
    },
  }).catch(() => {})

  return NextResponse.json({ success: true, application })
}
