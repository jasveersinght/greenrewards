import Link from 'next/link'
import { getSession } from '@/server/session'
import { prisma } from '@/server/db'
import { Camera, QrCode, CheckCircle2, Award, ArrowRight } from 'lucide-react'

export const dynamic = 'force-dynamic'

export default async function MerchantDashboardPage() {
  const session = await getSession()
  if (!session) return null

  const partnerId = session.partnerIds[0]

  // Count confirmed claims at this partner
  const [confirmedCount, activeOffers, recentClaims] = await Promise.all([
    prisma.claim.count({
      where: {
        status: 'CONFIRMED',
        offer: partnerId ? { partnerId } : undefined,
      },
    }),
    prisma.offer.findMany({
      where: {
        active: true,
        partnerId: partnerId ?? undefined,
      },
      include: { campaign: true },
    }),
    prisma.claim.findMany({
      where: {
        status: 'CONFIRMED',
        offer: partnerId ? { partnerId } : undefined,
      },
      include: {
        user: { select: { displayName: true, locality: true } },
        offer: { select: { name: true } },
      },
      orderBy: { usedAt: 'desc' },
      take: 10,
    }),
  ])

  return (
    <div className="space-y-8 font-body">
      {/* Quick Action Hero */}
      <div className="bg-gradient-to-r from-emerald-50 via-white to-slate-50 border border-emerald-200/80 rounded-2xl p-6 sm:p-8 text-center shadow-xs">
        <div className="w-16 h-16 bg-emerald-100 text-emerald-800 rounded-2xl flex items-center justify-center text-3xl mx-auto mb-3 shadow-2xs">
          📷
        </div>
        <h2 className="font-display text-2xl sm:text-3xl font-bold text-slate-900">Customer at Checkout?</h2>
        <p className="text-slate-600 text-xs sm:text-sm mt-1 max-w-md mx-auto">
          Scan customer&apos;s 120-second dynamic QR code to verify reusable bag and issue stamp.
        </p>

        <div className="mt-5 max-w-sm mx-auto">
          <Link
            href="/merchant/scan"
            className="w-full py-3.5 px-6 bg-emerald-700 hover:bg-emerald-600 text-white font-semibold rounded-xl text-sm shadow-md flex items-center justify-center gap-2 transition-all cursor-pointer"
          >
            <Camera className="w-4 h-4" />
            <span>Open Scanner / Enter Code</span>
          </Link>
        </div>
      </div>

      {/* Stats Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-xs">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Stamps Issued</p>
          <p className="font-display text-3xl font-bold text-emerald-700 mt-2">{confirmedCount}</p>
          <p className="text-xs text-slate-400 mt-0.5">Reusable actions confirmed</p>
        </div>

        <div className="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-xs">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Active Offers</p>
          <p className="font-display text-3xl font-bold text-slate-900 mt-2">{activeOffers.length}</p>
          <p className="text-xs text-slate-400 mt-0.5">Participating in Reuse &amp; Earn</p>
        </div>
      </div>

      {/* Active Store Offers */}
      <section>
        <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-4">
          Your Active Store Offers
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {activeOffers.map(o => (
            <div key={o.id} className="bg-white border border-slate-200/90 rounded-2xl p-5 flex items-center justify-between shadow-xs">
              <div>
                <p className="font-display font-bold text-slate-900 text-base">{o.name}</p>
                <p className="text-xs text-slate-500 mt-0.5">{o.rewardText}</p>
              </div>
              <span className="text-xs font-semibold text-emerald-800 bg-emerald-50 border border-emerald-200 px-3 py-1 rounded-full">
                {o.stampsNeeded} Stamps = ₹{(o.voucherValuePaise / 100).toFixed(0)}
              </span>
            </div>
          ))}
        </div>
      </section>

      {/* Recent Confirmed Transactions */}
      <section>
        <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-4">
          Recent Confirmations
        </h3>

        {recentClaims.length === 0 ? (
          <div className="bg-white border border-slate-200/90 rounded-2xl p-8 text-center text-slate-400 text-xs shadow-xs">
            No stamps confirmed yet today.
          </div>
        ) : (
          <div className="bg-white border border-slate-200/90 rounded-2xl divide-y divide-slate-100 overflow-hidden shadow-xs">
            {recentClaims.map(c => (
              <div key={c.id} className="p-4 flex items-center justify-between text-xs">
                <div>
                  <p className="font-bold text-slate-900 text-sm">
                    {c.user.displayName ?? 'Customer'}
                    <span className="text-slate-400 font-normal text-xs ml-1.5">({c.user.locality ?? 'Chennai'})</span>
                  </p>
                  <p className="text-xs text-slate-500 mt-0.5">
                    {c.offer.name}
                    {c.receiptRef && <span className="ml-1 text-slate-400">· #{c.receiptRef}</span>}
                  </p>
                </div>
                <div className="text-right">
                  <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200">
                    +1 Stamp
                  </span>
                  <p className="text-[11px] text-slate-400 mt-1">
                    {c.usedAt ? new Date(c.usedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '—'}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  )
}
