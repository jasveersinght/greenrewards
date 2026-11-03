import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Green Rewards — Sustainability Made Rewarding',
  description: 'Complete sustainability actions, get verified, and earn real rewards in Chennai.',
  keywords: ['sustainability', 'green', 'rewards', 'Chennai', 'eco'],
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="bg-[#f8fafc] text-foreground antialiased selection:bg-emerald-100 selection:text-emerald-900 font-sans">
        {children}
      </body>
    </html>
  )
}
