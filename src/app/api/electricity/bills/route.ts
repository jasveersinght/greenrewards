import { NextResponse } from 'next/server';
import { getSession } from '@/server/session';
import { electricityService } from '@/server/services/electricityService';
import { z } from 'zod';

const addBillSchema = z.object({
  periodStart: z.string().datetime(),
  periodEnd: z.string().datetime(),
  units: z.number().positive(),
  amountPaise: z.number().int().positive(),
  tariffPaisePerUnit: z.number().int().optional(),
});

export async function GET() {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const bills = await electricityService.getBills(session.userId);
    return NextResponse.json({ success: true, bills });
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
    const parsed = addBillSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ success: false, error: parsed.error.issues }, { status: 400 });
    }

    const bill = await electricityService.addBill({
      userId: session.userId,
      periodStart: new Date(parsed.data.periodStart),
      periodEnd: new Date(parsed.data.periodEnd),
      units: parsed.data.units,
      amountPaise: parsed.data.amountPaise,
      tariffPaisePerUnit: parsed.data.tariffPaisePerUnit,
    });

    return NextResponse.json({ success: true, bill }, { status: 201 });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
