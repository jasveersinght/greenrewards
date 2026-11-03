import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getSession, createSession, setSessionCookie } from '@/server/session';
import { prisma } from '@/server/db';

const roleSchema = z.object({
  role: z.enum(['CITIZEN', 'MERCHANT', 'REVIEWER', 'SPONSOR', 'ADMIN']),
});

export async function POST(req: NextRequest) {
  // Gated behind development mode and ENABLE_DEV_ROLE_SWITCH === 'true'
  if (
    process.env.NODE_ENV !== 'development' ||
    process.env.ENABLE_DEV_ROLE_SWITCH !== 'true'
  ) {
    return NextResponse.json({ error: 'Not available in this environment' }, { status: 403 });
  }

  const session = await getSession();
  if (!session?.userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  const parsed = roleSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Invalid input', details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const targetRole = parsed.data.role;

  // Find partner scopes if applicable
  let partnerIds: string[] = [];
  if (targetRole === 'MERCHANT') {
    const partner = await prisma.partner.findFirst();
    if (partner) partnerIds.push(partner.id);
  }

  const newSessionToken = await createSession({
    userId: session.userId,
    email: session.email,
    displayName: session.displayName,
    roles: [targetRole],
    partnerIds,
  });

  const response = NextResponse.json({
    success: true,
    activeRole: targetRole,
    message: `Switched active role to ${targetRole}`,
  });

  setSessionCookie(response, newSessionToken);
  return response;
}
