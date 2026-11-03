import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { getSession } from '@/server/session'
import { submitLeakReport, getLeakCases } from '@/server/services/leakService'

const submitSchema = z.object({
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
  category: z.enum(['ROAD', 'STATION', 'PARK', 'OTHER_PUBLIC']),
  description: z.string().min(5).max(500),
  photoUrl: z.string().min(1),
})

export async function GET(req: NextRequest) {
  const session = await getSession()
  const url = new URL(req.url)
  const mine = url.searchParams.get('mine') === 'true'
  const status = url.searchParams.get('status') ?? undefined
  const category = url.searchParams.get('category') ?? undefined

  const cases = await getLeakCases({
    userId: mine && session?.userId ? session.userId : undefined,
    status,
    category,
  })

  return NextResponse.json(cases)
}

export async function POST(req: NextRequest) {
  const session = await getSession()
  if (!session?.userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await req.json().catch(() => null)
  const parsed = submitSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Invalid input', details: parsed.error.flatten() },
      { status: 400 }
    )
  }

  try {
    const result = await submitLeakReport({
      userId: session.userId,
      ...parsed.data,
    })

    return NextResponse.json(result, { status: 201 })
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message ?? 'Failed to submit leak report' },
      { status: 400 }
    )
  }
}
