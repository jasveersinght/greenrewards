import { getSession } from '@/server/session'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Shield, BarChart3, Globe, Megaphone, Store, FileText } from 'lucide-react'

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession()
  if (!session?.roles.includes('ADMIN')) redirect('/home')

  const navItems = [
    { href: '/admin', label: 'Dashboard', icon: BarChart3 },
    { href: '/admin/impact', label: 'City Impact', icon: Globe },
    { href: '/admin/campaigns', label: 'Campaigns', icon: Megaphone },
    { href: '/admin/partners', label: 'Partners', icon: Store },
    { href: '/admin/audit', label: 'Audit Log', icon: FileText },
  ]

  return (
    <div className="min-h-screen bg-[#f8fafc] text-slate-900 font-body flex flex-col">
      <header className="bg-white/90 backdrop-blur-md border-b border-slate-200/80 px-6 py-4 flex items-center justify-between sticky top-0 z-30">
        <div className="flex items-center gap-4">
          <Link href="/home" className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-emerald-700 transition-colors">
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>App</span>
          </Link>
          <div className="border-l border-slate-200 pl-4 flex items-center gap-2">
            <Shield className="w-5 h-5 text-rose-600" />
            <div>
              <h1 className="font-display text-lg font-bold text-slate-900">Admin Control Center</h1>
              <p className="text-xs text-slate-500">Green Rewards Chennai · Municipal Infrastructure</p>
            </div>
          </div>
        </div>

        <span className="text-xs font-bold px-3 py-1 rounded-full bg-rose-50 text-rose-700 border border-rose-200">
          Super Admin
        </span>
      </header>

      <div className="flex flex-1">
        {/* Sidebar */}
        <aside className="w-60 bg-white border-r border-slate-200 min-h-screen p-4 hidden md:block shrink-0">
          <nav aria-label="Admin navigation">
            <ul className="space-y-1">
              {navItems.map(item => {
                const Icon = item.icon
                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      className="flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 hover:text-slate-900 transition-colors"
                    >
                      <Icon className="w-4 h-4 text-slate-400" />
                      <span>{item.label}</span>
                    </Link>
                  </li>
                )
              })}
            </ul>
          </nav>
        </aside>

        <main className="flex-1 p-6 max-w-7xl">{children}</main>
      </div>
    </div>
  )
}
