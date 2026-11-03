import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { getSession } from '@/server/session'
import { prisma } from '@/server/db'

const schema = z.object({
  decision: z.enum(['APPROVE', 'REJECT']),
  reason: z.string().optional(),
})

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession()
  if (!session || !session.roles.includes('ADMIN')) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { id } = await params
  const body = await req.json().catch(() => null)
  const parsed = schema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid input' }, { status: 400 })
  }

  const application = await prisma.roleApplication.findUnique({
    where: { id },
    include: { user: true },
  })

  if (!application) {
    return NextResponse.json({ error: 'Application not found' }, { status: 404 })
  }

  if (application.status !== 'PENDING') {
    return NextResponse.json(
      { error: `Application already decided (${application.status})` },
      { status: 409 }
    )
  }

  const { decision, reason } = parsed.data

  if (decision === 'APPROVE') {
    // 1. Create or link Partner record
    const partnerType =
      application.role === 'SHOPKEEPER'
        ? 'SHOP'
        : application.role === 'FOOD_PARTNER'
        ? 'FOOD_PARTNER'
        : application.role === 'PLUMBER'
        ? 'PLUMBER'
        : 'SPONSOR'

    const partner = await prisma.partner.create({
      data: {
        name: application.organizationName,
        type: partnerType,
        address: application.shopAddress || application.locality,
        locality: application.locality,
        phone: application.phone,
        serviceArea: application.serviceArea,
        category: application.shopCategory,
        approved: true,
        isSimulated: false,
      },
    })

    // 2. Grant the role
    await prisma.roleGrant.upsert({
      where: {
        userId_role_partnerId: {
          userId: application.userId,
          role: application.role,
          partnerId: partner.id,
        },
      },
      update: {
        revokedAt: null,
        grantedBy: session.userId,
      },
      create: {
        userId: application.userId,
        role: application.role,
        partnerId: partner.id,
        grantedBy: session.userId,
      },
    })

    // 3. Update application status
    const updated = await prisma.roleApplication.update({
      where: { id: application.id },
      data: {
        status: 'APPROVED',
        decisionReason: reason || 'Application approved by administrator',
        decidedByUserId: session.userId,
        decidedAt: new Date(),
      },
    })

    // 4. Send notification
    await prisma.notification.create({
      data: {
        userId: application.userId,
        title: 'Role Application Approved!',
        body: `Your application for ${application.role} (${application.organizationName}) has been approved! You can now switch roles in your portal.`,
      },
    })

    // 5. Audit log
    await prisma.auditLog.create({
      data: {
        actorId: session.userId,
        action: 'ROLE_APPLICATION_APPROVED',
        refType: 'RoleApplication',
        refId: application.id,
        meta: JSON.stringify({
          role: application.role,
          partnerId: partner.id,
          organizationName: application.organizationName,
          reason,
        }),
      },
    })

    return NextResponse.json({ success: true, application: updated, partner })
  } else {
    // REJECT
    const updated = await prisma.roleApplication.update({
      where: { id: application.id },
      data: {
        status: 'REJECTED',
        decisionReason: reason || 'Requirements not met or incomplete information',
        decidedByUserId: session.userId,
        decidedAt: new Date(),
      },
    })

    await prisma.notification.create({
      data: {
        userId: application.userId,
        title: 'Role Application Update',
        body: `Your application for ${application.role} was not approved: ${reason || 'Requirements not met.'}`,
      },
    })

    await prisma.auditLog.create({
      data: {
        actorId: session.userId,
        action: 'ROLE_APPLICATION_REJECTED',
        refType: 'RoleApplication',
        refId: application.id,
        meta: JSON.stringify({
          role: application.role,
          organizationName: application.organizationName,
          reason,
        }),
      },
    })

    return NextResponse.json({ success: true, application: updated })
  }
}
