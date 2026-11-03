import { NextRequest, NextResponse } from 'next/server'
import { getTokenFromRequest, verifySession } from '@/server/session'

const PUBLIC_PATHS = ['/login', '/signup', '/onboarding', '/sponsor', '/api/auth/send-otp', '/api/auth/verify-otp', '/api/dev/', '/api/electricity/predict']
const ADMIN_PATHS = ['/admin']
const MERCHANT_PATHS = ['/merchant']
const REVIEWER_PATHS = ['/reviewer']

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl

  // Check existing session token
  const token = getTokenFromRequest(req)
  const session = token ? await verifySession(token) : null

  // Allow landing page unconditionally
  if (pathname === '/') {
    return NextResponse.next()
  }

  // Allow public paths unconditionally
  if (PUBLIC_PATHS.some(p => pathname.startsWith(p))) {
    return NextResponse.next()
  }

  // Allow static files, media, and Next internals
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/favicon') ||
    pathname.endsWith('.mp4') ||
    pathname.endsWith('.png') ||
    pathname.endsWith('.jpg') ||
    pathname.endsWith('.svg') ||
    pathname.endsWith('.ico')
  ) {
    return NextResponse.next()
  }

  if (!session) {
    if (pathname.startsWith('/api/')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    return NextResponse.redirect(new URL('/login', req.url))
  }

  // Role-gated paths
  if (ADMIN_PATHS.some(p => pathname.startsWith(p))) {
    if (!session.roles.includes('ADMIN')) {
      return pathname.startsWith('/api/')
        ? NextResponse.json({ error: 'Forbidden' }, { status: 403 })
        : NextResponse.redirect(new URL('/home', req.url))
    }
  }

  if (MERCHANT_PATHS.some(p => pathname.startsWith(p))) {
    if (!session.roles.includes('MERCHANT') && !session.roles.includes('ADMIN')) {
      return pathname.startsWith('/api/')
        ? NextResponse.json({ error: 'Forbidden' }, { status: 403 })
        : NextResponse.redirect(new URL('/home', req.url))
    }
  }

  if (REVIEWER_PATHS.some(p => pathname.startsWith(p))) {
    if (!session.roles.includes('REVIEWER') && !session.roles.includes('ADMIN')) {
      return pathname.startsWith('/api/')
        ? NextResponse.json({ error: 'Forbidden' }, { status: 403 })
        : NextResponse.redirect(new URL('/home', req.url))
    }
  }

  // Onboarding redirect: if user has no displayName, send to onboarding
  if (!pathname.startsWith('/api/') && !pathname.startsWith('/onboarding') && !session.displayName) {
    return NextResponse.redirect(new URL('/onboarding', req.url))
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|icons).*)'],
}
