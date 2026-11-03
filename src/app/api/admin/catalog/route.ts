import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getSession } from '@/server/session';
import { prisma } from '@/server/db';

const createCatalogSchema = z.object({
  funderId: z.string().min(1),
  title: z.string().min(3),
  description: z.string().min(5),
  pointsPrice: z.number().int().positive(),
  faceValueText: z.string().min(2),
  minSpendText: z.string().optional(),
  validMerchantIds: z.string().optional(),
  stockTotal: z.number().int().nonnegative(),
  perUserLimit: z.number().int().positive().default(1),
  validUntil: z.string().transform((v) => new Date(v)),
  kind: z.enum(['PLATFORM_QR', 'IMPORTED_CODE']).default('PLATFORM_QR'),
  funderCostPaise: z.number().int().nonnegative().default(0),
  isActive: z.boolean().default(true),
});

export async function GET(_req: NextRequest) {
  const session = await getSession();
  if (!session?.userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  if (!session.roles.includes('ADMIN')) {
    return NextResponse.json({ error: 'Forbidden: Admin role required' }, { status: 403 });
  }

  const items = await prisma.couponCatalogItem.findMany({
    include: {
      funder: true,
      _count: {
        select: {
          codes: true,
          redemptions: true,
        },
      },
    },
    orderBy: { createdAt: 'desc' },
  });

  return NextResponse.json({ items });
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session?.userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  if (!session.roles.includes('ADMIN')) {
    return NextResponse.json({ error: 'Forbidden: Admin role required' }, { status: 403 });
  }

  const body = await req.json().catch(() => null);
  const parsed = createCatalogSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Invalid input', details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const data = parsed.data;

  const item = await prisma.couponCatalogItem.create({
    data: {
      funderId: data.funderId,
      title: data.title,
      description: data.description,
      pointsPrice: data.pointsPrice,
      faceValueText: data.faceValueText,
      minSpendText: data.minSpendText ?? null,
      validMerchantIds: data.validMerchantIds ?? null,
      stockTotal: data.stockTotal,
      stockRemaining: data.stockTotal,
      perUserLimit: data.perUserLimit,
      validUntil: data.validUntil,
      kind: data.kind,
      funderCostPaise: data.funderCostPaise,
      isActive: data.isActive,
    },
  });

  return NextResponse.json(item, { status: 201 });
}
