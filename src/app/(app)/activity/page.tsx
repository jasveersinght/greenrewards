import { getSession } from '@/server/session'
import { prisma } from '@/server/db'
import { Bell, CheckCircle2, Clock, Sparkles } from 'lucide-react'

export default async function ActivityPage() {
  const session = await getSession()
  if (!session) return null

  const notifications = await prisma.notification.findMany({
    where: { userId: session.userId },
    orderBy: { createdAt: 'desc' },
    take: 30,
  })

  const unread = notifications.filter((n) => !n.readAt)

  return (
    <div className="space-y-8 font-body">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2 text-xs font-semibold text-emerald-700 bg-emerald-50 w-fit px-3 py-1 rounded-full border border-emerald-200 mb-2">
          <Sparkles className="w-3.5 h-3.5" />
          <span>Real-time Updates</span>
        </div>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="font-display text-3xl sm:text-4xl font-bold text-slate-900 tracking-tight">
              My Activity &amp; Notifications
            </h1>
            <p className="text-slate-600 text-sm mt-1">
              Track verification progress, challenge completions, and points updates.
            </p>
          </div>
          {unread.length > 0 && (
            <span className="text-xs font-bold px-3 py-1 rounded-full bg-amber-50 text-amber-700 border border-amber-200">
              {unread.length} Unread
            </span>
          )}
        </div>
      </div>

      {/* Notifications List */}
      <section>
        {notifications.length === 0 ? (
          <div className="bg-white border border-slate-200/90 rounded-2xl p-12 text-center shadow-xs">
            <div className="text-4xl mb-3">🔔</div>
            <h3 className="font-semibold text-slate-900 text-base">No notifications yet</h3>
            <p className="text-slate-500 text-sm mt-1 max-w-sm mx-auto">
              Participate in challenges or submit leak reports to get real-time verification alerts here.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {notifications.map((n) => {
              const isUnread = !n.readAt
              return (
                <div
                  key={n.id}
                  className={`bg-white border rounded-2xl p-4 sm:p-5 shadow-xs transition-all ${
                    isUnread
                      ? 'border-emerald-300 bg-emerald-50/20'
                      : 'border-slate-200/90 hover:border-slate-300'
                  }`}
                >
                  <div className="flex items-start gap-3.5">
                    <div
                      className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                        isUnread
                          ? 'bg-emerald-100 text-emerald-700'
                          : 'bg-slate-100 text-slate-500'
                      }`}
                    >
                      <Bell className="w-4 h-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <h4 className="font-bold text-slate-900 text-sm">{n.title}</h4>
                        <span className="text-[11px] text-slate-400 whitespace-nowrap">
                          {new Date(n.createdAt).toLocaleString('en-IN', {
                            dateStyle: 'short',
                            timeStyle: 'short',
                          })}
                        </span>
                      </div>
                      <p className="text-slate-600 text-xs sm:text-sm mt-1 leading-relaxed">
                        {n.body}
                      </p>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </section>

      {/* Active Tasks Overview */}
      <section className="bg-white border border-slate-200/90 rounded-2xl p-6 shadow-xs">
        <div className="flex items-center gap-2 mb-2">
          <Clock className="w-4 h-4 text-emerald-600" />
          <h3 className="font-bold text-slate-900 text-sm">Active City Challenges</h3>
        </div>
        <p className="text-slate-500 text-xs sm:text-sm leading-relaxed">
          Your active challenge participation status is verified synchronously across Chennai sensors. Visit the challenges catalog on the home page to earn points.
        </p>
      </section>
    </div>
  )
}
