import { NextResponse } from 'next/server';
import { getSession } from '@/server/session';
import { commuteService } from '@/server/services/commuteService';

export async function GET() {
  try {
    const session = await getSession();
    const challenges = await commuteService.getChallenges();

    // If user is logged in, attach their progress
    const challengesWithProgress = await Promise.all(
      challenges.map(async (c) => {
        const detail = await commuteService.getChallengeWithUserProgress(c.id, session?.userId);
        return detail || c;
      })
    );

    return NextResponse.json({ success: true, challenges: challengesWithProgress });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
