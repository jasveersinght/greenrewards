import { getSession } from '@/server/session'
import { redirect } from 'next/navigation'
import { prisma } from '@/server/db'
import { getWalletBalance } from '@/server/services/walletService'
import AppNavbar from '@/components/layout/AppNavbar'
import BottomNav from '@/components/layout/BottomNav'
import NearbyRewards from '@/components/map/NearbyRewards'

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession()
  if (!session) redirect('/login')
  if (!session.displayName) redirect('/onboarding')

  const balance = await getWalletBalance(session.userId)
  const unreadCount = await prisma.notification.count({
    where: { userId: session.userId, readAt: null },
  })

  return (
    <div className="min-h-screen bg-[#f8fafc] text-slate-900 font-body flex flex-col">
      {/* Universal Desktop & Mobile Header */}
      <AppNavbar
        user={{
          displayName: session.displayName,
          email: session.email,
          roles: session.roles,
        }}
        balancePaise={balance.availablePaise}
        unreadCount={unreadCount}
      />

      {/* Responsive Main Body with ample bottom clearance */}
      <main className="flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 pb-36 md:pb-24">
        {children}
      </main>

      {/* Floating Nearby Map Button & Modal */}
      <NearbyRewards />

      {/* Mobile-only Bottom Navigation */}
      <BottomNav roles={session.roles} />
    </div>
  )
}
