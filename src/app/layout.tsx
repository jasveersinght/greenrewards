import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' })

export const metadata: Metadata = {
  title: 'Green Rewards — Sustainability Made Rewarding',
  description: 'Complete sustainability actions, get verified, and earn real rewards in Chennai.',
  keywords: ['sustainability', 'green', 'rewards', 'Chennai', 'eco'],
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={inter.variable}>
      <body className="bg-[#f8fafc] text-foreground antialiased selection:bg-emerald-100 selection:text-emerald-900">
        {children}
      </body>
    </html>
  )
}
