'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { ArrowLeft, Droplets, Camera, CheckCircle2, Sparkles, Wrench } from 'lucide-react';

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
    createdAt: string;
  }[];
}

export default function WaterPage() {
  const [household, setHousehold] = useState<Household | null>(null);
  const [loading, setLoading] = useState(true);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Claim modal state
  const [showClaimModal, setShowClaimModal] = useState(false);
  const [evidenceUrl, setEvidenceUrl] = useState('');
  const [invoiceUrl, setInvoiceUrl] = useState('');
  const [uploading, setUploading] = useState(false);
  const [submittingClaim, setSubmittingClaim] = useState(false);

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

  async function handleSubmitRepairClaim(e: React.FormEvent) {
    e.preventDefault();
    if (!evidenceUrl) {
      setError('Please attach a photo of the repaired plumbing fixture.');
      return;
    }

    setSubmittingClaim(true);
    setError(null);

    try {
      const res = await fetch('/api/water/repair-claims', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          evidenceUrl,
          invoiceUrl: invoiceUrl || undefined,
          householdId: household?.id,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to submit repair claim');

      setShowClaimModal(false);
      setEvidenceUrl('');
      setInvoiceUrl('');
      setFeedback('🎉 Repair claim submitted! Reviewer will verify and release your 75 Green Points.');
      fetchData();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSubmittingClaim(false);
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

          <Link
            href="/reviewer"
            className="hidden sm:inline-flex items-center text-xs font-semibold bg-cyan-50 text-cyan-800 border border-cyan-200 px-3.5 py-2 rounded-xl hover:bg-cyan-100 transition-colors"
          >
            Reviewer Hub →
          </Link>
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
            Home Plumbing Repair
          </span>
          <span className="text-xs bg-slate-100 text-slate-600 px-2.5 py-1 rounded-md border border-slate-200 font-medium">
            Chennai Metro Water (Simulated)
          </span>
        </div>

        <h2 className="font-display text-2xl sm:text-3xl font-bold text-slate-900 mt-2">
          Fixed a Leaking Tap or Pipe?
        </h2>
        <p className="text-slate-600 text-sm mt-1 max-w-2xl leading-relaxed">
          75 pts per verified repair: fix household drips, upload photo evidence or plumber invoice, and earn 75 Green Points once confirmed by city reviewers.
        </p>

        <button
          type="button"
          onClick={() => setShowClaimModal(true)}
          className="mt-6 px-6 py-3 bg-cyan-700 hover:bg-cyan-600 text-white font-semibold rounded-xl text-xs sm:text-sm transition shadow-md flex items-center justify-center gap-2 cursor-pointer"
        >
          <Camera className="w-4 h-4" />
          <span>Claim 75 Green Points Repair Reward</span>
        </button>
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

      {/* Recent Repair Claims */}
      <section>
        <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-4 flex items-center gap-2">
          <span>🔧</span> Your Plumbing Repair Claims
        </h3>

        {(!household?.repairClaims || household.repairClaims.length === 0) ? (
          <div className="bg-white border border-slate-200/90 rounded-2xl p-8 text-center text-slate-500 text-sm shadow-xs">
            <p className="text-3xl mb-2">🚿</p>
            <p className="font-semibold text-slate-800">No repair claims submitted yet</p>
            <p className="text-xs text-slate-400 mt-1">Fixed a leaky faucet or flush tank? Submit evidence above to claim 75 Green Points!</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {household.repairClaims.map((claim) => (
              <div
                key={claim.id}
                className="bg-white border border-slate-200/90 rounded-2xl p-4 flex justify-between items-center text-xs shadow-xs"
              >
                <div className="flex items-center gap-3">
                  <img
                    src={claim.evidenceUrl}
                    alt="Repair photo"
                    className="w-12 h-12 rounded-xl object-cover bg-slate-100 border border-slate-200"
                  />
                  <div>
                    <span className="font-bold text-slate-900 text-sm block">Home Plumbing Repair</span>
                    <span className="text-xs text-slate-400 mt-0.5 block">
                      {new Date(claim.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                </div>

                <span
                  className={`text-[10px] font-bold px-2.5 py-1 rounded-full ${
                    claim.status === 'CONFIRMED'
                      ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                      : claim.status === 'REJECTED'
                      ? 'bg-rose-50 text-rose-700 border border-rose-200'
                      : 'bg-amber-50 text-amber-800 border border-amber-200'
                  }`}
                >
                  {claim.status === 'CONFIRMED' ? '✓ 75 GP Awarded' : claim.status}
                </span>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Claim Modal */}
      {showClaimModal && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 max-w-md w-full space-y-4 shadow-2xl">
            <div className="flex justify-between items-center">
              <h3 className="font-display font-bold text-slate-900 text-xl">Claim Plumbing Repair Reward</h3>
              <button onClick={() => setShowClaimModal(false)} className="text-slate-400 hover:text-slate-700 text-sm cursor-pointer">
                ✕
              </button>
            </div>

            <form onSubmit={handleSubmitRepairClaim} className="space-y-4 text-xs font-semibold">
              <div>
                <label className="block text-slate-700 mb-1">Repair Photo Evidence</label>
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
                  {uploading ? 'Uploading...' : evidenceUrl ? '✓ Photo Attached' : 'Upload Repair Photo'}
                </button>
                {evidenceUrl && (
                  <div className="mt-2 text-center">
                    <img src={evidenceUrl} alt="Preview" className="max-h-24 mx-auto rounded-lg border border-slate-200 shadow-2xs" />
                  </div>
                )}
              </div>

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

              <div className="pt-2 flex gap-3">
                <button
                  type="button"
                  onClick={() => setShowClaimModal(false)}
                  className="w-1/2 py-2.5 bg-slate-100 text-slate-700 rounded-xl font-semibold hover:bg-slate-200 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingClaim || uploading}
                  className="w-1/2 py-2.5 bg-cyan-700 text-white rounded-xl font-bold hover:bg-cyan-600 disabled:opacity-50 cursor-pointer shadow-xs"
                >
                  {submittingClaim ? 'Submitting...' : 'Submit Claim'}
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
