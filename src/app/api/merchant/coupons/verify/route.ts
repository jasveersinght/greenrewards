import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getSession } from '@/server/session';
import { prisma } from '@/server/db';

const verifySchema = z.object({
  code: z.string().min(1),
});

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session?.userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  if (!session.roles.includes('SHOPKEEPER') && !session.roles.includes('ADMIN')) {
    return NextResponse.json({ error: 'Forbidden: Shopkeeper role required' }, { status: 403 });
  }

  const body = await req.json().catch(() => null);
  const parsed = verifySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Invalid input', details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const normalizedCode = parsed.data.code.trim().toUpperCase();

  const coupon = await prisma.couponCode.findUnique({
    where: { code: normalizedCode },
    include: {
      catalogItem: {
        include: {
          funder: { select: { id: true, name: true, type: true } },
        },
      },
    },
  });

  if (!coupon) {
    return NextResponse.json({ error: 'Coupon code not found' }, { status: 404 });
  }

  let customerName = 'Valued Citizen';
  if (coupon.assignedUserId) {
    const user = await prisma.user.findUnique({
      where: { id: coupon.assignedUserId },
      select: { displayName: true },
    });
    if (user?.displayName) customerName = user.displayName;
  }

  const now = new Date();
  const isExpired = coupon.expiresAt ? coupon.expiresAt < now : false;

  return NextResponse.json({
    id: coupon.id,
    code: coupon.code,
    status: coupon.status,
    isExpired,
    title: coupon.catalogItem.title,
    faceValueText: coupon.catalogItem.faceValueText,
    minSpendText: coupon.catalogItem.minSpendText,
    validUntil: coupon.catalogItem.validUntil,
    expiresAt: coupon.expiresAt,
    funderName: coupon.catalogItem.funder.name,
    customerName,
    canBeUsed: coupon.status === 'ASSIGNED' && !isExpired,
  });
}
