import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/server/db'
import { getSession } from '@/server/session'

const updateSchema = z.object({
  isSimulated: z.boolean().optional(),
  approved: z.boolean().optional(),
})

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession()
  if (!session?.roles.includes('ADMIN')) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { id } = await params
  const body = await req.json().catch(() => null)
  const parsed = updateSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid input' }, { status: 400 })
  }

  const partner = await prisma.partner.update({
    where: { id },
    data: {
      ...(parsed.data.isSimulated !== undefined ? { isSimulated: parsed.data.isSimulated } : {}),
      ...(parsed.data.approved !== undefined ? { approved: parsed.data.approved } : {}),
    },
  })

  await prisma.auditLog.create({
    data: {
      actorId: session.userId,
      action: 'PARTNER_UPDATED',
      refType: 'Partner',
      refId: id,
      meta: JSON.stringify(parsed.data),
    },
  }).catch(() => {})

  return NextResponse.json({ success: true, partner })
}
