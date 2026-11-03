'use client'

import React, { useEffect, useState } from 'react'
import {
  Wrench,
  CheckCircle2,
  Clock,
  MapPin,
  Camera,
  FileText,
  AlertCircle,
  Tag,
  Star,
  User,
  Phone,
  ShieldCheck,
  ChevronRight,
  Upload,
} from 'lucide-react'

interface Job {
  id: string
  customerName: string
  locality: string
  address: string
  category?: string | null
  notes?: string | null
  repairStage: 'REQUESTED' | 'ACCEPTED' | 'VISITED' | 'REPAIRED' | 'VERIFIED'
  status: string
  createdAt: string
  evidenceUrl?: string | null
  beforePhotoUrl?: string | null
  afterPhotoUrl?: string | null
  meterReading?: number | null
}

interface PartnerProfile {
  name: string
  locality?: string | null
  serviceArea?: string | null
  phone?: string | null
  discountOffer?: string | null
  category?: string | null
}

export default function PlumberDashboard() {
  const [tab, setTab] = useState<'requests' | 'active' | 'discount' | 'profile'>('requests')
  const [availableJobs, setAvailableJobs] = useState<Job[]>([])
  const [myJobs, setMyJobs] = useState<Job[]>([])
  const [profile, setProfile] = useState<PartnerProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  const [selectedJob, setSelectedJob] = useState<Job | null>(null)

  // Job progress form
  const [progressStage, setProgressStage] = useState<'VISITED' | 'REPAIRED'>('VISITED')
  const [progressNotes, setProgressNotes] = useState('')
  const [beforeUrl, setBeforeUrl] = useState('')
  const [afterUrl, setAfterUrl] = useState('')
  const [meterReading, setMeterReading] = useState('')

  // Discount form
  const [discountInput, setDiscountInput] = useState('')
  const [discountSaved, setDiscountSaved] = useState(false)

  // Profile form
  const [nameInput, setNameInput] = useState('')
  const [serviceAreaInput, setServiceAreaInput] = useState('')
  const [phoneInput, setPhoneInput] = useState('')
  const [profileSaved, setProfileSaved] = useState(false)

  useEffect(() => {
    loadData()
  }, [])

  async function loadData() {
    setLoading(true)
    try {
      const [jobsRes, profRes] = await Promise.all([
        fetch('/api/plumber/jobs'),
        fetch('/api/plumber/profile'),
      ])
      const jobsData = await jobsRes.json()
      const profData = await profRes.json()

      setAvailableJobs(jobsData.available || [])
      setMyJobs(jobsData.myJobs || [])
      if (profData.partner) {
        setProfile(profData.partner)
        setDiscountInput(profData.partner.discountOffer || '10% off service labour for Green Rewards users')
        setNameInput(profData.partner.name || '')
        setServiceAreaInput(profData.partner.serviceArea || '')
        setPhoneInput(profData.partner.phone || '')
      }
    } catch {
      console.error('Failed to load plumber data')
    } finally {
      setLoading(false)
    }
  }

  async function handleAccept(id: string) {
    setActionLoading(id)
    try {
      const res = await fetch(`/api/plumber/jobs/${id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'ACCEPT' }),
      })
      if (res.ok) {
        await loadData()
        setTab('active')
      }
    } finally {
      setActionLoading(null)
    }
  }

  async function handleProgressSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!selectedJob) return
    setActionLoading(selectedJob.id)

    try {
      const isSubmittingReview = progressStage === 'REPAIRED'
      const res = await fetch(`/api/plumber/jobs/${selectedJob.id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: isSubmittingReview ? 'SUBMIT_FOR_REVIEW' : 'PROGRESS',
          stage: progressStage,
          notes: progressNotes,
          beforePhotoUrl: beforeUrl || undefined,
          afterPhotoUrl: afterUrl || undefined,
          meterReading: meterReading ? parseFloat(meterReading) : undefined,
        }),
      })

      if (res.ok) {
        setSelectedJob(null)
        await loadData()
      }
    } finally {
      setActionLoading(null)
    }
  }

  async function handleSaveDiscount(e: React.FormEvent) {
    e.preventDefault()
    try {
      const res = await fetch('/api/plumber/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ discountOffer: discountInput }),
      })
      if (res.ok) {
        setDiscountSaved(true)
        setTimeout(() => setDiscountSaved(false), 3000)
      }
    } catch (err) {
      console.error(err)
    }
  }

  async function handleSaveProfile(e: React.FormEvent) {
    e.preventDefault()
    try {
      const res = await fetch('/api/plumber/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: nameInput,
          serviceArea: serviceAreaInput,
          phone: phoneInput,
        }),
      })
      if (res.ok) {
        setProfileSaved(true)
        setTimeout(() => setProfileSaved(false), 3000)
      }
    } catch (err) {
      console.error(err)
    }
  }

  const completedCount = myJobs.filter(j => j.repairStage === 'REPAIRED' || j.status === 'CONFIRMED').length
  const inProgressCount = myJobs.filter(j => j.repairStage === 'ACCEPTED' || j.repairStage === 'VISITED').length

  return (
    <div className="space-y-6">
      {/* 4 Metric Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">New Requests</span>
            <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
          </div>
          <div className="mt-2 text-3xl font-bold font-serif text-slate-900">{availableJobs.length}</div>
          <p className="mt-1 text-[11px] text-slate-500">In your service area</p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-2xs">
          <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider">In Progress</div>
          <div className="mt-2 text-3xl font-bold font-serif text-amber-600">{inProgressCount}</div>
          <p className="mt-1 text-[11px] text-slate-500">Active assigned jobs</p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-2xs">
          <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Completed Month</div>
          <div className="mt-2 text-3xl font-bold font-serif text-emerald-600">{completedCount}</div>
          <p className="mt-1 text-[11px] text-slate-500">Fixed & verified repairs</p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-2xs">
          <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Average Rating</div>
          <div className="mt-2 text-3xl font-bold font-serif text-slate-900 flex items-center gap-1">
            4.9 <Star className="w-5 h-5 text-amber-400 fill-amber-400" />
          </div>
          <p className="mt-1 text-[11px] text-slate-500">From 18 resident reviews</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white rounded-2xl border border-slate-200/90 p-1.5 flex gap-1 text-xs font-semibold shadow-2xs">
        <button
          onClick={() => setTab('requests')}
          className={`flex-1 py-2.5 px-4 rounded-xl transition-all ${
            tab === 'requests' ? 'bg-blue-50 text-blue-800 shadow-2xs font-bold' : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          Job Requests ({availableJobs.length})
        </button>
        <button
          onClick={() => setTab('active')}
          className={`flex-1 py-2.5 px-4 rounded-xl transition-all ${
            tab === 'active' ? 'bg-blue-50 text-blue-800 shadow-2xs font-bold' : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          My Jobs ({myJobs.length})
        </button>
        <button
          onClick={() => setTab('discount')}
          className={`flex-1 py-2.5 px-4 rounded-xl transition-all ${
            tab === 'discount' ? 'bg-blue-50 text-blue-800 shadow-2xs font-bold' : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          Discount Offers
        </button>
        <button
          onClick={() => setTab('profile')}
          className={`flex-1 py-2.5 px-4 rounded-xl transition-all ${
            tab === 'profile' ? 'bg-blue-50 text-blue-800 shadow-2xs font-bold' : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          Business Profile
        </button>
      </div>

      {/* Tab 1: Available Requests */}
      {tab === 'requests' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-slate-900 font-serif">
              Available Household Leaks & Repair Requests
            </h2>
            <span className="text-xs text-slate-500">
              Exact street addresses are revealed after you accept a job request.
            </span>
          </div>

          {availableJobs.length === 0 ? (
            <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center text-slate-500">
              <CheckCircle2 className="w-10 h-10 mx-auto text-slate-300 mb-2" />
              <p className="font-semibold text-slate-700">No open requests in your service area right now.</p>
              <p className="text-xs text-slate-400 mt-1">Check back soon or expand your service area localities in your profile.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {availableJobs.map((job) => (
                <div key={job.id} className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-2xs space-y-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <span className="text-[11px] font-bold text-blue-700 bg-blue-50 px-2.5 py-0.5 rounded-full border border-blue-100 uppercase tracking-wider">
                        {job.category || 'Household Pipe'}
                      </span>
                      <h3 className="font-bold text-slate-900 text-sm mt-1.5">{job.customerName}</h3>
                      <p className="text-xs text-slate-500 flex items-center gap-1 mt-0.5">
                        <MapPin className="w-3.5 h-3.5 text-slate-400" />
                        {job.locality}
                      </p>
                    </div>
                    <span className="text-[11px] text-slate-400">
                      {new Date(job.createdAt).toLocaleDateString('en-IN', { month: 'short', day: 'numeric' })}
                    </span>
                  </div>

                  <div className="p-3 bg-slate-50 rounded-xl text-xs text-slate-600">
                    <span className="font-semibold text-slate-700">Customer Note: </span>
                    {job.notes || 'Household tap/leak repair reported under Save Water challenge.'}
                  </div>

                  <div className="p-2.5 bg-amber-50/70 border border-amber-200/60 rounded-xl text-[11px] text-amber-800 flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 shrink-0 text-amber-600" />
                    <span>Exact address protected until accepted by technician.</span>
                  </div>

                  <div className="pt-2 flex gap-2">
                    <button
                      onClick={() => handleAccept(job.id)}
                      disabled={actionLoading === job.id}
                      className="flex-1 py-2 px-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold transition-colors shadow-2xs disabled:opacity-50"
                    >
                      {actionLoading === job.id ? 'Accepting...' : 'Accept Job Request'}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Tab 2: My Jobs */}
      {tab === 'active' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-slate-900 font-serif">
              My Assigned & Active Repair Jobs
            </h2>
          </div>

          {myJobs.length === 0 ? (
            <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center text-slate-500">
              <p className="font-semibold text-slate-700">No active jobs assigned yet.</p>
              <button
                onClick={() => setTab('requests')}
                className="mt-3 text-xs text-blue-600 hover:underline font-semibold"
              >
                Browse available job requests &rarr;
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {myJobs.map((job) => (
                <div key={job.id} className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-2xs space-y-3">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-slate-900 text-sm">{job.customerName}</span>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border uppercase ${
                          job.repairStage === 'REPAIRED'
                            ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                            : job.repairStage === 'VISITED'
                            ? 'bg-amber-50 text-amber-800 border-amber-200'
                            : 'bg-blue-50 text-blue-800 border-blue-200'
                        }`}>
                          Stage: {job.repairStage}
                        </span>
                        {job.status === 'CONFIRMED' && (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                            ✓ Verified by City Reviewer
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-slate-600 flex items-center gap-1 mt-1">
                        <MapPin className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                        <span className="font-semibold text-slate-800">{job.address}</span>
                      </p>
                    </div>

                    <div className="flex items-center gap-2">
                      {job.status !== 'CONFIRMED' && job.repairStage !== 'REPAIRED' && (
                        <button
                          onClick={() => {
                            setSelectedJob(job)
                            setProgressStage(job.repairStage === 'ACCEPTED' ? 'VISITED' : 'REPAIRED')
                            setProgressNotes(job.notes || '')
                            setBeforeUrl(job.beforePhotoUrl || '')
                            setAfterUrl(job.afterPhotoUrl || '')
                          }}
                          className="py-1.5 px-3 bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 rounded-xl text-xs font-semibold transition-colors"
                        >
                          Update Job Stage
                        </button>
                      )}
                    </div>
                  </div>

                  {job.notes && (
                    <div className="text-xs text-slate-600 bg-slate-50 p-3 rounded-xl">
                      <span className="font-semibold text-slate-700">Technician Log: </span>
                      {job.notes}
                    </div>
                  )}

                  {/* Stage Progress Tracker */}
                  <div className="grid grid-cols-4 gap-2 pt-2 border-t border-slate-100 text-center text-[11px] font-semibold">
                    <div className="p-2 rounded-lg bg-blue-50 text-blue-800">1. Accepted</div>
                    <div className={`p-2 rounded-lg ${
                      job.repairStage === 'VISITED' || job.repairStage === 'REPAIRED'
                        ? 'bg-blue-50 text-blue-800'
                        : 'bg-slate-100 text-slate-400'
                    }`}>
                      2. Visited Site
                    </div>
                    <div className={`p-2 rounded-lg ${
                      job.repairStage === 'REPAIRED'
                        ? 'bg-blue-50 text-blue-800'
                        : 'bg-slate-100 text-slate-400'
                    }`}>
                      3. Repaired
                    </div>
                    <div className={`p-2 rounded-lg ${
                      job.status === 'CONFIRMED'
                        ? 'bg-emerald-50 text-emerald-800'
                        : 'bg-slate-100 text-slate-400'
                    }`}>
                      4. Reviewer Audit
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Job Progress Modal */}
          {selectedJob && (
            <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 z-50">
              <div className="bg-white rounded-3xl max-w-lg w-full p-6 space-y-4 border border-slate-200 shadow-2xl">
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <h3 className="font-bold text-slate-900 font-serif text-lg">
                    Update Job: {selectedJob.customerName}
                  </h3>
                  <button
                    onClick={() => setSelectedJob(null)}
                    className="text-slate-400 hover:text-slate-600 text-sm font-bold"
                  >
                    ✕
                  </button>
                </div>

                <form onSubmit={handleProgressSubmit} className="space-y-4 text-xs">
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Select Stage</label>
                    <select
                      value={progressStage}
                      onChange={(e) => setProgressStage(e.target.value as 'VISITED' | 'REPAIRED')}
                      className="w-full p-2.5 rounded-xl border border-slate-200 bg-white font-medium"
                    >
                      <option value="VISITED">Visited Site (Inspection in Progress)</option>
                      <option value="REPAIRED">Repaired (Submit for Reviewer Verification)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Technician Notes</label>
                    <textarea
                      rows={3}
                      required
                      value={progressNotes}
                      onChange={(e) => setProgressNotes(e.target.value)}
                      placeholder="Replaced worn faucet washer, tightened Teflon joint, tested with meter flow test."
                      className="w-full p-2.5 rounded-xl border border-slate-200 font-medium"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block font-semibold text-slate-700 mb-1">Before Photo URL</label>
                      <input
                        type="url"
                        value={beforeUrl}
                        onChange={(e) => setBeforeUrl(e.target.value)}
                        placeholder="https://... photo"
                        className="w-full p-2.5 rounded-xl border border-slate-200 font-medium"
                      />
                    </div>
                    <div>
                      <label className="block font-semibold text-slate-700 mb-1">After Photo URL</label>
                      <input
                        type="url"
                        value={afterUrl}
                        onChange={(e) => setAfterUrl(e.target.value)}
                        placeholder="https://... photo"
                        className="w-full p-2.5 rounded-xl border border-slate-200 font-medium"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Meter Reading / Flow Rate (Litres/min)</label>
                    <input
                      type="number"
                      step="0.1"
                      value={meterReading}
                      onChange={(e) => setMeterReading(e.target.value)}
                      placeholder="e.g. 0.0 L/min after fix"
                      className="w-full p-2.5 rounded-xl border border-slate-200 font-medium"
                    />
                  </div>

                  <p className="text-[11px] text-slate-500">
                    * Note: A plumber can never verify their own job. City municipal reviewers audit before/after proof before releasing citizen challenge points.
                  </p>

                  <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                    <button
                      type="button"
                      onClick={() => setSelectedJob(null)}
                      className="py-2 px-4 rounded-xl border border-slate-200 font-semibold text-slate-600 hover:bg-slate-50"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={Boolean(actionLoading)}
                      className="py-2 px-5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold transition-colors disabled:opacity-50"
                    >
                      {progressStage === 'REPAIRED' ? 'Submit for Review' : 'Save Update'}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Tab 3: Discount Offers */}
      {tab === 'discount' && (
        <div className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-200/90 shadow-2xs space-y-6 max-w-2xl">
          <div>
            <h2 className="text-lg font-bold text-slate-900 font-serif">Community Discount Offer</h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Your promotional offer is displayed to citizens in the Save Water section when requesting plumbing repairs.
            </p>
          </div>

          {discountSaved && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs font-semibold">
              ✓ Discount offer updated and published to Save Water directory!
            </div>
          )}

          <form onSubmit={handleSaveDiscount} className="space-y-4 text-xs">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Discount Offer Text *
              </label>
              <input
                type="text"
                required
                value={discountInput}
                onChange={(e) => setDiscountInput(e.target.value)}
                placeholder="e.g. 10% off service labour for Green Rewards users"
                className="w-full p-3 rounded-xl border border-slate-200 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
              />
              <p className="mt-1 text-slate-400">
                Visible to all citizens in Chennai requesting certified leak & plumbing fixes.
              </p>
            </div>

            <button
              type="submit"
              className="py-2.5 px-5 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl text-xs shadow-2xs transition-colors"
            >
              Save & Publish Discount
            </button>
          </form>
        </div>
      )}

      {/* Tab 4: Profile */}
      {tab === 'profile' && (
        <div className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-200/90 shadow-2xs space-y-6 max-w-2xl">
          <div>
            <h2 className="text-lg font-bold text-slate-900 font-serif">Technician & Business Profile</h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Service radius and contact credentials verified by Chennai Metropolitan Water Supply.
            </p>
          </div>

          {profileSaved && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs font-semibold">
              ✓ Profile saved successfully!
            </div>
          )}

          <form onSubmit={handleSaveProfile} className="space-y-4 text-xs">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Business / Service Name</label>
              <input
                type="text"
                required
                value={nameInput}
                onChange={(e) => setNameInput(e.target.value)}
                className="w-full p-2.5 rounded-xl border border-slate-200 font-medium"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Service Areas (Coverage Localities)</label>
              <input
                type="text"
                required
                value={serviceAreaInput}
                onChange={(e) => setServiceAreaInput(e.target.value)}
                placeholder="Potheri, Guduvanchery, Kattankulathur, Tambaram"
                className="w-full p-2.5 rounded-xl border border-slate-200 font-medium"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Direct Contact Phone</label>
              <input
                type="tel"
                required
                value={phoneInput}
                onChange={(e) => setPhoneInput(e.target.value)}
                className="w-full p-2.5 rounded-xl border border-slate-200 font-medium"
              />
            </div>

            <div className="p-4 bg-blue-50/70 border border-blue-100 rounded-2xl flex items-center justify-between">
              <div>
                <span className="font-bold text-blue-900">CMWSSB Plumbing Verification</span>
                <p className="text-slate-500 text-[11px] mt-0.5">Authorized for household pipe repairs and public main alerts</p>
              </div>
              <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200">
                <ShieldCheck className="w-4 h-4" /> Certified
              </span>
            </div>

            <button
              type="submit"
              className="py-2.5 px-5 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl text-xs shadow-2xs transition-colors"
            >
              Update Profile Info
            </button>
          </form>
        </div>
      )}
    </div>
  )
}
