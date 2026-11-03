import { NextResponse } from 'next/server';
import { foodService } from '@/server/services/foodService';

export async function GET() {
  try {
    const parcels = await foodService.listDonationParcels();
    return NextResponse.json({ success: true, parcels });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
