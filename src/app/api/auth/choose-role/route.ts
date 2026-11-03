import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { getSession, switchSessionActiveRole } from '@/server/session'
import { normalizeRole, ROLE_HOME_PATHS } from '@/server/domain/roles'

const schema = z.object({
  role: z.string().min(1),
  remember: z.boolean().optional(),
})

export async function POST(req: NextRequest) {
  const session = await getSession()
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await req.json().catch(() => null)
  const parsed = schema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid input' }, { status: 400 })
  }

  const normalized = normalizeRole(parsed.data.role)
  const result = await switchSessionActiveRole(session.userId, normalized)

  if (!result.success) {
    return NextResponse.json(
      { error: result.error || 'Role not granted' },
      { status: 403 }
    )
  }

  const redirectUrl = ROLE_HOME_PATHS[normalized] || '/home'
  const response = NextResponse.json({
    success: true,
    activeRole: normalized,
    redirectUrl,
  })

  if (parsed.data.remember) {
    response.cookies.set('gr_preferred_role', normalized, {
      path: '/',
      maxAge: 30 * 24 * 60 * 60, // 30 days
      sameSite: 'lax',
    })
  } else {
    response.cookies.delete('gr_preferred_role')
  }

  return response
}
