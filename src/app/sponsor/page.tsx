import React from 'react';
import { impactService } from '@/server/services/impactService';
import { getSession } from '@/server/session';
import { ShieldCheck, BarChart3, MapPin, Users } from 'lucide-react';

export const dynamic = 'force-dynamic';

export default async function SponsorPage() {
  const session = await getSession();
  const report = await impactService.getSponsorReport(session?.partnerIds?.[0]);

  return (
    <div className="space-y-8 font-body">
      {/* Sponsor Header Card */}
      <div className="bg-gradient-to-r from-emerald-50 via-white to-slate-50 border border-emerald-200/80 rounded-2xl p-6 sm:p-8 shadow-xs flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <span className="text-xs uppercase font-bold text-emerald-800 tracking-wider">
            Funder Organization
          </span>
          <h2 className="font-display text-2xl sm:text-3xl font-bold text-slate-900 mt-1">
            {report.sponsor?.name || 'Chennai Metro Water & City Sponsors'}
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Category: {report.sponsor?.type || 'Civic Infrastructure Funder'} · Status: Active Verified Partner
          </p>
        </div>

        <div className="text-left sm:text-right bg-white sm:bg-transparent p-4 sm:p-0 rounded-xl border sm:border-0 border-slate-200">
          <span className="text-xs text-slate-500 block">Total Sponsored Campaigns</span>
          <span className="font-display text-3xl font-bold text-slate-900 mt-0.5 block">
            {report.campaigns.length}
          </span>
        </div>
      </div>

      {/* Campaign Budget Utilization */}
      <section className="space-y-4">
        <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-2">
          <span>📊</span> Budget Utilization &amp; Impact Delivery
        </h3>

        <div className="grid gap-4">
          {report.campaigns.map((c) => (
            <div
              key={c.id}
              className="bg-white border border-slate-200/90 rounded-2xl p-6 space-y-4 shadow-xs"
            >
              <div className="flex justify-between items-start">
                <div>
                  <div className="flex items-center gap-2">
                    <h4 className="font-display font-bold text-slate-900 text-lg">{c.name}</h4>
                    <span className="text-[10px] font-bold px-2 py-0.5 bg-slate-100 text-slate-700 rounded-full uppercase border border-slate-200">
                      {c.section}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5">
                    {c.totalClaims} verified citizen actions funded
                  </p>
                </div>

                <span className="text-xs font-mono font-bold text-emerald-800 bg-emerald-50 border border-emerald-200 px-3 py-1 rounded-full">
                  {c.percentSpent}% Disbursed
                </span>
              </div>

              {/* Progress bar */}
              <div className="space-y-2">
                <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden">
                  <div
                    className="bg-emerald-600 h-full rounded-full transition-all"
                    style={{ width: `${c.percentSpent}%` }}
                  />
                </div>
                <div className="flex justify-between text-xs text-slate-600 font-mono">
                  <span>Spent: ₹{(c.spentPaise / 100).toLocaleString()}</span>
                  <span>Remaining: ₹{(c.remainingPaise / 100).toLocaleString()}</span>
                  <span className="text-slate-900 font-bold">Total: ₹{(c.totalPaise / 100).toLocaleString()}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Citizen Reach by Locality with k-Anonymity */}
      <section className="bg-white border border-slate-200/90 rounded-2xl p-6 sm:p-8 space-y-5 shadow-xs">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
          <div>
            <h3 className="font-display font-bold text-slate-900 text-xl flex items-center gap-2">
              <MapPin className="w-5 h-5 text-emerald-600" />
              <span>Citizen Reach by Locality</span>
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Geographic distribution of active reward participants across Chennai &amp; Chengalpattu
            </p>
          </div>

          <span className="text-xs bg-purple-50 text-purple-700 border border-purple-200 px-3 py-1 rounded-full font-semibold">
            🛡️ k-Anonymity (k=5) Active
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-2">
          {report.localityReach.map((loc) => (
            <div
              key={loc.locality}
              className="bg-slate-50 border border-slate-200 rounded-xl p-4 text-center space-y-1"
            >
              <span className="text-xs text-slate-500 block font-medium">{loc.locality}</span>
              <span className="font-display text-3xl font-bold text-slate-900 block">
                {loc.displayCount}
              </span>
              {loc.isSuppressed ? (
                <span className="text-[10px] text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full inline-block font-medium">
                  Suppressed for Privacy
                </span>
              ) : (
                <span className="text-[10px] text-emerald-700 font-semibold">Verified Citizens</span>
              )}
            </div>
          ))}
        </div>

        <div className="mt-4 pt-4 border-t border-slate-100 text-xs text-slate-500 bg-slate-50/70 p-4 rounded-xl border border-slate-200">
          <p className="font-semibold text-slate-700">Privacy Safeguard Disclosure:</p>
          <p className="mt-1 leading-relaxed">
            To prevent re-identification of individual users, any geographic cluster with fewer than 5 active citizens is automatically suppressed and reported as &quot;&lt; 5&quot;. This guarantees compliance with strict academic and municipal data privacy standards.
          </p>
        </div>
      </section>
    </div>
  );
}
