import { NextResponse } from 'next/server';
import { getSession } from '@/server/session';
import { electricityService } from '@/server/services/electricityService';
import { z } from 'zod';

const registerDeviceSchema = z.object({
  name: z.string().min(2),
  appliance: z.string().optional(),
  circuit: z.string().optional(),
  deviceType: z.string().optional(),
});

export async function GET() {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const devices = await electricityService.getUserDevices(session.userId);
    return NextResponse.json({ success: true, devices });
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
    const parsed = registerDeviceSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ success: false, error: parsed.error.issues }, { status: 400 });
    }

    const device = await electricityService.registerDevice(session.userId, parsed.data);
    return NextResponse.json({ success: true, device }, { status: 201 });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
