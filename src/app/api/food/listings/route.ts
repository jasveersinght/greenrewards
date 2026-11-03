import { NextResponse } from 'next/server';
import { getSession } from '@/server/session';
import { foodService } from '@/server/services/foodService';
import { z } from 'zod';

const createListingSchema = z.object({
  partnerId: z.string().min(1),
  type: z.enum(['SALE', 'DONATION']),
  item: z.string().min(2),
  quantity: z.number().int().positive(),
  originalPricePaise: z.number().int().nonnegative().optional(),
  discountedPricePaise: z.number().int().nonnegative().optional(),
  pickupStart: z.string().datetime().optional(),
  pickupEnd: z.string().datetime().optional(),
  ingredients: z.string().optional(),
  allergens: z.array(z.string()).optional(),
  consumeBy: z.string().datetime().optional(),
  handlingNeeds: z.string().optional(),
});

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type') as 'SALE' | 'DONATION' | null;
    const partnerId = searchParams.get('partnerId') ?? undefined;
    const activeOnly = searchParams.get('activeOnly') !== 'false';

    const listings = await foodService.listListings({
      type: type || undefined,
      partnerId,
      activeOnly,
    });

    return NextResponse.json({ success: true, listings });
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
    const parsed = createListingSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ success: false, error: parsed.error.issues }, { status: 400 });
    }

    const listing = await foodService.createListing({
      ...parsed.data,
      pickupStart: parsed.data.pickupStart ? new Date(parsed.data.pickupStart) : undefined,
      pickupEnd: parsed.data.pickupEnd ? new Date(parsed.data.pickupEnd) : undefined,
      consumeBy: parsed.data.consumeBy ? new Date(parsed.data.consumeBy) : undefined,
    });

    return NextResponse.json({ success: true, listing }, { status: 201 });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
