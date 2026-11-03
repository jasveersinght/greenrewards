import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getSession } from '@/server/session';
import { redeemCoupon } from '@/server/services/couponService';

const redeemSchema = z.object({
  catalogItemId: z.string().min(1),
});

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session?.userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const idempotencyKey =
    req.headers.get('idempotency-key') ||
    req.headers.get('Idempotency-Key') ||
    undefined;

  const body = await req.json().catch(() => null);
  const parsed = redeemSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Invalid input', details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  try {
    const result = await redeemCoupon({
      userId: session.userId,
      catalogItemId: parsed.data.catalogItemId,
      idempotencyKey,
    });

    return NextResponse.json(result, { status: 200 });
  } catch (err: any) {
    const message = err.message ?? 'Redemption failed';
    const status =
      message.includes('INSUFFICIENT') ||
      message.includes('LIMIT_REACHED') ||
      message.includes('OUT_OF_STOCK')
        ? 400
        : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
