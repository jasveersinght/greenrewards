import { getSession } from '@/server/session'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import {
  ArrowLeft,
  Shield,
  BarChart3,
  Globe,
  Megaphone,
  Store,
  FileText,
  Users,
  ClipboardList,
  RefreshCw,
  Wrench,
  ClipboardCheck,
  HeartHandshake,
  User,
} from 'lucide-react'

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession()
  if (!session?.roles.includes('ADMIN')) redirect('/home')

  const navItems = [
    { href: '/admin', label: 'Dashboard', icon: BarChart3 },
    { href: '/admin/applications', label: 'Role Applications', icon: ClipboardList },
    { href: '/admin/users', label: 'Users & Roles', icon: Users },
    { href: '/admin/partners', label: 'Partners', icon: Store },
    { href: '/admin/campaigns', label: 'Campaigns', icon: Megaphone },
    { href: '/admin/impact', label: 'City Impact', icon: Globe },
  ]

  const hasMultipleRoles = session.roles.length >= 2 || session.isAdminStaff

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
              <div className="flex items-center gap-2">
                <h1 className="font-display text-lg font-bold text-slate-900">Admin Control Center</h1>
                <span className="px-2 py-0.5 rounded-full bg-rose-50 text-rose-700 border border-rose-200 text-[10px] font-bold uppercase tracking-wider">
                  Admin mode
                </span>
              </div>
              <p className="text-xs text-slate-500">Green Rewards Chennai · Municipal Infrastructure</p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="hidden sm:flex flex-col text-right text-xs">
            <span className="font-semibold text-slate-700">{session.displayName || 'Administrator'}</span>
            <span className="text-[11px] text-rose-600 font-medium">You&apos;re using: Admin</span>
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
            className="w-8 h-8 rounded-full bg-slate-900 text-white flex items-center justify-center font-bold text-xs hover:bg-rose-700 transition-colors"
          >
            {session.displayName?.charAt(0).toUpperCase() || 'A'}
          </Link>
        </div>
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

            <div className="pt-6 mt-6 border-t border-slate-100">
              <span className="px-3.5 text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-2">
                Operator Portals
              </span>
              <ul className="space-y-1">
                <li>
                  <Link
                    href="/plumber"
                    className="flex items-center gap-2.5 px-3.5 py-2 rounded-xl text-xs font-medium text-slate-600 hover:bg-cyan-50 hover:text-cyan-800 transition-colors"
                  >
                    <Wrench className="w-3.5 h-3.5 text-cyan-600" />
                    <span>Plumber Portal</span>
                  </Link>
                </li>
                <li>
                  <Link
                    href="/merchant"
                    className="flex items-center gap-2.5 px-3.5 py-2 rounded-xl text-xs font-medium text-slate-600 hover:bg-amber-50 hover:text-amber-800 transition-colors"
                  >
                    <Store className="w-3.5 h-3.5 text-amber-600" />
                    <span>Shopkeeper Portal</span>
                  </Link>
                </li>
                <li>
                  <Link
                    href="/reviewer"
                    className="flex items-center gap-2.5 px-3.5 py-2 rounded-xl text-xs font-medium text-slate-600 hover:bg-blue-50 hover:text-blue-800 transition-colors"
                  >
                    <ClipboardCheck className="w-3.5 h-3.5 text-blue-600" />
                    <span>Reviewer Queue</span>
                  </Link>
                </li>
                <li>
                  <Link
                    href="/partner"
                    className="flex items-center gap-2.5 px-3.5 py-2 rounded-xl text-xs font-medium text-slate-600 hover:bg-orange-50 hover:text-orange-800 transition-colors"
                  >
                    <HeartHandshake className="w-3.5 h-3.5 text-orange-600" />
                    <span>Food Partner Hub</span>
                  </Link>
                </li>
              </ul>
            </div>
          </nav>
        </aside>

        <main className="flex-1 p-6 max-w-7xl">{children}</main>
      </div>
    </div>
  )
}
