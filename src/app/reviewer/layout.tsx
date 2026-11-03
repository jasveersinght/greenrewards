import Link from 'next/link'
import { redirect } from 'next/navigation'
import { getSession } from '@/server/session'
import { ArrowLeft, CheckCircle2, ShieldCheck, RefreshCw } from 'lucide-react'

export default async function ReviewerLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession()
  if (!session) redirect('/login')

  const isReviewer = session.roles.includes('REVIEWER') || session.roles.includes('ADMIN')
  if (!isReviewer) {
    redirect('/home')
  }

  const hasMultipleRoles = session.roles.length >= 2 || session.isAdminStaff

  return (
    <div className="min-h-screen bg-[#f8fafc] text-slate-900 font-body flex flex-col">
      {/* Top Navbar */}
      <header className="bg-white/90 backdrop-blur-md border-b border-slate-200/80 px-4 sm:px-6 py-4 flex items-center justify-between sticky top-0 z-30">
        <div className="flex items-center gap-4">
          <Link href="/home" className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-emerald-700 transition-colors">
            <ArrowLeft className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Citizen App</span>
          </Link>
          <div className="border-l border-slate-200 pl-4 flex items-center gap-2">
            <span className="text-xl">⚖️</span>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="font-display font-bold text-slate-900 text-lg">City Reviewer Portal</h1>
                <span className="px-2 py-0.5 bg-blue-50 text-blue-700 border border-blue-200 rounded-full text-[10px] font-bold uppercase tracking-wider">
                  Reviewer mode
                </span>
              </div>
              <p className="text-xs text-slate-500">
                Chennai Sustainability Authority · Verification &amp; Auditing
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="hidden sm:flex flex-col text-right text-xs">
            <span className="font-semibold text-slate-700">{session.displayName || 'Reviewer'}</span>
            <span className="text-[11px] text-blue-600 font-medium">You&apos;re using: Reviewer</span>
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
            href="/reviewer"
            className="px-3.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs rounded-xl font-semibold transition-colors"
          >
            Verification Queue
          </Link>
        </div>
      </header>

      {/* Main Content Area (Universal Responsive) */}
      <main className="flex-1 p-6 max-w-6xl mx-auto w-full">
        {children}
      </main>
    </div>
  )
}
