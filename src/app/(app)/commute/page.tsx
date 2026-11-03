'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { ArrowLeft, Bus, Camera, Bell, CheckCircle2, Sparkles, ArrowRight } from 'lucide-react';

interface TicketSubmission {
  id: string;
  ticketId: string;
  journeyDate: string;
  status: string;
  imageUrl: string;
  createdAt: string;
}

interface Challenge {
  id: string;
  modes: string[];
  targetJourneys: number;
  dailyLimit: number;
  rewardValuePaise: number;
  startsAt: string;
  endsAt: string;
  approvedCount: number;
  progress: {
    percent: number;
    remaining: number;
    completed: boolean;
  };
  userSubmissions: TicketSubmission[];
  campaign: {
    name: string;
    description: string;
  };
}

export default function CommutePage() {
  const [challenges, setChallenges] = useState<Challenge[]>([]);
  const [selectedChallenge, setSelectedChallenge] = useState<Challenge | null>(null);
  const [loading, setLoading] = useState(true);
  const [showSubmitModal, setShowSubmitModal] = useState(false);

  // Form states
  const [ticketId, setTicketId] = useState('');
  const [journeyDate, setJourneyDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [imageUrl, setImageUrl] = useState('');
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Remind Me state
  const [reminded, setReminded] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetchChallenges();
    checkReminder();
  }, []);

  async function fetchChallenges() {
    setLoading(true);
    try {
      const res = await fetch('/api/commute/challenges');
      const data = await res.json();
      if (data.success && data.challenges.length > 0) {
        setChallenges(data.challenges);
        setSelectedChallenge(data.challenges[0]);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  async function checkReminder() {
    try {
      const res = await fetch('/api/campaigns/campaign-commute-1/remind');
      if (res.ok) {
        const data = await res.json();
        setReminded(data.reminded);
      }
    } catch (e) {
      console.error(e);
    }
  }

  async function handleToggleReminder() {
    try {
      const res = await fetch('/api/campaigns/campaign-commute-1/remind', { method: 'POST' });
      const data = await res.json();
      if (res.ok) {
        setReminded(data.reminded);
        setFeedback(data.message);
      }
    } catch (e) {
      setError('Failed to update reminder.');
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
        const base64 = reader.result as string;
        const res = await fetch('/api/uploads', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ dataUrl: base64, filename: file.name }),
        });
        const data = await res.json();
        if (data.success) {
          setImageUrl(data.url);
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

  async function handleSubmitTicket(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedChallenge) return;
    if (!imageUrl) {
      setError('Please upload a photo of your ticket or transit pass.');
      return;
    }

    setSubmitting(true);
    setError(null);
    setFeedback(null);

    try {
      const res = await fetch('/api/commute/tickets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          challengeId: selectedChallenge.id,
          ticketId: ticketId.trim(),
          journeyDate: new Date(journeyDate).toISOString(),
          imageUrl,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to submit commute ticket');
      }

      setFeedback('🎉 Ticket submitted! A reviewer will verify your journey shortly.');
      setShowSubmitModal(false);
      setTicketId('');
      setImageUrl('');
      fetchChallenges();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

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
            <div className="flex items-center gap-2 text-xs font-semibold text-purple-700 bg-purple-50 w-fit px-3 py-1 rounded-full border border-purple-200 mb-2">
              <Bus className="w-3.5 h-3.5" />
              <span>Low-Carbon Public Transit</span>
            </div>
            <h1 className="font-display text-3xl sm:text-4xl font-bold text-slate-900 tracking-tight">
              Green Commute
            </h1>
            <p className="text-slate-600 text-sm mt-1">
              Ride Chennai Metro, MTC buses, or suburban rail to complete the 5-trip challenge and earn cash.
            </p>
          </div>

          <Link
            href="/reviewer"
            className="hidden sm:inline-flex items-center text-xs font-semibold bg-purple-50 text-purple-800 border border-purple-200 px-3.5 py-2 rounded-xl hover:bg-purple-100 transition-colors"
          >
            Transit Reviewer Hub →
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

      {loading ? (
        <div className="text-center py-16 text-slate-400 text-sm animate-pulse">
          Loading commute challenges...
        </div>
      ) : selectedChallenge ? (
        <div className="space-y-6">
          {/* Challenge Banner Card */}
          <div className="bg-gradient-to-r from-purple-50 via-white to-slate-50 border border-purple-200/80 rounded-2xl p-6 sm:p-8 shadow-xs relative">
            <div className="flex justify-between items-start mb-3">
              <span className="bg-purple-100 text-purple-800 border border-purple-200 text-xs font-semibold px-3 py-1 rounded-full uppercase tracking-wider">
                Active Transit Challenge
              </span>
              <span className="text-xs bg-slate-100 text-slate-600 px-2.5 py-1 rounded-md border border-slate-200 font-medium">
                CMRL / MTC (Simulated)
              </span>
            </div>

            <h2 className="font-display text-2xl sm:text-3xl font-bold text-slate-900 mt-2">
              5-Trip Green Commute Challenge
            </h2>
            <p className="text-slate-600 text-sm mt-1 max-w-2xl leading-relaxed">
              Take 5 trips on Chennai Metro Rail, suburban EMU trains, or MTC buses to earn ₹100 cash voucher credited straight to your wallet.
            </p>

            {/* Progress Bar & Details */}
            <div className="mt-6 bg-white p-5 rounded-xl border border-slate-200/80 shadow-2xs space-y-3">
              <div className="flex justify-between text-xs font-semibold">
                <span className="text-slate-500">Milestone Progress</span>
                <span className="text-purple-700 font-bold">
                  {selectedChallenge.approvedCount} / {selectedChallenge.targetJourneys} Journeys Verified ({selectedChallenge.progress.percent}%)
                </span>
              </div>

              <div className="w-full bg-slate-100 h-3 rounded-full overflow-hidden">
                <div
                  className="bg-purple-600 h-full rounded-full transition-all duration-500"
                  style={{ width: `${selectedChallenge.progress.percent}%` }}
                />
              </div>

              <div className="flex justify-between items-center text-xs text-slate-500 pt-1">
                <span>Daily limit: {selectedChallenge.dailyLimit} trip/day</span>
                {selectedChallenge.progress.completed ? (
                  <span className="text-emerald-700 font-bold">🎉 Challenge Complete! ₹100 Credited</span>
                ) : (
                  <span className="font-semibold text-purple-700">{selectedChallenge.progress.remaining} trips needed</span>
                )}
              </div>
            </div>

            {/* Action Buttons */}
            <div className="mt-6 flex flex-wrap gap-3">
              <button
                type="button"
                onClick={() => setShowSubmitModal(true)}
                className="px-6 py-3 bg-purple-600 hover:bg-purple-700 text-white font-semibold rounded-xl text-xs sm:text-sm transition shadow-md flex items-center justify-center gap-2 cursor-pointer"
              >
                <Camera className="w-4 h-4" />
                <span>Submit Transit Ticket</span>
              </button>

              <button
                type="button"
                onClick={handleToggleReminder}
                className={`px-5 py-3 rounded-xl font-semibold text-xs sm:text-sm transition flex items-center justify-center gap-2 cursor-pointer ${
                  reminded
                    ? 'bg-emerald-50 text-emerald-800 border border-emerald-300'
                    : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 shadow-2xs'
                }`}
              >
                <Bell className="w-4 h-4" />
                <span>{reminded ? 'Reminded ✓' : 'Remind Me'}</span>
              </button>
            </div>
          </div>

          {/* Submissions History */}
          <section>
            <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-4">
              Your Ticket Submissions
            </h3>

            {(!selectedChallenge.userSubmissions || selectedChallenge.userSubmissions.length === 0) ? (
              <div className="bg-white border border-slate-200/90 rounded-2xl p-8 text-center text-slate-500 text-sm shadow-xs">
                <p className="text-3xl mb-2">🚇</p>
                <p className="font-semibold text-slate-800">No tickets submitted yet</p>
                <p className="text-xs text-slate-400 mt-1">Take a ride today, keep your ticket, and upload it above!</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {selectedChallenge.userSubmissions.map((t) => (
                  <div
                    key={t.id}
                    className="bg-white border border-slate-200/90 rounded-2xl p-4 flex justify-between items-center shadow-xs"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-slate-900 text-xs">{t.ticketId}</span>
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                            t.status === 'APPROVED'
                              ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                              : t.status === 'REJECTED'
                              ? 'bg-rose-50 text-rose-700 border border-rose-200'
                              : 'bg-amber-50 text-amber-800 border border-amber-200'
                          }`}
                        >
                          {t.status}
                        </span>
                      </div>
                      <p className="text-xs text-slate-500 mt-1">
                        Journey Date: {new Date(t.journeyDate).toLocaleDateString()}
                      </p>
                    </div>

                    {t.imageUrl && (
                      <a
                        href={t.imageUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="text-xs text-purple-600 hover:text-purple-700 font-semibold underline"
                      >
                        View Ticket →
                      </a>
                    )}
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>
      ) : null}

      {/* Modal: Submit Ticket */}
      {showSubmitModal && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 max-w-md w-full space-y-4 shadow-2xl">
            <div className="flex justify-between items-center">
              <h3 className="font-display font-bold text-slate-900 text-xl">Submit Transit Ticket</h3>
              <button
                onClick={() => setShowSubmitModal(false)}
                className="text-slate-400 hover:text-slate-700 text-sm cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSubmitTicket} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Ticket Number / PNR / Pass ID</label>
                <input
                  type="text"
                  required
                  value={ticketId}
                  onChange={(e) => setTicketId(e.target.value)}
                  placeholder="e.g. CMRL-984210 or BUS-47A-12"
                  className="w-full bg-white border border-slate-300 rounded-xl px-3.5 py-2.5 text-slate-900 text-sm focus:border-purple-600 outline-none uppercase font-mono shadow-2xs"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Journey Date</label>
                <input
                  type="date"
                  required
                  value={journeyDate}
                  onChange={(e) => setJourneyDate(e.target.value)}
                  className="w-full bg-white border border-slate-300 rounded-xl px-3.5 py-2.5 text-slate-900 text-sm focus:border-purple-600 outline-none shadow-2xs"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Ticket Photo (Proof)</label>
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
                  className="w-full py-3 bg-slate-50 border border-dashed border-slate-300 rounded-xl text-xs font-semibold text-slate-700 hover:border-purple-600 flex items-center justify-center gap-2 cursor-pointer"
                >
                  <Camera className="w-4 h-4 text-slate-500" />
                  {uploading ? 'Uploading...' : imageUrl ? '✓ Photo Attached (Click to change)' : 'Upload Ticket Photo'}
                </button>
                {imageUrl && (
                  <div className="mt-2 text-center">
                    <img src={imageUrl} alt="Ticket preview" className="max-h-28 mx-auto rounded-lg border border-slate-200 shadow-2xs" />
                  </div>
                )}
              </div>

              <div className="pt-2 flex gap-3">
                <button
                  type="button"
                  onClick={() => setShowSubmitModal(false)}
                  className="w-1/2 py-2.5 bg-slate-100 text-slate-700 rounded-xl text-xs font-semibold hover:bg-slate-200 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting || uploading}
                  className="w-1/2 py-2.5 bg-purple-600 text-white rounded-xl text-xs font-bold hover:bg-purple-700 disabled:opacity-50 cursor-pointer shadow-xs"
                >
                  {submitting ? 'Submitting...' : 'Submit Ticket'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
