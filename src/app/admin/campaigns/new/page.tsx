'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

const SECTIONS = ['REUSE', 'LEAK', 'FOOD', 'ELECTRICITY', 'WATER', 'COMMUTE']

export default function NewCampaignPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [form, setForm] = useState({
    name: '',
    section: 'REUSE',
    funderPartnerId: '',
    status: 'DRAFT',
    startsAt: '',
    endsAt: '',
    description: '',
    evidenceNeeded: '',
    budgetTotalPaise: '',
    isSimulated: false,
  })

  function update(key: string, value: string | boolean) {
    setForm(f => ({ ...f, [key]: value }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')
    try {
      const res = await fetch('/api/campaigns', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Idempotency-Key': crypto.randomUUID() },
        body: JSON.stringify({
          ...form,
          budgetTotalPaise: parseInt(form.budgetTotalPaise, 10),
          rewardRule: {},
          limits: { perUserPerDay: 1, perUserTotal: 10, totalSlots: 1000 },
        }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error ?? 'Failed to create campaign')
        return
      }
      router.push('/admin/campaigns')
    } finally {
      setLoading(false)
    }
  }

  const labelCls = 'block text-sm font-medium text-gray-300 mb-1'
  const inputCls = 'gr-input'

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-white">New Campaign</h2>
        <p className="text-gray-400 text-sm">Every campaign must have a funder and a budget before rewards can be issued.</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        <div className="grid grid-cols-2 gap-4">
          <div className="col-span-2">
            <label htmlFor="camp-name" className={labelCls}>Campaign Name</label>
            <input id="camp-name" type="text" className={inputCls} required minLength={3} maxLength={100}
              value={form.name} onChange={e => update('name', e.target.value)} />
          </div>

          <div>
            <label htmlFor="camp-section" className={labelCls}>Section</label>
            <select id="camp-section" className={inputCls} value={form.section} onChange={e => update('section', e.target.value)}>
              {SECTIONS.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>

          <div>
            <label htmlFor="camp-status" className={labelCls}>Initial Status</label>
            <select id="camp-status" className={inputCls} value={form.status} onChange={e => update('status', e.target.value)}>
              {['DRAFT', 'COMING_SOON', 'ACTIVE'].map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>

          <div className="col-span-2">
            <label htmlFor="camp-funder" className={labelCls}>Funder Partner ID</label>
            <input id="camp-funder" type="text" className={inputCls} required
              placeholder="Partner ID from /admin/partners"
              value={form.funderPartnerId} onChange={e => update('funderPartnerId', e.target.value)} />
          </div>

          <div>
            <label htmlFor="camp-starts" className={labelCls}>Starts At</label>
            <input id="camp-starts" type="datetime-local" className={inputCls} required
              value={form.startsAt} onChange={e => update('startsAt', e.target.value)} />
          </div>

          <div>
            <label htmlFor="camp-ends" className={labelCls}>Ends At</label>
            <input id="camp-ends" type="datetime-local" className={inputCls} required
              value={form.endsAt} onChange={e => update('endsAt', e.target.value)} />
          </div>

          <div className="col-span-2">
            <label htmlFor="camp-desc" className={labelCls}>Description (shown before user joins)</label>
            <textarea id="camp-desc" className={inputCls} rows={3} required minLength={10}
              value={form.description} onChange={e => update('description', e.target.value)} />
          </div>

          <div className="col-span-2">
            <label htmlFor="camp-evidence" className={labelCls}>Evidence Needed</label>
            <input id="camp-evidence" type="text" className={inputCls}
              placeholder="e.g. Photo of reusable bag at checkout"
              value={form.evidenceNeeded} onChange={e => update('evidenceNeeded', e.target.value)} />
          </div>

          <div>
            <label htmlFor="camp-budget" className={labelCls}>Budget (in paise)</label>
            <input id="camp-budget" type="number" className={inputCls} required min={1}
              placeholder="e.g. 1000000 = ₹10,000"
              value={form.budgetTotalPaise} onChange={e => update('budgetTotalPaise', e.target.value)} />
            {form.budgetTotalPaise && !isNaN(parseInt(form.budgetTotalPaise)) && (
              <p className="text-gray-400 text-xs mt-1">= ₹{(parseInt(form.budgetTotalPaise) / 100).toFixed(2)}</p>
            )}
          </div>

          <div className="flex items-center gap-3 self-end pb-2">
            <input id="camp-sim" type="checkbox" checked={form.isSimulated}
              onChange={e => update('isSimulated', e.target.checked)}
              className="w-4 h-4 accent-purple-500" />
            <label htmlFor="camp-sim" className="text-sm text-gray-300">
              Mark as <span className="badge badge-simulated ml-1">Simulated</span>
            </label>
          </div>
        </div>

        {error && <p className="text-red-400 text-sm" role="alert">{error}</p>}

        <div className="flex gap-3">
          <button type="button" onClick={() => router.back()} className="btn-secondary" style={{ flex: '0 0 auto', width: 'auto', padding: '12px 20px' }}>
            Cancel
          </button>
          <button type="submit" className="btn-primary" disabled={loading}>
            {loading ? '⏳ Creating...' : '✅ Create Campaign'}
          </button>
        </div>
      </form>
    </div>
  )
}
