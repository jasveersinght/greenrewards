import { NextResponse } from 'next/server';
import { getSession } from '@/server/session';
import { waterService } from '@/server/services/waterService';

export async function GET() {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const isReviewerOrAdmin = session.roles.includes('REVIEWER') || session.roles.includes('ADMIN');
    if (!isReviewerOrAdmin) {
      return NextResponse.json({ success: false, error: 'Reviewer permission required' }, { status: 403 });
    }

    const claims = await waterService.getPendingRepairClaims();
    return NextResponse.json({ success: true, claims });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
