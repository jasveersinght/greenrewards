import { NextResponse } from 'next/server';
import { getSession } from '@/server/session';
import { waterService } from '@/server/services/waterService';
import { z } from 'zod';

const claimSchema = z.object({
  evidenceUrl: z.string().optional(),
  invoiceUrl: z.string().optional(),
  householdId: z.string().optional(),
  leakCaseId: z.string().optional(),
  category: z.string().optional(),
  address: z.string().optional(),
  locality: z.string().optional(),
  notes: z.string().optional(),
  beforePhotoUrl: z.string().optional(),
  afterPhotoUrl: z.string().optional(),
  repairStage: z.string().optional(),
});

export async function GET() {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const claims = await waterService.getUserRepairClaims(session.userId);
    return NextResponse.json({ success: true, claims });
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
    const parsed = claimSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ success: false, error: parsed.error.issues }, { status: 400 });
    }

    const claim = await waterService.submitRepairClaim({
      userId: session.userId,
      evidenceUrl: parsed.data.evidenceUrl,
      invoiceUrl: parsed.data.invoiceUrl,
      householdId: parsed.data.householdId,
      leakCaseId: parsed.data.leakCaseId,
      category: parsed.data.category,
      address: parsed.data.address,
      locality: parsed.data.locality,
      notes: parsed.data.notes,
      beforePhotoUrl: parsed.data.beforePhotoUrl,
      afterPhotoUrl: parsed.data.afterPhotoUrl,
      repairStage: parsed.data.repairStage,
    });

    return NextResponse.json({ success: true, claim }, { status: 201 });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 400 });
  }
}
