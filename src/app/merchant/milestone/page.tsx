import { getSession } from '@/server/session'
import { prisma } from '@/server/db'

export const dynamic = 'force-dynamic'

export default async function MerchantMilestonePage() {
  const session = await getSession()
  if (!session) return null

  const partnerId = session.partnerIds[0]

  const milestone = partnerId
    ? await prisma.merchantMilestone.findFirst({
        where: { partnerId },
      })
    : null

  const partner = partnerId
    ? await prisma.partner.findUnique({
        where: { id: partnerId },
        select: { name: true, isSimulated: true },
      })
    : null

  const count = milestone?.count ?? 0

  const TIERS = [
    { target: 25, label: 'Bronze Partner', reward: 'Partner badge on map + listing priority' },
    { target: 50, label: 'Silver Partner', reward: 'Featured Eco-Partner promo in Chennai app' },
    { target: 100, label: 'Gold Partner', reward: 'Eco-Cell verified sustainable merchant certificate' },
    { target: 250, label: 'Green Champion', reward: 'Exclusive municipal sustainability sponsorship' },
  ]

  return (
    <div className="space-y-6 pb-12 font-body">
      <div>
        <h1 className="font-display text-2xl font-bold text-slate-900 flex items-center gap-2">
          <span>🏆</span>
          <span>Merchant Milestones</span>
        </h1>
        <p className="text-xs sm:text-sm text-slate-500 mt-1">
          {partner?.name ?? 'Store'} progress towards sustainable merchant awards
        </p>
      </div>

      {/* Progress Hero */}
      <div className="bg-gradient-to-br from-emerald-50 via-teal-50 to-white border border-emerald-200/90 rounded-3xl p-6 shadow-xs">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs text-emerald-800 font-bold uppercase tracking-wider">Total Verified Actions</p>
            <p className="text-4xl font-extrabold text-slate-900 font-display mt-1">{count}</p>
          </div>
          <div className="w-14 h-14 bg-emerald-100 text-emerald-800 rounded-2xl flex items-center justify-center text-2xl border border-emerald-200 shadow-2xs">
            🌱
          </div>
        </div>

        {milestone?.flaggedForAudit && (
          <div className="mt-4 p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-800">
            ℹ️ This partner has been queued for periodic automated verification check.
          </div>
        )}
      </div>

      {/* Milestone Tiers */}
      <div className="space-y-3">
        <h2 className="text-xs font-bold text-slate-500 uppercase tracking-wider">
          Achievement Tiers
        </h2>

        <div className="space-y-3">
          {TIERS.map((tier) => {
            const achieved = count >= tier.target
            const progress = Math.min(100, Math.round((count / tier.target) * 100))

            return (
              <div
                key={tier.target}
                className={`border rounded-2xl p-4 transition-all shadow-xs ${
                  achieved
                    ? 'bg-emerald-50/60 border-emerald-200'
                    : 'bg-white border-slate-200/90'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className="text-lg">{achieved ? '🎖️' : '🔒'}</span>
                    <h3 className="font-bold text-sm text-slate-900">{tier.label}</h3>
                  </div>
                  <span
                    className={`text-xs px-2.5 py-0.5 rounded-full font-semibold border ${
                      achieved
                        ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                        : 'bg-slate-100 text-slate-600 border-slate-200'
                    }`}
                  >
                    {achieved ? 'Achieved' : `${count}/${tier.target}`}
                  </span>
                </div>

                <p className="text-xs text-slate-600">{tier.reward}</p>

                {!achieved && (
                  <div className="mt-3">
                    <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                      <div
                        className="bg-emerald-600 h-1.5 rounded-full transition-all"
                        style={{ width: `${progress}%` }}
                      />
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
