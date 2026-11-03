import { NextResponse } from 'next/server';
import { getSession } from '@/server/session';
import { commuteService } from '@/server/services/commuteService';
import { z } from 'zod';

const submitTicketSchema = z.object({
  challengeId: z.string().min(1),
  ticketId: z.string().min(2),
  journeyDate: z.string().datetime(),
  imageUrl: z.string().min(5),
});

export async function GET() {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const tickets = await commuteService.getUserTickets(session.userId);
    return NextResponse.json({ success: true, tickets });
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
    const parsed = submitTicketSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ success: false, error: parsed.error.issues }, { status: 400 });
    }

    const ticket = await commuteService.submitTicket(session.userId, {
      challengeId: parsed.data.challengeId,
      ticketId: parsed.data.ticketId,
      journeyDate: new Date(parsed.data.journeyDate),
      imageUrl: parsed.data.imageUrl,
    });

    return NextResponse.json({ success: true, ticket }, { status: 201 });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 400 });
  }
}
