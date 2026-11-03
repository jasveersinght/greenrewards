'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Home,
  Wallet,
  Activity,
  User,
  Bell,
  Sparkles,
  Droplets,
  UtensilsCrossed,
  Bus,
  Zap,
  RotateCcw,
  Gift,
} from 'lucide-react';

interface AppNavbarProps {
  user: {
    displayName?: string | null;
    email?: string;
    roles: string[];
  };
  balancePoints?: number;
  balancePaise?: bigint | number;
  unreadCount?: number;
}

export default function AppNavbar({ user, balancePoints, balancePaise = 0, unreadCount = 0 }: AppNavbarProps) {
  const pathname = usePathname();

  const navLinks = [
    { href: '/home', label: 'Home', icon: Home },
    { href: '/leak', label: 'Leak Hunter', icon: Droplets },
    { href: '/food', label: 'Food Rescue', icon: UtensilsCrossed },
    { href: '/commute', label: 'Commute', icon: Bus },
    { href: '/electricity', label: 'Electricity', icon: Zap },
    { href: '/water', label: 'Water', icon: Droplets },
    { href: '/reuse', label: 'Reuse', icon: RotateCcw },
    { href: '/rewards', label: 'Rewards', icon: Gift },
    { href: '/wallet', label: 'Wallet', icon: Wallet },
    { href: '/activity', label: 'Activity', icon: Activity },
  ];

  const formattedBalance = balancePoints != null
    ? `${balancePoints} GP`
    : `${Number(balancePaise)} GP`;

  return (
    <header className="sticky top-0 z-40 w-full border-b border-slate-200/80 bg-white/95 backdrop-blur-md transition-all">
      <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-3">
        {/* Left: Brand */}
        <div className="flex items-center gap-3 shrink-0">
          <Link href="/home" className="flex items-center gap-2.5 group">
            <img
              src="/logo.png"
              alt="Green Rewards"
              className="w-8 h-8 object-contain transform group-hover:scale-105 transition-transform"
            />
            <span className="font-display text-2xl font-bold tracking-tight text-slate-900 group-hover:text-emerald-700 transition-colors">
              Green Rewards
            </span>
          </Link>
          <span className="hidden sm:inline-flex items-center gap-1 text-[11px] font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200/80 px-2.5 py-0.5 rounded-full">
            <Sparkles className="w-3 h-3 text-emerald-600" />
            <span>Chennai</span>
          </span>
        </div>

        {/* Center: Desktop Navigation Links (all 9 options available across desktop breakpoints) */}
        <nav className="hidden xl:flex items-center gap-0.5 font-body">
          {navLinks.map((item) => {
            const isActive = pathname === item.href;
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  isActive
                    ? 'bg-emerald-50 text-emerald-800 shadow-2xs font-bold'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/70'
                }`}
              >
                <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-emerald-600' : 'text-slate-400'}`} />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>

        {/* Medium screens compact navigation */}
        <nav className="hidden md:flex xl:hidden items-center gap-1 font-body">
          {navLinks.slice(0, 5).map((item) => {
            const isActive = pathname === item.href;
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  isActive
                    ? 'bg-emerald-50 text-emerald-800 shadow-2xs font-bold'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/70'
                }`}
              >
                <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-emerald-600' : 'text-slate-400'}`} />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>

        {/* Right: Balance Pill, Notifications, Role Badges, Profile */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Balance Pill */}
          <Link
            href="/wallet"
            className="flex items-center gap-1.5 bg-emerald-50/80 hover:bg-emerald-100/80 border border-emerald-200/80 rounded-full px-3 py-1 text-xs font-bold text-emerald-800 shadow-2xs transition-colors"
            title="View Wallet Balance"
          >
            <span>🪙</span>
            <span>{formattedBalance}</span>
          </Link>

          {/* Activity / Notifications Bell */}
          <Link
            href="/activity"
            className="relative p-2 rounded-full text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors"
            aria-label="Notifications"
          >
            <Bell className="w-4 h-4" />
            {unreadCount > 0 && (
              <span className="absolute top-1 right-1 w-4 h-4 bg-rose-500 rounded-full text-[10px] text-white flex items-center justify-center font-bold animate-pulse">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </Link>

          {/* Role Badges */}
          {user.roles.includes('ADMIN') && (
            <Link
              href="/admin"
              className="hidden sm:inline-flex items-center text-[11px] font-bold px-2.5 py-1 rounded-full bg-blue-50 text-blue-700 border border-blue-200 hover:bg-blue-100 transition-colors"
            >
              Admin
            </Link>
          )}

          {user.roles.includes('MERCHANT') && (
            <Link
              href="/merchant"
              className="hidden sm:inline-flex items-center text-[11px] font-bold px-2.5 py-1 rounded-full bg-amber-50 text-amber-700 border border-amber-200 hover:bg-amber-100 transition-colors"
            >
              Merchant
            </Link>
          )}

          {/* Sponsor Link */}
          <Link
            href="/sponsor"
            className="hidden md:inline-flex items-center text-[11px] font-semibold text-slate-600 hover:text-emerald-700 px-2 py-1 rounded-md transition-colors"
          >
            Sponsors
          </Link>

          {/* Profile Avatar */}
          <Link
            href="/profile"
            className="flex items-center justify-center w-8 h-8 rounded-full bg-slate-900 text-white font-bold text-xs hover:bg-emerald-700 transition-colors shadow-2xs"
            title={user.displayName || 'Profile'}
          >
            {user.displayName ? user.displayName.charAt(0).toUpperCase() : <User className="w-4 h-4" />}
          </Link>
        </div>
      </div>
    </header>
  );
}
