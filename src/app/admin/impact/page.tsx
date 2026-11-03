import React from 'react';
import { impactService } from '@/server/services/impactService';
import Link from 'next/link';

export const dynamic = 'force-dynamic';

export default async function AdminImpactDashboardPage() {
  const metrics = await impactService.getCityMetrics();

  return (
    <div className="space-y-6 font-body">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="font-display text-2xl sm:text-3xl font-bold text-slate-900 flex items-center gap-2">
            <span>🌍</span> City Sustainability &amp; Impact
          </h2>
          <p className="text-slate-500 text-xs sm:text-sm mt-1">
            Aggregated municipal metrics across Chennai Metropolitan Area
          </p>
        </div>

        <Link
          href="/sponsor"
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-emerald-700 hover:bg-emerald-600 text-white rounded-xl text-xs font-semibold transition shadow-xs w-fit"
        >
          Open Sponsor Portal →
        </Link>
      </div>

      {/* Hero Carbon Banner */}
      <div className="bg-gradient-to-r from-emerald-50 via-teal-50 to-white border border-emerald-200/90 rounded-3xl p-6 shadow-xs flex items-center justify-between">
        <div>
          <span className="text-xs uppercase font-bold text-emerald-800 tracking-wider">
            Total Carbon Footprint Reduction
          </span>
          <div className="text-4xl font-extrabold text-slate-900 mt-1 font-display">
            {metrics.carbonAvoidedKg.toLocaleString()} <span className="text-xl font-normal text-emerald-700">kg CO₂e</span>
          </div>
          <p className="text-xs text-slate-600 mt-1">
            Equivalent to planting ~{Math.round(metrics.carbonAvoidedKg / 22)} urban trees across Chennai
          </p>
        </div>

        <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-emerald-100 text-emerald-800 border border-emerald-200 flex items-center justify-center text-3xl sm:text-4xl shadow-2xs">
          🌱
        </div>
      </div>

      {/* 6-Pillar Metric Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <div className="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-xs">
          <div className="text-2xl mb-2">🛍️</div>
          <p className="text-2xl font-extrabold text-emerald-700 font-display">{metrics.stampsAvoidedBags}</p>
          <p className="text-slate-900 text-sm font-semibold mt-1">Single-Use Bags Avoided</p>
          <p className="text-slate-500 text-xs mt-0.5">Reusable container &amp; tote stamps</p>
        </div>

        <div className="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-xs">
          <div className="text-2xl mb-2">🍱</div>
          <p className="text-2xl font-extrabold text-amber-600 font-display">{metrics.mealsRescued}</p>
          <p className="text-slate-900 text-sm font-semibold mt-1">Surplus Meals Rescued</p>
          <p className="text-slate-500 text-xs mt-0.5">Discount meals + NGO food parcels</p>
        </div>

        <div className="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-xs">
          <div className="text-2xl mb-2">💧</div>
          <p className="text-2xl font-extrabold text-blue-600 font-display">{metrics.leaksRepaired}</p>
          <p className="text-slate-900 text-sm font-semibold mt-1">Water Leaks Resolved</p>
          <p className="text-slate-500 text-xs mt-0.5">Verified public repairs &amp; citizen claims</p>
        </div>

        <div className="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-xs">
          <div className="text-2xl mb-2">🚇</div>
          <p className="text-2xl font-extrabold text-purple-600 font-display">{metrics.transitTrips}</p>
          <p className="text-slate-900 text-sm font-semibold mt-1">Clean Transit Journeys</p>
          <p className="text-slate-500 text-xs mt-0.5">Verified CMRL Metro &amp; MTC bus trips</p>
        </div>

        <div className="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-xs">
          <div className="text-2xl mb-2">⚡</div>
          <p className="text-2xl font-extrabold text-amber-600 font-display">{metrics.kwhSaved} kWh</p>
          <p className="text-slate-900 text-sm font-semibold mt-1">Electricity Conserved</p>
          <p className="text-slate-500 text-xs mt-0.5">10% baseline reduction challenges</p>
        </div>

        <div className="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-xs">
          <div className="text-2xl mb-2">💰</div>
          <p className="text-2xl font-extrabold text-emerald-700 font-display">₹{metrics.totalDisbursedRupees.toLocaleString()}</p>
          <p className="text-slate-900 text-sm font-semibold mt-1">Eco-Incentives Paid</p>
          <p className="text-slate-500 text-xs mt-0.5">Disbursed directly into citizen wallets</p>
        </div>
      </div>

      {/* Municipal Context & Data Provenance */}
      <div className="bg-white border border-slate-200/90 rounded-2xl p-5 text-xs text-slate-600 space-y-2 shadow-xs">
        <h3 className="text-slate-900 font-semibold text-sm">Data Provenance &amp; Verification Protocol</h3>
        <p>
          All metrics are computed append-only from double-entry cryptographic ledger records and verified reviewer actions.
          Simulated entities (e.g. CMRL simulated authority, Chennai Metro Water demo) are visibly badged and isolated from production municipal telemetry.
        </p>
        <p className="text-slate-400 pt-1">
          Last computed: {new Date(metrics.lastUpdated).toLocaleString()}
        </p>
      </div>
    </div>
  );
}
