import { SignJWT, jwtVerify } from 'jose'
import { NextRequest } from 'next/server'
import { normalizeRole, type AppRole } from '@/server/domain/roles'
import { isStaffUsername } from '@/server/domain/username'

const SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET ?? 'dev-jwt-secret-change-in-production-32chars-min'
)
export const COOKIE_NAME = process.env.SESSION_COOKIE_NAME ?? 'gr_session'
export const MAX_AGE = parseInt(process.env.SESSION_MAX_AGE_SECONDS ?? '604800', 10)

export interface EdgeSessionPayload {
  userId: string
  email: string
  username: string | null
  displayName: string | null
  activeRole: AppRole
  roles: AppRole[]
  partnerIds: string[]
  isAdminStaff: boolean
}

export async function signSessionJwt(data: {
  userId: string
  email: string
  username?: string | null
  displayName?: string | null
  activeRole: AppRole
  roles: AppRole[]
  partnerIds: string[]
}): Promise<string> {
  const isAdminStaff = isStaffUsername(data.username ?? '')

  return new SignJWT({
    userId: data.userId,
    email: data.email,
    username: data.username ?? null,
    displayName: data.displayName ?? null,
    activeRole: data.activeRole,
    roles: data.roles,
    partnerIds: data.partnerIds,
    isAdminStaff,
  })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(`${MAX_AGE}s`)
    .sign(SECRET)
}

export async function verifySessionJwt(token: string): Promise<EdgeSessionPayload | null> {
  try {
    const { payload } = await jwtVerify(token, SECRET)
    if (!payload.userId) return null

    const rawRoles = Array.isArray(payload.roles) ? (payload.roles as string[]) : ['CITIZEN']
    const roles = Array.from(new Set(rawRoles.map(normalizeRole))) as AppRole[]
    const activeRole = normalizeRole((payload.activeRole as string) || 'CITIZEN')
    const partnerIds = Array.isArray(payload.partnerIds) ? (payload.partnerIds as string[]) : []
    const username = (payload.username as string) || null

    return {
      userId: payload.userId as string,
      email: (payload.email as string) || '',
      username,
      displayName: (payload.displayName as string) || null,
      activeRole,
      roles,
      partnerIds,
      isAdminStaff: isStaffUsername(username ?? ''),
    }
  } catch {
    return null
  }
}

export function getTokenFromRequest(req: NextRequest): string | null {
  return req.cookies.get(COOKIE_NAME)?.value ?? null
}
