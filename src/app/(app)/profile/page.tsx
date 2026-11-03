import { getSession } from '@/server/session'
import { prisma } from '@/server/db'
import LogoutButton from '@/components/layout/LogoutButton'
import { User, MapPin, Calendar, Shield, ArrowRight } from 'lucide-react'
import Link from 'next/link'

const ROLE_LABELS: Record<string, { label: string; badge: string }> = {
  USER: { label: 'Citizen', badge: 'badge-gray' },
  MERCHANT: { label: 'Merchant Partner', badge: 'badge-green' },
  REVIEWER: { label: 'City Reviewer', badge: 'badge-blue' },
  MAINTENANCE: { label: 'Maintenance Dept', badge: 'badge-yellow' },
  FOOD_PARTNER: { label: 'Food Partner', badge: 'badge-yellow' },
  SPONSOR: { label: 'Sponsor Organization', badge: 'badge-blue' },
  ADMIN: { label: 'System Admin', badge: 'badge-red' },
}

export default async function ProfilePage() {
  const session = await getSession()
  if (!session) return null

  const user = await prisma.user.findUnique({
    where: { id: session.userId },
    select: { id: true, email: true, displayName: true, city: true, locality: true, createdAt: true },
  })

  if (!user) return null

  return (
    <div className="space-y-8 font-body max-w-3xl mx-auto">
      {/* Title Header */}
      <div>
        <h1 className="font-display text-3xl sm:text-4xl font-bold text-slate-900 tracking-tight">
          Citizen Profile
        </h1>
        <p className="text-slate-600 text-sm mt-1">
          Manage your account credentials, regional settings, and system roles.
        </p>
      </div>

      {/* Profile Card */}
      <div className="bg-white border border-slate-200/90 rounded-2xl p-6 sm:p-8 shadow-xs flex flex-col sm:flex-row items-center sm:items-start gap-6">
        <div className="w-20 h-20 rounded-full bg-emerald-700 flex items-center justify-center text-3xl font-bold text-white shadow-md shrink-0 font-display">
          {user.displayName?.[0]?.toUpperCase() ?? 'U'}
        </div>

        <div className="flex-1 text-center sm:text-left">
          <div className="flex flex-col sm:flex-row sm:items-center gap-2">
            <h2 className="font-display text-2xl font-bold text-slate-900">
              {user.displayName}
            </h2>
            <div className="flex flex-wrap justify-center sm:justify-start gap-1.5 mt-1 sm:mt-0">
              {session.roles.map((role) => {
                const meta = ROLE_LABELS[role] ?? { label: role, badge: 'badge-gray' }
                return (
                  <span key={role} className={`badge ${meta.badge}`}>
                    {meta.label}
                  </span>
                )
              })}
            </div>
          </div>

          <p className="text-slate-500 text-sm mt-1">{user.email}</p>

          <div className="flex items-center justify-center sm:justify-start gap-4 text-xs text-slate-500 mt-3 pt-3 border-t border-slate-100">
            <span className="flex items-center gap-1">
              <MapPin className="w-3.5 h-3.5 text-emerald-600" />
              {user.locality ? `${user.locality}, ` : ''}{user.city || 'Chennai'}
            </span>
            <span className="flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5 text-slate-400" />
              Joined {new Date(user.createdAt).toLocaleDateString('en-IN', { month: 'short', year: 'numeric' })}
            </span>
          </div>
        </div>
      </div>

      {/* Account Details */}
      <div className="bg-white border border-slate-200/90 rounded-2xl p-6 shadow-xs space-y-4">
        <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider">
          Account Information
        </h3>

        <div className="divide-y divide-slate-100">
          <div className="py-3 flex justify-between items-center text-sm">
            <span className="text-slate-500">Citizen ID</span>
            <span className="font-mono text-xs text-slate-700 bg-slate-50 px-2 py-1 rounded-md border border-slate-200">
              {user.id}
            </span>
          </div>
          <div className="py-3 flex justify-between items-center text-sm">
            <span className="text-slate-500">Registered Municipality</span>
            <span className="font-semibold text-slate-800">{user.city || 'Chennai'}</span>
          </div>
          <div className="py-3 flex justify-between items-center text-sm">
            <span className="text-slate-500">Locality / Campus</span>
            <span className="font-semibold text-slate-800">{user.locality || 'Chennai'}</span>
          </div>
        </div>
      </div>

      {/* Admin Quick Action */}
      {session.roles.includes('ADMIN') && (
        <Link
          href="/admin"
          className="bg-white border border-rose-200 rounded-2xl p-5 shadow-xs hover:border-rose-300 hover:shadow-md transition-all flex items-center gap-4 group"
        >
          <div className="w-12 h-12 rounded-xl bg-rose-50 text-rose-700 flex items-center justify-center shrink-0">
            <Shield className="w-6 h-6" />
          </div>
          <div className="flex-1">
            <h4 className="font-semibold text-slate-900 text-sm group-hover:text-rose-700 transition-colors">
              Municipal Admin Portal
            </h4>
            <p className="text-slate-500 text-xs mt-0.5">
              Review leak bounties, sponsor budgets, and audit trail.
            </p>
          </div>
          <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-rose-600 transition-transform group-hover:translate-x-1" />
        </Link>
      )}

      {/* Logout Action */}
      <div className="pt-2">
        <LogoutButton />
      </div>

      <p className="text-center text-xs text-slate-400 pt-4">
        Green Rewards · Chennai · Empowering sustainable living
      </p>
    </div>
  )
}
