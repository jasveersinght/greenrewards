import React from 'react'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { getSession } from '@/server/session'
import { prisma } from '@/server/db'
import { ArrowLeft, Wrench, RefreshCw, LogOut, CheckCircle, Clock } from 'lucide-react'

export default async function PlumberLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession()
  if (!session) redirect('/login')

  const isPlumber = session.roles.includes('PLUMBER')
  const isAdmin = session.roles.includes('ADMIN')

  if (!isPlumber && !isAdmin) {
    redirect('/home')
  }

  const partner = await prisma.partner.findFirst({
    where: {
      id: { in: session.partnerIds },
      type: 'PLUMBER',
    },
    select: { id: true, name: true, locality: true, serviceArea: true, isSimulated: true },
  }) || await prisma.partner.findFirst({
    where: { type: 'PLUMBER' },
    select: { id: true, name: true, locality: true, serviceArea: true, isSimulated: true },
  })

  const hasMultipleRoles = session.roles.length >= 2 || session.isAdminStaff

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-body flex flex-col">
      {/* Top Header */}
      <header className="bg-white/95 backdrop-blur-md border-b border-slate-200/90 px-4 sm:px-8 py-3.5 flex items-center justify-between sticky top-0 z-30">
        <div className="flex items-center gap-3 sm:gap-4">
          <Link
            href="/home"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-emerald-700 transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Citizen App</span>
          </Link>
          <div className="border-l border-slate-200 pl-3 sm:pl-4 flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-700 flex items-center justify-center font-bold">
              <Wrench className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-display font-bold text-slate-900 text-base sm:text-lg">
                  Plumber Portal
                </span>
                <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-blue-50 text-blue-800 border border-blue-200 rounded-full text-[10px] font-bold uppercase tracking-wider">
                  Plumber mode
                </span>
                {partner?.isSimulated && (
                  <span className="hidden sm:inline px-1.5 py-0.2 bg-amber-50 text-amber-700 border border-amber-200 rounded text-[9px] font-semibold uppercase">
                    Simulated
                  </span>
                )}
              </div>
              <p className="text-[11px] text-slate-500">
                {partner ? `${partner.name} (${partner.locality || 'Chennai'})` : 'Technician Hub'}
              </p>
            </div>
          </div>
        </div>

        {/* Right actions: Role indicator & switcher */}
        <div className="flex items-center gap-2 sm:gap-3">
          <div className="hidden sm:flex flex-col text-right text-xs">
            <span className="font-semibold text-slate-700">{session.displayName || 'Technician'}</span>
            <span className="text-[11px] text-blue-600 font-medium">You&apos;re using: Plumber</span>
          </div>

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

          <Link
            href="/profile"
            className="w-8 h-8 rounded-full bg-slate-900 text-white flex items-center justify-center font-bold text-xs hover:bg-blue-700 transition-colors"
          >
            {session.displayName?.charAt(0).toUpperCase() || 'P'}
          </Link>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-6xl w-full mx-auto px-4 sm:px-6 py-6 pb-20 md:pb-8">
        {children}
      </main>
    </div>
  )
}
