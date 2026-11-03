'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { ArrowLeft, Droplets, Camera, CheckCircle2, Sparkles, Wrench, RefreshCw, MapPin, AlertCircle, Clock } from 'lucide-react';

interface Household {
  id: string;
  name: string;
  memberCount: number;
  readings: {
    id: string;
    litres?: number | null;
    readingAt: string;
    source: string;
  }[];
  repairClaims: {
    id: string;
    evidenceUrl: string;
    invoiceUrl?: string | null;
    status: string;
    repairStage?: string;
    category?: string | null;
    address?: string | null;
    locality?: string | null;
    notes?: string | null;
    assignedPlumber?: {
      displayName: string | null;
    } | null;
    createdAt: string;
  }[];
}

const SAMPLE_PHOTO = 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="400" height="300" viewBox="0 0 400 300"><rect width="400" height="300" fill="%230284c7"/><text x="50%25" y="45%25" dominant-baseline="middle" text-anchor="middle" font-size="20" fill="%23ffffff" font-family="sans-serif">Repaired Water Fixture</text><text x="50%25" y="60%25" dominant-baseline="middle" text-anchor="middle" font-size="14" fill="%23e0f2fe" font-family="sans-serif">Green Rewards Verified Evidence</text></svg>';

export default function WaterPage() {
  const [household, setHousehold] = useState<Household | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Modal state
  const [showModal, setShowModal] = useState(false);
  const [modalTab, setModalTab] = useState<'REQUEST_PLUMBER' | 'SELF_REPAIR'>('REQUEST_PLUMBER');
  const [category, setCategory] = useState('TAP');
  const [locality, setLocality] = useState('Potheri');
  const [address, setAddress] = useState('Flat 4B, Green Enclave Apartments, Potheri');
  const [notes, setNotes] = useState('Continuous tap dripping in kitchen, wasting clean water.');
  const [evidenceUrl, setEvidenceUrl] = useState('');
  const [invoiceUrl, setInvoiceUrl] = useState('');
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Reading modal state
  const [showReadingModal, setShowReadingModal] = useState(false);
  const [litres, setLitres] = useState('340');
  const [submittingReading, setSubmittingReading] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetchData();
  }, []);

  async function fetchData() {
    setLoading(true);
    try {
      const res = await fetch('/api/water/household');
      const data = await res.json();
      if (data.success) {
        setHousehold(data.household);
      }
    } catch (e: any) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  async function handleRefresh() {
    setRefreshing(true);
    try {
      const res = await fetch('/api/water/household');
      const data = await res.json();
      if (data.success) {
        setHousehold(data.household);
        setFeedback('✓ Status refreshed with live database updates');
        setTimeout(() => setFeedback(null), 3000);
      }
    } catch {
      // Ignore
    } finally {
      setRefreshing(false);
    }
  }

  async function handlePhotoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    setError(null);

    const reader = new FileReader();
    reader.onload = async () => {
      try {
        const res = await fetch('/api/uploads', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ dataUrl: reader.result as string, filename: file.name }),
        });
        const data = await res.json();
        if (data.success) {
          setEvidenceUrl(data.url);
        } else {
          setError(data.error || 'Failed to upload photo');
        }
      } catch (err: any) {
        setError(err.message);
      } finally {
        setUploading(false);
      }
    };
    reader.readAsDataURL(file);
  }

  function handleUseSamplePhoto() {
    setEvidenceUrl(SAMPLE_PHOTO);
  }

  async function handleSubmitForm(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    const isRequestingPlumber = modalTab === 'REQUEST_PLUMBER';
    const finalEvidence = evidenceUrl.trim() || SAMPLE_PHOTO;

    try {
      const res = await fetch('/api/water/repair-claims', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          evidenceUrl: finalEvidence,
          invoiceUrl: invoiceUrl.trim() || undefined,
          householdId: household?.id,
          category,
          locality,
          address: address.trim(),
          notes: notes.trim(),
          repairStage: isRequestingPlumber ? 'REQUESTED' : 'REPAIRED',
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to submit repair request');

      setShowModal(false);
      setEvidenceUrl('');
      setInvoiceUrl('');
      if (isRequestingPlumber) {
        setFeedback('🎉 Plumber request dispatched! A certified plumber can now accept your job on the Plumber portal.');
      } else {
        setFeedback('🎉 Repair claim submitted! Reviewer will verify and release your 75 Green Points.');
      }
      fetchData();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  async function handleLogReading(e: React.FormEvent) {
    e.preventDefault();
    if (!household) return;
    setSubmittingReading(true);
    setError(null);

    try {
      const res = await fetch('/api/water/household', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          householdId: household.id,
          litres: parseFloat(litres),
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to log water reading');

      setShowReadingModal(false);
      setFeedback('✓ Daily water reading saved.');
      fetchData();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSubmittingReading(false);
    }
  }

  const latestReading = household?.readings[0];
  const perPerson = household && latestReading?.litres
    ? Math.round(latestReading.litres / household.memberCount)
    : 110;

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
        <div className="flex items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-xs font-semibold text-cyan-700 bg-cyan-50 w-fit px-3 py-1 rounded-full border border-cyan-200 mb-2">
              <Droplets className="w-3.5 h-3.5" />
              <span>Water Stewardship</span>
            </div>
            <h1 className="font-display text-3xl sm:text-4xl font-bold text-slate-900 tracking-tight">
              Save Water
            </h1>
            <p className="text-slate-600 text-sm mt-1">
              Household consumption tracking &amp; verified plumbing leak repair rewards.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleRefresh}
              disabled={refreshing}
              className="inline-flex items-center gap-1.5 text-xs font-semibold bg-white text-slate-700 border border-slate-200 px-3 py-2 rounded-xl hover:bg-slate-50 transition-colors cursor-pointer shadow-2xs"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} />
              <span>Refresh</span>
            </button>
            <Link
              href="/reviewer"
              className="hidden sm:inline-flex items-center text-xs font-semibold bg-cyan-50 text-cyan-800 border border-cyan-200 px-3.5 py-2 rounded-xl hover:bg-cyan-100 transition-colors"
            >
              Reviewer Hub →
            </Link>
          </div>
        </div>
      </div>

      {feedback && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl text-emerald-900 text-sm flex justify-between items-center shadow-xs">
          <span>{feedback}</span>
          <button onClick={() => setFeedback(null)} className="text-slate-400 hover:text-slate-700 text-xs cursor-pointer">
            ✕
          </button>
        </div>
      )}

      {error && (
        <div className="p-4 bg-rose-50 border border-rose-200 rounded-2xl text-rose-900 text-sm flex justify-between items-center shadow-xs">
          <span>{error}</span>
          <button onClick={() => setError(null)} className="text-rose-400 hover:text-rose-700 text-xs cursor-pointer">
            ✕
          </button>
        </div>
      )}

      {/* Plumbing Repair Reward Hero Card */}
      <div className="bg-gradient-to-r from-cyan-50 via-white to-slate-50 border border-cyan-200/80 rounded-2xl p-6 sm:p-8 shadow-xs relative">
        <div className="flex justify-between items-start mb-3">
          <span className="bg-cyan-100 text-cyan-800 border border-cyan-200 text-xs font-semibold px-3 py-1 rounded-full uppercase tracking-wider">
            Home Plumbing &amp; Plumber Network
          </span>
          <span className="text-xs bg-slate-100 text-slate-600 px-2.5 py-1 rounded-md border border-slate-200 font-medium">
            Chennai Metro Water (Simulated)
          </span>
        </div>

        <h2 className="font-display text-2xl sm:text-3xl font-bold text-slate-900 mt-2">
          Fix Plumbing Leaks &amp; Earn 75 Green Points
        </h2>
        <p className="text-slate-600 text-sm mt-1 max-w-2xl leading-relaxed">
          Request a certified community plumber to visit and fix your leaking tap or pipe, or submit proof of your completed repair to earn 75 Green Points.
        </p>

        <div className="mt-6 flex flex-wrap gap-3">
          <button
            type="button"
            onClick={() => {
              setModalTab('REQUEST_PLUMBER');
              setShowModal(true);
            }}
            className="px-5 py-3 bg-cyan-700 hover:bg-cyan-600 text-white font-semibold rounded-xl text-xs sm:text-sm transition shadow-md flex items-center justify-center gap-2 cursor-pointer"
          >
            <Wrench className="w-4 h-4" />
            <span>Request Community Plumber Visit</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setModalTab('SELF_REPAIR');
              setShowModal(true);
            }}
            className="px-5 py-3 bg-white hover:bg-slate-50 text-cyan-800 border border-cyan-300 font-semibold rounded-xl text-xs sm:text-sm transition shadow-2xs flex items-center justify-center gap-2 cursor-pointer"
          >
            <Camera className="w-4 h-4" />
            <span>Submit Completed Repair Proof (75 GP)</span>
          </button>
        </div>
      </div>

      {/* Household Consumption Stats */}
      {household && (
        <section className="bg-white border border-slate-200/90 rounded-2xl p-6 shadow-xs space-y-4">
          <div className="flex justify-between items-center">
            <div>
              <h3 className="font-display font-bold text-slate-900 text-lg">{household.name}</h3>
              <p className="text-xs text-slate-500">{household.memberCount} Registered Household Members</p>
            </div>
            <button
              onClick={() => setShowReadingModal(true)}
              className="text-xs bg-cyan-50 text-cyan-800 border border-cyan-200 font-semibold px-3.5 py-1.5 rounded-xl hover:bg-cyan-100 transition cursor-pointer"
            >
              + Log Reading
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-center bg-slate-50 p-5 rounded-xl border border-slate-200">
            <div>
              <span className="text-xs font-semibold text-slate-500 uppercase block tracking-wider">Daily Household Total</span>
              <span className="text-3xl font-bold text-cyan-800 font-mono mt-1 block">
                {latestReading?.litres ? `${latestReading.litres} L` : '350 L'}
              </span>
              <span className="text-xs text-slate-400 mt-0.5 block">Metered volume</span>
            </div>
            <div className="sm:border-l border-slate-200 pt-3 sm:pt-0">
              <span className="text-xs font-semibold text-slate-500 uppercase block tracking-wider">Per Person Usage</span>
              <span className="text-3xl font-bold text-slate-900 font-mono mt-1 block">
                {perPerson} L/day
              </span>
              <span className="text-xs font-semibold text-emerald-700 mt-0.5 block">Target: &lt;135 L/person</span>
            </div>
          </div>
        </section>
      )}

      {/* Recent Repair Requests & Claims */}
      <section>
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-2">
            <span>🔧</span> Your Plumbing Requests &amp; Repair Claims
          </h3>
          <button
            onClick={handleRefresh}
            className="text-[11px] text-cyan-700 hover:text-cyan-800 font-semibold flex items-center gap-1 cursor-pointer"
          >
            <RefreshCw className={`w-3 h-3 ${refreshing ? 'animate-spin' : ''}`} />
            <span>Update Feed</span>
          </button>
        </div>

        {(!household?.repairClaims || household.repairClaims.length === 0) ? (
          <div className="bg-white border border-slate-200/90 rounded-2xl p-8 text-center text-slate-500 text-sm shadow-xs">
            <p className="text-3xl mb-2">🚿</p>
            <p className="font-semibold text-slate-800">No repair requests or claims yet</p>
            <p className="text-xs text-slate-400 mt-1">Request a plumber or submit completed repair proof above to earn 75 Green Points!</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {household.repairClaims.map((claim) => {
              const isPlumberRequested = claim.repairStage === 'REQUESTED';
              const isPlumberAccepted = claim.repairStage === 'ACCEPTED';
              const isPlumberVisited = claim.repairStage === 'VISITED';
              const isRepaired = claim.repairStage === 'REPAIRED';
              const isConfirmed = claim.status === 'CONFIRMED';
              const isRejected = claim.status === 'REJECTED';

              return (
                <div
                  key={claim.id}
                  className="bg-white border border-slate-200/90 rounded-2xl p-4 flex flex-col justify-between text-xs shadow-xs space-y-3"
                >
                  <div className="flex justify-between items-start gap-2">
                    <div className="flex items-start gap-3">
                      {claim.evidenceUrl ? (
                        <img
                          src={claim.evidenceUrl}
                          alt="Repair photo"
                          className="w-12 h-12 rounded-xl object-cover bg-slate-100 border border-slate-200 shrink-0"
                        />
                      ) : (
                        <div className="w-12 h-12 rounded-xl bg-cyan-50 border border-cyan-200 flex items-center justify-center text-cyan-700 shrink-0">
                          <Wrench className="w-5 h-5" />
                        </div>
                      )}
                      <div>
                        <span className="font-bold text-slate-900 text-sm block">
                          {claim.category ? `${claim.category} Repair` : 'Home Plumbing Repair'}
                        </span>
                        <div className="flex items-center gap-1 text-[11px] text-slate-400 mt-0.5">
                          <MapPin className="w-3 h-3 shrink-0" />
                          <span>{claim.locality || 'Potheri'}</span>
                          <span>·</span>
                          <span>{new Date(claim.createdAt).toLocaleDateString()}</span>
                        </div>
                        {claim.notes && (
                          <p className="text-xs text-slate-600 mt-1 line-clamp-2 italic">
                            &ldquo;{claim.notes}&rdquo;
                          </p>
                        )}
                      </div>
                    </div>

                    <div>
                      {isConfirmed ? (
                        <span className="text-[10px] font-bold px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200 whitespace-nowrap">
                          ✓ 75 GP Awarded
                        </span>
                      ) : isRejected ? (
                        <span className="text-[10px] font-bold px-2.5 py-1 rounded-full bg-rose-50 text-rose-700 border border-rose-200 whitespace-nowrap">
                          ✕ Rejected
                        </span>
                      ) : isPlumberAccepted ? (
                        <span className="text-[10px] font-bold px-2.5 py-1 rounded-full bg-amber-50 text-amber-800 border border-amber-200 whitespace-nowrap flex items-center gap-1">
                          <Clock className="w-2.5 h-2.5" />
                          <span>Plumber Accepted</span>
                        </span>
                      ) : isPlumberVisited ? (
                        <span className="text-[10px] font-bold px-2.5 py-1 rounded-full bg-indigo-50 text-indigo-800 border border-indigo-200 whitespace-nowrap">
                          Plumber Visited
                        </span>
                      ) : isRepaired ? (
                        <span className="text-[10px] font-bold px-2.5 py-1 rounded-full bg-cyan-50 text-cyan-800 border border-cyan-200 whitespace-nowrap">
                          Review in Progress
                        </span>
                      ) : (
                        <span className="text-[10px] font-bold px-2.5 py-1 rounded-full bg-blue-50 text-blue-800 border border-blue-200 whitespace-nowrap">
                          Awaiting Plumber
                        </span>
                      )}
                    </div>
                  </div>

                  {claim.assignedPlumber && (
                    <div className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 flex items-center justify-between text-[11px]">
                      <span className="text-slate-500">Assigned Plumber:</span>
                      <span className="font-semibold text-slate-900">
                        {claim.assignedPlumber.displayName || 'Certified Plumber'}
                      </span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* Unified Plumbing Action Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 max-w-md w-full space-y-4 shadow-2xl">
            <div className="flex justify-between items-center">
              <h3 className="font-display font-bold text-slate-900 text-xl">
                {modalTab === 'REQUEST_PLUMBER' ? 'Request Community Plumber' : 'Claim 75 GP Repair Reward'}
              </h3>
              <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-slate-700 text-sm cursor-pointer">
                ✕
              </button>
            </div>

            {/* Modal Tabs */}
            <div className="flex bg-slate-100 p-1 rounded-xl text-xs border border-slate-200">
              <button
                type="button"
                onClick={() => setModalTab('REQUEST_PLUMBER')}
                className={`flex-1 py-1.5 rounded-lg font-semibold transition cursor-pointer flex items-center justify-center gap-1.5 ${
                  modalTab === 'REQUEST_PLUMBER' ? 'bg-white text-cyan-800 shadow-xs' : 'text-slate-500 hover:text-slate-900'
                }`}
              >
                <Wrench className="w-3.5 h-3.5" />
                <span>Request Plumber</span>
              </button>
              <button
                type="button"
                onClick={() => setModalTab('SELF_REPAIR')}
                className={`flex-1 py-1.5 rounded-lg font-semibold transition cursor-pointer flex items-center justify-center gap-1.5 ${
                  modalTab === 'SELF_REPAIR' ? 'bg-white text-cyan-800 shadow-xs' : 'text-slate-500 hover:text-slate-900'
                }`}
              >
                <Camera className="w-3.5 h-3.5" />
                <span>Self Repair Proof</span>
              </button>
            </div>

            <form onSubmit={handleSubmitForm} className="space-y-4 text-xs font-semibold">
              <div>
                <label className="block text-slate-700 mb-1">Fixture Issue Category</label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2.5 text-slate-900 outline-none focus:border-cyan-600 shadow-2xs"
                >
                  <option value="TAP">Tap / Faucet Leak (Dripping)</option>
                  <option value="PIPE">Pipe Joint / Concealed Leak</option>
                  <option value="TOILET">Flush Tank / Toilet Drip</option>
                  <option value="METER">Water Meter Fitting Leak</option>
                  <option value="TANK">Overhead Tank Valve Leak</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-700 mb-1">Locality</label>
                <select
                  value={locality}
                  onChange={(e) => setLocality(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2.5 text-slate-900 outline-none focus:border-cyan-600 shadow-2xs"
                >
                  <option value="Potheri">Potheri</option>
                  <option value="Kattankulathur">Kattankulathur</option>
                  <option value="Guduvancheri">Guduvancheri</option>
                  <option value="Maraimalai Nagar">Maraimalai Nagar</option>
                  <option value="Tambaram">Tambaram</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-700 mb-1">
                  Street Address / Flat Number {modalTab === 'REQUEST_PLUMBER' && '(Revealed to plumber when accepted)'}
                </label>
                <input
                  type="text"
                  required
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="e.g. Flat 302, SRM Enclave, Potheri"
                  className="w-full bg-white border border-slate-300 rounded-xl px-3.5 py-2.5 text-slate-900 outline-none focus:border-cyan-600 shadow-2xs"
                />
              </div>

              <div>
                <label className="block text-slate-700 mb-1">Description / Problem Notes</label>
                <textarea
                  rows={2}
                  required
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Describe the leak or what needs fixing..."
                  className="w-full bg-white border border-slate-300 rounded-xl px-3.5 py-2 text-slate-900 outline-none focus:border-cyan-600 shadow-2xs resize-none"
                />
              </div>

              <div>
                <div className="flex justify-between items-center mb-1">
                  <label className="text-slate-700">
                    {modalTab === 'REQUEST_PLUMBER' ? 'Photo of Leak (Optional)' : 'Repair Evidence Photo (Required)'}
                  </label>
                  <button
                    type="button"
                    onClick={handleUseSamplePhoto}
                    className="text-[11px] text-cyan-700 hover:text-cyan-800 underline font-medium cursor-pointer"
                  >
                    Use Sample Photo
                  </button>
                </div>

                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handlePhotoUpload}
                  className="hidden"
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full py-3 bg-slate-50 border border-dashed border-slate-300 rounded-xl text-xs text-slate-700 hover:border-cyan-600 flex items-center justify-center gap-2 cursor-pointer"
                >
                  <Camera className="w-4 h-4 text-slate-500" />
                  {uploading ? 'Uploading...' : evidenceUrl ? '✓ Photo Attached' : 'Upload Leak / Repair Photo'}
                </button>
                {evidenceUrl && (
                  <div className="mt-2 text-center">
                    <img src={evidenceUrl} alt="Preview" className="max-h-20 mx-auto rounded-lg border border-slate-200 shadow-2xs" />
                  </div>
                )}
              </div>

              {modalTab === 'SELF_REPAIR' && (
                <div>
                  <label className="block text-slate-700 mb-1">Plumber Invoice Reference / URL (Optional)</label>
                  <input
                    type="text"
                    value={invoiceUrl}
                    onChange={(e) => setInvoiceUrl(e.target.value)}
                    placeholder="e.g. INV-PLUMB-5582"
                    className="w-full bg-white border border-slate-300 rounded-xl px-3.5 py-2.5 text-slate-900 outline-none focus:border-cyan-600 shadow-2xs"
                  />
                </div>
              )}

              <div className="pt-2 flex gap-3">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="w-1/2 py-2.5 bg-slate-100 text-slate-700 rounded-xl font-semibold hover:bg-slate-200 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting || uploading}
                  className="w-1/2 py-2.5 bg-cyan-700 text-white rounded-xl font-bold hover:bg-cyan-600 disabled:opacity-50 cursor-pointer shadow-xs"
                >
                  {submitting
                    ? 'Submitting...'
                    : modalTab === 'REQUEST_PLUMBER'
                    ? 'Dispatch Request'
                    : 'Submit for 75 GP'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Reading Modal */}
      {showReadingModal && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 max-w-sm w-full space-y-4 shadow-2xl">
            <div className="flex justify-between items-center">
              <h3 className="font-display font-bold text-slate-900 text-xl">Log Water Reading</h3>
              <button onClick={() => setShowReadingModal(false)} className="text-slate-400 hover:text-slate-700 text-sm cursor-pointer">
                ✕
              </button>
            </div>

            <form onSubmit={handleLogReading} className="space-y-4 text-xs font-semibold">
              <div>
                <label className="block text-slate-700 mb-1">Litres Consumed Today</label>
                <input
                  type="number"
                  required
                  value={litres}
                  onChange={(e) => setLitres(e.target.value)}
                  className="w-full bg-white border border-slate-300 rounded-xl px-3.5 py-2.5 text-slate-900 outline-none focus:border-cyan-600 font-mono text-base shadow-2xs"
                />
              </div>

              <div className="pt-2 flex gap-3">
                <button
                  type="button"
                  onClick={() => setShowReadingModal(false)}
                  className="w-1/2 py-2.5 bg-slate-100 text-slate-700 rounded-xl font-semibold hover:bg-slate-200 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingReading}
                  className="w-1/2 py-2.5 bg-cyan-700 text-white rounded-xl font-bold hover:bg-cyan-600 disabled:opacity-50 cursor-pointer shadow-xs"
                >
                  {submittingReading ? 'Saving...' : 'Save Reading'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
