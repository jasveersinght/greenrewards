import { NextResponse } from 'next/server';
import { getSession } from '@/server/session';
import { waterService } from '@/server/services/waterService';
import { z } from 'zod';

const readingSchema = z.object({
  householdId: z.string().min(1),
  litres: z.number().positive(),
});

export async function GET() {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const household = await waterService.getUserHousehold(session.userId);
    return NextResponse.json({ success: true, household });
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
    const parsed = readingSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ success: false, error: parsed.error.issues }, { status: 400 });
    }

    const reading = await waterService.logWaterReading(parsed.data.householdId, parsed.data.litres);
    return NextResponse.json({ success: true, reading }, { status: 201 });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 400 });
  }
}
