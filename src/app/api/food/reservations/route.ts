import { NextResponse } from 'next/server';
import { getSession } from '@/server/session';
import { foodService } from '@/server/services/foodService';
import { z } from 'zod';

const reserveSchema = z.object({
  listingId: z.string().min(1),
  quantity: z.number().int().positive(),
});

export async function GET() {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const reservations = await foodService.getUserReservations(session.userId);
    return NextResponse.json({ success: true, reservations });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const parsed = reserveSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ success: false, error: parsed.error.issues }, { status: 400 });
    }

    const reservation = await foodService.reserveFood(
      session.userId,
      parsed.data.listingId,
      parsed.data.quantity
    );

    return NextResponse.json({ success: true, reservation }, { status: 201 });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 400 });
  }
}
