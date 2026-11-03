'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { ArrowLeft, Zap, Plus, CheckCircle2, AlertCircle, Sparkles, TrendingDown } from 'lucide-react';
import BillPredictorCard from '@/components/electricity/BillPredictorCard';

interface Device {
  id: string;
  name: string;
  appliance?: string | null;
  circuit?: string | null;
  isSimulated: boolean;
  readings: {
    id: string;
    watts?: number | null;
    kwh?: number | null;
    readingAt: string;
  }[];
}

interface Bill {
  id: string;
  periodStart: string;
  periodEnd: string;
  units: number;
  amountPaise: number;
  source: string;
}

interface BaselineStatus {
  hasSufficientHistory: boolean;
  baselineKwh: number;
  currentKwh: number;
  billCount: number;
  latestBillId?: string;
  evaluation?: {
    reductionPercent: number;
    achieved: boolean;
    savingsKwh: number;
  } | null;
  alreadyClaimed: boolean;
}

export default function ElectricityPage() {
  const [devices, setDevices] = useState<Device[]>([]);
  const [bills, setBills] = useState<Bill[]>([]);
  const [status, setStatus] = useState<BaselineStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [claiming, setClaiming] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // New bill modal state
  const [showAddBillModal, setShowAddBillModal] = useState(false);
  const [units, setUnits] = useState('185');
  const [amountRupees, setAmountRupees] = useState('1295');
  const [periodStart, setPeriodStart] = useState('2026-10-01');
  const [periodEnd, setPeriodEnd] = useState('2026-10-31');
  const [submittingBill, setSubmittingBill] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  async function fetchData() {
    setLoading(true);
    try {
      const [devRes, billRes, statRes] = await Promise.all([
        fetch('/api/electricity/devices'),
        fetch('/api/electricity/bills'),
        fetch('/api/electricity/status'),
      ]);

      const [devData, billData, statData] = await Promise.all([
        devRes.json(),
        billRes.json(),
        statRes.json(),
      ]);

      if (devData.success) setDevices(devData.devices);
      if (billData.success) setBills(billData.bills);
      if (statData.success) setStatus(statData.status);
    } catch (e: any) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  async function handleClaimReward() {
    if (!status?.latestBillId) return;
    setClaiming(true);
    setError(null);
    try {
      const res = await fetch('/api/electricity/claim-challenge', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ billId: status.latestBillId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to claim reward');
      setFeedback('🎉 150 Green Points successfully credited to your wallet!');
      fetchData();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setClaiming(false);
    }
  }

  async function handleAddBill(e: React.FormEvent) {
    e.preventDefault();
    setSubmittingBill(true);
    setError(null);

    try {
      const res = await fetch('/api/electricity/bills', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          periodStart: new Date(periodStart).toISOString(),
          periodEnd: new Date(periodEnd).toISOString(),
          units: parseFloat(units),
          amountPaise: Math.round(parseFloat(amountRupees) * 100),
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to add bill');

      setShowAddBillModal(false);
      setFeedback('✓ Electricity bill recorded successfully.');
      fetchData();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSubmittingBill(false);
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
        <div className="flex items-center gap-2 text-xs font-semibold text-amber-700 bg-amber-50 w-fit px-3 py-1 rounded-full border border-amber-200 mb-2">
          <Zap className="w-3.5 h-3.5" />
          <span>Energy Conservation</span>
        </div>
        <h1 className="font-display text-3xl sm:text-4xl font-bold text-slate-900 tracking-tight">
          Save Electricity
        </h1>
        <p className="text-slate-600 text-sm mt-1">
          Smart meter telemetry monitoring &amp; 10% TANGEDCO billing cycle reduction challenges.
        </p>
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

      {/* 10% Reduction Challenge Card */}
      {status && (
        <div className="bg-gradient-to-r from-amber-50 via-white to-slate-50 border border-amber-200/80 rounded-2xl p-6 sm:p-8 shadow-xs relative">
          <div className="flex justify-between items-start mb-3">
            <span className="bg-amber-100 text-amber-800 border border-amber-200 text-xs font-semibold px-3 py-1 rounded-full uppercase tracking-wider">
              City Energy Challenge
            </span>
            <span className="text-xs bg-slate-100 text-slate-600 px-2.5 py-1 rounded-md border border-slate-200 font-medium">
              Chennai EcoCell
            </span>
          </div>

          <h2 className="font-display text-2xl sm:text-3xl font-bold text-slate-900 mt-2">
            10% Electricity Reduction Reward
          </h2>
          <p className="text-slate-600 text-sm mt-1 max-w-2xl leading-relaxed">
            150 pts for 10% less vs your own bills: reduce current billing cycle usage by ≥10% compared to your 3-period historical baseline.
          </p>

          <div className="my-6 grid grid-cols-1 sm:grid-cols-3 gap-4 text-center bg-white p-5 rounded-xl border border-slate-200 shadow-2xs">
            <div>
              <span className="text-xs font-semibold text-slate-500 uppercase block tracking-wider">Baseline (Avg)</span>
              <span className="text-2xl font-bold text-slate-900 font-mono mt-1 block">
                {status.baselineKwh} kWh
              </span>
            </div>
            <div className="sm:border-x border-slate-100 pt-3 sm:pt-0">
              <span className="text-xs font-semibold text-slate-500 uppercase block tracking-wider">Latest Bill</span>
              <span className="text-2xl font-bold text-amber-700 font-mono mt-1 block">
                {status.currentKwh} kWh
              </span>
            </div>
            <div className="pt-3 sm:pt-0">
              <span className="text-xs font-semibold text-slate-500 uppercase block tracking-wider">Reduction Drop</span>
              <span className={`text-2xl font-bold font-mono mt-1 block ${
                (status.evaluation?.reductionPercent || 0) >= 10 ? 'text-emerald-700' : 'text-slate-700'
              }`}>
                {status.evaluation?.reductionPercent ?? 0}%
              </span>
            </div>
          </div>

          {/* Claim Action */}
          {status.hasSufficientHistory ? (
            status.evaluation?.achieved ? (
              status.alreadyClaimed ? (
                <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl text-center text-xs font-bold text-emerald-800">
                  ✓ Challenge Reward Claimed! 150 GP credited to your wallet.
                </div>
              ) : (
                <button
                  type="button"
                  disabled={claiming}
                  onClick={handleClaimReward}
                  className="w-full py-3.5 bg-emerald-700 hover:bg-emerald-600 text-white font-semibold rounded-xl transition text-sm shadow-md cursor-pointer"
                >
                  {claiming ? 'Processing Reward...' : '⚡ Claim 150 Green Points Now'}
                </button>
              )
            ) : (
              <div className="p-4 bg-slate-100 rounded-xl text-center text-xs text-slate-600 font-medium">
                Target: 10% reduction. Current drop: {status.evaluation?.reductionPercent || 0}%. Keep saving power to unlock the 150 pts bonus!
              </div>
            )
          ) : (
            <div className="p-4 bg-slate-100 rounded-xl text-center text-xs text-slate-600 font-medium">
              Need {Math.max(0, 3 - status.billCount)} more billing periods to establish an accurate baseline.
            </div>
          )}
        </div>
      )}

      {/* Trained AI Household Bill Predictor */}
      <BillPredictorCard />

      {/* Connected Energy Plugs & Monitors */}
      <section>
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-2">
            <span>🔌</span> Connected Smart Monitors ({devices.length})
          </h3>
          <span className="text-xs font-semibold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
            Live Telemetry
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {devices.map((d) => {
            const latest = d.readings[0];
            return (
              <div
                key={d.id}
                className="bg-white border border-slate-200/90 rounded-2xl p-5 flex justify-between items-center shadow-xs"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-slate-900 text-sm">{d.name}</span>
                    {d.isSimulated && (
                      <span className="text-[10px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded border border-slate-200 font-medium">
                        Simulated
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-500 mt-1">{d.circuit || d.appliance || 'Plug Sensor'}</p>
                </div>

                <div className="text-right">
                  <span className="text-lg font-mono font-bold text-amber-700 block">
                    {latest?.watts ? `${latest.watts} W` : '0 W'}
                  </span>
                  <span className="text-xs text-slate-400">
                    {latest?.kwh ? `${latest.kwh} kWh today` : 'Idle'}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Billing History */}
      <section>
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-2">
            <span>📄</span> Electricity Bills ({bills.length})
          </h3>
          <button
            onClick={() => setShowAddBillModal(true)}
            className="text-xs bg-amber-600 text-white font-semibold px-3.5 py-1.5 rounded-lg hover:bg-amber-700 transition cursor-pointer shadow-2xs"
          >
            + Log Bill
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {bills.map((b) => (
            <div
              key={b.id}
              className="bg-white border border-slate-200/90 rounded-2xl p-4 flex justify-between items-center text-xs shadow-xs"
            >
              <div>
                <span className="font-bold text-slate-900 text-sm">
                  {new Date(b.periodStart).toLocaleDateString([], { month: 'short' })} - {new Date(b.periodEnd).toLocaleDateString([], { month: 'short', year: 'numeric' })}
                </span>
                <p className="text-slate-500 text-xs mt-0.5">Source: {b.source}</p>
              </div>

              <div className="text-right">
                <span className="font-mono font-bold text-slate-900 text-sm block">{b.units} kWh</span>
                <span className="text-emerald-700 font-semibold text-xs">₹{(b.amountPaise / 100).toFixed(0)}</span>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Add Bill Modal */}
      {showAddBillModal && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 max-w-md w-full space-y-4 shadow-2xl">
            <div className="flex justify-between items-center">
              <h3 className="font-display font-bold text-slate-900 text-xl">Record Electricity Bill</h3>
              <button onClick={() => setShowAddBillModal(false)} className="text-slate-400 hover:text-slate-700 text-sm cursor-pointer">
                ✕
              </button>
            </div>

            <form onSubmit={handleAddBill} className="space-y-4 text-xs font-semibold">
              <div>
                <label className="block text-slate-700 mb-1">Units Consumed (kWh)</label>
                <input
                  type="number"
                  step="0.1"
                  required
                  value={units}
                  onChange={(e) => setUnits(e.target.value)}
                  className="w-full bg-white border border-slate-300 rounded-xl px-3.5 py-2.5 text-slate-900 text-sm outline-none focus:border-amber-600 shadow-2xs font-mono"
                />
              </div>

              <div>
                <label className="block text-slate-700 mb-1">Bill Amount (₹)</label>
                <input
                  type="number"
                  required
                  value={amountRupees}
                  onChange={(e) => setAmountRupees(e.target.value)}
                  className="w-full bg-white border border-slate-300 rounded-xl px-3.5 py-2.5 text-slate-900 text-sm outline-none focus:border-amber-600 shadow-2xs font-mono"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 mb-1">Period Start</label>
                  <input
                    type="date"
                    required
                    value={periodStart}
                    onChange={(e) => setPeriodStart(e.target.value)}
                    className="w-full bg-white border border-slate-300 rounded-xl px-3.5 py-2.5 text-slate-900 text-sm outline-none shadow-2xs"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 mb-1">Period End</label>
                  <input
                    type="date"
                    required
                    value={periodEnd}
                    onChange={(e) => setPeriodEnd(e.target.value)}
                    className="w-full bg-white border border-slate-300 rounded-xl px-3.5 py-2.5 text-slate-900 text-sm outline-none shadow-2xs"
                  />
                </div>
              </div>

              <div className="pt-2 flex gap-3">
                <button
                  type="button"
                  onClick={() => setShowAddBillModal(false)}
                  className="w-1/2 py-2.5 bg-slate-100 text-slate-700 rounded-xl font-semibold hover:bg-slate-200 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingBill}
                  className="w-1/2 py-2.5 bg-amber-600 text-white rounded-xl font-bold hover:bg-amber-700 disabled:opacity-50 cursor-pointer shadow-xs"
                >
                  {submittingBill ? 'Saving...' : 'Save Bill'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
