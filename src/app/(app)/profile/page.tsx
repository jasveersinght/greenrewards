import { getSession } from '@/server/session'
import { prisma } from '@/server/db'
import LogoutButton from '@/components/layout/LogoutButton'
import {
  User,
  MapPin,
  Calendar,
  Shield,
  ArrowRight,
  Briefcase,
  RefreshCw,
  Clock,
  CheckCircle2,
  XCircle,
  Bell,
  Trash2,
} from 'lucide-react'
import Link from 'next/link'
import { ROLE_LABELS, type AppRole } from '@/server/domain/roles'

export default async function ProfilePage() {
  const session = await getSession()
  if (!session) return null

  const user = await prisma.user.findUnique({
    where: { id: session.userId },
    select: {
      id: true,
      email: true,
      username: true,
      displayName: true,
      city: true,
      locality: true,
      createdAt: true,
      roleApplications: {
        orderBy: { createdAt: 'desc' },
      },
      roleGrants: {
        where: { revokedAt: null },
        include: { partner: true },
      },
    },
  })

  if (!user) return null

  const hasMultipleRoles = session.roles.length >= 2 || session.isAdminStaff

  return (
    <div className="space-y-8 font-body max-w-3xl mx-auto pb-12">
      {/* Title Header */}
      <div>
        <h1 className="font-display text-3xl sm:text-4xl font-bold text-slate-900 tracking-tight">
          Citizen Profile
        </h1>
        <p className="text-slate-600 text-sm mt-1">
          Manage your account credentials, granted portal roles, and partner applications.
        </p>
      </div>

      {/* Profile Summary Card */}
      <div className="bg-white border border-slate-200/90 rounded-3xl p-6 sm:p-8 shadow-xs flex flex-col sm:flex-row items-center sm:items-start gap-6">
        <div className="w-20 h-20 rounded-full bg-emerald-700 flex items-center justify-center text-3xl font-bold text-white shadow-md shrink-0 font-display">
          {user.displayName?.[0]?.toUpperCase() ?? 'U'}
        </div>

        <div className="flex-1 text-center sm:text-left">
          <div className="flex flex-col sm:flex-row sm:items-center gap-2">
            <h2 className="font-display text-2xl font-bold text-slate-900">
              {user.displayName || 'Green Citizen'}
            </h2>
            <div className="flex flex-wrap justify-center sm:justify-start gap-1.5 mt-1 sm:mt-0">
              {session.roles.map((role) => (
                <span
                  key={role}
                  className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full border uppercase tracking-wider ${
                    role === 'ADMIN'
                      ? 'bg-rose-50 text-rose-700 border-rose-200'
                      : role === 'SHOPKEEPER'
                      ? 'bg-amber-50 text-amber-700 border-amber-200'
                      : role === 'PLUMBER'
                      ? 'bg-blue-50 text-blue-700 border-blue-200'
                      : role === 'FOOD_PARTNER'
                      ? 'bg-orange-50 text-orange-700 border-orange-200'
                      : role === 'REVIEWER'
                      ? 'bg-cyan-50 text-cyan-700 border-cyan-200'
                      : role === 'SPONSOR'
                      ? 'bg-purple-50 text-purple-700 border-purple-200'
                      : 'bg-emerald-50 text-emerald-800 border-emerald-200'
                  }`}
                >
                  {ROLE_LABELS[role as AppRole] || role}
                </span>
              ))}
            </div>
          </div>

          <p className="text-slate-500 text-xs font-mono mt-1">
            {user.username ? `@${user.username}` : user.email}
          </p>

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

      {/* Switch Role Card (if multi-role) */}
      {hasMultipleRoles && (
        <div className="bg-gradient-to-r from-emerald-50 via-teal-50 to-white border border-emerald-200 rounded-3xl p-6 shadow-xs flex items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-emerald-600 text-white flex items-center justify-center shrink-0">
              <RefreshCw className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 text-sm">Switch Active Workspace Mode</h3>
              <p className="text-xs text-slate-600 mt-0.5">
                You currently hold multiple granted roles. Switch between Citizen and partner portals anytime.
              </p>
            </div>
          </div>
          <Link
            href="/choose-role"
            className="py-2.5 px-5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-semibold shrink-0 transition-colors shadow-2xs"
          >
            Switch Role &rarr;
          </Link>
        </div>
      )}

      {/* Role Applications Status */}
      <div className="bg-white border border-slate-200/90 rounded-3xl p-6 sm:p-8 shadow-xs space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div>
            <h3 className="font-bold text-slate-900 font-serif text-base">
              My Partner Applications
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Status of your shopkeeper, plumber, food partner NGO, or sponsor applications.
            </p>
          </div>
          <Link
            href="/apply"
            className="inline-flex items-center gap-1.5 py-1.5 px-3 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 rounded-xl text-xs font-semibold transition-colors"
          >
            <Briefcase className="w-3.5 h-3.5" />
            <span>Apply for a Role</span>
          </Link>
        </div>

        {user.roleApplications.length === 0 ? (
          <div className="py-6 text-center text-slate-400 text-xs">
            <p>You haven&apos;t submitted any partner role applications yet.</p>
            <Link href="/apply" className="text-emerald-700 font-semibold hover:underline mt-1 inline-block">
              Apply to become a verified partner &rarr;
            </Link>
          </div>
        ) : (
          <div className="space-y-3">
            {user.roleApplications.map((app) => (
              <div
                key={app.id}
                className="p-4 rounded-2xl border border-slate-200 bg-slate-50/50 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-slate-900">{app.organizationName}</span>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-200 text-slate-700 uppercase">
                      {ROLE_LABELS[app.role as AppRole] || app.role}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    Submitted on {new Date(app.createdAt).toLocaleDateString('en-IN', { month: 'short', day: 'numeric', year: 'numeric' })} • Locality: {app.locality}
                  </p>
                  {app.decisionReason && (
                    <p className="text-[11px] text-slate-600 mt-1 bg-white p-2 rounded-lg border border-slate-100">
                      <span className="font-semibold">Reviewer Note: </span>{app.decisionReason}
                    </p>
                  )}
                </div>

                <div>
                  <span
                    className={`inline-flex items-center gap-1 text-[11px] font-bold px-3 py-1 rounded-full uppercase tracking-wider ${
                      app.status === 'APPROVED'
                        ? 'bg-emerald-100 text-emerald-800'
                        : app.status === 'REJECTED'
                        ? 'bg-rose-100 text-rose-800'
                        : 'bg-amber-100 text-amber-800'
                    }`}
                  >
                    {app.status === 'APPROVED' ? (
                      <CheckCircle2 className="w-3.5 h-3.5" />
                    ) : app.status === 'REJECTED' ? (
                      <XCircle className="w-3.5 h-3.5" />
                    ) : (
                      <Clock className="w-3.5 h-3.5" />
                    )}
                    {app.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Account Details & Settings */}
      <div className="bg-white border border-slate-200/90 rounded-3xl p-6 sm:p-8 shadow-xs space-y-4">
        <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider">
          Account Credentials &amp; Region
        </h3>

        <div className="divide-y divide-slate-100">
          <div className="py-3 flex justify-between items-center text-xs">
            <span className="text-slate-500">Citizen ID</span>
            <span className="font-mono text-[11px] text-slate-700 bg-slate-50 px-2 py-1 rounded-md border border-slate-200">
              {user.id}
            </span>
          </div>
          <div className="py-3 flex justify-between items-center text-xs">
            <span className="text-slate-500">Username Handle</span>
            <span className="font-mono text-slate-800 font-semibold">
              {user.username ? `@${user.username}` : 'Not assigned'}
            </span>
          </div>
          <div className="py-3 flex justify-between items-center text-xs">
            <span className="text-slate-500">Registered Municipality</span>
            <span className="font-semibold text-slate-800">{user.city || 'Chennai'}</span>
          </div>
          <div className="py-3 flex justify-between items-center text-xs">
            <span className="text-slate-500">Locality / Ward</span>
            <span className="font-semibold text-slate-800">{user.locality || 'Chennai'}</span>
          </div>
        </div>
      </div>

      {/* Notification Preferences */}
      <div className="bg-white border border-slate-200/90 rounded-3xl p-6 sm:p-8 shadow-xs space-y-3">
        <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
          <Bell className="w-3.5 h-3.5" /> Notification Settings
        </h3>
        <p className="text-xs text-slate-500">Manage real-time alerts for verified points settlement and leak updates.</p>
        <div className="space-y-2 pt-2 text-xs">
          <label className="flex items-center justify-between p-3 rounded-xl bg-slate-50 cursor-pointer">
            <span className="font-semibold text-slate-700">Points &amp; Settlement Alerts</span>
            <input type="checkbox" defaultChecked className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500" />
          </label>
          <label className="flex items-center justify-between p-3 rounded-xl bg-slate-50 cursor-pointer">
            <span className="font-semibold text-slate-700">Public Water Main Alerts</span>
            <input type="checkbox" defaultChecked className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500" />
          </label>
        </div>
      </div>

      {/* Account Deletion & Logout */}
      <div className="bg-white border border-slate-200/90 rounded-3xl p-6 sm:p-8 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-4">
        <div>
          <h4 className="font-bold text-slate-900 text-sm">Sign Out or Request Data Deletion</h4>
          <p className="text-xs text-slate-500 mt-0.5">
            Your telemetry and points ledger are retained in compliance with CMWSSB civic audit rules.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <LogoutButton />
        </div>
      </div>

      <p className="text-center text-xs text-slate-400 pt-4">
        Green Rewards · Chennai Municipal Corporation · Empowering Sustainable Cities
      </p>
    </div>
  )
}
