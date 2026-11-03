import { NextResponse } from 'next/server';
import { getSession } from '@/server/session';
import { commuteService } from '@/server/services/commuteService';

export async function GET(
  request: Request,
  props: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();
    const params = await props.params;

    const challenge = await commuteService.getChallengeWithUserProgress(params.id, session?.userId);
    if (!challenge) {
      return NextResponse.json({ success: false, error: 'Challenge not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true, challenge });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
