import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { getSession } from '@/server/session'
import { prisma } from '@/server/db'
import { validateStaffAdminAccount } from '@/server/domain/username'
import { normalizeRole, ROLES, type AppRole } from '@/server/domain/roles'

const createStaffSchema = z.object({
  displayName: z.string().min(2).max(50),
  email: z.string().email(),
  username: z.string().min(3).max(30),
  roles: z.array(z.string()).min(1),
  locality: z.string().optional(),
})

export async function GET(req: NextRequest) {
  const session = await getSession()
  if (!session || !session.roles.includes('ADMIN')) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { searchParams } = new URL(req.url)
  const query = searchParams.get('q')?.trim().toLowerCase() || ''
  const roleFilter = searchParams.get('role') || 'ALL'
  const page = parseInt(searchParams.get('page') || '1', 10)
  const limit = Math.min(parseInt(searchParams.get('limit') || '20', 10), 100)
  const skip = (page - 1) * limit

  const where: Record<string, unknown> = {}
  if (query) {
    where.OR = [
      { email: { contains: query } },
      { username: { contains: query } },
      { displayName: { contains: query } },
    ]
  }

  if (roleFilter !== 'ALL') {
    where.roleGrants = {
      some: {
        role: roleFilter,
        revokedAt: null,
      },
    }
  }

  const [total, users] = await Promise.all([
    prisma.user.count({ where }),
    prisma.user.findMany({
      where,
      skip,
      take: limit,
      include: {
        roleGrants: {
          where: { revokedAt: null },
          include: { partner: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    }),
  ])

  return NextResponse.json({
    users: users.map(u => ({
      id: u.id,
      email: u.email,
      username: u.username,
      displayName: u.displayName,
      locality: u.locality,
      city: u.city,
      isSuspended: u.isSuspended,
      roles: Array.from(new Set(u.roleGrants.map(g => normalizeRole(g.role)).concat(['CITIZEN']))),
      roleGrants: u.roleGrants,
      createdAt: u.createdAt,
    })),
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  })
}

export async function POST(req: NextRequest) {
  const session = await getSession()
  if (!session || !session.roles.includes('ADMIN')) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const body = await req.json().catch(() => null)
  const parsed = createStaffSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid input', details: parsed.error.flatten() }, { status: 400 })
  }

  const { displayName, email, username, roles, locality } = parsed.data
  const normalizedRoles = roles.map(normalizeRole)

  // Validate admin username rules
  const valResult = validateStaffAdminAccount(username, normalizedRoles)
  if (!valResult.valid) {
    return NextResponse.json({ error: valResult.error }, { status: 400 })
  }

  const cleanEmail = email.trim().toLowerCase()
  const cleanUsername = valResult.normalized!

  // Check unique constraints
  const [existingEmail, existingUsername] = await Promise.all([
    prisma.user.findUnique({ where: { email: cleanEmail } }),
    prisma.user.findUnique({ where: { username: cleanUsername } }),
  ])

  if (existingEmail) {
    return NextResponse.json({ error: 'Email already registered' }, { status: 409 })
  }
  if (existingUsername) {
    return NextResponse.json({ error: 'Username already taken' }, { status: 409 })
  }

  // Create user
  const newUser = await prisma.user.create({
    data: {
      email: cleanEmail,
      username: cleanUsername,
      displayName: displayName.trim(),
      locality: locality || 'Chennai Central',
      city: 'Chennai',
    },
  })

  // Create role grants
  for (const r of normalizedRoles) {
    if (r === 'CITIZEN') continue
    await prisma.roleGrant.create({
      data: {
        userId: newUser.id,
        role: r,
        grantedBy: session.userId,
      },
    })
  }

  await prisma.auditLog.create({
    data: {
      actorId: session.userId,
      action: 'STAFF_ACCOUNT_CREATED',
      refType: 'User',
      refId: newUser.id,
      meta: JSON.stringify({ email: cleanEmail, username: cleanUsername, roles: normalizedRoles }),
    },
  })

  return NextResponse.json({
    success: true,
    user: {
      id: newUser.id,
      email: newUser.email,
      username: newUser.username,
      displayName: newUser.displayName,
      roles: normalizedRoles.concat(['CITIZEN']),
    },
  })
}
