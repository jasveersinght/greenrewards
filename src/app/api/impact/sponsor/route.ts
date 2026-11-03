import { NextResponse } from 'next/server';
import { getSession } from '@/server/session';
import { impactService } from '@/server/services/impactService';

export async function GET(request: Request) {
  try {
    const session = await getSession();
    const { searchParams } = new URL(request.url);
    const partnerId = searchParams.get('partnerId') || session?.partnerIds?.[0];

    const report = await impactService.getSponsorReport(partnerId);
    return NextResponse.json({ success: true, report });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
