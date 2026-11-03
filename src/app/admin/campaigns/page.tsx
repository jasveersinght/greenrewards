import { prisma } from '@/server/db'

export default async function AdminCampaignsPage() {
  const campaigns = await prisma.campaign.findMany({
    include: {
      funder: { select: { name: true, isSimulated: true } },
      budget: true,
    },
    orderBy: { createdAt: 'desc' },
  })

  function formatPaise(v: bigint | number | null) {
    if (v == null) return '—'
    return `₹${(Number(v) / 100).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`
  }

  const STATUS_COLORS: Record<string, string> = {
    ACTIVE: 'badge-green', COMING_SOON: 'badge-yellow',
    ENDED: 'badge-gray', DRAFT: 'badge-gray', PAUSED: 'badge-red',
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white">Campaigns</h2>
          <p className="text-gray-400 text-sm">{campaigns.length} total</p>
        </div>
        <a href="/admin/campaigns/new" className="btn-primary" style={{ width: 'auto', padding: '10px 16px', textDecoration: 'none', fontSize: '14px' }}>
          + New Campaign
        </a>
      </div>

      <div className="space-y-3">
        {campaigns.map(c => (
          <div key={c.id} className="admin-stat-card">
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className={`status-dot ${c.status === 'ACTIVE' ? 'active' : c.status === 'COMING_SOON' ? 'coming-soon' : 'ended'}`} />
                  <h3 className="text-white font-semibold">{c.name}</h3>
                  <span className={`badge ${STATUS_COLORS[c.status] ?? 'badge-gray'}`}>{c.status.replace('_', ' ')}</span>
                  {c.isSimulated && <span className="badge badge-simulated">Simulated</span>}
                </div>
                <p className="text-gray-400 text-sm mt-1">
                  Section: {c.section} · Funder: {c.funder.name}
                  {c.funder.isSimulated && ' (Simulated)'}
                </p>
                <p className="text-gray-500 text-xs mt-1">
                  {new Date(c.startsAt).toLocaleDateString('en-IN')} → {new Date(c.endsAt).toLocaleDateString('en-IN')}
                </p>
              </div>
              {c.budget && (
                <div className="text-right shrink-0">
                  <p className="text-white text-sm font-semibold">{formatPaise(c.budget.totalPaise)}</p>
                  <p className="text-gray-400 text-xs">Budget</p>
                  <p className="text-yellow-400 text-xs">{formatPaise(c.budget.reservedPaise)} reserved</p>
                  <p className="text-green-400 text-xs">{formatPaise(c.budget.spentPaise)} spent</p>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
