import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getSession } from '@/server/session';
import { prisma } from '@/server/db';

const codesSchema = z.object({
  codes: z.array(z.string().min(1)),
});

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: catalogItemId } = await params;
  const session = await getSession();
  if (!session?.userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  if (!session.roles.includes('ADMIN')) {
    return NextResponse.json({ error: 'Forbidden: Admin role required' }, { status: 403 });
  }

  const catalogItem = await prisma.couponCatalogItem.findUnique({
    where: { id: catalogItemId },
  });

  if (!catalogItem) {
    return NextResponse.json({ error: 'Catalog item not found' }, { status: 404 });
  }

  const body = await req.json().catch(() => null);
  const parsed = codesSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Invalid input', details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const { codes } = parsed.data;

  // Insert codes
  const createdCodes = await prisma.$transaction(async (tx) => {
    let inserted = 0;
    for (const code of codes) {
      const cleanCode = code.trim().toUpperCase();
      if (!cleanCode) continue;

      const existing = await tx.couponCode.findUnique({ where: { code: cleanCode } });
      if (!existing) {
        await tx.couponCode.create({
          data: {
            catalogItemId,
            code: cleanCode,
            status: 'AVAILABLE',
          },
        });
        inserted++;
      }
    }

    // Update stock total and stock remaining
    await tx.couponCatalogItem.update({
      where: { id: catalogItemId },
      data: {
        stockTotal: { increment: inserted },
        stockRemaining: { increment: inserted },
      },
    });

    return inserted;
  });

  return NextResponse.json({ success: true, count: createdCodes }, { status: 201 });
}
