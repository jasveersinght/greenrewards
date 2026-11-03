import Link from 'next/link'
import { redirect } from 'next/navigation'
import { getSession } from '@/server/session'
import { prisma } from '@/server/db'
import { ArrowLeft, Camera, Store, QrCode, Award, BarChart3, RefreshCw } from 'lucide-react'

export default async function MerchantLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession()
  if (!session) redirect('/login')

  const isMerchant = session.roles.includes('SHOPKEEPER')
  const isAdmin = session.roles.includes('ADMIN')

  if (!isMerchant && !isAdmin) {
    redirect('/home')
  }

  // Look up merchant's partner details
  const partnerId = session.partnerIds[0]
  const partner = partnerId
    ? await prisma.partner.findUnique({
        where: { id: partnerId },
        select: { id: true, name: true, type: true, locality: true, isSimulated: true },
      })
    : null

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
          <div className="border-l border-slate-200 pl-4">
            <div className="flex items-center gap-2">
              <span className="text-xl">🏪</span>
              <span className="font-display font-bold text-slate-900 text-lg">Shopkeeper Portal</span>
              <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200 text-[10px] font-bold uppercase tracking-wider">
                Shopkeeper mode
              </span>
              {partner?.isSimulated && (
                <span className="hidden sm:inline px-2 py-0.5 bg-amber-50 text-amber-700 border border-amber-200 rounded text-[10px] uppercase font-semibold">
                  Simulated
                </span>
              )}
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              {partner ? `${partner.name} (${partner.locality || 'Chennai'})` : 'Administrator Mode'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="hidden sm:flex flex-col text-right text-xs">
            <span className="font-semibold text-slate-700">{session.displayName || 'Shopkeeper'}</span>
            <span className="text-[11px] text-emerald-600 font-medium">You&apos;re using: Shopkeeper</span>
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
            href="/merchant/scan"
            className="bg-emerald-700 hover:bg-emerald-600 text-white py-2 px-3.5 rounded-xl text-xs font-semibold flex items-center gap-2 shadow-xs transition-colors"
          >
            <Camera className="w-4 h-4" />
            <span className="hidden sm:inline">Scan Citizen QR</span>
          </Link>
        </div>
      </header>

      {/* Merchant Nav Tabs */}
      <div className="bg-white border-b border-slate-200 px-6 flex gap-8 text-xs font-semibold">
        <Link
          href="/merchant"
          className="py-3 text-slate-600 hover:text-emerald-700 border-b-2 border-transparent hover:border-emerald-600 transition-colors"
        >
          Dashboard
        </Link>
        <Link
          href="/merchant/scan"
          className="py-3 text-slate-600 hover:text-emerald-700 border-b-2 border-transparent hover:border-emerald-600 transition-colors"
        >
          Scanner &amp; Redeem
        </Link>
        <Link
          href="/merchant/milestone"
          className="py-3 text-slate-600 hover:text-emerald-700 border-b-2 border-transparent hover:border-emerald-600 transition-colors"
        >
          Milestones
        </Link>
      </div>

      {/* Main Content Area (Universal Responsive) */}
      <main className="flex-1 p-6 max-w-6xl mx-auto w-full">
        {children}
      </main>
    </div>
  )
}
