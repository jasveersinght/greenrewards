import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/server/session';
import { verifyLedgerIntegrity } from '@/server/services/walletService';

export async function GET(_req: NextRequest) {
  const session = await getSession();
  if (!session?.userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  if (!session.roles.includes('ADMIN')) {
    return NextResponse.json({ error: 'Forbidden: Admin role required' }, { status: 403 });
  }

  try {
    const result = await verifyLedgerIntegrity();
    return NextResponse.json(result);
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message ?? 'Ledger verification failed' },
      { status: 500 }
    );
  }
}
