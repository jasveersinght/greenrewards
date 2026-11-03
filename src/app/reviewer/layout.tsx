import Link from 'next/link'
import { redirect } from 'next/navigation'
import { getSession } from '@/server/session'
import { ArrowLeft, CheckCircle2, ShieldCheck } from 'lucide-react'

export default async function ReviewerLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession()
  if (!session) redirect('/login')

  const isReviewer = session.roles.includes('REVIEWER') || session.roles.includes('ADMIN')
  if (!isReviewer) {
    redirect('/home')
  }

  return (
    <div className="min-h-screen bg-[#f8fafc] text-slate-900 font-body flex flex-col">
      {/* Top Navbar */}
      <header className="bg-white/90 backdrop-blur-md border-b border-slate-200/80 px-6 py-4 flex items-center justify-between sticky top-0 z-30">
        <div className="flex items-center gap-4">
          <Link href="/home" className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-emerald-700 transition-colors">
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>App</span>
          </Link>
          <div className="border-l border-slate-200 pl-4 flex items-center gap-2">
            <span className="text-xl">⚖️</span>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="font-display font-bold text-slate-900 text-lg">City Reviewer Portal</h1>
                <span className="px-2 py-0.5 bg-blue-50 text-blue-700 border border-blue-200 rounded-full text-[10px] font-bold">
                  Reviewer
                </span>
              </div>
              <p className="text-xs text-slate-500">
                Chennai Sustainability Authority · Verification &amp; Auditing
              </p>
            </div>
          </div>
        </div>

        <Link
          href="/reviewer"
          className="px-3.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs rounded-xl font-semibold transition-colors"
        >
          Verification Queue
        </Link>
      </header>

      {/* Main Content Area (Universal Responsive) */}
      <main className="flex-1 p-6 max-w-6xl mx-auto w-full">
        {children}
      </main>
    </div>
  )
}
