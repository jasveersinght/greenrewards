import { getSession } from '@/server/session'
import { prisma } from '@/server/db'
import { getWalletBalance } from '@/server/services/walletService'
import { POINTS_CONFIG, SECTION_REWARD_LABELS } from '@/server/domain/pointsConfig'
import Link from 'next/link'
import {
  Sparkles,
  ArrowRight,
  TrendingUp,
  Award,
  Wallet as WalletIcon,
  Activity as ActivityIcon,
} from 'lucide-react'

const SECTIONS = [
  {
    id: 'reuse',
    href: '/reuse',
    title: 'Reuse & Earn',
    emoji: '♻️',
    description: 'Stamp card rewards for bringing reusable bags & cups at partner shops.',
    accent: 'linear-gradient(90deg, #10b981, #059669)',
    color: '#059669',
    badge: SECTION_REWARD_LABELS.REUSE,
  },
  {
    id: 'leak',
    href: '/leak',
    title: 'Leak Hunter',
    emoji: '💧',
    description: 'Report public water leaks across Chennai to earn Green Points.',
    accent: 'linear-gradient(90deg, #0284c7, #0369a1)',
    color: '#0284c7',
    badge: SECTION_REWARD_LABELS.LEAK,
  },
  {
    id: 'food',
    href: '/food',
    title: 'Food Rescue',
    emoji: '🍱',
    description: 'Reserve surplus food packages from verified local food partners & restaurants.',
    accent: 'linear-gradient(90deg, #d97706, #b45309)',
    color: '#d97706',
    badge: SECTION_REWARD_LABELS.FOOD,
  },
  {
    id: 'commute',
    href: '/commute',
    title: 'Green Commute',
    emoji: '🚌',
    description: 'Metro, MTC bus & suburban train 5-trip challenge to earn Green Points.',
    accent: 'linear-gradient(90deg, #7c3aed, #6d28d9)',
    color: '#7c3aed',
    badge: SECTION_REWARD_LABELS.COMMUTE,
  },
  {
    id: 'electricity',
    href: '/electricity',
    title: 'AI Bill Predictor & Save',
    emoji: '⚡',
    description: 'Predict electricity bills with our trained ML model & earn points for 10% reduction.',
    accent: 'linear-gradient(90deg, #ca8a04, #a16207)',
    color: '#ca8a04',
    badge: SECTION_REWARD_LABELS.ELECTRICITY,
  },
  {
    id: 'water',
    href: '/water',
    title: 'Save Water',
    emoji: '🚰',
    description: 'Household water conservation tracking and verified plumber repair rewards.',
    accent: 'linear-gradient(90deg, #0891b2, #0e7490)',
    color: '#0891b2',
    badge: SECTION_REWARD_LABELS.WATER,
  },
]

export default async function HomePage() {
  const session = await getSession()
  if (!session) return null

  const balance = await getWalletBalance(session.userId)
  const activeCampaigns = await prisma.campaign.count({
    where: { status: 'ACTIVE' },
  })

  return (
    <div className="space-y-8 font-body">
      {/* Hero Welcome Banner */}
      <section className="bg-gradient-to-r from-emerald-50 via-white to-slate-50 border border-emerald-100/80 rounded-2xl p-6 sm:p-8 shadow-xs relative overflow-hidden">
        <div className="relative z-10 max-w-2xl">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-100/70 text-emerald-800 text-xs font-semibold mb-3">
            <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
            <span>Chennai Sustainability Initiative</span>
          </div>
          <h1 className="font-display text-3xl sm:text-4xl lg:text-5xl font-bold text-slate-900 tracking-tight leading-tight">
            Welcome back, {session.displayName?.split(' ')[0] || 'Citizen'}
          </h1>
          <p className="mt-2 text-slate-600 text-sm sm:text-base leading-relaxed">
            Every green action you take today creates real environmental change. Track your points, complete verified challenges, and redeem partner coupons.
          </p>
        </div>

        <div className="hidden md:flex absolute -right-6 -bottom-6 w-56 h-56 bg-emerald-400/10 rounded-full blur-3xl pointer-events-none" />
      </section>

      {/* Wallet Balance Summary (Universal 3-Card Grid) */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xs font-bold text-slate-500 uppercase tracking-wider font-body">
            Rewards Portfolio
          </h2>
          <Link
            href="/wallet"
            className="text-xs font-semibold text-emerald-700 hover:text-emerald-800 flex items-center gap-1 transition-colors"
          >
            <span>Wallet details</span>
            <ArrowRight className="w-3 h-3" />
          </Link>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {/* Available Points Card */}
          <div className="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-xs hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                Available Points
              </span>
              <span className="p-2 rounded-xl bg-emerald-50 text-emerald-700 text-base">🪙</span>
            </div>
            <div className="mt-3 flex items-baseline gap-2">
              <span className="font-display text-3xl font-bold text-slate-900">
                {balance.availablePoints ?? 0} GP
              </span>
              <span className="text-xs text-emerald-600 font-semibold flex items-center gap-0.5">
                <TrendingUp className="w-3 h-3" />
                Active
              </span>
            </div>
            <p className="mt-2 text-xs text-slate-500">
              Ready to redeem for partner coupons and store discounts
            </p>
          </div>

          {/* Pending Verification Card */}
          <div className="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-xs hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                Pending Points
              </span>
              <span className="p-2 rounded-xl bg-amber-50 text-amber-700 text-base">⏳</span>
            </div>
            <div className="mt-3 flex items-baseline gap-2">
              <span className="font-display text-3xl font-bold text-slate-900">
                {balance.pendingPoints ?? 0} GP
              </span>
              <span className="text-xs text-amber-600 font-semibold">Under review</span>
            </div>
            <p className="mt-2 text-xs text-slate-500">
              Awaiting verification / settlement period
            </p>
          </div>

          {/* Stamps Collected Card */}
          <div className="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-xs hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                Digital Stamps
              </span>
              <span className="p-2 rounded-xl bg-purple-50 text-purple-700 text-base">🎫</span>
            </div>
            <div className="mt-3 flex items-baseline gap-2">
              <span className="font-display text-3xl font-bold text-slate-900">
                {balance.stamps}
              </span>
              <span className="text-xs text-purple-600 font-semibold flex items-center gap-0.5">
                <Award className="w-3 h-3" />
                Collected
              </span>
            </div>
            <p className="mt-2 text-xs text-slate-500">
              Earn 5 stamps to unlock +{POINTS_CONFIG.EARNING.REUSE_CARD_BONUS} bonus points
            </p>
          </div>
        </div>
      </section>

      {/* AI Bill & Consumption Predictor Spotlight */}
      <section className="bg-gradient-to-r from-amber-500/10 via-amber-400/5 to-emerald-500/10 border border-amber-200/80 rounded-2xl p-5 sm:p-6 shadow-xs relative overflow-hidden">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-amber-400 to-amber-600 text-white flex items-center justify-center text-2xl shadow-sm shrink-0">
              ⚡
            </div>
            <div>
              <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-900 text-[11px] font-bold mb-1.5 border border-amber-200">
                <Sparkles className="w-3 h-3 text-amber-600" />
                <span>Trained ML Model • 1,000 Chennai Households</span>
              </div>
              <h2 className="font-display text-2xl font-bold text-slate-900 tracking-tight">
                AI Household Bill &amp; Usage Predictor
              </h2>
              <p className="mt-1 text-slate-600 text-xs sm:text-sm max-w-xl">
                Simulate your power consumption based on room count, AC usage, occupants, and square footage.
                Beat the predicted consumption by 10% to unlock <strong>+{POINTS_CONFIG.EARNING.ELECTRICITY_10PCT_REDUCTION} Green Points</strong>.
              </p>
            </div>
          </div>
          <Link
            href="/electricity"
            className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-full bg-slate-900 text-white hover:bg-slate-800 text-xs sm:text-sm font-semibold transition shadow-sm shrink-0"
          >
            <span>Launch AI Predictor</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </section>

      {/* Sustainability Challenges (Universal Multi-Column Grid) */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-xs font-bold text-slate-500 uppercase tracking-wider font-body">
              Active Challenges
            </h2>
            <p className="text-sm text-slate-600 mt-0.5">
              {activeCampaigns} active campaigns across Chennai
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {SECTIONS.map((section) => (
            <Link
              key={section.id}
              href={section.href}
              className="section-card group"
              style={{ '--card-accent': section.accent } as React.CSSProperties}
            >
              <div className="flex items-start justify-between">
                <span className="text-3xl p-2.5 rounded-xl bg-slate-50 border border-slate-100 group-hover:scale-105 transition-transform">
                  {section.emoji}
                </span>
                <span className="text-[11px] font-bold text-emerald-800 bg-emerald-50 border border-emerald-200/80 px-2.5 py-1 rounded-full">
                  {section.badge}
                </span>
              </div>

              <h3 className="font-display text-xl font-bold text-slate-900 mt-4 group-hover:text-emerald-700 transition-colors">
                {section.title}
              </h3>
              <p className="text-slate-600 text-xs sm:text-sm mt-1.5 leading-relaxed">
                {section.description}
              </p>

              <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs font-semibold text-emerald-700 group-hover:text-emerald-800">
                <span>Start Challenge</span>
                <ArrowRight className="w-3.5 h-3.5 transform group-hover:translate-x-1 transition-transform" />
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* Quick Access Actions */}
      <section className="grid grid-cols-1 md:grid-cols-2 gap-4 pb-12">
        <Link
          href="/wallet"
          className="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-xs hover:border-emerald-300 hover:shadow-md transition-all flex items-center gap-4 group"
        >
          <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center shrink-0">
            <WalletIcon className="w-6 h-6" />
          </div>
          <div className="flex-1">
            <h4 className="font-semibold text-slate-900 text-sm group-hover:text-emerald-700 transition-colors">
              Manage Wallet &amp; Coupons
            </h4>
            <p className="text-slate-500 text-xs mt-0.5">
              Review transaction ledger and redeem partner coupons.
            </p>
          </div>
          <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-emerald-600 group-hover:translate-x-0.5 transition-all" />
        </Link>

        <Link
          href="/activity"
          className="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-xs hover:border-emerald-300 hover:shadow-md transition-all flex items-center gap-4 group"
        >
          <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-700 flex items-center justify-center shrink-0">
            <ActivityIcon className="w-6 h-6" />
          </div>
          <div className="flex-1">
            <h4 className="font-semibold text-slate-900 text-sm group-hover:text-blue-700 transition-colors">
              Activity &amp; Impact Feed
            </h4>
            <p className="text-slate-500 text-xs mt-0.5">
              Track verification progress for leak reports and commute trips.
            </p>
          </div>
          <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-blue-600 group-hover:translate-x-0.5 transition-all" />
        </Link>
      </section>
    </div>
  )
}
