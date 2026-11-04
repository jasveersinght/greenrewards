import { prisma } from '@/server/db';
import AdminOperations from '@/components/admin/AdminOperations';
import Link from 'next/link';
import { Gift, ShieldCheck, Tag, Wrench, Store, ClipboardCheck, HeartHandshake } from 'lucide-react';

export default async function AdminDashboardPage() {
  const [
    campaignCount,
    partnerCount,
    userCount,
    couponCatalogCount,
    redemptionsCount,
    ledgerCount,
  ] = await Promise.all([
    prisma.campaign.count({ where: { status: 'ACTIVE' } }),
    prisma.partner.count({ where: { approved: true } }),
    prisma.user.count(),
    prisma.couponCatalogItem.count({ where: { isActive: true } }),
    prisma.redemption.count(),
    prisma.ledgerEntry.count(),
  ]);

  return (
    <div className="space-y-6 font-body">
      <div>
        <h2 className="font-display text-2xl sm:text-3xl font-bold text-slate-900">Admin Dashboard</h2>
        <p className="text-slate-500 text-sm mt-1">Green Points telemetry, cryptographic ledger &amp; coupon operations</p>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Active Campaigns', value: campaignCount, icon: '📢', color: 'text-emerald-700 bg-emerald-50' },
          { label: 'Approved Partners', value: partnerCount, icon: '🏪', color: 'text-blue-700 bg-blue-50' },
          { label: 'Active Coupons', value: couponCatalogCount, icon: '🎟️', color: 'text-purple-700 bg-purple-50' },
          { label: 'Total Redemptions', value: redemptionsCount, icon: '🎁', color: 'text-amber-700 bg-amber-50' },
        ].map(stat => (
          <div key={stat.label} className="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-xs">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">{stat.label}</span>
              <span className={`p-2 rounded-xl text-lg ${stat.color}`}>{stat.icon}</span>
            </div>
            <div className="font-display text-2xl font-bold text-slate-900 mt-3">{stat.value}</div>
          </div>
        ))}
      </div>

      {/* Admin Automated Operations & Verification */}
      <section className="space-y-3">
        <h3 className="font-display font-bold text-slate-900 text-lg">System Operations &amp; Verification</h3>
        <AdminOperations />
      </section>

      {/* Operator Portals Quick Access */}
      <section className="space-y-3">
        <h3 className="font-display font-bold text-slate-900 text-lg">Operator Portals &amp; Workspaces</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Link
            href="/plumber"
            className="bg-white border border-slate-200/90 hover:border-cyan-400 rounded-2xl p-4 shadow-xs transition-all flex items-center justify-between group"
          >
            <div className="flex items-center gap-3">
              <span className="p-2.5 rounded-xl bg-cyan-50 text-cyan-700">
                <Wrench className="w-5 h-5" />
              </span>
              <div>
                <h4 className="font-bold text-slate-900 text-xs group-hover:text-cyan-800 transition-colors">
                  Plumber Portal
                </h4>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Job dispatch &amp; repair proof
                </p>
              </div>
            </div>
            <span className="text-slate-400 group-hover:text-cyan-800 transition-colors text-xs">→</span>
          </Link>

          <Link
            href="/merchant"
            className="bg-white border border-slate-200/90 hover:border-amber-400 rounded-2xl p-4 shadow-xs transition-all flex items-center justify-between group"
          >
            <div className="flex items-center gap-3">
              <span className="p-2.5 rounded-xl bg-amber-50 text-amber-700">
                <Store className="w-5 h-5" />
              </span>
              <div>
                <h4 className="font-bold text-slate-900 text-xs group-hover:text-amber-800 transition-colors">
                  Shopkeeper Portal
                </h4>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Counter barcode &amp; QR scanner
                </p>
              </div>
            </div>
            <span className="text-slate-400 group-hover:text-amber-800 transition-colors text-xs">→</span>
          </Link>

          <Link
            href="/reviewer"
            className="bg-white border border-slate-200/90 hover:border-blue-400 rounded-2xl p-4 shadow-xs transition-all flex items-center justify-between group"
          >
            <div className="flex items-center gap-3">
              <span className="p-2.5 rounded-xl bg-blue-50 text-blue-700">
                <ClipboardCheck className="w-5 h-5" />
              </span>
              <div>
                <h4 className="font-bold text-slate-900 text-xs group-hover:text-blue-800 transition-colors">
                  Reviewer Queue
                </h4>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Audit citizen submissions
                </p>
              </div>
            </div>
            <span className="text-slate-400 group-hover:text-blue-800 transition-colors text-xs">→</span>
          </Link>

          <Link
            href="/partner"
            className="bg-white border border-slate-200/90 hover:border-orange-400 rounded-2xl p-4 shadow-xs transition-all flex items-center justify-between group"
          >
            <div className="flex items-center gap-3">
              <span className="p-2.5 rounded-xl bg-orange-50 text-orange-700">
                <HeartHandshake className="w-5 h-5" />
              </span>
              <div>
                <h4 className="font-bold text-slate-900 text-xs group-hover:text-orange-800 transition-colors">
                  Food Partner Hub
                </h4>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Surplus food rescue &amp; pickups
                </p>
              </div>
            </div>
            <span className="text-slate-400 group-hover:text-orange-800 transition-colors text-xs">→</span>
          </Link>
        </div>
      </section>

      {/* Quick Navigation Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Link
          href="/rewards"
          className="bg-white border border-slate-200/90 hover:border-emerald-300 rounded-2xl p-5 shadow-xs transition-all flex items-center justify-between group"
        >
          <div className="flex items-center gap-3">
            <span className="p-2.5 rounded-xl bg-purple-50 text-purple-700">
              <Gift className="w-5 h-5" />
            </span>
            <div>
              <h4 className="font-bold text-slate-900 text-sm group-hover:text-emerald-700 transition-colors">
                Public Rewards Store
              </h4>
              <p className="text-xs text-slate-500 mt-0.5">
                Preview active partner coupons and citizen redemption flow
              </p>
            </div>
          </div>
          <span className="text-slate-400 group-hover:text-emerald-700 transition-colors">→</span>
        </Link>

        <Link
          href="/admin/impact"
          className="bg-white border border-slate-200/90 hover:border-emerald-300 rounded-2xl p-5 shadow-xs transition-all flex items-center justify-between group"
        >
          <div className="flex items-center gap-3">
            <span className="p-2.5 rounded-xl bg-blue-50 text-blue-700">
              <ShieldCheck className="w-5 h-5" />
            </span>
            <div>
              <h4 className="font-bold text-slate-900 text-sm group-hover:text-emerald-700 transition-colors">
                Verified Impact &amp; Audit
              </h4>
              <p className="text-xs text-slate-500 mt-0.5">
                Review verified action counts, emission factors, and sources
              </p>
            </div>
          </div>
          <span className="text-slate-400 group-hover:text-emerald-700 transition-colors">→</span>
        </Link>
      </div>
    </div>
  );
}
