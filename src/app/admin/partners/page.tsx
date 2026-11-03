'use client'

import React, { useEffect, useState } from 'react'
import {
  Store,
  Wrench,
  HeartHandshake,
  Building2,
  Search,
  CheckCircle2,
  AlertCircle,
  ToggleLeft,
  ToggleRight,
} from 'lucide-react'

interface Partner {
  id: string
  name: string
  type: string
  approved: boolean
  isSimulated: boolean
  locality?: string | null
  address?: string | null
  phone?: string | null
  serviceArea?: string | null
  category?: string | null
  createdAt: string
}

export default function AdminPartnersPage() {
  const [partners, setPartners] = useState<Partner[]>([])
  const [loading, setLoading] = useState(true)
  const [typeFilter, setTypeFilter] = useState('ALL')
  const [search, setSearch] = useState('')
  const [togglingId, setTogglingId] = useState<string | null>(null)

  useEffect(() => {
    loadPartners()
  }, [])

  async function loadPartners() {
    setLoading(true)
    try {
      const res = await fetch('/api/admin/partners')
      const data = await res.json()
      setPartners(data || [])
    } finally {
      setLoading(false)
    }
  }

  async function handleToggleSimulated(id: string, currentSimulated: boolean) {
    setTogglingId(id)
    try {
      const res = await fetch(`/api/admin/partners/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isSimulated: !currentSimulated }),
      })
      if (res.ok) {
        setPartners(prev =>
          prev.map(p => (p.id === id ? { ...p, isSimulated: !currentSimulated } : p))
        )
      }
    } finally {
      setTogglingId(null)
    }
  }

  const filtered = partners.filter(p => {
    if (typeFilter !== 'ALL' && p.type !== typeFilter) return false
    if (search) {
      const q = search.toLowerCase()
      if (!p.name.toLowerCase().includes(q) && !(p.locality || '').toLowerCase().includes(q)) {
        return false
      }
    }
    return true
  })

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold font-serif text-slate-900">Partner Organizations</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Manage partner merchants, certified plumbers, food rescue NGOs, and CSR sponsor companies.
          </p>
        </div>
      </div>

      {/* Filter toolbar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/90 shadow-2xs flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-1.5 flex-wrap">
          {['ALL', 'SHOP', 'PLUMBER', 'FOOD_PARTNER', 'SPONSOR'].map((t) => (
            <button
              key={t}
              onClick={() => setTypeFilter(t)}
              className={`py-1.5 px-3 rounded-xl font-semibold transition-all ${
                typeFilter === t
                  ? 'bg-slate-900 text-white shadow-2xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {t === 'ALL' ? 'All Partners' : t}
            </button>
          ))}
        </div>

        <div className="relative">
          <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search partners..."
            className="pl-8 pr-3 py-1.5 rounded-xl border border-slate-200 text-xs w-48 sm:w-64 focus:outline-none focus:ring-1 focus:ring-slate-400"
          />
        </div>
      </div>

      {/* Partners Table */}
      <div className="bg-white rounded-3xl border border-slate-200/90 shadow-2xs overflow-hidden">
        <table className="w-full text-left border-collapse text-xs">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider text-[10px]">
              <th className="py-3 px-4">Partner Name</th>
              <th className="py-3 px-4">Type</th>
              <th className="py-3 px-4">Locality / Address</th>
              <th className="py-3 px-4">Simulation Mode</th>
              <th className="py-3 px-4 text-right">Approval</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {loading ? (
              <tr>
                <td colSpan={5} className="py-12 text-center text-slate-400">Loading partners...</td>
              </tr>
            ) : filtered.length === 0 ? (
              <tr>
                <td colSpan={5} className="py-12 text-center text-slate-400">No partners found.</td>
              </tr>
            ) : (
              filtered.map((p) => {
                const isToggling = togglingId === p.id
                return (
                  <tr key={p.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="py-3.5 px-4 font-bold text-slate-900">
                      <div>{p.name}</div>
                      {p.category && <div className="text-[11px] font-normal text-slate-500">{p.category}</div>}
                    </td>
                    <td className="py-3.5 px-4">
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase border bg-slate-100 text-slate-800">
                        {p.type}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-slate-600">
                      <div>{p.address || p.locality || 'Chennai'}</div>
                      {p.serviceArea && <div className="text-[11px] text-slate-400">Coverage: {p.serviceArea}</div>}
                    </td>
                    <td className="py-3.5 px-4">
                      <button
                        onClick={() => handleToggleSimulated(p.id, p.isSimulated)}
                        disabled={isToggling}
                        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-xs font-bold transition-all border ${
                          p.isSimulated
                            ? 'bg-amber-50 text-amber-800 border-amber-200'
                            : 'bg-emerald-50 text-emerald-800 border-emerald-200'
                        }`}
                      >
                        {p.isSimulated ? 'Simulated Partner' : 'Live / Production'}
                        <span className="text-slate-400">({isToggling ? '...' : 'Toggle'})</span>
                      </button>
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <span className="text-emerald-700 font-bold">✓ Approved</span>
                    </td>
                  </tr>
                )
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
