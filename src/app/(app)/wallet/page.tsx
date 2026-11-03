import { getSession } from '@/server/session'
import { getLedgerHistory, getWalletBalance } from '@/server/services/walletService'
import { prisma } from '@/server/db'
import { Wallet, Award, Clock, ArrowDownLeft, ArrowUpRight, Tag, ShieldCheck } from 'lucide-react'

function formatPaise(paise: number | bigint | null | undefined): string {
  if (!paise) return '₹0.00'
  return `₹${(Number(paise) / 100).toFixed(2)}`
}

const LEDGER_TYPE_LABELS: Record<string, { label: string; sign: '+' | '-' | '' }> = {
  EARN_STAMP: { label: 'Stamp earned', sign: '+' },
  USE_STAMP: { label: 'Stamps redeemed', sign: '-' },
  EARN_PENDING: { label: 'Reward pending', sign: '+' },
  APPROVE_PENDING: { label: 'Reward approved', sign: '+' },
  REJECT_PENDING: { label: 'Reward rejected', sign: '-' },
  RESERVE_REDEMPTION: { label: 'Redemption reserved', sign: '-' },
  COMPLETE_REDEMPTION: { label: 'Redeemed', sign: '-' },
  RELEASE_REDEMPTION: { label: 'Redemption released', sign: '+' },
  REVERSE: { label: 'Reversal', sign: '-' },
}

export default async function WalletPage() {
  const session = await getSession()
  if (!session) return null

  const [balance, entries, vouchers] = await Promise.all([
    getWalletBalance(session.userId),
    getLedgerHistory(session.userId, { take: 50 }),
    prisma.voucher.findMany({
      where: { userId: session.userId, redeemedAt: null, expiresAt: { gt: new Date() } },
      orderBy: { expiresAt: 'asc' },
    }),
  ])

  return (
    <div className="space-y-8 font-body">
      {/* Title Header */}
      <div>
        <div className="flex items-center gap-2 text-xs font-semibold text-emerald-700 bg-emerald-50 w-fit px-3 py-1 rounded-full border border-emerald-200 mb-2">
          <ShieldCheck className="w-3.5 h-3.5" />
          <span>Double-Entry Verified Ledger</span>
        </div>
        <h1 className="font-display text-3xl sm:text-4xl font-bold text-slate-900 tracking-tight">
          Wallet &amp; Rewards
        </h1>
        <p className="text-slate-600 text-sm mt-1">
          Manage your verified cash balances, merchant vouchers, and redemption ledger.
        </p>
      </div>

      {/* Balance Cards (Universal Responsive Grid) */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Available Credits Card */}
        <div className="bg-white border border-slate-200/90 rounded-2xl p-6 shadow-xs relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Available Credits
            </span>
            <span className="p-2.5 rounded-xl bg-emerald-50 text-emerald-700">
              <Wallet className="w-5 h-5" />
            </span>
          </div>
          <div className="mt-3">
            <span className="font-display text-3xl sm:text-4xl font-bold text-slate-900">
              {formatPaise(balance.availablePaise)}
            </span>
            <p className="text-xs text-slate-500 mt-1">Approved, immediately redeemable value</p>
          </div>
          <div className="mt-4 pt-3 border-t border-slate-100 flex items-center gap-2">
            <span className="text-[11px] font-semibold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-md">
              Instant UPI / Vouchers
            </span>
          </div>
        </div>

        {/* Pending Rewards Card */}
        <div className="bg-white border border-slate-200/90 rounded-2xl p-6 shadow-xs relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Pending Validation
            </span>
            <span className="p-2.5 rounded-xl bg-amber-50 text-amber-700">
              <Clock className="w-5 h-5" />
            </span>
          </div>
          <div className="mt-3">
            <span className="font-display text-3xl sm:text-4xl font-bold text-slate-900">
              {formatPaise(balance.pendingPaise)}
            </span>
            <p className="text-xs text-slate-500 mt-1">Submitted actions under review</p>
          </div>
          <div className="mt-4 pt-3 border-t border-slate-100 flex items-center gap-2">
            <span className="text-[11px] font-semibold text-amber-800 bg-amber-50 px-2 py-0.5 rounded-md">
              MTC / TANGEDCO / Leaks
            </span>
          </div>
        </div>

        {/* Stamps Card */}
        <div className="bg-white border border-slate-200/90 rounded-2xl p-6 shadow-xs relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Digital Stamps
            </span>
            <span className="p-2.5 rounded-xl bg-purple-50 text-purple-700">
              <Award className="w-5 h-5" />
            </span>
          </div>
          <div className="mt-3">
            <span className="font-display text-3xl sm:text-4xl font-bold text-slate-900">
              {balance.stamps}
            </span>
            <p className="text-xs text-slate-500 mt-1">Reusable bag stamps collected</p>
          </div>
          <div className="mt-4 pt-3 border-t border-slate-100 flex items-center gap-2">
            <span className="text-[11px] font-semibold text-purple-800 bg-purple-50 px-2 py-0.5 rounded-md">
              5 Stamps = ₹20 Bonus
            </span>
          </div>
        </div>
      </div>

      {/* Vouchers Section */}
      {vouchers.length > 0 && (
        <section>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              Active Vouchers ({vouchers.length})
            </h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {vouchers.map((v) => (
              <div key={v.id} className="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-xs flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="p-3 rounded-xl bg-emerald-50 text-emerald-700">
                    <Tag className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-900 text-sm">{formatPaise(v.valuePaise)} Merchant Voucher</h3>
                    {v.minimumSpendPaise > 0 && (
                      <p className="text-slate-500 text-xs mt-0.5">Min spend: {formatPaise(v.minimumSpendPaise)}</p>
                    )}
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <span className="text-[11px] font-semibold px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200">
                    Active
                  </span>
                  <p className="text-slate-400 text-[11px] mt-1">
                    Exp: {new Date(v.expiresAt).toLocaleDateString('en-IN')}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Ledger History Section */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xs font-bold text-slate-500 uppercase tracking-wider">
            Ledger Transaction History
          </h2>
          <span className="text-xs text-slate-500 font-medium">Last 50 entries</span>
        </div>

        {entries.length === 0 ? (
          <div className="bg-white border border-slate-200/90 rounded-2xl p-12 text-center shadow-xs">
            <div className="text-4xl mb-3">💳</div>
            <h3 className="font-semibold text-slate-900 text-base">No transactions yet</h3>
            <p className="text-slate-500 text-sm mt-1 max-w-sm mx-auto">
              Participate in challenges, report leaks, or use reusable bags to earn your first rewards.
            </p>
          </div>
        ) : (
          <div className="bg-white border border-slate-200/90 rounded-2xl overflow-hidden shadow-xs">
            <div className="overflow-x-auto">
              <table className="ledger-table w-full text-left" aria-label="Transaction history">
                <thead>
                  <tr>
                    <th>Transaction</th>
                    <th>Reference / Campaign</th>
                    <th>Amount</th>
                    <th>Date &amp; Time</th>
                  </tr>
                </thead>
                <tbody>
                  {entries.map((e) => {
                    const meta = LEDGER_TYPE_LABELS[e.type] ?? { label: e.type, sign: '' }
                    const isCredit = meta.sign === '+'
                    return (
                      <tr key={e.id} className="hover:bg-slate-50/70 transition-colors">
                        <td>
                          <div className="flex items-center gap-2">
                            <span className={`p-1 rounded-md ${isCredit ? 'bg-emerald-50 text-emerald-600' : 'bg-slate-100 text-slate-600'}`}>
                              {isCredit ? <ArrowDownLeft className="w-3.5 h-3.5" /> : <ArrowUpRight className="w-3.5 h-3.5" />}
                            </span>
                            <span className="font-semibold text-slate-900 text-sm">{meta.label}</span>
                          </div>
                        </td>
                        <td>
                          <div className="text-slate-600 text-xs">
                            {e.campaign?.name || e.note || 'Direct Citizen Credit'}
                          </div>
                        </td>
                        <td>
                          <span className={`font-semibold text-sm ${isCredit ? 'text-emerald-700' : 'text-slate-700'}`}>
                            {e.stamps != null
                              ? `${meta.sign}${e.stamps} 🪙`
                              : `${meta.sign}${formatPaise(e.amountPaise)}`}
                          </span>
                        </td>
                        <td>
                          <span className="text-slate-500 text-xs whitespace-nowrap">
                            {new Date(e.createdAt).toLocaleString('en-IN', {
                              dateStyle: 'medium',
                              timeStyle: 'short',
                            })}
                          </span>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </section>
    </div>
  )
}
