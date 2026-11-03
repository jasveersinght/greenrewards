import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getSession } from '@/server/session';
import { verifyAndUseCoupon } from '@/server/services/couponService';

const useSchema = z.object({
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
  const parsed = useSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Invalid input', details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  try {
    const result = await verifyAndUseCoupon({
      code: parsed.data.code,
      merchantPartnerId: session.partnerIds?.[0] ?? '',
    });

    return NextResponse.json(result, { status: 200 });
  } catch (err: any) {
    const message = err.message ?? 'Failed to redeem coupon';
    const status =
      message.includes('NOT_FOUND')
        ? 404
        : message.includes('ALREADY_USED')
        ? 409
        : message.includes('EXPIRED')
        ? 410
        : message.includes('WRONG_MERCHANT')
        ? 403
        : 400;

    return NextResponse.json({ error: message }, { status });
  }
}
