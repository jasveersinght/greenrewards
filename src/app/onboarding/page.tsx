'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

const CHENNAI_LOCALITIES = [
  'T. Nagar', 'Adyar', 'Velachery', 'Anna Nagar',
  'Guindy', 'Mylapore', 'Nungambakkam', 'Perungudi',
  'Sholinganallur', 'Tambaram', 'Chromepet', 'Pallavaram',
  'Perambur', 'Kodambakkam', 'Potheri', 'Guduvancheri', 'Other',
]

export default function OnboardingPage() {
  const router = useRouter()
  const [displayName, setDisplayName] = useState('')
  const [locality, setLocality] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!displayName.trim() || !locality) return
    setLoading(true)
    setError('')
    try {
      const res = await fetch('/api/auth/onboarding', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          displayName: displayName.trim(),
          city: 'Chennai',
          locality,
        }),
      })
      if (!res.ok) {
        const data = await res.json()
        setError(data.error ?? 'Failed to save profile')
        return
      }
      router.push('/home')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen w-full flex flex-col items-center justify-center py-10 px-4 sm:px-6 bg-[#f8fafc] text-slate-900 font-body overflow-y-auto">
      <div className="w-full max-w-md my-auto bg-white border border-slate-200/90 rounded-3xl p-6 sm:p-8 shadow-xs animate-fade-in-up">
        <div className="text-center mb-6">
          <div className="w-16 h-16 mx-auto mb-3 flex items-center justify-center">
            <img src="/logo.png" alt="Green Rewards" className="w-16 h-16 object-contain" />
          </div>
          <h1 className="font-display text-3xl font-bold text-slate-900">Welcome to Green Rewards</h1>
          <p className="text-slate-500 text-xs sm:text-sm mt-1">Set up your citizen profile once to get started</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="displayName" className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
              Your name
            </label>
            <input
              id="displayName"
              type="text"
              value={displayName}
              onChange={e => setDisplayName(e.target.value)}
              className="gr-input"
              placeholder="e.g. Priya Kumar"
              minLength={2}
              maxLength={50}
              required
              disabled={loading}
            />
          </div>

          <div>
            <label htmlFor="city" className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
              City
            </label>
            <input
              id="city"
              type="text"
              value="Chennai"
              className="gr-input bg-slate-50 text-slate-500 cursor-not-allowed"
              readOnly
              aria-readonly="true"
            />
          </div>

          <div>
            <label htmlFor="locality" className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
              Locality / Area
            </label>
            <select
              id="locality"
              value={locality}
              onChange={e => setLocality(e.target.value)}
              className="gr-input"
              required
              disabled={loading}
            >
              <option value="">Select your area</option>
              {CHENNAI_LOCALITIES.map(l => (
                <option key={l} value={l} className="text-slate-900 bg-white">
                  {l}
                </option>
              ))}
            </select>
          </div>

          <p className="text-xs text-slate-400">
            We use this to show nearby offers. We&apos;ll only ask for your device location when you need directions.
          </p>

          {error && <p className="text-rose-600 text-xs font-semibold" role="alert">{error}</p>}

          <button
            type="submit"
            className="btn-primary mt-2 cursor-pointer"
            disabled={loading || !displayName.trim() || !locality}
          >
            {loading ? '⏳ Saving...' : 'Start Earning Rewards →'}
          </button>
        </form>
      </div>
    </div>
  )
}
