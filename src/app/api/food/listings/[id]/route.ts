import { NextResponse } from 'next/server';
import { foodService } from '@/server/services/foodService';

export async function GET(request: Request, props: { params: Promise<{ id: string }> }) {
  try {
    const params = await props.params;
    const listing = await foodService.getListingById(params.id);
    if (!listing) {
      return NextResponse.json({ success: false, error: 'Listing not found' }, { status: 404 });
    }
    return NextResponse.json({ success: true, listing });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
