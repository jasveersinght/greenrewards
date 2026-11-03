import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/server/session';
import { settlePendingPoints } from '@/server/services/walletService';

export async function POST(_req: NextRequest) {
  const session = await getSession();
  if (!session?.userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  if (!session.roles.includes('ADMIN')) {
    return NextResponse.json({ error: 'Forbidden: Admin role required' }, { status: 403 });
  }

  try {
    const result = await settlePendingPoints();
    return NextResponse.json(result);
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message ?? 'Settlement job failed' },
      { status: 500 }
    );
  }
}
