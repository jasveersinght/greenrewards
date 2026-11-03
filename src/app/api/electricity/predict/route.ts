import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/server/session';
import { predictHouseholdBill, BillPredictionInput } from '@/server/services/billPredictor';

export async function POST(req: NextRequest) {
  try {
    const session = await getSession();
    const body = await req.json().catch(() => ({}));

    // Default inputs if not supplied
    const input: BillPredictionInput = {
      num_rooms: body.num_rooms != null ? Number(body.num_rooms) : 2,
      num_people: body.num_people != null ? Number(body.num_people) : 4,
      housearea: body.housearea != null ? Number(body.housearea) : 750,
      is_ac: body.is_ac != null ? body.is_ac : true,
      is_tv: body.is_tv != null ? body.is_tv : true,
      is_flat: body.is_flat != null ? body.is_flat : true,
      ave_monthly_income: body.ave_monthly_income != null ? Number(body.ave_monthly_income) : 25000,
      num_children: body.num_children != null ? Number(body.num_children) : 1,
      is_urban: body.is_urban != null ? body.is_urban : true,
      season: body.season || 'summer',
    };

    const prediction = predictHouseholdBill(input);

    return NextResponse.json({
      success: true,
      input,
      prediction,
    });
  } catch (err: any) {
    console.error('Error in /api/electricity/predict:', err);
    return NextResponse.json(
      { error: err.message || 'Failed to compute bill prediction' },
      { status: 500 }
    );
  }
}

export async function GET() {
  // Provide baseline defaults
  const baseline = predictHouseholdBill({
    num_rooms: 2,
    num_people: 4,
    housearea: 750,
    is_ac: true,
    is_tv: true,
    is_flat: true,
    ave_monthly_income: 25000,
    num_children: 1,
    is_urban: true,
    season: 'summer',
  });

  return NextResponse.json({
    success: true,
    baseline,
  });
}
