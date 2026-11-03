import Link from 'next/link'
import { getSession } from '@/server/session'
import { prisma } from '@/server/db'
import { ArrowLeft, Droplets, Camera, CheckCircle2, Sparkles, MapPin, ArrowRight } from 'lucide-react'

export const dynamic = 'force-dynamic'

export default async function LeakPage() {
  const session = await getSession()

  // 1. Fetch active leak campaign
  const campaign = await prisma.campaign.findFirst({
    where: { section: 'LEAK', status: 'ACTIVE' },
    include: { funder: true },
  })

  // 2. Fetch all public leak cases
  const allCases = await prisma.leakCase.findMany({
    include: {
      reports: {
        include: { user: { select: { id: true, displayName: true, locality: true } } },
        orderBy: { submittedAt: 'asc' },
      },
      events: { orderBy: { createdAt: 'desc' }, take: 1 },
    },
    orderBy: { createdAt: 'desc' },
    take: 20,
  })

  const myCases = session?.userId
    ? allCases.filter(c => c.reports.some(r => r.userId === session.userId))
    : []

  const STATUS_CONFIG: Record<string, { label: string; badge: string }> = {
    SUBMITTED: { label: 'Under Review', badge: 'bg-amber-50 text-amber-700 border-amber-200' },
    ACCEPTED: { label: 'Accepted · 50 GP Credited', badge: 'bg-emerald-50 text-emerald-800 border-emerald-200' },
    ASSIGNED: { label: 'Plumber Assigned', badge: 'bg-blue-50 text-blue-700 border-blue-200' },
    REPAIRED: { label: 'Repaired · Verifying', badge: 'bg-purple-50 text-purple-700 border-purple-200' },
    VERIFIED_CLOSED: { label: 'Verified Closed · 150 GP Total', badge: 'bg-emerald-100 text-emerald-900 border-emerald-300' },
    REJECTED: { label: 'Rejected', badge: 'bg-rose-50 text-rose-700 border-rose-200' },
    NEEDS_INFO: { label: 'Needs Info', badge: 'bg-orange-50 text-orange-700 border-orange-200' },
  }

  const CATEGORY_ICONS: Record<string, string> = {
    ROAD: '🛣️ Road / Footpath',
    STATION: '🚉 Station / Stand',
    PARK: '🌳 Public Park',
    OTHER_PUBLIC: '🏛️ Public Area',
  }

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
        <div className="flex items-center gap-2 text-xs font-semibold text-blue-700 bg-blue-50 w-fit px-3 py-1 rounded-full border border-blue-200 mb-2">
          <Droplets className="w-3.5 h-3.5" />
          <span>Civic Water Protection</span>
        </div>
        <h1 className="font-display text-3xl sm:text-4xl font-bold text-slate-900 tracking-tight">
          Leak Hunter
        </h1>
        <p className="text-slate-600 text-sm mt-1">
          Report public water pipeline leaks across Chennai, track repairs, and earn Green Points.
        </p>
      </div>

      {/* Campaign Hero Card */}
      <div className="bg-gradient-to-r from-blue-50 via-white to-slate-50 border border-blue-200/80 rounded-2xl p-6 sm:p-8 shadow-xs relative overflow-hidden">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="max-w-xl">
            <span className="px-3 py-1 bg-blue-100 text-blue-800 font-semibold text-xs rounded-full border border-blue-200">
              {campaign?.funder.name ?? 'Chennai Metro Water'}
              {campaign?.funder.isSimulated && ' (Simulated)'}
            </span>
            <h2 className="font-display text-2xl sm:text-3xl font-bold text-slate-900 mt-3">
              {campaign?.name ?? 'Chennai Public Pipeline Leak Hunt'}
            </h2>
            <p className="text-slate-600 text-sm mt-2 leading-relaxed">
              Spot a burst pipe, leaking main line, or leaking public meter on roads or railway stations? Upload a photo with location tag to alert municipal maintenance.
            </p>
          </div>

          <div className="shrink-0 flex flex-col sm:flex-row md:flex-col gap-3">
            <Link
              href="/leak/report"
              className="inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-full bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm shadow-md transition-all cursor-pointer"
            >
              <Camera className="w-4 h-4" />
              <span>Report a Leak Now</span>
            </Link>
          </div>
        </div>

        {/* Two-Tier Reward Breakdown */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-6">
          <div className="bg-white border border-slate-200/80 rounded-xl p-4 shadow-2xs">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Tier 1: Review</span>
            <p className="font-display text-2xl font-bold text-emerald-700 mt-1">50 pts accepted</p>
            <p className="text-xs text-slate-500 mt-0.5">Credited when municipal reviewers accept valid report</p>
          </div>
          <div className="bg-white border border-slate-200/80 rounded-xl p-4 shadow-2xs">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Tier 2: Verified Fixed</span>
            <p className="font-display text-2xl font-bold text-emerald-700 mt-1">+100 when repaired</p>
            <p className="text-xs text-slate-500 mt-0.5">Credited when maintenance confirms permanent fix</p>
          </div>
        </div>
      </div>

      {/* My Reports */}
      {myCases.length > 0 && (
        <section>
          <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-4">
            My Reported Leaks ({myCases.length})
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {myCases.map(c => {
              const cfg = STATUS_CONFIG[c.status] ?? STATUS_CONFIG.SUBMITTED
              const primary = c.reports[0]
              return (
                <Link
                  key={c.id}
                  href={`/leak/${c.id}`}
                  className="bg-white border border-slate-200/90 rounded-2xl p-4 shadow-xs hover:border-blue-300 hover:shadow-md transition-all block group"
                >
                  <div className="flex items-start gap-3.5">
                    {primary?.photoUrl && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={primary.photoUrl}
                        alt="Leak photo"
                        className="w-16 h-16 rounded-xl object-cover bg-slate-100 border border-slate-200 shrink-0"
                      />
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-1">
                        <span className="text-xs font-bold text-slate-800">
                          {CATEGORY_ICONS[c.category] ?? c.category}
                        </span>
                        <span className={`text-[10px] px-2.5 py-0.5 rounded-full font-bold border ${cfg.badge}`}>
                          {cfg.label}
                        </span>
                      </div>
                      <p className="text-xs text-slate-600 mt-1 line-clamp-1">{c.description}</p>
                      <p className="text-[11px] text-slate-400 mt-1">
                        Reported on {new Date(c.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                </Link>
              )
            })}
          </div>
        </section>
      )}

      {/* Active Public Cases Feed */}
      <section>
        <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-4">
          Active Community Leaks ({allCases.length})
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {allCases.map(c => {
            const cfg = STATUS_CONFIG[c.status] ?? STATUS_CONFIG.SUBMITTED
            return (
              <Link
                key={c.id}
                href={`/leak/${c.id}`}
                className="bg-white border border-slate-200/90 rounded-2xl p-4 shadow-xs hover:border-blue-300 hover:shadow-md transition-all flex flex-col justify-between group"
              >
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-bold text-slate-800">
                      {CATEGORY_ICONS[c.category] ?? c.category}
                    </span>
                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold border ${cfg.badge}`}>
                      {cfg.label}
                    </span>
                  </div>

                  <p className="text-xs text-slate-600 line-clamp-2 leading-relaxed">{c.description}</p>
                </div>

                <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
                  <span>
                    {c.reports.length} report{c.reports.length > 1 ? 's' : ''}
                    {c.reports.length > 1 && ' (Merged)'}
                  </span>
                  <span className="text-blue-600 font-semibold flex items-center gap-1 group-hover:text-blue-700">
                    <span>View Timeline</span>
                    <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
                  </span>
                </div>
              </Link>
            )
          })}
        </div>
      </section>
    </div>
  )
}
