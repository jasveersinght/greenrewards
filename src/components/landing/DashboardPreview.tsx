'use client';

import React from 'react';
import { motion } from 'framer-motion';
import {
  ChevronDown,
  Search,
  Bell,
  Home,
  CheckCircle2,
  ArrowUpRight,
  ArrowDownLeft,
  Sliders,
  Settings,
  Plus,
  MoreVertical,
  Wallet,
  FileText,
  Globe2,
} from 'lucide-react';

export default function DashboardPreview() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.8, delay: 0.5, ease: [0.16, 1, 0.3, 1] }}
      className="mt-6 md:mt-8 w-full max-w-5xl"
    >
      {/* Frosted Glass Container */}
      <div
        className="rounded-2xl overflow-hidden p-3 md:p-4 text-[11px] select-none pointer-events-none"
        style={{
          background: 'rgba(255, 255, 255, 0.55)',
          border: '1px solid rgba(255, 255, 255, 0.75)',
          boxShadow: 'var(--shadow-dashboard)',
          backdropFilter: 'blur(24px)',
        }}
      >
        <div className="bg-background/95 rounded-xl border border-border shadow-sm overflow-hidden flex flex-col">
          {/* Top Bar */}
          <div className="h-12 border-b border-border px-4 flex items-center justify-between bg-background">
            <div className="flex items-center gap-2">
              <img src="/logo.png" alt="Green Rewards" className="w-5 h-5 object-contain" />
              <span className="font-semibold text-foreground text-xs tracking-tight">Green Rewards</span>
              <ChevronDown className="w-3.5 h-3.5 text-muted-foreground" />
            </div>

            {/* Search */}
            <div className="flex items-center gap-2 bg-secondary/80 border border-border/80 px-2.5 py-1.5 rounded-lg w-72 text-muted-foreground">
              <Search className="w-3.5 h-3.5 text-muted-foreground" />
              <span className="text-[10px]">Search campaigns, reuse stores, or leak spots...</span>
              <kbd className="ml-auto text-[9px] bg-background border border-border px-1.5 py-0.5 rounded text-muted-foreground font-mono">
                ⌘K
              </kbd>
            </div>

            {/* Right actions */}
            <div className="flex items-center gap-3">
              <button
                type="button"
                className="px-3 py-1 rounded-full bg-emerald-600 text-white font-medium text-[10px] shadow-sm flex items-center gap-1"
              >
                <span>🎟️</span> Rewards Store
              </button>
              <div className="relative">
                <Bell className="w-4 h-4 text-muted-foreground" />
                <span className="absolute -top-0.5 -right-0.5 w-1.5 h-1.5 bg-emerald-500 rounded-full" />
              </div>
              <div className="w-7 h-7 rounded-full bg-emerald-100 border border-emerald-300 text-emerald-800 font-bold flex items-center justify-center text-[10px]">
                PK
              </div>
            </div>
          </div>

          <div className="flex flex-1">
            {/* Sidebar */}
            <div className="w-44 border-r border-border p-3 space-y-4 bg-background shrink-0">
              <div className="space-y-1">
                <div className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg bg-emerald-50 text-emerald-900 font-semibold border border-emerald-200/60">
                  <Home className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Dashboard</span>
                </div>
                <div className="flex items-center justify-between px-2.5 py-1.5 rounded-lg text-muted-foreground">
                  <div className="flex items-center gap-2">
                    <span>♻️</span>
                    <span>Reuse &amp; Earn</span>
                  </div>
                  <span className="bg-emerald-100 text-emerald-800 text-[9px] font-bold px-1.5 py-0.2 rounded-full">
                    3/5
                  </span>
                </div>
                <div className="flex items-center justify-between px-2.5 py-1.5 rounded-lg text-muted-foreground">
                  <div className="flex items-center gap-2">
                    <span>💧</span>
                    <span>Leak Hunter</span>
                  </div>
                  <span className="bg-blue-100 text-blue-700 text-[9px] font-bold px-1 rounded">
                    50 GP
                  </span>
                </div>
                <div className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-muted-foreground">
                  <span>🍱</span>
                  <span>Food Rescue</span>
                </div>
                <div className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-muted-foreground">
                  <span>🚌</span>
                  <span>Green Commute</span>
                </div>
                <div className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-muted-foreground">
                  <span>⚡</span>
                  <span>Save Electricity</span>
                </div>
                <div className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-muted-foreground">
                  <span>🚰</span>
                  <span>Save Water</span>
                </div>
              </div>

              <div>
                <p className="px-2.5 text-[9px] uppercase font-bold text-muted-foreground tracking-wider mb-1">
                  Citizen Hub
                </p>
                <div className="space-y-1 text-muted-foreground">
                  <div className="flex items-center gap-2 px-2.5 py-1 rounded-lg">
                    <Wallet className="w-3 h-3 text-emerald-600" />
                    <span>Wallet &amp; Ledger</span>
                  </div>
                  <div className="flex items-center gap-2 px-2.5 py-1 rounded-lg">
                    <FileText className="w-3 h-3 text-muted-foreground" />
                    <span>My Activity</span>
                  </div>
                  <div className="flex items-center gap-2 px-2.5 py-1 rounded-lg">
                    <Globe2 className="w-3 h-3 text-muted-foreground" />
                    <span>City Impact</span>
                  </div>
                  <div className="flex items-center gap-2 px-2.5 py-1 rounded-lg">
                    <Settings className="w-3 h-3" />
                    <span>Settings</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Main Content Area */}
            <div className="flex-1 p-4 bg-secondary/30 space-y-3.5 overflow-hidden">
              {/* Greeting */}
              <div className="flex justify-between items-center">
                <div>
                  <h3 className="text-sm font-semibold text-foreground">Welcome back, Priya Kumar</h3>
                  <p className="text-[10px] text-muted-foreground">Chennai Metropolitan Area · 6 Active Campaigns</p>
                </div>
                <span className="text-[10px] bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full font-medium border border-emerald-200">
                  🌱 Verified Eco Citizen
                </span>
              </div>

              {/* Action Buttons Row */}
              <div className="flex items-center justify-between flex-wrap gap-1.5">
                <div className="flex items-center gap-1.5">
                  <span className="rounded-full px-3 py-1 bg-emerald-600 text-white font-semibold text-[10px] shadow-sm">
                    💧 Report Leak
                  </span>
                  {['🍱 Save Food', '🛍️ Scan Bag QR', '🚌 Metro Ticket', '⚡ Log Meter', '🎟️ Redeem Coupon'].map((action) => (
                    <span
                      key={action}
                      className="rounded-full px-2.5 py-1 bg-background border border-border text-foreground font-medium text-[10px]"
                    >
                      {action}
                    </span>
                  ))}
                </div>
                <span className="text-[10px] text-muted-foreground underline cursor-pointer">
                  + Customize
                </span>
              </div>

              {/* Two Cards Side by Side */}
              <div className="flex gap-3">
                {/* Wallet Balance Card */}
                <div className="flex-1 basis-0 bg-background border border-border rounded-xl p-3.5 flex flex-col justify-between shadow-xs">
                  <div>
                    <div className="flex items-center justify-between text-muted-foreground">
                      <div className="flex items-center gap-1.5">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                        <span className="font-medium text-foreground">Available Green Points</span>
                      </div>
                      <span className="text-[10px] font-mono text-emerald-700 bg-emerald-50 px-1.5 py-0.2 rounded border border-emerald-200">
                        SHA-256 Ledger
                      </span>
                    </div>

                    <div className="mt-2 flex items-baseline gap-1">
                      <span className="text-xl font-bold tracking-tight text-foreground font-mono">
                        480
                      </span>
                      <span className="text-xs text-emerald-700 font-bold font-mono">GP</span>
                    </div>

                    <div className="flex items-center gap-2 mt-1 text-[10px]">
                      <span className="text-muted-foreground">This Month:</span>
                      <span className="text-emerald-600 font-semibold flex items-center">
                        <ArrowUpRight className="w-3 h-3" /> +320 GP earned
                      </span>
                      <span className="text-purple-600 font-semibold flex items-center">
                        <ArrowDownLeft className="w-3 h-3" /> -150 GP redeemed
                      </span>
                    </div>
                  </div>

                  {/* Handcrafted Cubic Bézier SVG Area Chart in Emerald */}
                  <div className="mt-2.5 h-20 w-full relative">
                    <svg viewBox="0 0 300 80" className="w-full h-full overflow-visible" preserveAspectRatio="none">
                      <defs>
                        <linearGradient id="greenAreaGradient" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#10b981" stopOpacity="0.28" />
                          <stop offset="100%" stopColor="#10b981" stopOpacity="0.0" />
                        </linearGradient>
                      </defs>

                      {/* Area Fill */}
                      <path
                        d="M 0 68 
                           C 35 60, 65 48, 105 50 
                           C 145 52, 175 28, 215 30 
                           C 255 32, 280 14, 300 10 
                           L 300 80 
                           L 0 80 Z"
                        fill="url(#greenAreaGradient)"
                      />

                      {/* Stroke Line */}
                      <path
                        d="M 0 68 
                           C 35 60, 65 48, 105 50 
                           C 145 52, 175 28, 215 30 
                           C 255 32, 280 14, 300 10"
                        fill="none"
                        stroke="#059669"
                        strokeWidth="1.85"
                        strokeLinecap="round"
                      />

                      {/* Pulse point */}
                      <circle cx="300" cy="10" r="3.5" fill="#059669" />
                      <circle cx="300" cy="10" r="7" fill="#059669" opacity="0.3" />
                    </svg>
                  </div>
                </div>

                {/* Active Campaigns Card */}
                <div className="flex-1 basis-0 bg-background border border-border rounded-xl p-3.5 flex flex-col justify-between shadow-xs">
                  <div className="flex items-center justify-between border-b border-border pb-2">
                    <span className="font-semibold text-foreground">Active Milestones</span>
                    <div className="flex items-center gap-1.5 text-muted-foreground">
                      <Plus className="w-3.5 h-3.5" />
                      <MoreVertical className="w-3.5 h-3.5" />
                    </div>
                  </div>

                  <div className="divide-y divide-border/40">
                    <div className="py-2 flex justify-between items-center text-xs">
                      <div className="flex items-center gap-2">
                        <span className="text-xs">♻️</span>
                        <div>
                          <span className="font-medium text-foreground block leading-tight">FreshMart Bags</span>
                          <span className="text-[10px] text-muted-foreground">4 of 5 stamps collected</span>
                        </div>
                      </div>
                      <span className="font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded text-[10px]">
                        40 GP Bonus
                      </span>
                    </div>

                    <div className="py-2 flex justify-between items-center text-xs">
                      <div className="flex items-center gap-2">
                        <span className="text-xs">🚌</span>
                        <div>
                          <span className="font-medium text-foreground block leading-tight">CMRL Metro Challenge</span>
                          <span className="text-[10px] text-muted-foreground">3 of 5 trips approved</span>
                        </div>
                      </div>
                      <span className="font-semibold text-purple-700 bg-purple-50 px-2 py-0.5 rounded text-[10px]">
                        25 GP Streak
                      </span>
                    </div>

                    <div className="py-2 flex justify-between items-center text-xs">
                      <div className="flex items-center gap-2">
                        <span className="text-xs">⚡</span>
                        <div>
                          <span className="font-medium text-foreground block leading-tight">Campus Energy Saver</span>
                          <span className="text-[10px] text-muted-foreground">15% reduction vs baseline</span>
                        </div>
                      </div>
                      <span className="font-semibold text-amber-700 bg-amber-50 px-2 py-0.5 rounded text-[10px]">
                        150 GP Challenge
                      </span>
                    </div>
                  </div>

                  <div className="pt-2 text-[10px] text-muted-foreground flex justify-between border-t border-border/60">
                    <span>Chennai EcoCell · CMRL · EcoBrand</span>
                    <span className="text-emerald-700 font-semibold cursor-pointer">View Map Pins →</span>
                  </div>
                </div>
              </div>

              {/* Transactions Table */}
              <div className="bg-background border border-border rounded-xl p-3.5 shadow-xs">
                <div className="flex justify-between items-center mb-2">
                  <span className="font-semibold text-foreground">Verified Eco Activity &amp; Ledger</span>
                  <span className="text-[10px] text-emerald-700 font-medium">Full Ledger (12 Actions)</span>
                </div>

                <table className="w-full text-left">
                  <thead>
                    <tr className="text-[10px] text-muted-foreground border-b border-border/80 pb-1">
                      <th className="py-1 font-medium">Date &amp; Time</th>
                      <th className="py-1 font-medium">Initiative</th>
                      <th className="py-1 font-medium">Reward / Ledger</th>
                      <th className="py-1 font-medium text-right">Verification</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/40 text-[10px]">
                    <tr>
                      <td className="py-1.5 text-muted-foreground">Today, 10:30 AM</td>
                      <td className="py-1.5 font-medium text-foreground">FreshMart Grocery — Reusable Bag</td>
                      <td className="py-1.5 font-semibold text-emerald-700 font-mono">+1 Stamp (4/5)</td>
                      <td className="py-1.5 text-right">
                        <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-700 border border-emerald-500/20 font-medium">
                          ✓ Confirmed
                        </span>
                      </td>
                    </tr>
                    <tr>
                      <td className="py-1.5 text-muted-foreground">Yesterday, 4:15 PM</td>
                      <td className="py-1.5 font-medium text-foreground">Potheri Junction — Public Pipe Leak Report</td>
                      <td className="py-1.5 font-semibold text-emerald-700 font-mono">+50 GP Wallet</td>
                      <td className="py-1.5 text-right">
                        <span className="px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-700 border border-blue-500/20 font-medium">
                          Verified by Reviewer
                        </span>
                      </td>
                    </tr>
                    <tr>
                      <td className="py-1.5 text-muted-foreground">Oct 24</td>
                      <td className="py-1.5 font-medium text-foreground">Annapoorna Kitchen — Surplus Meal Rescued</td>
                      <td className="py-1.5 font-semibold text-foreground font-mono">₹49 meal + 15 GP</td>
                      <td className="py-1.5 text-right">
                        <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-700 border border-emerald-500/20 font-medium">
                          ✓ Picked Up
                        </span>
                      </td>
                    </tr>
                    <tr>
                      <td className="py-1.5 text-muted-foreground">Oct 23</td>
                      <td className="py-1.5 font-medium text-foreground">CMRL Metro — Guindy to Central Commute</td>
                      <td className="py-1.5 font-semibold text-purple-700 font-mono">+1 Trip (Milestone 3/5)</td>
                      <td className="py-1.5 text-right">
                        <span className="px-2 py-0.5 rounded-full bg-purple-500/10 text-purple-700 border border-purple-500/20 font-medium">
                          Approved
                        </span>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
