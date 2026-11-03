import { NextResponse } from 'next/server';
import { getSession } from '@/server/session';
import { electricityService } from '@/server/services/electricityService';
import { z } from 'zod';

const claimSchema = z.object({
  billId: z.string().min(1),
});

export async function POST(request: Request) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const parsed = claimSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ success: false, error: parsed.error.issues }, { status: 400 });
    }

    const ledger = await electricityService.claimReductionReward(session.userId, parsed.data.billId);
    return NextResponse.json({ success: true, ledger });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 400 });
  }
}
