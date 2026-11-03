'use client'

import React, { useEffect, useState } from 'react'
import {
  HeartHandshake,
  CheckCircle2,
  Clock,
  MapPin,
  Utensils,
  PackageCheck,
  AlertCircle,
  Truck,
  Plus,
  Users,
  Building,
  Check,
  X,
} from 'lucide-react'

interface Parcel {
  id: string
  parcelCode: string
  quantity: number
  status: string
  rejectionReason?: string | null
  createdAt: string
  listing: {
    item: string
    ingredients?: string | null
    allergens?: string | null
    preparedAt?: string | null
    consumeBy?: string | null
    handlingNeeds?: string | null
    partner: {
      name: string
      locality?: string | null
      phone?: string | null
    }
  }
  mission?: {
    volunteer: {
      displayName?: string | null
      email: string
    }
    acceptedAt: string
    completedAt?: string | null
  } | null
}

interface CollectionCentre {
  id: string
  name: string
  address: string
  locality: string
  openHours?: string | null
  contactPhone?: string | null
  active: boolean
}

interface PartnerProfile {
  name: string
  registrationNo?: string | null
  address?: string | null
  phone?: string | null
  openingHours?: string | null
}

export default function PartnerDashboard() {
  const [tab, setTab] = useState<'requests' | 'deliveries' | 'centres' | 'volunteers' | 'profile'>('requests')
  const [parcels, setParcels] = useState<Parcel[]>([])
  const [centres, setCentres] = useState<CollectionCentre[]>([])
  const [profile, setProfile] = useState<PartnerProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState<string | null>(null)

  // Inspection modal
  const [inspectingParcel, setInspectingParcel] = useState<Parcel | null>(null)
  const [inspectDecision, setInspectDecision] = useState<'ACCEPT' | 'REJECT'>('ACCEPT')
  const [inspectReason, setInspectReason] = useState('')

  // New Centre form
  const [centreName, setCentreName] = useState('')
  const [centreAddress, setCentreAddress] = useState('')
  const [centreLocality, setCentreLocality] = useState('')
  const [centreHours, setCentreHours] = useState('9:00 AM – 7:00 PM')
  const [centrePhone, setCentrePhone] = useState('')

  // Profile form
  const [profName, setProfName] = useState('')
  const [profReg, setProfReg] = useState('')
  const [profAddress, setProfAddress] = useState('')
  const [profPhone, setProfPhone] = useState('')
  const [profHours, setProfHours] = useState('')
  const [profileSaved, setProfileSaved] = useState(false)

  useEffect(() => {
    loadData()
  }, [])

  async function loadData() {
    setLoading(true)
    try {
      const [parcelsRes, centresRes, profRes] = await Promise.all([
        fetch('/api/partner/parcels'),
        fetch('/api/partner/centres'),
        fetch('/api/partner/profile'),
      ])
      const pData = await parcelsRes.json()
      const cData = await centresRes.json()
      const profData = await profRes.json()

      setParcels(pData.parcels || [])
      setCentres(cData.centres || [])
      if (profData.partner) {
        setProfile(profData.partner)
        setProfName(profData.partner.name || '')
        setProfReg(profData.partner.registrationNo || '')
        setProfAddress(profData.partner.address || '')
        setProfPhone(profData.partner.phone || '')
        setProfHours(profData.partner.openingHours || '')
      }
    } catch {
      console.error('Failed to load partner data')
    } finally {
      setLoading(false)
    }
  }

  async function handleInspectSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!inspectingParcel) return
    setActionLoading(inspectingParcel.id)

    try {
      const res = await fetch(`/api/partner/parcels/${inspectingParcel.id}/receive`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          decision: inspectDecision,
          reason: inspectReason || undefined,
        }),
      })

      if (res.ok) {
        setInspectingParcel(null)
        setInspectReason('')
        await loadData()
      }
    } finally {
      setActionLoading(null)
    }
  }

  async function handleCreateCentre(e: React.FormEvent) {
    e.preventDefault()
    try {
      const res = await fetch('/api/partner/centres', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: centreName,
          address: centreAddress,
          locality: centreLocality,
          openHours: centreHours,
          contactPhone: centrePhone,
        }),
      })

      if (res.ok) {
        setCentreName('')
        setCentreAddress('')
        setCentreLocality('')
        setCentrePhone('')
        await loadData()
      }
    } catch (err) {
      console.error(err)
    }
  }

  async function handleSaveProfile(e: React.FormEvent) {
    e.preventDefault()
    try {
      const res = await fetch('/api/partner/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: profName,
          registrationNo: profReg,
          address: profAddress,
          phone: profPhone,
          openingHours: profHours,
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

  const pendingRequests = parcels.filter(p => p.status === 'PENDING' || p.status === 'ACCEPTED_BY_PARTNER')
  const inTransitDeliveries = parcels.filter(p => p.status === 'COLLECTED' || p.status === 'DELIVERED')
  const acceptedMonth = parcels.filter(p => p.status === 'ACCEPTED').length

  return (
    <div className="space-y-6">
      {/* Metrics Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-2xs">
          <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Donations Waiting</div>
          <div className="mt-2 text-3xl font-bold font-serif text-slate-900">{pendingRequests.length}</div>
          <p className="mt-1 text-[11px] text-slate-500">From verified partner kitchens</p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-2xs">
          <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Arriving / In Transit</div>
          <div className="mt-2 text-3xl font-bold font-serif text-amber-600">{inTransitDeliveries.length}</div>
          <p className="mt-1 text-[11px] text-slate-500">Volunteer dispatch active</p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-2xs">
          <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Accepted This Month</div>
          <div className="mt-2 text-3xl font-bold font-serif text-emerald-600">{acceptedMonth}</div>
          <p className="mt-1 text-[11px] text-slate-500">Inspected safe & distributed</p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-2xs">
          <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Drop Centres</div>
          <div className="mt-2 text-3xl font-bold font-serif text-slate-900">{centres.length}</div>
          <p className="mt-1 text-[11px] text-slate-500">Designated public hubs</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white rounded-2xl border border-slate-200/90 p-1.5 flex gap-1 text-xs font-semibold shadow-2xs">
        <button
          onClick={() => setTab('requests')}
          className={`flex-1 py-2.5 px-3 rounded-xl transition-all ${
            tab === 'requests' ? 'bg-amber-50 text-amber-800 shadow-2xs font-bold' : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          Incoming Donations ({pendingRequests.length})
        </button>
        <button
          onClick={() => setTab('deliveries')}
          className={`flex-1 py-2.5 px-3 rounded-xl transition-all ${
            tab === 'deliveries' ? 'bg-amber-50 text-amber-800 shadow-2xs font-bold' : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          Deliveries & Arrival ({inTransitDeliveries.length})
        </button>
        <button
          onClick={() => setTab('centres')}
          className={`flex-1 py-2.5 px-3 rounded-xl transition-all ${
            tab === 'centres' ? 'bg-amber-50 text-amber-800 shadow-2xs font-bold' : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          Collection Centres ({centres.length})
        </button>
        <button
          onClick={() => setTab('volunteers')}
          className={`flex-1 py-2.5 px-3 rounded-xl transition-all ${
            tab === 'volunteers' ? 'bg-amber-50 text-amber-800 shadow-2xs font-bold' : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          Volunteer Couriers
        </button>
        <button
          onClick={() => setTab('profile')}
          className={`flex-1 py-2.5 px-3 rounded-xl transition-all ${
            tab === 'profile' ? 'bg-amber-50 text-amber-800 shadow-2xs font-bold' : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          NGO Profile
        </button>
      </div>

      {/* Tab 1: Incoming Donation Requests */}
      {tab === 'requests' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-slate-900 font-serif">
              Surplus Food Donation Batches from Partner Restaurants
            </h2>
            <span className="text-xs text-slate-500">
              Fresh surplus packages prepared within safe consumable windows.
            </span>
          </div>

          {parcels.length === 0 ? (
            <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center text-slate-500">
              <Utensils className="w-10 h-10 mx-auto text-slate-300 mb-2" />
              <p className="font-semibold text-slate-700">No surplus donations in queue right now.</p>
              <p className="text-xs text-slate-400 mt-1">Partner restaurant kitchens dispatch daily afternoon and evening batches.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {parcels.map((parcel) => (
                <div key={parcel.id} className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-2xs space-y-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <span className="text-[10px] font-bold text-amber-800 bg-amber-50 px-2.5 py-0.5 rounded-full border border-amber-200 uppercase">
                        Code: {parcel.parcelCode}
                      </span>
                      <h3 className="font-bold text-slate-900 text-sm mt-1">{parcel.listing.item}</h3>
                      <p className="text-xs text-slate-500 mt-0.5">{parcel.listing.partner.name} • {parcel.listing.partner.locality}</p>
                    </div>
                    <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-xl">
                      {parcel.quantity} Meals
                    </span>
                  </div>

                  <div className="p-3 bg-slate-50 rounded-xl space-y-1.5 text-xs text-slate-600">
                    <div><span className="font-semibold text-slate-700">Prepared at: </span>{parcel.listing.preparedAt ? new Date(parcel.listing.preparedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Today 12:30 PM'}</div>
                    <div><span className="font-semibold text-slate-700">Consume by: </span>{parcel.listing.consumeBy ? new Date(parcel.listing.consumeBy).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Today 6:00 PM'}</div>
                    <div><span className="font-semibold text-slate-700">Handling notes: </span>{parcel.listing.handlingNeeds || 'Keep covered, immediate insulated transport recommended'}</div>
                  </div>

                  <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-xs">
                    <span className={`font-semibold px-2 py-0.5 rounded-full text-[11px] ${
                      parcel.status === 'ACCEPTED'
                        ? 'bg-emerald-50 text-emerald-800'
                        : parcel.status === 'REJECTED'
                        ? 'bg-rose-50 text-rose-800'
                        : 'bg-amber-50 text-amber-800'
                    }`}>
                      Status: {parcel.status}
                    </span>

                    {parcel.status !== 'ACCEPTED' && parcel.status !== 'REJECTED' && (
                      <button
                        onClick={() => {
                          setInspectingParcel(parcel)
                          setInspectDecision('ACCEPT')
                        }}
                        className="py-1.5 px-3 bg-amber-600 hover:bg-amber-700 text-white rounded-xl font-semibold transition-colors shadow-2xs"
                      >
                        Inspect & Receive
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Tab 2: Deliveries & Inspections */}
      {tab === 'deliveries' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-slate-900 font-serif">
              Volunteer Delivery Dispatches & Intake Inspection
            </h2>
            <span className="text-xs text-slate-500">
              Accepting releases +15 Green Points to volunteer courier.
            </span>
          </div>

          <div className="space-y-3">
            {parcels.map((parcel) => (
              <div key={parcel.id} className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-slate-900 text-sm">{parcel.listing.item}</span>
                    <span className="text-xs text-slate-500">({parcel.quantity} parcels)</span>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 uppercase">
                      {parcel.parcelCode}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 mt-1">
                    Courier:{' '}
                    <span className="font-semibold text-slate-800">
                      {parcel.mission?.volunteer.displayName || 'Volunteer Courier (Priya Kumar)'}
                    </span>{' '}
                    • Origin: {parcel.listing.partner.name}
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  {parcel.status === 'ACCEPTED' ? (
                    <span className="inline-flex items-center gap-1 text-xs font-semibold px-3 py-1 bg-emerald-50 text-emerald-800 rounded-full border border-emerald-200">
                      <CheckCircle2 className="w-3.5 h-3.5" /> Inspected & Accepted (+15 GP awarded)
                    </span>
                  ) : parcel.status === 'REJECTED' ? (
                    <span className="inline-flex items-center gap-1 text-xs font-semibold px-3 py-1 bg-rose-50 text-rose-800 rounded-full border border-rose-200">
                      <AlertCircle className="w-3.5 h-3.5" /> Rejected: {parcel.rejectionReason}
                    </span>
                  ) : (
                    <button
                      onClick={() => {
                        setInspectingParcel(parcel)
                        setInspectDecision('ACCEPT')
                      }}
                      className="py-2 px-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold transition-colors shadow-2xs flex items-center gap-1.5"
                    >
                      <PackageCheck className="w-4 h-4" />
                      <span>Intake Inspection</span>
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Intake Inspection Modal */}
          {inspectingParcel && (
            <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 z-50">
              <div className="bg-white rounded-3xl max-w-lg w-full p-6 space-y-4 border border-slate-200 shadow-2xl">
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <h3 className="font-bold text-slate-900 font-serif text-lg">
                    Food Intake Safety Check: {inspectingParcel.listing.item}
                  </h3>
                  <button
                    onClick={() => setInspectingParcel(null)}
                    className="text-slate-400 hover:text-slate-600 text-sm font-bold"
                  >
                    ✕
                  </button>
                </div>

                <form onSubmit={handleInspectSubmit} className="space-y-4 text-xs">
                  <div className="p-3 bg-amber-50 rounded-xl space-y-1 text-amber-900">
                    <p className="font-bold">FSSAI Hygiene Standard Verification</p>
                    <p>Verify packaging integrity, temperature safety, and consume-by validity before accepting.</p>
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Intake Decision</label>
                    <div className="grid grid-cols-2 gap-3">
                      <button
                        type="button"
                        onClick={() => setInspectDecision('ACCEPT')}
                        className={`p-3 rounded-xl border font-bold flex items-center justify-center gap-2 ${
                          inspectDecision === 'ACCEPT'
                            ? 'bg-emerald-50 border-emerald-500 text-emerald-800 ring-2 ring-emerald-500/20'
                            : 'border-slate-200 text-slate-600'
                        }`}
                      >
                        <Check className="w-4 h-4" /> Accept & Release Points
                      </button>
                      <button
                        type="button"
                        onClick={() => setInspectDecision('REJECT')}
                        className={`p-3 rounded-xl border font-bold flex items-center justify-center gap-2 ${
                          inspectDecision === 'REJECT'
                            ? 'bg-rose-50 border-rose-500 text-rose-800 ring-2 ring-rose-500/20'
                            : 'border-slate-200 text-slate-600'
                        }`}
                      >
                        <X className="w-4 h-4" /> Reject Intake
                      </button>
                    </div>
                  </div>

                  {inspectDecision === 'REJECT' && (
                    <div>
                      <label className="block font-semibold text-slate-700 mb-1">Rejection Reason *</label>
                      <input
                        type="text"
                        required
                        value={inspectReason}
                        onChange={(e) => setInspectReason(e.target.value)}
                        placeholder="e.g. Broken seal, past safe consume window, improper temperature"
                        className="w-full p-2.5 rounded-xl border border-slate-200 font-medium"
                      />
                    </div>
                  )}

                  <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                    <button
                      type="button"
                      onClick={() => setInspectingParcel(null)}
                      className="py-2 px-4 rounded-xl border border-slate-200 font-semibold text-slate-600 hover:bg-slate-50"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={Boolean(actionLoading)}
                      className={`py-2 px-5 rounded-xl text-white font-semibold transition-colors disabled:opacity-50 ${
                        inspectDecision === 'ACCEPT' ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-rose-600 hover:bg-rose-700'
                      }`}
                    >
                      {actionLoading ? 'Saving...' : inspectDecision === 'ACCEPT' ? 'Confirm & Credit Volunteer' : 'Confirm Rejection'}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Tab 3: Collection Centres */}
      {tab === 'centres' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-4">
            <h2 className="text-base font-bold text-slate-900 font-serif">
              Designated Public Drop-Off Centres
            </h2>
            <p className="text-xs text-slate-500">
              Only verified drop-off facilities are shown on public citizen maps (recipient family locations are strictly protected and never displayed).
            </p>

            <div className="space-y-3">
              {centres.map((c) => (
                <div key={c.id} className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-2xs space-y-1.5">
                  <div className="flex items-center justify-between">
                    <h3 className="font-bold text-slate-900 text-sm">{c.name}</h3>
                    <span className="text-[10px] font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                      Active Map Hub
                    </span>
                  </div>
                  <p className="text-xs text-slate-600 flex items-center gap-1">
                    <MapPin className="w-3.5 h-3.5 text-slate-400" />
                    {c.address}, {c.locality}
                  </p>
                  <p className="text-[11px] text-slate-400">Hours: {c.openHours || '9:00 AM – 7:00 PM'}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Add Centre Form */}
          <div className="bg-white p-6 rounded-3xl border border-slate-200/90 shadow-2xs space-y-4 h-fit">
            <h3 className="font-bold text-slate-900 font-serif text-sm">Add New Drop-Off Hub</h3>
            <form onSubmit={handleCreateCentre} className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Hub Name *</label>
                <input
                  type="text"
                  required
                  value={centreName}
                  onChange={(e) => setCentreName(e.target.value)}
                  placeholder="e.g. Annapoorna Community Center"
                  className="w-full p-2.5 rounded-xl border border-slate-200"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Locality *</label>
                <input
                  type="text"
                  required
                  value={centreLocality}
                  onChange={(e) => setCentreLocality(e.target.value)}
                  placeholder="e.g. Potheri / Tambaram"
                  className="w-full p-2.5 rounded-xl border border-slate-200"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Street Address *</label>
                <input
                  type="text"
                  required
                  value={centreAddress}
                  onChange={(e) => setCentreAddress(e.target.value)}
                  placeholder="e.g. 5 Station Road"
                  className="w-full p-2.5 rounded-xl border border-slate-200"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Contact Phone</label>
                <input
                  type="tel"
                  value={centrePhone}
                  onChange={(e) => setCentrePhone(e.target.value)}
                  placeholder="+91 ..."
                  className="w-full p-2.5 rounded-xl border border-slate-200"
                />
              </div>

              <button
                type="submit"
                className="w-full py-2.5 bg-amber-600 hover:bg-amber-700 text-white font-semibold rounded-xl text-xs transition-colors shadow-2xs"
              >
                + Register Drop-Off Centre
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Tab 4: Volunteers */}
      {tab === 'volunteers' && (
        <div className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-200/90 shadow-2xs space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-slate-900 font-serif">
                Approved Community Volunteer Couriers
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Volunteers certified to transport surplus parcels safely with thermal bags.
              </p>
            </div>
          </div>

          <div className="divide-y divide-slate-100">
            {[
              { name: 'Priya Kumar', email: 'user@demo', deliveries: 12, rating: '5.0 ★', locality: 'Potheri' },
              { name: 'Karthik Raja', email: 'karthik@demo', deliveries: 8, rating: '4.9 ★', locality: 'Guduvanchery' },
              { name: 'Amina Begum', email: 'amina@demo', deliveries: 15, rating: '5.0 ★', locality: 'Tambaram' },
            ].map((v) => (
              <div key={v.email} className="py-3.5 flex items-center justify-between text-xs">
                <div>
                  <h4 className="font-bold text-slate-900">{v.name}</h4>
                  <p className="text-slate-500 text-[11px]">{v.email} • {v.locality}</p>
                </div>
                <div className="flex items-center gap-4">
                  <span className="font-semibold text-slate-700">{v.deliveries} dispatches</span>
                  <span className="text-emerald-700 font-bold">{v.rating}</span>
                  <span className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200 text-[10px] font-bold">
                    Active
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tab 5: NGO Profile */}
      {tab === 'profile' && (
        <div className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-200/90 shadow-2xs space-y-6 max-w-2xl">
          <div>
            <h2 className="text-lg font-bold text-slate-900 font-serif">Organization Profile</h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Verified food relief organization credentials under Tamil Nadu Societies Registration.
            </p>
          </div>

          {profileSaved && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs font-semibold">
              ✓ NGO profile updated successfully!
            </div>
          )}

          <form onSubmit={handleSaveProfile} className="space-y-4 text-xs">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Organization Name</label>
              <input
                type="text"
                required
                value={profName}
                onChange={(e) => setProfName(e.target.value)}
                className="w-full p-2.5 rounded-xl border border-slate-200 font-medium"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">NGO Registration Number</label>
              <input
                type="text"
                value={profReg}
                onChange={(e) => setProfReg(e.target.value)}
                placeholder="TN/SR/2021/4892"
                className="w-full p-2.5 rounded-xl border border-slate-200 font-medium"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">HQ Address</label>
              <input
                type="text"
                value={profAddress}
                onChange={(e) => setProfAddress(e.target.value)}
                placeholder="12 Anna Salai, Chennai"
                className="w-full p-2.5 rounded-xl border border-slate-200 font-medium"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Contact Phone</label>
                <input
                  type="tel"
                  value={profPhone}
                  onChange={(e) => setProfPhone(e.target.value)}
                  placeholder="+91 ..."
                  className="w-full p-2.5 rounded-xl border border-slate-200 font-medium"
                />
              </div>
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Operating Hours</label>
                <input
                  type="text"
                  value={profHours}
                  onChange={(e) => setProfHours(e.target.value)}
                  placeholder="8:00 AM – 10:00 PM"
                  className="w-full p-2.5 rounded-xl border border-slate-200 font-medium"
                />
              </div>
            </div>

            <button
              type="submit"
              className="py-2.5 px-5 bg-amber-600 hover:bg-amber-700 text-white font-semibold rounded-xl text-xs shadow-2xs transition-colors"
            >
              Save Organization Details
            </button>
          </form>
        </div>
      )}
    </div>
  )
}
