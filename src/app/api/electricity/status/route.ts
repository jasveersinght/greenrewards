import { NextResponse } from 'next/server';
import { getSession } from '@/server/session';
import { electricityService } from '@/server/services/electricityService';

export async function GET() {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const status = await electricityService.evaluateBaselineStatus(session.userId);
    return NextResponse.json({ success: true, status });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
