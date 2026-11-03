import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { sendOtp } from '@/server/services/authService'

const schema = z.object({
  email: z.string().trim().min(3).max(100),
  displayName: z.string().min(2).max(50).optional(),
  locality: z.string().min(2).max(50).optional(),
  username: z.string().min(3).max(30).optional(),
  mode: z.enum(['login', 'signup']).optional(),
})

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null)
  const parsed = schema.safeParse(body)

  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid input', details: parsed.error.flatten() }, { status: 400 })
  }

  const { email, displayName, locality, username } = parsed.data
  const result = await sendOtp(email, displayName ? { displayName, locality, username } : undefined)

  if (!result.sent) {
    const status = result.error ? 404 : 429
    return NextResponse.json(
      { error: result.error || 'Please wait before requesting another OTP', cooldownRemaining: result.cooldownRemaining },
      { status }
    )
  }

  return NextResponse.json({
    sent: true,
    isExistingUser: result.isExistingUser,
    resolvedEmail: result.resolvedEmail,
  })
}
