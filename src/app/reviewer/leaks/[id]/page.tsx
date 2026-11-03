'use client'

import React, { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, CheckCircle2, ShieldAlert } from 'lucide-react'

export default function ReviewerLeakDecisionPage() {
  const params = useParams()
  const router = useRouter()
  const caseId = params.id as string

  const [leakCase, setLeakCase] = useState<any>(null)
  const [currentUser, setCurrentUser] = useState<any>(null)
  const [reason, setReason] = useState('')
  const [loading, setLoading] = useState(true)
  const [acting, setActing] = useState(false)
  const [feedback, setFeedback] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function loadData() {
      try {
        const [caseRes, meRes] = await Promise.all([
          fetch(`/api/leaks/${caseId}`),
          fetch('/api/auth/me'),
        ])
        if (!caseRes.ok) throw new Error('Leak case not found')
        const caseData = await caseRes.json()
        const meData = meRes.ok ? await meRes.json() : null

        setLeakCase(caseData)
        setCurrentUser(meData?.user ?? null)
      } catch (err: any) {
        setError(err.message)
      } finally {
        setLoading(false)
      }
    }
    loadData()
  }, [caseId])

  async function handleDecision(decision: 'APPROVED' | 'REJECTED' | 'NEEDS_INFO') {
    setActing(true)
    setError(null)
    setFeedback(null)

    try {
      const res = await fetch(`/api/leaks/${caseId}/review`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ decision, reason: reason.trim() || undefined }),
      })
      const data = await res.json()

      if (!res.ok) {
        setError(data.error ?? 'Failed to apply decision')
        return
      }

      setFeedback(data.message)
      // Reload case
      const updated = await fetch(`/api/leaks/${caseId}`)
      if (updated.ok) setLeakCase(await updated.json())
    } catch (err: any) {
      setError(err?.message ?? 'An error occurred')
    } finally {
      setActing(false)
    }
  }

  async function handleVerifyRepair() {
    setActing(true)
    setError(null)
    setFeedback(null)

    try {
      const res = await fetch(`/api/leaks/${caseId}/verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ note: reason.trim() || 'Repair verified by authority reviewer' }),
      })
      const data = await res.json()

      if (!res.ok) {
        setError(data.error ?? 'Failed to verify repair')
        return
      }

      setFeedback(data.message)
      const updated = await fetch(`/api/leaks/${caseId}`)
      if (updated.ok) setLeakCase(await updated.json())
    } catch (err: any) {
      setError(err?.message ?? 'An error occurred')
    } finally {
      setActing(false)
    }
  }

  if (loading) {
    return (
      <div className="p-8 text-center text-slate-400 font-body">
        <div className="animate-spin text-3xl inline-block mb-3">🔍</div>
        <p className="text-sm">Loading leak case details...</p>
      </div>
    )
  }

  if (error && !leakCase) {
    return (
      <div className="p-8 text-center font-body bg-white border border-slate-200/90 rounded-2xl max-w-md mx-auto shadow-xs">
        <p className="text-rose-600 mb-4 text-sm font-semibold">{error}</p>
        <Link href="/reviewer" className="inline-block py-2 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-xl">
          ← Back to Reviewer Queue
        </Link>
      </div>
    )
  }

  const primaryReport = leakCase.reports[0]
  const isReporterSelf = currentUser?.id && primaryReport?.userId === currentUser.id
  const repairEvent = leakCase.events.find((e: any) => e.eventType === 'REPAIR_UPLOADED')

  return (
    <div className="max-w-3xl mx-auto space-y-6 pb-16 font-body">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link
          href="/reviewer"
          className="text-slate-500 hover:text-emerald-700 text-xs sm:text-sm font-semibold flex items-center gap-1 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Queue</span>
        </Link>
        <span className="text-slate-300">/</span>
        <h1 className="text-sm sm:text-base font-display font-bold text-slate-900 truncate">
          Review Leak #{leakCase.id.slice(-6).toUpperCase()}
        </h1>
      </div>

      <div className="space-y-6">
        {feedback && (
          <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs font-semibold rounded-2xl shadow-xs">
            ✓ {feedback}
          </div>
        )}

        {error && (
          <div className="p-4 bg-rose-50 border border-rose-200 text-rose-800 text-xs font-semibold rounded-2xl shadow-xs">
            ⚠️ {error}
          </div>
        )}

        {/* Self-Review Ban Alert */}
        {isReporterSelf && (
          <div className="p-4 bg-amber-50 border border-amber-200 text-amber-900 text-xs rounded-2xl flex items-start gap-2.5 shadow-xs">
            <ShieldAlert className="w-5 h-5 text-amber-600 shrink-0" />
            <div>
              <p className="font-bold">Self-Review Not Allowed</p>
              <p className="mt-0.5 text-amber-800">
                You reported this leak case yourself. In compliance with Green Rewards integrity policy, another reviewer must evaluate this submission.
              </p>
            </div>
          </div>
        )}

        {/* Case Summary */}
        <div className="bg-white border border-slate-200/90 rounded-2xl p-6 space-y-4 shadow-xs">
          <div className="flex items-center justify-between">
            <h2 className="font-display text-xl font-bold text-slate-900">
              {leakCase.category} Leak
            </h2>
            <span className="text-xs px-3 py-1 rounded-full font-bold bg-blue-50 text-blue-800 border border-blue-200">
              {leakCase.status}
            </span>
          </div>

          <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">{leakCase.description}</p>

          <div className="text-xs text-slate-600 bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-1.5">
            <p>Reporter: <strong className="text-slate-900">{primaryReport?.user.displayName ?? 'Citizen'}</strong></p>
            <p>GPS Pin: <span className="font-mono text-slate-800 font-semibold">{leakCase.lat.toFixed(4)}, {leakCase.lng.toFixed(4)}</span></p>
            <p>Total Reports Joined: <strong className="text-slate-900">{leakCase.reports.length}</strong></p>
          </div>
        </div>

        {/* Photos */}
        <div className="bg-white border border-slate-200/90 rounded-2xl p-6 space-y-4 shadow-xs">
          <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider">
            Evidence Photos
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {primaryReport?.photoUrl && (
              <div>
                <p className="text-xs text-slate-600 mb-1.5 font-semibold">Citizen Report Photo</p>
                <div className="aspect-video rounded-xl overflow-hidden bg-slate-100 border border-slate-200 shadow-inner">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={primaryReport.photoUrl} alt="Initial leak" className="w-full h-full object-cover" />
                </div>
              </div>
            )}

            {repairEvent?.evidenceUrl && (
              <div>
                <p className="text-xs text-emerald-800 mb-1.5 font-semibold">Repair Evidence</p>
                <div className="aspect-video rounded-xl overflow-hidden bg-slate-100 border border-emerald-200 shadow-inner">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={repairEvent.evidenceUrl} alt="Repair" className="w-full h-full object-cover" />
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Reviewer Action Buttons */}
        {!isReporterSelf && (
          <div className="bg-white border border-slate-200/90 rounded-2xl p-6 space-y-4 shadow-xs">
            <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              Reviewer Decision
            </h3>

            <input
              type="text"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Decision note or rejection reason (optional)"
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs text-slate-900 focus:outline-none focus:border-emerald-500"
            />

            {leakCase.status === 'SUBMITTED' && (
              <div className="space-y-3 pt-2">
                <button
                  type="button"
                  id="approve-leak-btn"
                  disabled={acting}
                  onClick={() => handleDecision('APPROVED')}
                  className="w-full py-3.5 bg-emerald-700 hover:bg-emerald-600 text-white font-semibold rounded-xl text-sm transition shadow-sm cursor-pointer disabled:opacity-50"
                >
                  ✓ Accept Report &amp; Award 50 Green Points
                </button>

                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    disabled={acting}
                    onClick={() => handleDecision('NEEDS_INFO')}
                    className="py-2.5 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold cursor-pointer"
                  >
                    ❓ Request Info
                  </button>
                  <button
                    type="button"
                    disabled={acting}
                    onClick={() => handleDecision('REJECTED')}
                    className="py-2.5 px-4 bg-rose-50 hover:bg-rose-100 border border-rose-200 text-rose-800 rounded-xl text-xs font-semibold cursor-pointer"
                  >
                    ✕ Reject Report
                  </button>
                </div>
              </div>
            )}

            {leakCase.status === 'REPAIRED' && (
              <div className="pt-2">
                <button
                  type="button"
                  id="verify-repair-btn"
                  disabled={acting}
                  onClick={handleVerifyRepair}
                  className="w-full py-3.5 bg-emerald-700 hover:bg-emerald-600 text-white font-semibold rounded-xl text-sm transition shadow-sm cursor-pointer disabled:opacity-50"
                >
                  ✓ Verify Repair &amp; Award 100 Green Points
                </button>
              </div>
            )}

            {['ACCEPTED', 'VERIFIED_CLOSED', 'REJECTED'].includes(leakCase.status) && (
              <p className="text-xs text-slate-500 text-center py-2">
                This case has already been resolved ({leakCase.status}).
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
