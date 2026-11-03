import Link from 'next/link'
import { getSession } from '@/server/session'
import { prisma } from '@/server/db'
import CommuteReviewCard from '@/components/reviewer/CommuteReviewCard'
import WaterReviewCard from '@/components/reviewer/WaterReviewCard'
import { CheckCircle2, Droplets, Wrench, Bus, ArrowRight } from 'lucide-react'

export const dynamic = 'force-dynamic'

export default async function ReviewerQueuePage() {
  const session = await getSession()
  if (!session) return null

  // Fetch pending review items
  const [submittedCases, repairedCases, pendingTickets, pendingWaterClaims] = await Promise.all([
    prisma.leakCase.findMany({
      where: { status: 'SUBMITTED' },
      include: {
        reports: {
          include: { user: { select: { id: true, displayName: true } } },
          orderBy: { submittedAt: 'asc' },
        },
      },
      orderBy: { createdAt: 'asc' },
    }),
    prisma.leakCase.findMany({
      where: { status: 'REPAIRED' },
      include: {
        reports: {
          include: { user: { select: { id: true, displayName: true } } },
          orderBy: { submittedAt: 'asc' },
        },
        events: { where: { eventType: 'REPAIR_UPLOADED' }, take: 1 },
      },
      orderBy: { updatedAt: 'asc' },
    }),
    prisma.ticketSubmission.findMany({
      where: { status: 'SUBMITTED' },
      include: {
        user: { select: { id: true, displayName: true, email: true } },
        challenge: true,
      },
      orderBy: { createdAt: 'asc' },
    }),
    prisma.repairClaim.findMany({
      where: { status: 'PENDING' },
      include: {
        user: { select: { id: true, displayName: true, email: true } },
        household: true,
      },
      orderBy: { createdAt: 'asc' },
    }),
  ])

  return (
    <div className="space-y-8 font-body">
      <div>
        <h1 className="font-display text-2xl sm:text-3xl font-bold text-slate-900 flex items-center gap-2">
          <span>📋</span>
          <span>Verification Queue</span>
        </h1>
        <p className="text-xs sm:text-sm text-slate-500 mt-1">
          Evaluate public submissions and award verified Green Points across Chennai.
        </p>
      </div>

      {/* Counters */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white border border-amber-200/90 rounded-2xl p-5 shadow-xs">
          <p className="text-xs text-amber-800 uppercase tracking-wider font-bold">Tier 1: Reports</p>
          <p className="font-display text-3xl font-bold text-slate-900 mt-1">{submittedCases.length}</p>
          <p className="text-xs text-slate-400 mt-0.5">50 Green Points per accepted report</p>
        </div>

        <div className="bg-white border border-blue-200/90 rounded-2xl p-5 shadow-xs">
          <p className="text-xs text-blue-800 uppercase tracking-wider font-bold">Tier 2: Repairs</p>
          <p className="font-display text-3xl font-bold text-slate-900 mt-1">{repairedCases.length}</p>
          <p className="text-xs text-slate-400 mt-0.5">100 Green Points per verified repair</p>
        </div>

        <div className="bg-white border border-purple-200/90 rounded-2xl p-5 shadow-xs">
          <p className="text-xs text-purple-800 uppercase tracking-wider font-bold">Commute Tickets</p>
          <p className="font-display text-3xl font-bold text-slate-900 mt-1">{pendingTickets.length}</p>
          <p className="text-xs text-slate-400 mt-0.5">5-Trip Challenge audit queue</p>
        </div>
      </div>

      {/* Section 1: Initial Leak Reports Awaiting Review */}
      <section>
        <h2 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-4">
          Initial Leak Reports ({submittedCases.length})
        </h2>

        {submittedCases.length === 0 ? (
          <div className="bg-white border border-slate-200/90 rounded-2xl p-8 text-center text-slate-500 text-xs shadow-xs">
            ✓ All incoming leak reports have been reviewed!
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {submittedCases.map(c => {
              const primary = c.reports[0]
              return (
                <div key={c.id} className="bg-white border border-slate-200/90 rounded-2xl p-5 space-y-3 shadow-xs">
                  <div className="flex items-start gap-3.5">
                    {primary?.photoUrl && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={primary.photoUrl}
                        alt="Leak evidence"
                        className="w-16 h-16 rounded-xl object-cover bg-slate-100 border border-slate-200 shrink-0"
                      />
                    )}
                    <div className="flex-1 min-w-0 text-xs">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-slate-900 uppercase tracking-wider text-[11px]">
                          {c.category}
                        </span>
                        <span className="text-[10px] text-amber-800 bg-amber-50 border border-amber-200 px-2.5 py-0.5 rounded-full font-bold">
                          Needs Decision
                        </span>
                      </div>
                      <p className="text-slate-600 mt-1 line-clamp-2 leading-relaxed">{c.description}</p>
                      <p className="text-slate-400 text-[11px] mt-1.5">
                        By {primary?.user.displayName ?? 'Citizen'} · {c.reports.length} merged report{c.reports.length > 1 ? 's' : ''}
                      </p>
                    </div>
                  </div>

                  <div className="pt-3 border-t border-slate-100 flex justify-end">
                    <Link
                      href={`/reviewer/leaks/${c.id}`}
                      className="px-4 py-2 bg-emerald-700 hover:bg-emerald-600 text-white text-xs font-semibold rounded-xl transition-colors shadow-2xs"
                    >
                      Open Decision Review →
                    </Link>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </section>

      {/* Section 2: Repairs Awaiting Closure Verification */}
      <section>
        <h2 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-4">
          Repaired Leaks Awaiting Closure ({repairedCases.length})
        </h2>

        {repairedCases.length === 0 ? (
          <div className="bg-white border border-slate-200/90 rounded-2xl p-8 text-center text-slate-500 text-xs shadow-xs">
            No completed repairs pending closure verification.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {repairedCases.map(c => {
              const repairEvt = c.events[0]
              return (
                <div key={c.id} className="bg-white border border-slate-200/90 rounded-2xl p-5 space-y-3 shadow-xs">
                  <div className="flex items-start gap-3.5">
                    {repairEvt?.evidenceUrl && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={repairEvt.evidenceUrl}
                        alt="Repair photo"
                        className="w-16 h-16 rounded-xl object-cover bg-slate-100 border border-slate-200 shrink-0"
                      />
                    )}
                    <div className="flex-1 min-w-0 text-xs">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-slate-900">{c.category}</span>
                        <span className="text-[10px] text-purple-800 bg-purple-50 border border-purple-200 px-2.5 py-0.5 rounded-full font-bold">
                          Repaired
                        </span>
                      </div>
                      <p className="text-slate-600 mt-1 line-clamp-1">{repairEvt?.note ?? 'Repair completed'}</p>
                    </div>
                  </div>

                  <div className="pt-3 border-t border-slate-100 flex justify-end">
                    <Link
                      href={`/reviewer/leaks/${c.id}`}
                      className="px-4 py-2 bg-emerald-700 hover:bg-emerald-600 text-white text-xs font-semibold rounded-xl transition-colors shadow-2xs"
                    >
                      Verify Closure &amp; Pay Bonus →
                    </Link>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </section>

      {/* Section 3: Transit Tickets Awaiting Verification */}
      <section>
        <h2 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-4">
          Commute Tickets Pending Review ({pendingTickets.length})
        </h2>

        {pendingTickets.length === 0 ? (
          <div className="bg-white border border-slate-200/90 rounded-2xl p-8 text-center text-slate-500 text-xs shadow-xs">
            ✓ No transit tickets currently waiting for review.
          </div>
        ) : (
          <div className="space-y-3">
            {pendingTickets.map((t) => (
              <CommuteReviewCard key={t.id} ticket={t} />
            ))}
          </div>
        )}
      </section>

      {/* Section 4: Home Plumbing Repair Claims */}
      <section>
        <h2 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-4">
          Plumbing Repair Claims Pending Review ({pendingWaterClaims.length})
        </h2>

        {pendingWaterClaims.length === 0 ? (
          <div className="bg-white border border-slate-200/90 rounded-2xl p-8 text-center text-slate-500 text-xs shadow-xs">
            ✓ No plumbing repair claims currently waiting for review.
          </div>
        ) : (
          <div className="space-y-3">
            {pendingWaterClaims.map((claim) => (
              <WaterReviewCard key={claim.id} claim={claim} />
            ))}
          </div>
        )}
      </section>
    </div>
  )
}
