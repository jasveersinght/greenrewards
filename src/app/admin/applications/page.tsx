'use client'

import React, { useEffect, useState } from 'react'
import {
  FileText,
  CheckCircle2,
  XCircle,
  Clock,
  Store,
  Wrench,
  HeartHandshake,
  Building2,
  Search,
  Filter,
  AlertCircle,
  ExternalLink,
} from 'lucide-react'
import { ROLE_LABELS } from '@/server/domain/roles'

interface Application {
  id: string
  role: string
  organizationName: string
  locality: string
  phone: string
  description: string
  serviceArea?: string | null
  shopAddress?: string | null
  shopCategory?: string | null
  proofUrl?: string | null
  status: 'PENDING' | 'APPROVED' | 'REJECTED'
  decisionReason?: string | null
  createdAt: string
  user: {
    id: string
    displayName?: string | null
    email: string
    username?: string | null
  }
  decidedByUser?: {
    displayName?: string | null
    username?: string | null
  } | null
}

const ROLE_ICONS: Record<string, React.ElementType> = {
  SHOPKEEPER: Store,
  PLUMBER: Wrench,
  FOOD_PARTNER: HeartHandshake,
  SPONSOR: Building2,
}

export default function AdminApplicationsPage() {
  const [applications, setApplications] = useState<Application[]>([])
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'PENDING' | 'APPROVED' | 'REJECTED'>('PENDING')
  const [roleFilter, setRoleFilter] = useState<string>('ALL')
  const [search, setSearch] = useState('')
  const [actionLoading, setActionLoading] = useState<string | null>(null)

  // Rejection modal
  const [rejectingApp, setRejectingApp] = useState<Application | null>(null)
  const [rejectReason, setRejectReason] = useState('')

  useEffect(() => {
    loadApplications()
  }, [])

  async function loadApplications() {
    setLoading(true)
    try {
      const res = await fetch('/api/admin/applications')
      const data = await res.json()
      setApplications(data.applications || [])
    } catch {
      console.error('Failed to load role applications')
    } finally {
      setLoading(false)
    }
  }

  async function handleApprove(id: string) {
    setActionLoading(id)
    try {
      const res = await fetch(`/api/admin/applications/${id}/decide`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ decision: 'APPROVE' }),
      })
      if (res.ok) {
        await loadApplications()
      }
    } finally {
      setActionLoading(null)
    }
  }

  async function handleRejectSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!rejectingApp) return
    setActionLoading(rejectingApp.id)

    try {
      const res = await fetch(`/api/admin/applications/${rejectingApp.id}/decide`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          decision: 'REJECT',
          reason: rejectReason || 'Incomplete business credentials or unverified address',
        }),
      })
      if (res.ok) {
        setRejectingApp(null)
        setRejectReason('')
        await loadApplications()
      }
    } finally {
      setActionLoading(null)
    }
  }

  const filtered = applications.filter((app) => {
    if (statusFilter !== 'ALL' && app.status !== statusFilter) return false
    if (roleFilter !== 'ALL' && app.role !== roleFilter) return false
    if (search) {
      const q = search.toLowerCase()
      const matchOrg = app.organizationName.toLowerCase().includes(q)
      const matchUser = (app.user.displayName || '').toLowerCase().includes(q) || app.user.email.toLowerCase().includes(q)
      const matchLoc = app.locality.toLowerCase().includes(q)
      if (!matchOrg && !matchUser && !matchLoc) return false
    }
    return true
  })

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold font-serif text-slate-900">Partner Role Applications</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Review and decide merchant shopkeepers, licensed plumbers, food rescue NGOs, and CSR sponsor applications.
          </p>
        </div>
        <div className="text-xs font-semibold px-3 py-1 bg-amber-50 text-amber-800 border border-amber-200 rounded-full w-fit">
          {applications.filter(a => a.status === 'PENDING').length} Pending Review
        </div>
      </div>

      {/* Filters & Search */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/90 shadow-2xs flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-1.5 flex-wrap">
          {(['ALL', 'PENDING', 'APPROVED', 'REJECTED'] as const).map((s) => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={`py-1.5 px-3 rounded-xl font-semibold transition-all ${
                statusFilter === s
                  ? 'bg-slate-900 text-white shadow-2xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {s === 'ALL' ? 'All Statuses' : s}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2">
          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            className="py-1.5 px-3 rounded-xl border border-slate-200 bg-white font-medium text-slate-700"
          >
            <option value="ALL">All Roles</option>
            <option value="SHOPKEEPER">Shopkeeper</option>
            <option value="PLUMBER">Plumber</option>
            <option value="FOOD_PARTNER">Food Partner</option>
            <option value="SPONSOR">Sponsor</option>
          </select>

          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search org, applicant, locality..."
              className="pl-8 pr-3 py-1.5 rounded-xl border border-slate-200 text-xs w-48 sm:w-64 focus:outline-none focus:ring-1 focus:ring-slate-400"
            />
          </div>
        </div>
      </div>

      {/* Applications List */}
      {loading ? (
        <div className="p-12 text-center text-slate-400 text-xs">Loading role applications...</div>
      ) : filtered.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center text-slate-500">
          <Clock className="w-10 h-10 mx-auto text-slate-300 mb-2" />
          <p className="font-semibold text-slate-700">No applications matching current filters.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {filtered.map((app) => {
            const Icon = ROLE_ICONS[app.role] || Store
            return (
              <div
                key={app.id}
                className="bg-white rounded-3xl p-6 border border-slate-200/90 shadow-2xs space-y-4"
              >
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 border-b border-slate-100 pb-4">
                  <div className="flex items-start gap-3">
                    <div className="w-11 h-11 rounded-2xl bg-slate-100 text-slate-700 flex items-center justify-center shrink-0">
                      <Icon className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-bold text-slate-900 text-base">{app.organizationName}</h3>
                        <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-800 border uppercase">
                          {ROLE_LABELS[app.role as keyof typeof ROLE_LABELS] || app.role}
                        </span>
                      </div>
                      <p className="text-xs text-slate-500 mt-0.5">
                        Applicant:{' '}
                        <span className="font-semibold text-slate-700">
                          {app.user.displayName || 'User'} ({app.user.email})
                        </span>{' '}
                        • Locality: <span className="font-semibold text-slate-700">{app.locality}</span> • Phone: {app.phone}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <span
                      className={`text-[11px] font-bold px-3 py-1 rounded-full uppercase tracking-wider ${
                        app.status === 'APPROVED'
                          ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                          : app.status === 'REJECTED'
                          ? 'bg-rose-50 text-rose-800 border border-rose-200'
                          : 'bg-amber-50 text-amber-800 border border-amber-200'
                      }`}
                    >
                      {app.status}
                    </span>
                  </div>
                </div>

                <div className="text-xs text-slate-600 bg-slate-50 p-4 rounded-2xl space-y-2">
                  <p className="leading-relaxed">
                    <span className="font-semibold text-slate-800">Application Statement: </span>
                    {app.description}
                  </p>

                  {app.shopAddress && (
                    <p>
                      <span className="font-semibold text-slate-800">Shop Address: </span>
                      {app.shopAddress} ({app.shopCategory || 'Retail'})
                    </p>
                  )}

                  {app.serviceArea && (
                    <p>
                      <span className="font-semibold text-slate-800">Plumber Service Area: </span>
                      {app.serviceArea}
                    </p>
                  )}

                  {app.proofUrl && (
                    <p className="flex items-center gap-1.5 pt-1 text-blue-600 font-semibold">
                      <ExternalLink className="w-3.5 h-3.5" />
                      <a href={app.proofUrl} target="_blank" rel="noreferrer" className="hover:underline">
                        View Certificate / Proof Documentation
                      </a>
                    </p>
                  )}

                  {app.decisionReason && (
                    <div className="pt-2 border-t border-slate-200/70 text-slate-700">
                      <span className="font-semibold">Decision Note: </span>
                      {app.decisionReason}
                      {app.decidedByUser && (
                        <span className="text-slate-400"> (by {app.decidedByUser.displayName || app.decidedByUser.username})</span>
                      )}
                    </div>
                  )}
                </div>

                {/* Actions */}
                {app.status === 'PENDING' && (
                  <div className="flex items-center justify-end gap-2 pt-2">
                    <button
                      onClick={() => setRejectingApp(app)}
                      disabled={actionLoading === app.id}
                      className="py-2 px-4 rounded-xl border border-rose-200 text-rose-700 hover:bg-rose-50 text-xs font-semibold transition-colors disabled:opacity-50"
                    >
                      Reject Application
                    </button>
                    <button
                      onClick={() => handleApprove(app.id)}
                      disabled={actionLoading === app.id}
                      className="py-2 px-5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold transition-colors shadow-2xs disabled:opacity-50"
                    >
                      {actionLoading === app.id ? 'Approving...' : '✓ Approve & Grant Role'}
                    </button>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* Reject Modal */}
      {rejectingApp && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 space-y-4 border border-slate-200 shadow-2xl">
            <h3 className="font-bold text-slate-900 font-serif text-lg">
              Reject Application: {rejectingApp.organizationName}
            </h3>
            <p className="text-xs text-slate-500">
              Provide a clear reason for the applicant. This will be sent as a notification to their profile.
            </p>

            <form onSubmit={handleRejectSubmit} className="space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Reason for Rejection *</label>
                <textarea
                  rows={3}
                  required
                  value={rejectReason}
                  onChange={(e) => setRejectReason(e.target.value)}
                  placeholder="e.g. Invalid trade license, phone number unreachable, service area not within Chennai jurisdiction."
                  className="w-full p-2.5 rounded-xl border border-slate-200 font-medium"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setRejectingApp(null)}
                  className="py-2 px-4 rounded-xl border border-slate-200 font-semibold text-slate-600 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={Boolean(actionLoading)}
                  className="py-2 px-5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-semibold transition-colors disabled:opacity-50"
                >
                  Confirm Rejection
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
