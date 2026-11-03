import { NextResponse } from 'next/server';
import { getSession } from '@/server/session';
import { foodService } from '@/server/services/foodService';

export async function POST(
  request: Request,
  props: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const params = await props.params;
    const cancelled = await foodService.cancelReservation(session.userId, params.id);
    return NextResponse.json({ success: true, reservation: cancelled });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 400 });
  }
}
