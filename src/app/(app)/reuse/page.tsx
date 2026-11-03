import Link from 'next/link'
import { getSession } from '@/server/session'
import { prisma } from '@/server/db'
import StampCard from '@/components/wallet/StampCard'
import { ArrowLeft, ShoppingBag, QrCode, Ticket, Sparkles, ArrowRight } from 'lucide-react'

export const dynamic = 'force-dynamic'

export default async function ReusePage() {
  const session = await getSession()

  // 1. Fetch active offers in REUSE campaigns
  const offers = await prisma.offer.findMany({
    where: {
      active: true,
      campaign: {
        section: 'REUSE',
        status: 'ACTIVE',
      },
    },
    include: {
      partner: { select: { id: true, name: true, isSimulated: true } },
      campaign: { select: { id: true, name: true } },
    },
    orderBy: { createdAt: 'desc' },
  })

  // 2. Fetch user's active stamp cards
  const userCards = session?.userId
    ? await prisma.stampCard.findMany({
        where: { userId: session.userId },
        include: {
          offer: {
            include: { partner: true },
          },
        },
      })
    : []

  const userCardsMap = Object.fromEntries(userCards.map(c => [c.offerId, c]))

  return (
    <div className="space-y-8 font-body">
      {/* Header */}
      <div>
        <Link
          href="/home"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-emerald-700 transition-colors mb-3"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to Challenges</span>
        </Link>
        <div className="flex items-center gap-2 text-xs font-semibold text-emerald-700 bg-emerald-50 w-fit px-3 py-1 rounded-full border border-emerald-200 mb-2">
          <Sparkles className="w-3.5 h-3.5" />
          <span>Zero Single-Use Plastic</span>
        </div>
        <h1 className="font-display text-3xl sm:text-4xl font-bold text-slate-900 tracking-tight">
          Reuse &amp; Earn
        </h1>
        <p className="text-slate-600 text-sm mt-1">
          Bring your own bag or cup to partner stores across Chennai, collect stamps, and earn Green Points.
        </p>
      </div>

      {/* How it works Banner */}
      <div className="bg-gradient-to-r from-emerald-50 via-white to-slate-50 border border-emerald-200/80 rounded-2xl p-6 shadow-xs">
        <h2 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-4">
          How Reuse &amp; Earn Works
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-white rounded-xl p-4 border border-slate-200/80 shadow-2xs">
            <div className="w-10 h-10 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center mb-2">
              <ShoppingBag className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-slate-900 text-sm">1. Bring Bag</h3>
            <p className="text-slate-500 text-xs mt-1">Refuse plastic bag at partner checkout counter.</p>
          </div>
          <div className="bg-white rounded-xl p-4 border border-slate-200/80 shadow-2xs">
            <div className="w-10 h-10 rounded-lg bg-blue-50 text-blue-700 flex items-center justify-center mb-2">
              <QrCode className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-slate-900 text-sm">2. Scan Merchant QR</h3>
            <p className="text-slate-500 text-xs mt-1">Scan the counter QR or show your citizen claim code.</p>
          </div>
          <div className="bg-white rounded-xl p-4 border border-slate-200/80 shadow-2xs">
            <div className="w-10 h-10 rounded-lg bg-amber-50 text-amber-700 flex items-center justify-center mb-2">
              <Ticket className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-slate-900 text-sm">3. Earn Points</h3>
            <p className="text-slate-500 text-xs mt-1">10 pts per stamp · +40 bonus at 5 stamps.</p>
          </div>
        </div>
      </div>

      {/* User Active Stamp Cards */}
      {userCards.length > 0 && (
        <section>
          <h2 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-4">
            Your Active Stamp Cards
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {userCards.map(card => (
              <div key={card.id} className="space-y-2">
                <StampCard
                  offerName={card.offer.name}
                  partnerName={card.offer.partner.name}
                  currentStamps={card.stamps}
                  stampsNeeded={card.offer.stampsNeeded}
                  voucherValuePaise={card.offer.voucherValuePaise}
                  isSimulated={card.offer.partner.isSimulated}
                  completedAt={card.completedAt}
                />
                <div className="text-right">
                  <Link
                    href={`/reuse/${card.offerId}`}
                    className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-700 hover:text-emerald-800"
                  >
                    <span>Scan at counter</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* All Available Reuse Offers */}
      <section>
        <h2 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-4">
          Available Partner Stamp Offers
        </h2>
        {offers.length === 0 ? (
          <div className="bg-white border border-slate-200/90 rounded-2xl p-8 text-center text-slate-500 text-sm shadow-xs">
            No active reuse offers at this moment. Check back soon.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {offers.map(offer => {
              const userCard = userCardsMap[offer.id]
              return (
                <div
                  key={offer.id}
                  className="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-xs flex flex-col justify-between hover:border-emerald-300 transition-colors"
                >
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200">
                        {offer.partner.name}
                      </span>
                      {offer.partner.isSimulated && (
                        <span className="text-[10px] uppercase font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                          Simulated
                        </span>
                      )}
                    </div>
                    <h3 className="font-display font-bold text-slate-900 text-lg">{offer.name}</h3>
                    <p className="text-slate-500 text-xs mt-1">
                      10 pts per stamp · +40 bonus at {offer.stampsNeeded} stamps.
                    </p>
                  </div>

                  <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between">
                    <span className="text-xs text-slate-500">
                      {userCard ? `${userCard.stamps}/${offer.stampsNeeded} collected` : 'Not started'}
                    </span>
                    <Link
                      href={`/reuse/${offer.id}`}
                      className="px-4 py-2 rounded-xl text-xs font-semibold bg-emerald-700 hover:bg-emerald-600 text-white transition-colors"
                    >
                      {userCard ? 'View Card →' : 'Start Card →'}
                    </Link>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </section>
    </div>
  )
}
