import Link from 'next/link'
import { redirect } from 'next/navigation'
import { getSession } from '@/server/session'
import { prisma } from '@/server/db'
import { ArrowLeft, Camera, Store, QrCode, Award, BarChart3 } from 'lucide-react'

export default async function MerchantLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession()
  if (!session) redirect('/login')

  const isMerchant = session.roles.includes('MERCHANT')
  const isAdmin = session.roles.includes('ADMIN')

  if (!isMerchant && !isAdmin) {
    redirect('/home')
  }

  // Look up merchant's partner details
  const partnerId = session.partnerIds[0]
  const partner = partnerId
    ? await prisma.partner.findUnique({
        where: { id: partnerId },
        select: { id: true, name: true, type: true, isSimulated: true },
      })
    : null

  return (
    <div className="min-h-screen bg-[#f8fafc] text-slate-900 font-body flex flex-col">
      {/* Top Navbar */}
      <header className="bg-white/90 backdrop-blur-md border-b border-slate-200/80 px-6 py-4 flex items-center justify-between sticky top-0 z-30">
        <div className="flex items-center gap-4">
          <Link href="/home" className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-emerald-700 transition-colors">
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>App</span>
          </Link>
          <div className="border-l border-slate-200 pl-4">
            <div className="flex items-center gap-2">
              <span className="text-xl">🏪</span>
              <span className="font-display font-bold text-slate-900 text-lg">Merchant Partner Portal</span>
              {partner?.isSimulated && (
                <span className="px-2 py-0.5 bg-amber-50 text-amber-700 border border-amber-200 rounded text-[10px] uppercase font-semibold">
                  Simulated
                </span>
              )}
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              {partner ? partner.name : 'Administrator Mode'}
            </p>
          </div>
        </div>

        <Link
          href="/merchant/scan"
          className="bg-emerald-700 hover:bg-emerald-600 text-white py-2 px-4 rounded-xl text-xs font-semibold flex items-center gap-2 shadow-xs transition-colors"
        >
          <Camera className="w-4 h-4" />
          <span>Scan Citizen QR</span>
        </Link>
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
          Scanner
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
