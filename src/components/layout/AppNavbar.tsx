'use client';

import React, { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
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
  RefreshCw,
  LogOut,
  ChevronDown,
  Shield,
  Briefcase,
} from 'lucide-react';
import { ROLE_LABELS, type AppRole } from '@/server/domain/roles';

interface AppNavbarProps {
  user: {
    displayName?: string | null;
    email?: string;
    username?: string | null;
    roles: string[];
    activeRole?: string;
  };
  balancePoints?: number;
  balancePaise?: bigint | number;
  unreadCount?: number;
}

export default function AppNavbar({ user, balancePoints, balancePaise = 0, unreadCount = 0 }: AppNavbarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setMenuOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

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

  const activeRoleName = (ROLE_LABELS[(user.activeRole || 'CITIZEN') as AppRole] || user.activeRole || 'Citizen');
  const hasMultipleRoles = user.roles.length >= 2 || user.username?.startsWith('admin');

  async function handleLogout() {
    await fetch('/api/auth/logout', { method: 'POST' });
    router.push('/login');
  }

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

        {/* Center: Desktop Navigation Links */}
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

        {/* Right: Balance Pill, Notifications, Role Badges, Profile Menu */}
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

          {/* Avatar Menu with Dropdown */}
          <div className="relative" ref={menuRef}>
            <button
              onClick={() => setMenuOpen(!menuOpen)}
              className="flex items-center gap-1.5 p-1 rounded-full hover:bg-slate-100 transition-colors focus:outline-none"
              aria-label="User profile menu"
            >
              <div className="flex items-center justify-center w-8 h-8 rounded-full bg-slate-900 text-white font-bold text-xs shadow-2xs">
                {user.displayName ? user.displayName.charAt(0).toUpperCase() : <User className="w-4 h-4" />}
              </div>
              <ChevronDown className="w-3.5 h-3.5 text-slate-400 hidden sm:block" />
            </button>

            {menuOpen && (
              <div className="absolute right-0 mt-2 w-64 bg-white rounded-2xl shadow-xl border border-slate-200 p-2 z-50 text-xs font-body">
                <div className="px-3 py-2 border-b border-slate-100">
                  <p className="font-bold text-slate-900 truncate">{user.displayName || 'Green Citizen'}</p>
                  <p className="text-[11px] text-slate-500 truncate font-mono">
                    {user.username ? `@${user.username}` : user.email}
                  </p>
                  <div className="mt-1.5 flex items-center justify-between text-[11px] text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-100">
                    <span>You&apos;re using:</span>
                    <span className="font-bold">{activeRoleName}</span>
                  </div>
                </div>

                <div className="py-1">
                  {hasMultipleRoles && (
                    <Link
                      href="/choose-role"
                      onClick={() => setMenuOpen(false)}
                      className="flex items-center gap-2 px-3 py-2 rounded-xl text-slate-700 hover:bg-emerald-50 hover:text-emerald-800 font-semibold transition-colors"
                    >
                      <RefreshCw className="w-3.5 h-3.5 text-emerald-600" />
                      <span>Switch role...</span>
                    </Link>
                  )}

                  <Link
                    href="/profile"
                    onClick={() => setMenuOpen(false)}
                    className="flex items-center gap-2 px-3 py-2 rounded-xl text-slate-700 hover:bg-slate-50 font-semibold transition-colors"
                  >
                    <User className="w-3.5 h-3.5 text-slate-500" />
                    <span>My Profile &amp; Settings</span>
                  </Link>

                  <Link
                    href="/apply"
                    onClick={() => setMenuOpen(false)}
                    className="flex items-center gap-2 px-3 py-2 rounded-xl text-slate-700 hover:bg-slate-50 font-semibold transition-colors"
                  >
                    <Briefcase className="w-3.5 h-3.5 text-slate-500" />
                    <span>Apply for a Role</span>
                  </Link>
                </div>

                <div className="pt-1 border-t border-slate-100">
                  <button
                    onClick={handleLogout}
                    className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-rose-700 hover:bg-rose-50 font-semibold transition-colors text-left"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                    <span>Sign Out</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
