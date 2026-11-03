import { NextResponse } from 'next/server';
import { getSession } from '@/server/session';
import { foodService } from '@/server/services/foodService';
import { prisma } from '@/server/db';

export async function POST(
  request: Request,
  props: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const params = await props.params;

    // Find the partner ID associated with the logged-in merchant/admin
    let partnerId = session.partnerIds?.[0] || null;
    if (!partnerId) {
      const grant = await prisma.roleGrant.findFirst({
        where: { userId: session.userId, partnerId: { not: null } },
      });
      partnerId = grant?.partnerId || null;
    }

    // In demo environment, if still not found, allow demo partner (Chennai Java Cafe or Bakery)
    if (!partnerId) {
      const demoPartner = await prisma.partner.findFirst({
        where: { type: 'MERCHANT' },
      });
      partnerId = demoPartner?.id || null;
    }

    if (!partnerId) {
      return NextResponse.json(
        { success: false, error: 'No associated merchant partner found for this user' },
        { status: 403 }
      );
    }

    const reservation = await foodService.confirmPickup(partnerId, params.id);
    return NextResponse.json({ success: true, reservation });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 400 });
  }
}
