import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/server/session';
import { getUserCoupons } from '@/server/services/couponService';

export async function GET(_req: NextRequest) {
  const session = await getSession();
  if (!session?.userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const coupons = await getUserCoupons(session.userId);
    return NextResponse.json({ coupons });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message ?? 'Failed to load user coupons' },
      { status: 500 }
    );
  }
}
