import { NextRequest, NextResponse } from 'next/server';
import { getPublicCouponCatalog } from '@/server/services/couponService';
import { getSession } from '@/server/session';
import { getWalletBalance } from '@/server/services/walletService';

export async function GET(req: NextRequest) {
  try {
    const session = await getSession();
    let userAvailablePoints = 0;
    if (session?.userId) {
      const balance = await getWalletBalance(session.userId);
      userAvailablePoints = balance.availablePoints;
    }

    const url = new URL(req.url);
    const filter = url.searchParams.get('filter'); // 'all' | 'nearMe' | 'online' | 'affordable'

    let catalog = await getPublicCouponCatalog();

    if (filter === 'online') {
      catalog = catalog.filter((c) => c.validMerchantIds === 'online code');
    } else if (filter === 'nearMe') {
      catalog = catalog.filter((c) => c.validMerchantIds !== 'online code');
    } else if (filter === 'affordable') {
      catalog = catalog.filter((c) => c.pointsPrice <= userAvailablePoints);
    }

    return NextResponse.json({
      catalog,
      userAvailablePoints,
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message ?? 'Failed to load coupon catalog' },
      { status: 500 }
    );
  }
}
