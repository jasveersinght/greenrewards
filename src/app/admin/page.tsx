import { prisma } from '@/server/db'

export default async function AdminDashboardPage() {
  const [campaignCount, partnerCount, userCount, budgetStats] = await Promise.all([
    prisma.campaign.count({ where: { status: 'ACTIVE' } }),
    prisma.partner.count({ where: { approved: true } }),
    prisma.user.count(),
    prisma.budget.aggregate({ _sum: { totalPaise: true, reservedPaise: true, spentPaise: true } }),
  ])

  const totalBudget = Number(budgetStats._sum.totalPaise ?? 0)
  const totalSpent = Number(budgetStats._sum.spentPaise ?? 0)
  const totalReserved = Number(budgetStats._sum.reservedPaise ?? 0)

  function formatPaise(v: bigint | number) {
    return `₹${(Number(v) / 100).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`
  }

  return (
    <div className="space-y-6 font-body">
      <div>
        <h2 className="font-display text-2xl sm:text-3xl font-bold text-slate-900">Dashboard</h2>
        <p className="text-slate-500 text-sm mt-1">Green Rewards system overview &amp; budget telemetry</p>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Active Campaigns', value: campaignCount, icon: '📢', color: 'text-emerald-700 bg-emerald-50' },
          { label: 'Approved Partners', value: partnerCount, icon: '🏪', color: 'text-blue-700 bg-blue-50' },
          { label: 'Total Citizens', value: userCount, icon: '👥', color: 'text-purple-700 bg-purple-50' },
          { label: 'Budget Spent', value: formatPaise(totalSpent), icon: '💰', color: 'text-amber-700 bg-amber-50' },
        ].map(stat => (
          <div key={stat.label} className="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-xs">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">{stat.label}</span>
              <span className={`p-2 rounded-xl text-lg ${stat.color}`}>{stat.icon}</span>
            </div>
            <div className="font-display text-2xl font-bold text-slate-900 mt-3">{stat.value}</div>
          </div>
        ))}
      </div>

      {/* Budget summary */}
      <div className="bg-white border border-slate-200/90 rounded-2xl p-6 shadow-xs space-y-4">
        <h3 className="font-display font-bold text-slate-900 text-lg">Budget Overview (All Campaigns)</h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
            <p className="text-slate-500 text-xs uppercase tracking-wider font-semibold">Total Allocated</p>
            <p className="font-display text-2xl font-bold text-slate-900 mt-1">{formatPaise(totalBudget)}</p>
          </div>
          <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
            <p className="text-slate-500 text-xs uppercase tracking-wider font-semibold">Reserved</p>
            <p className="font-display text-2xl font-bold text-amber-700 mt-1">{formatPaise(totalReserved)}</p>
          </div>
          <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
            <p className="text-slate-500 text-xs uppercase tracking-wider font-semibold">Spent</p>
            <p className="font-display text-2xl font-bold text-emerald-700 mt-1">{formatPaise(totalSpent)}</p>
          </div>
        </div>
        <div className="mt-4">
          <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden">
            <div
              className="bg-emerald-600 h-full rounded-full transition-all"
              style={{ width: `${totalBudget > 0 ? (totalSpent / totalBudget) * 100 : 0}%` }}
            />
          </div>
        </div>
      </div>
    </div>
  )
}
