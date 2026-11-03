import { NextResponse } from 'next/server';
import { getSession } from '@/server/session';
import { waterService } from '@/server/services/waterService';
import { z } from 'zod';

const reviewSchema = z.object({
  decision: z.enum(['CONFIRMED', 'REJECTED']),
  reason: z.string().optional(),
});

export async function POST(
  request: Request,
  props: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const isReviewerOrAdmin = session.roles.includes('REVIEWER') || session.roles.includes('ADMIN');
    if (!isReviewerOrAdmin) {
      return NextResponse.json({ success: false, error: 'Reviewer permission required' }, { status: 403 });
    }

    const params = await props.params;
    const body = await request.json();
    const parsed = reviewSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ success: false, error: parsed.error.issues }, { status: 400 });
    }

    const result = await waterService.reviewRepairClaim(
      session.userId,
      params.id,
      parsed.data.decision,
      parsed.data.reason
    );

    return NextResponse.json({ success: true, result });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 400 });
  }
}
