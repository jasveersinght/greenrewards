import React from 'react';
import Link from 'next/link';
import { getSession } from '@/server/session';
import { ArrowLeft, Sparkles, Building2, RefreshCw } from 'lucide-react';

export default async function SponsorLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession();
  const hasMultipleRoles = session ? (session.roles.length >= 2 || session.isAdminStaff) : false;

  return (
    <div className="min-h-screen bg-[#f8fafc] text-slate-900 font-body flex flex-col">
      <header className="bg-white/90 backdrop-blur-md border-b border-slate-200/80 px-4 sm:px-6 py-4 flex justify-between items-center sticky top-0 z-30">
        <div className="flex items-center gap-4">
          <Link
            href="/home"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-emerald-700 transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Back to App</span>
          </Link>
          <div className="border-l border-slate-200 pl-4">
            <div className="flex items-center gap-2">
              <h1 className="font-display text-xl font-bold text-slate-900 flex items-center gap-2">
                <span>🤝</span> Funder &amp; Sponsor Portal
              </h1>
              <span className="px-2 py-0.5 rounded-full bg-purple-50 text-purple-700 border border-purple-200 text-[10px] font-bold uppercase tracking-wider">
                Sponsor mode
              </span>
            </div>
            <p className="text-xs text-slate-500">Campaign budget ROI &amp; privacy-preserving demographic reach</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {session && (
            <div className="hidden sm:flex flex-col text-right text-xs">
              <span className="font-semibold text-slate-700">{session.displayName || session.email}</span>
              <span className="text-[11px] text-purple-600 font-medium">You&apos;re using: Sponsor</span>
            </div>
          )}

          {hasMultipleRoles && (
            <Link
              href="/choose-role"
              className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold transition-colors border border-slate-200"
              title="Switch role"
            >
              <RefreshCw className="w-3.5 h-3.5 text-slate-500" />
              <span>Switch role</span>
            </Link>
          )}

          <span className="text-xs bg-emerald-50 text-emerald-800 border border-emerald-200 px-3 py-1 rounded-full font-semibold">
            {session?.email || 'sponsor@demo'}
          </span>
        </div>
      </header>

      <main className="flex-1 p-6 max-w-6xl mx-auto w-full">{children}</main>
    </div>
  );
}
