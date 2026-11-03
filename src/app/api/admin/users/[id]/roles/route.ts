import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { getSession } from '@/server/session'
import { prisma } from '@/server/db'
import { normalizeRole } from '@/server/domain/roles'

const schema = z.object({
  action: z.enum(['GRANT', 'REVOKE']),
  role: z.string().min(1),
  partnerId: z.string().optional(),
})

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession()
  if (!session || !session.roles.includes('ADMIN')) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { id: targetUserId } = await params
  const body = await req.json().catch(() => null)
  const parsed = schema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid input' }, { status: 400 })
  }

  const targetRole = normalizeRole(parsed.data.role)
  const { action, partnerId } = parsed.data

  const targetUser = await prisma.user.findUnique({
    where: { id: targetUserId },
    include: {
      roleGrants: {
        where: { revokedAt: null },
      },
    },
  })

  if (!targetUser) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 })
  }

  if (action === 'REVOKE') {
    // SECURITY LOCKOUT CHECK: An admin cannot remove their own last ADMIN role
    if (targetUserId === session.userId && targetRole === 'ADMIN') {
      const myAdminGrants = targetUser.roleGrants.filter(g => g.role === 'ADMIN')
      if (myAdminGrants.length <= 1) {
        return NextResponse.json(
          {
            error: 'CANNOT_REMOVE_OWN_LAST_ADMIN_ROLE',
            message: 'You cannot remove your own last admin role to prevent system lockout.',
          },
          { status: 400 }
        )
      }
    }

    // Also verify system doesn't lose all admins
    if (targetRole === 'ADMIN') {
      const totalSystemAdmins = await prisma.roleGrant.count({
        where: { role: 'ADMIN', revokedAt: null },
      })
      if (totalSystemAdmins <= 1) {
        return NextResponse.json(
          {
            error: 'CANNOT_REMOVE_LAST_SYSTEM_ADMIN',
            message: 'Cannot revoke the last remaining system administrator account.',
          },
          { status: 400 }
        )
      }
    }

    // Revoke the role grant
    await prisma.roleGrant.updateMany({
      where: {
        userId: targetUserId,
        role: targetRole,
        revokedAt: null,
        ...(partnerId ? { partnerId } : {}),
      },
      data: {
        revokedAt: new Date(),
      },
    })

    // If active session has this role, it will fall back to CITIZEN on next request via session.ts

    await prisma.auditLog.create({
      data: {
        actorId: session.userId,
        action: 'ROLE_REVOKED',
        refType: 'User',
        refId: targetUserId,
        meta: JSON.stringify({ role: targetRole, partnerId }),
      },
    })

    return NextResponse.json({
      success: true,
      message: `Role ${targetRole} revoked successfully`,
    })
  } else {
    // GRANT
    // If granting ADMIN, verify username requirement
    if (targetRole === 'ADMIN' && (!targetUser.username || !targetUser.username.startsWith('admin'))) {
      return NextResponse.json(
        {
          error: 'ADMIN_USERNAME_REQUIRED',
          message: "Users holding the ADMIN role must have a username starting with 'admin'. Please update the user's username first.",
        },
        { status: 400 }
      )
    }

    await prisma.roleGrant.create({
      data: {
        userId: targetUserId,
        role: targetRole,
        partnerId: partnerId || null,
        grantedBy: session.userId,
      },
    })

    await prisma.auditLog.create({
      data: {
        actorId: session.userId,
        action: 'ROLE_GRANTED',
        refType: 'User',
        refId: targetUserId,
        meta: JSON.stringify({ role: targetRole, partnerId }),
      },
    })

    return NextResponse.json({
      success: true,
      message: `Role ${targetRole} granted successfully`,
    })
  }
}
