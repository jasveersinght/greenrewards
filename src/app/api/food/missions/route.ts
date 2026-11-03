import { NextResponse } from 'next/server';
import { getSession } from '@/server/session';
import { foodService } from '@/server/services/foodService';
import { prisma } from '@/server/db';
import { z } from 'zod';

const claimSchema = z.object({
  parcelId: z.string().min(1),
});

export async function GET() {
  try {
    const missions = await prisma.deliveryMission.findMany({
      include: {
        volunteer: true,
        parcel: {
          include: {
            partner: true,
            listing: true,
          },
        },
      },
      orderBy: { acceptedAt: 'desc' },
    });
    return NextResponse.json({ success: true, missions });
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

    const mission = await foodService.claimDeliveryMission(session.userId, parsed.data.parcelId);
    return NextResponse.json({ success: true, mission }, { status: 201 });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 400 });
  }
}
