import { NextResponse } from 'next/server';
import { impactService } from '@/server/services/impactService';

export async function GET() {
  try {
    const metrics = await impactService.getCityMetrics();
    return NextResponse.json({ success: true, metrics });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
