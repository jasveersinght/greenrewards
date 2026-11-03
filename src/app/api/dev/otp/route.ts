import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/server/session'
import { getDevOtp } from '@/server/services/authService'

// Dev-only endpoint: returns the last OTP for a given email (for the UI banner)
export async function GET(req: NextRequest) {
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  const email = req.nextUrl.searchParams.get('email')
  if (!email) return NextResponse.json({ otp: null })

  const otp = await getDevOtp(email)
  return NextResponse.json({ otp: otp ?? null })
}
