import React from 'react'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { getLeakCaseById } from '@/server/services/leakService'
import { getSession } from '@/server/session'
import { ArrowLeft } from 'lucide-react'

export const dynamic = 'force-dynamic'

export default async function LeakCaseDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const session = await getSession()
  const leakCase = await getLeakCaseById(id)

  if (!leakCase) {
    notFound()
  }

  const primaryReport = leakCase.reports[0]
  const repairEvent = leakCase.events.find(e => e.eventType === 'REPAIR_UPLOADED')
  const isAccepted = ['ACCEPTED', 'ASSIGNED', 'REPAIRED', 'VERIFIED_CLOSED'].includes(leakCase.status)
  const isVerifiedClosed = leakCase.status === 'VERIFIED_CLOSED'

  const STATUS_CONFIG: Record<string, { label: string; badge: string }> = {
    SUBMITTED: { label: 'Under Review', badge: 'bg-amber-50 text-amber-800 border-amber-200' },
    ACCEPTED: { label: 'Accepted · ₹100 Credited', badge: 'bg-emerald-50 text-emerald-800 border-emerald-200' },
    ASSIGNED: { label: 'Maintenance Dispatched', badge: 'bg-blue-50 text-blue-800 border-blue-200' },
    REPAIRED: { label: 'Repaired · Awaiting Closure', badge: 'bg-purple-50 text-purple-800 border-purple-200' },
    VERIFIED_CLOSED: { label: 'Verified Closed · ₹250 Rewarded', badge: 'bg-emerald-100 text-emerald-900 border-emerald-300' },
    REJECTED: { label: 'Rejected', badge: 'bg-rose-50 text-rose-800 border-rose-200' },
    NEEDS_INFO: { label: 'Needs Info', badge: 'bg-orange-50 text-orange-800 border-orange-200' },
  }

  const cfg = STATUS_CONFIG[leakCase.status] ?? STATUS_CONFIG.SUBMITTED

  return (
    <div className="space-y-6 pb-16 font-body">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link
          href="/leak"
          className="text-slate-500 hover:text-emerald-700 text-xs sm:text-sm font-semibold flex items-center gap-1 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Leak Hunter</span>
        </Link>
        <span className="text-slate-300">/</span>
        <h1 className="text-sm sm:text-base font-display font-bold text-slate-900 truncate">
          Leak #{leakCase.id.slice(-6).toUpperCase()}
        </h1>
      </div>

      <div className="space-y-6">
        {/* Status Card */}
        <div className="bg-white border border-slate-200/90 rounded-2xl p-6 space-y-4 shadow-xs">
          <div>
            <span className={`text-xs px-3 py-1 rounded-full font-bold border inline-block ${cfg.badge}`}>
              {cfg.label}
            </span>
            <h2 className="font-display text-2xl font-bold text-slate-900 mt-2">
              {leakCase.category} Leak
            </h2>
            <p className="text-xs sm:text-sm text-slate-600 mt-1 leading-relaxed">{leakCase.description}</p>
          </div>

          {/* Two-Tier Bounty Tracker */}
          <div className="grid grid-cols-2 gap-3 text-center text-xs pt-3 border-t border-slate-100">
            <div
              className={`p-4 rounded-xl border ${
                isAccepted
                  ? 'bg-emerald-50/80 border-emerald-200 text-emerald-900 font-semibold'
                  : 'bg-slate-50 border-slate-200 text-slate-500'
              }`}
            >
              <p className="text-[11px] uppercase tracking-wider text-slate-500">Tier 1: Accepted</p>
              <p className="font-display text-lg font-bold mt-0.5">
                {isAccepted ? '₹100 Paid ✓' : '₹100 Pending'}
              </p>
            </div>

            <div
              className={`p-4 rounded-xl border ${
                isVerifiedClosed
                  ? 'bg-emerald-50/80 border-emerald-200 text-emerald-900 font-semibold'
                  : 'bg-slate-50 border-slate-200 text-slate-500'
              }`}
            >
              <p className="text-[11px] uppercase tracking-wider text-slate-500">Tier 2: Verified Closed</p>
              <p className="font-display text-lg font-bold mt-0.5">
                {isVerifiedClosed ? '₹150 Bonus ✓' : '₹150 Bonus'}
              </p>
            </div>
          </div>
        </div>

        {/* Evidence Photos (Before & After) */}
        <div className="bg-white border border-slate-200/90 rounded-2xl p-6 space-y-4 shadow-xs">
          <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider">
            Photo Evidence
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {primaryReport?.photoUrl && (
              <div>
                <p className="text-xs text-slate-600 mb-1.5 font-semibold">Initial Leak Photo</p>
                <div className="aspect-video rounded-xl overflow-hidden bg-slate-100 border border-slate-200 shadow-inner">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={primaryReport.photoUrl}
                    alt="Initial leak evidence"
                    className="w-full h-full object-cover"
                  />
                </div>
              </div>
            )}

            {repairEvent?.evidenceUrl ? (
              <div>
                <p className="text-xs text-emerald-800 mb-1.5 font-semibold">Repaired Photo</p>
                <div className="aspect-video rounded-xl overflow-hidden bg-slate-100 border border-emerald-200 shadow-inner">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={repairEvent.evidenceUrl}
                    alt="Repair evidence"
                    className="w-full h-full object-cover"
                  />
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center border-2 border-dashed border-slate-200 rounded-xl p-4 text-center text-slate-400 aspect-video bg-slate-50/50">
                <span className="text-2xl mb-1">🛠️</span>
                <span className="text-xs font-medium">Awaiting repair photo upload</span>
              </div>
            )}
          </div>
        </div>

        {/* Event Timeline */}
        <div className="bg-white border border-slate-200/90 rounded-2xl p-6 space-y-4 shadow-xs">
          <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider">
            Verification &amp; Event History
          </h3>

          <div className="space-y-4 pt-1">
            {leakCase.events.map((evt, idx) => (
              <div key={evt.id} className="flex gap-3 text-xs">
                <div className="flex flex-col items-center">
                  <div className="w-6 h-6 rounded-full bg-emerald-50 border border-emerald-300 text-emerald-800 flex items-center justify-center text-[10px] font-bold">
                    {idx + 1}
                  </div>
                  {idx < leakCase.events.length - 1 && (
                    <div className="w-0.5 flex-1 bg-slate-200 my-1" />
                  )}
                </div>
                <div className="flex-1 pb-2">
                  <p className="font-semibold text-slate-900 uppercase tracking-wider text-[11px]">
                    {evt.eventType.replace(/_/g, ' ')}
                  </p>
                  {evt.note && <p className="text-slate-600 mt-0.5 leading-relaxed">{evt.note}</p>}
                  <p className="text-[10px] text-slate-400 mt-1">
                    {new Date(evt.createdAt).toLocaleString()}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Reviewer Shortcut for Reviewer / Admin users */}
        {(session?.roles.includes('REVIEWER') || session?.roles.includes('ADMIN')) && (
          <div className="p-4 bg-purple-50 border border-purple-200 rounded-2xl flex items-center justify-between shadow-xs">
            <span className="text-xs text-purple-900 font-semibold">Reviewer controls</span>
            <Link
              href={`/reviewer/leaks/${leakCase.id}`}
              className="px-4 py-2 bg-purple-700 hover:bg-purple-600 text-white rounded-xl text-xs font-bold transition shadow-xs"
            >
              Open Reviewer Decision →
            </Link>
          </div>
        )}
      </div>
    </div>
  )
}
