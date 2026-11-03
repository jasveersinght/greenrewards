'use client'

import React, { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  Store,
  Wrench,
  HeartHandshake,
  Building2,
  ArrowLeft,
  CheckCircle2,
  AlertCircle,
  UploadCloud,
  Sparkles,
} from 'lucide-react'

const ROLE_OPTIONS = [
  {
    role: 'SHOPKEEPER',
    title: 'Shopkeeper / Local Merchant',
    icon: Store,
    badge: 'Zero Waste & Reusable Bag Partner',
    desc: 'Verify customer reusable bag & container stamps, offer rewards, and redeem Green Points store vouchers.',
  },
  {
    role: 'PLUMBER',
    title: 'Certified Plumber / Pipe Technician',
    icon: Wrench,
    badge: 'Household Water Steward',
    desc: 'Receive public leak and household pipe repair requests, upload proof of fix, and build local reputation.',
  },
  {
    role: 'FOOD_PARTNER',
    title: 'Food Partner / Community NGO',
    icon: HeartHandshake,
    badge: 'Food Rescue & Relief Network',
    desc: 'Coordinate surplus food collection from restaurants, dispatch volunteer parcel couriers, and distribute to communities.',
  },
  {
    role: 'SPONSOR',
    title: 'CSR Sponsor / Sustainable Brand',
    icon: Building2,
    badge: 'Green Rewards Campaign Funder',
    desc: 'Fund citizen sustainability challenges, issue sponsored promotional discounts, and measure certified ESG impact.',
  },
]

export default function ApplyRolePage() {
  const router = useRouter()
  const [selectedRole, setSelectedRole] = useState<string>('SHOPKEEPER')
  const [orgName, setOrgName] = useState('')
  const [locality, setLocality] = useState('')
  const [phone, setPhone] = useState('')
  const [description, setDescription] = useState('')
  const [serviceArea, setServiceArea] = useState('')
  const [shopAddress, setShopAddress] = useState('')
  const [shopCategory, setShopCategory] = useState('Grocery & Provisions')
  const [proofUrl, setProofUrl] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setSubmitting(true)

    try {
      const res = await fetch('/api/role-applications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          role: selectedRole,
          organizationName: orgName,
          locality,
          phone,
          description,
          serviceArea: selectedRole === 'PLUMBER' ? serviceArea : undefined,
          shopAddress: selectedRole === 'SHOPKEEPER' ? shopAddress : undefined,
          shopCategory: selectedRole === 'SHOPKEEPER' ? shopCategory : undefined,
          proofUrl: proofUrl || undefined,
        }),
      })

      const data = await res.json()
      if (!res.ok) {
        setError(data.error || 'Failed to submit application')
        setSubmitting(false)
        return
      }

      setSuccess(true)
      setSubmitting(false)
    } catch {
      setError('Connection error. Please try again.')
      setSubmitting(false)
    }
  }

  if (success) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-3xl p-8 border border-slate-200 shadow-xl text-center">
          <div className="w-16 h-16 bg-emerald-50 text-emerald-600 rounded-2xl flex items-center justify-center mx-auto mb-4 ring-8 ring-emerald-50/50">
            <CheckCircle2 className="w-8 h-8" />
          </div>
          <h2 className="text-2xl font-bold font-serif text-slate-900">Application Submitted!</h2>
          <p className="mt-2 text-sm text-slate-600 leading-relaxed">
            Your application to join as a certified <span className="font-semibold text-slate-900">{selectedRole}</span> has been received. Our city operations team will review your details within 24 hours.
          </p>
          <div className="mt-6 pt-6 border-t border-slate-100 flex flex-col gap-3">
            <Link
              href="/profile"
              className="w-full py-3 px-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-sm font-semibold transition-colors shadow-sm"
            >
              View Application Status in Profile
            </Link>
            <Link
              href="/home"
              className="w-full py-3 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-sm font-semibold transition-colors"
            >
              Return to Citizen Dashboard
            </Link>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50/40 via-slate-50 to-white py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto">
        <Link
          href="/home"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600 hover:text-slate-900 mb-6 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" /> Back to Dashboard
        </Link>

        {/* Header */}
        <div className="mb-8">
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-emerald-100 text-emerald-800 rounded-full text-xs font-semibold uppercase tracking-wider mb-2">
            <Sparkles className="w-3.5 h-3.5" /> Verified Community Partner Program
          </div>
          <h1 className="text-3xl font-bold font-serif text-slate-900">
            Apply for a Partner Role
          </h1>
          <p className="mt-1 text-sm text-slate-600">
            Join Chennai’s verified network of sustainable shopkeepers, licensed plumbers, food rescue NGOs, and CSR sponsors.
          </p>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-rose-50 border border-rose-200 rounded-2xl flex items-start gap-3 text-rose-800 text-sm">
            <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5 text-rose-600" />
            <div>{error}</div>
          </div>
        )}

        {/* Step 1: Role Selection Cards */}
        <div className="mb-8">
          <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">
            Select Role Category
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            {ROLE_OPTIONS.map((opt) => {
              const Icon = opt.icon
              const isSelected = selectedRole === opt.role
              return (
                <button
                  key={opt.role}
                  type="button"
                  onClick={() => setSelectedRole(opt.role)}
                  className={`p-4 rounded-2xl border text-left transition-all flex flex-col justify-between ${
                    isSelected
                      ? 'bg-white border-emerald-600 ring-2 ring-emerald-500/20 shadow-md'
                      : 'bg-white/80 hover:bg-white border-slate-200 hover:border-slate-300'
                  }`}
                >
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${
                        isSelected ? 'bg-emerald-600 text-white' : 'bg-slate-100 text-slate-700'
                      }`}>
                        <Icon className="w-5 h-5" />
                      </div>
                      <span className="text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-100">
                        {opt.badge}
                      </span>
                    </div>
                    <h3 className="font-bold text-slate-900 text-sm">{opt.title}</h3>
                    <p className="mt-1 text-xs text-slate-500 leading-relaxed">{opt.desc}</p>
                  </div>
                </button>
              )
            })}
          </div>
        </div>

        {/* Step 2: Form */}
        <form onSubmit={handleSubmit} className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-sm space-y-6">
          <div className="border-b border-slate-100 pb-4">
            <h2 className="text-lg font-bold text-slate-900 font-serif">
              Application Details & Verification
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Please provide complete business or organization info for administrative review.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Organization / Business Name *
              </label>
              <input
                type="text"
                required
                value={orgName}
                onChange={(e) => setOrgName(e.target.value)}
                placeholder="e.g. GreenBite Cafe, QuickFix Services"
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Locality / Area *
              </label>
              <input
                type="text"
                required
                value={locality}
                onChange={(e) => setLocality(e.target.value)}
                placeholder="e.g. Potheri, T. Nagar, Velachery"
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Contact Phone Number *
            </label>
            <input
              type="tel"
              required
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="e.g. +91 98765 43210"
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          {/* Role specific inputs */}
          {selectedRole === 'SHOPKEEPER' && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 bg-emerald-50/50 rounded-2xl border border-emerald-100">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Shop Street Address *
                </label>
                <input
                  type="text"
                  required
                  value={shopAddress}
                  onChange={(e) => setShopAddress(e.target.value)}
                  placeholder="e.g. 14 GST Road, Opp. SRM Gate 1"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Shop Category *
                </label>
                <select
                  value={shopCategory}
                  onChange={(e) => setShopCategory(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                >
                  <option>Grocery & Provisions</option>
                  <option>Bakery & Cafe</option>
                  <option>Restaurant & Dining</option>
                  <option>Organic & Farm Produce</option>
                  <option>Zero-Waste Store</option>
                </select>
              </div>
            </div>
          )}

          {selectedRole === 'PLUMBER' && (
            <div className="p-4 bg-blue-50/50 rounded-2xl border border-blue-100">
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Service Area / Coverage Localities *
              </label>
              <input
                type="text"
                required
                value={serviceArea}
                onChange={(e) => setServiceArea(e.target.value)}
                placeholder="e.g. Potheri, Guduvanchery, Kattankulathur, Tambaram"
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <p className="mt-1 text-[11px] text-slate-500">
                Localities where you can respond to domestic leaks, flush tank fixes, and public pipeline alerts.
              </p>
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Description & Experience *
            </label>
            <textarea
              required
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Tell us about your organization, services, operating hours, and how you plan to support sustainable habits."
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Proof or Certificate URL (Optional)
            </label>
            <div className="flex items-center gap-2">
              <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center text-slate-500">
                <UploadCloud className="w-5 h-5" />
              </div>
              <input
                type="url"
                value={proofUrl}
                onChange={(e) => setProofUrl(e.target.value)}
                placeholder="https://... (Trade license, FSSAI, plumber certification, NGO certificate)"
                className="flex-1 px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>
          </div>

          <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
            <span className="text-xs text-slate-500">
              Admin review takes ~24h. Role is unlocked upon approval.
            </span>
            <button
              type="submit"
              disabled={submitting}
              className="py-3 px-6 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-sm font-semibold transition-all shadow-md shadow-emerald-600/20 disabled:opacity-50"
            >
              {submitting ? 'Submitting...' : 'Submit Application'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
