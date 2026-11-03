import { NextRequest, NextResponse } from 'next/server'
import { getTokenFromRequest, verifySessionJwt } from '@/server/sessionToken'

const PUBLIC_PATHS = [
  '/login',
  '/signup',
  '/onboarding',
  '/sponsor',
  '/rewards',
  '/api/auth/send-otp',
  '/api/auth/verify-otp',
  '/api/auth/quick-login',
  '/api/auth/me',
  '/api/auth/logout',
  '/api/rewards',
  '/api/dev/',
  '/api/electricity/predict',
]

const ADMIN_PATHS = ['/admin', '/api/admin']
const MERCHANT_PATHS = ['/merchant', '/api/merchant']
const REVIEWER_PATHS = ['/reviewer', '/api/reviewer']
const PLUMBER_PATHS = ['/plumber', '/api/plumber']
const PARTNER_PATHS = ['/partner', '/api/partner']

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl

  // Check existing session token
  const token = getTokenFromRequest(req)
  const session = token ? await verifySessionJwt(token) : null

  // Allow landing page unconditionally
  if (pathname === '/') {
    return NextResponse.next()
  }

  // Allow public paths unconditionally
  if (PUBLIC_PATHS.some(p => pathname === p || pathname.startsWith(p + '/'))) {
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

  // Role-gated paths: strictly check granted roles on server
  if (ADMIN_PATHS.some(p => pathname === p || pathname.startsWith(p + '/'))) {
    if (!session.roles.includes('ADMIN')) {
      return pathname.startsWith('/api/')
        ? NextResponse.json({ error: 'Forbidden' }, { status: 403 })
        : NextResponse.redirect(new URL('/home', req.url))
    }
  }

  if (MERCHANT_PATHS.some(p => pathname === p || pathname.startsWith(p + '/'))) {
    if (!session.roles.includes('SHOPKEEPER') && !session.roles.includes('ADMIN')) {
      return pathname.startsWith('/api/')
        ? NextResponse.json({ error: 'Forbidden' }, { status: 403 })
        : NextResponse.redirect(new URL('/home', req.url))
    }
  }

  if (REVIEWER_PATHS.some(p => pathname === p || pathname.startsWith(p + '/'))) {
    if (!session.roles.includes('REVIEWER') && !session.roles.includes('ADMIN')) {
      return pathname.startsWith('/api/')
        ? NextResponse.json({ error: 'Forbidden' }, { status: 403 })
        : NextResponse.redirect(new URL('/home', req.url))
    }
  }

  if (PLUMBER_PATHS.some(p => pathname === p || pathname.startsWith(p + '/'))) {
    if (!session.roles.includes('PLUMBER') && !session.roles.includes('ADMIN')) {
      return pathname.startsWith('/api/')
        ? NextResponse.json({ error: 'Forbidden' }, { status: 403 })
        : NextResponse.redirect(new URL('/home', req.url))
    }
  }

  if (PARTNER_PATHS.some(p => pathname === p || pathname.startsWith(p + '/'))) {
    if (!session.roles.includes('FOOD_PARTNER') && !session.roles.includes('ADMIN')) {
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
