'use client'

import React, { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  User,
  Store,
  Wrench,
  ClipboardCheck,
  HeartHandshake,
  Building2,
  ShieldCheck,
  ArrowRight,
  Sparkles,
  CheckCircle2,
} from 'lucide-react'
import { ROLE_DESCRIPTIONS, ROLE_LABELS, type AppRole } from '@/server/domain/roles'

interface PartnerInfo {
  id: string
  name: string
  type: string
  locality?: string | null
}

interface RoleGrantInfo {
  role: string
  partner?: PartnerInfo | null
}

interface UserData {
  id: string
  email: string
  username?: string | null
  displayName?: string | null
  locality?: string | null
  roleGrants?: RoleGrantInfo[]
}

const ROLE_ICONS: Record<string, React.ElementType> = {
  CITIZEN: User,
  SHOPKEEPER: Store,
  PLUMBER: Wrench,
  REVIEWER: ClipboardCheck,
  FOOD_PARTNER: HeartHandshake,
  SPONSOR: Building2,
  ADMIN: ShieldCheck,
}

export default function ChooseRolePage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState<string | null>(null)
  const [user, setUser] = useState<UserData | null>(null)
  const [roles, setRoles] = useState<AppRole[]>([])
  const [activeRole, setActiveRole] = useState<string>('CITIZEN')
  const [remember, setRemember] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetch('/api/auth/me')
      .then(res => res.json())
      .then(data => {
        if (!data.user) {
          router.push('/login')
          return
        }
        setUser(data.user)
        setRoles(data.roles || ['CITIZEN'])
        setActiveRole(data.activeRole || 'CITIZEN')
        setLoading(false)
      })
      .catch(() => {
        router.push('/login')
      })
  }, [router])

  async function handleSelectRole(role: string) {
    try {
      setSubmitting(role)
      setError(null)
      const res = await fetch('/api/auth/choose-role', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role, remember }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error || 'Failed to select role')
        setSubmitting(null)
        return
      }
      window.location.href = data.redirectUrl || '/home'
    } catch {
      setError('Connection error. Please try again.')
      setSubmitting(null)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-emerald-600 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  const roleGrants = user?.roleGrants || []

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50/50 via-slate-50 to-white flex flex-col justify-between py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto w-full">
        {/* Header */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-emerald-100 text-emerald-800 rounded-full text-xs font-semibold uppercase tracking-wider mb-3">
            <Sparkles className="w-3.5 h-3.5" /> Multi-Role Portal Access
          </div>
          <h1 className="text-3xl sm:text-4xl font-bold font-serif text-slate-900">
            How do you want to continue, {user?.displayName || 'Partner'}?
          </h1>
          <p className="mt-2 text-sm text-slate-600 max-w-lg mx-auto">
            Choose the workspace you want to operate in right now. You can switch between your granted roles anytime from your profile menu.
          </p>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl text-sm text-center">
            {error}
          </div>
        )}

        {/* Roles Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
          {roles.map((r) => {
            const Icon = ROLE_ICONS[r] || User
            const grant = roleGrants.find((g) => g.role === r)
            const partner = grant?.partner
            const roleTitle = partner
              ? `${ROLE_LABELS[r] || r} — ${partner.name}${partner.locality ? `, ${partner.locality}` : ''}`
              : (ROLE_LABELS[r] || r)
            const description = ROLE_DESCRIPTIONS[r] || 'Access verified workspace tools and portal operations.'
            const isCurrent = activeRole === r
            const isChoosing = submitting === r

            return (
              <button
                key={r}
                type="button"
                onClick={() => handleSelectRole(r)}
                disabled={Boolean(submitting)}
                className={`relative text-left p-6 rounded-2xl border transition-all duration-200 group flex flex-col justify-between ${
                  isCurrent
                    ? 'bg-white border-emerald-500 shadow-lg shadow-emerald-500/10 ring-2 ring-emerald-500/20'
                    : 'bg-white/80 hover:bg-white border-slate-200 hover:border-emerald-300 hover:shadow-md'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center group-hover:scale-105 transition-transform">
                      <Icon className="w-6 h-6" />
                    </div>
                    {isCurrent && (
                      <span className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 bg-emerald-50 text-emerald-700 rounded-full border border-emerald-200">
                        <CheckCircle2 className="w-3.5 h-3.5" /> Active Mode
                      </span>
                    )}
                  </div>
                  <h3 className="text-lg font-bold text-slate-900 group-hover:text-emerald-700 transition-colors">
                    {roleTitle}
                  </h3>
                  <p className="mt-2 text-xs text-slate-600 leading-relaxed">
                    {description}
                  </p>
                </div>

                <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-between text-xs font-semibold text-emerald-700">
                  <span>{isChoosing ? 'Switching portal...' : 'Launch Portal'}</span>
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </div>
              </button>
            )
          })}
        </div>

        {/* Remember Preference */}
        <div className="mt-8 flex items-center justify-center">
          <label className="inline-flex items-center gap-2 cursor-pointer text-xs text-slate-600 select-none">
            <input
              type="checkbox"
              checked={remember}
              onChange={(e) => setRemember(e.target.checked)}
              className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 w-4 h-4"
            />
            <span>Remember my choice on this device (can be changed anytime)</span>
          </label>
        </div>

        {/* Apply Callout */}
        <div className="mt-10 text-center border-t border-slate-200 pt-8">
          <p className="text-xs text-slate-500">
            Want to join as a shopkeeper, plumber, food partner or sponsor?{' '}
            <Link
              href="/apply"
              className="font-semibold text-emerald-700 hover:text-emerald-800 underline underline-offset-4 decoration-emerald-300 hover:decoration-emerald-700 transition-all"
            >
              Apply for a verified partner role &rarr;
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
