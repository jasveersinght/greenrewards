import React from 'react';
import Link from 'next/link';
import { getSession } from '@/server/session';
import { ArrowLeft, Sparkles, Building2 } from 'lucide-react';

export default async function SponsorLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession();

  return (
    <div className="min-h-screen bg-[#f8fafc] text-slate-900 font-body flex flex-col">
      <header className="bg-white/90 backdrop-blur-md border-b border-slate-200/80 px-6 py-4 flex justify-between items-center sticky top-0 z-30">
        <div className="flex items-center gap-4">
          <Link
            href="/home"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-emerald-700 transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Back to App</span>
          </Link>
          <div className="border-l border-slate-200 pl-4">
            <h1 className="font-display text-xl font-bold text-slate-900 flex items-center gap-2">
              <span>🤝</span> Funder &amp; Sponsor Portal
            </h1>
            <p className="text-xs text-slate-500">Campaign budget ROI &amp; privacy-preserving demographic reach</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <span className="text-xs bg-emerald-50 text-emerald-800 border border-emerald-200 px-3 py-1 rounded-full font-semibold">
            {session?.email || 'sponsor@chennai-metro.gov.in'}
          </span>
        </div>
      </header>

      <main className="flex-1 p-6 max-w-6xl mx-auto w-full">{children}</main>
    </div>
  );
}
