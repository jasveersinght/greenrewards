import { getSession } from '@/server/session';
import { getLedgerHistory, getWalletBalance } from '@/server/services/walletService';
import { getUserCoupons } from '@/server/services/couponService';
import WalletView from '@/components/wallet/WalletView';

export default async function WalletPage() {
  const session = await getSession();
  if (!session) return null;

  // Lazy settlement and lazy refund run automatically inside getWalletBalance and getUserCoupons
  const [balance, entries, coupons] = await Promise.all([
    getWalletBalance(session.userId),
    getLedgerHistory(session.userId, { take: 50 }),
    getUserCoupons(session.userId),
  ]);

  const initialBalance = {
    availablePoints: balance.availablePoints,
    pendingPoints: balance.pendingPoints,
    expiringSoonPoints: balance.expiringSoonPoints,
    stamps: balance.stamps,
    pendingLots: balance.pendingLots.map((lot) => ({
      amountPoints: lot.amountPoints,
      availableAt: lot.availableAt.toISOString(),
      refType: lot.refType,
      refId: lot.refId,
    })),
  };

  const initialCoupons = coupons.map((r) => ({
    id: r.id,
    code: r.couponCode.code,
    status: r.couponCode.status as any,
    assignedAt: r.couponCode.assignedAt ? r.couponCode.assignedAt.toISOString() : null,
    expiresAt: r.couponCode.expiresAt ? r.couponCode.expiresAt.toISOString() : null,
    usedAt: r.couponCode.usedAt ? r.couponCode.usedAt.toISOString() : null,
    catalogItem: {
      id: r.catalogItem.id,
      title: r.catalogItem.title,
      description: r.catalogItem.description,
      pointsPrice: r.catalogItem.pointsPrice,
      faceValueText: r.catalogItem.faceValueText,
      minSpendText: r.catalogItem.minSpendText,
      validMerchantIds: r.catalogItem.validMerchantIds,
      kind: r.catalogItem.kind as any,
      funder: {
        name: r.catalogItem.funder.name,
        isSimulated: r.catalogItem.funder.isSimulated,
      },
    },
  }));

  const initialLedger = entries.map((e) => ({
    id: e.id,
    type: e.type,
    account: e.account,
    entrySide: e.entrySide ?? null,
    amountPoints: e.amountPoints ?? 0,
    stamps: e.stamps ?? null,
    note: e.note ?? null,
    createdAt: e.createdAt.toISOString(),
    campaign: e.campaign ? { name: e.campaign.name } : null,
  }));

  return (
    <WalletView
      initialBalance={initialBalance}
      initialCoupons={initialCoupons}
      initialLedger={initialLedger}
    />
  );
}
