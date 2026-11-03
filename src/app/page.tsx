'use client';

import React, { useEffect, useRef } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { Play } from 'lucide-react';
import { Button } from '@/components/ui/button';
import KineticHeadline from '@/components/landing/KineticHeadline';
import DashboardPreview from '@/components/landing/DashboardPreview';

export default function LandingPage() {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.play().catch(() => {
        // Autoplay policy handling
      });
    }
  }, []);

  return (
    <div className="min-h-screen flex flex-col bg-background text-foreground relative select-none font-body overflow-x-hidden">
      {/* Background Video - exact URL specified in specifications */}
      <video
        ref={videoRef}
        autoPlay
        loop
        muted
        playsInline
        className="fixed inset-0 w-full h-full object-cover z-0 pointer-events-none opacity-100"
      >
        <source src="https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260319_015952_e1deeb12-8fb7-4071-a42a-60779fc64ab6.mp4" type="video/mp4" />
        <source src="/bg-video.mp4" type="video/mp4" />
      </video>

      {/* Ultra-subtle overlay gradient so video is fully visible with zero cloudy haze */}
      <div
        className="fixed inset-0 z-0 pointer-events-none"
        style={{
          background:
            'radial-gradient(circle at 50% 25%, rgba(255,255,255,0.03) 0%, rgba(255,255,255,0.15) 85%)',
        }}
      />

      {/* Navbar */}
      <header className="relative z-20 flex items-center justify-between px-6 md:px-12 lg:px-20 py-5 font-body shrink-0 backdrop-blur-xs">
        <Link href="/" className="flex items-center gap-2.5 group">
          <img src="/logo.png" alt="Green Rewards Logo" className="w-8 h-8 object-contain group-hover:scale-105 transition-transform" />
          <span className="text-xl font-bold tracking-tight text-foreground font-body">
            Green Rewards
          </span>
          <span className="hidden sm:inline-block text-[10px] bg-emerald-100 text-emerald-800 border border-emerald-200 px-2 py-0.5 rounded-full font-semibold ml-1">
            Chennai
          </span>
        </Link>

        {/* Desktop Nav Links */}
        <nav className="hidden md:flex items-center gap-8 text-sm font-medium text-slate-700 font-body">
          <Link href="/login" className="hover:text-emerald-700 transition-colors">
            Challenges
          </Link>
          <Link href="/login" className="hover:text-emerald-700 transition-colors">
            Nearby Map
          </Link>
          <Link href="/login" className="hover:text-emerald-700 transition-colors">
            Surplus Food
          </Link>
          <Link href="/sponsor" className="hover:text-emerald-700 transition-colors">
            Sponsor Portal
          </Link>
        </nav>

        {/* CTA Buttons: Both Sign In and Sign Up */}
        <div className="flex items-center gap-2 sm:gap-3 font-body">
          <Link
            href="/login"
            className="text-xs sm:text-sm font-semibold text-slate-700 hover:text-emerald-700 transition-colors px-2 sm:px-3 py-1.5 cursor-pointer"
          >
            Sign In
          </Link>
          <Link href="/login?mode=signup">
            <Button
              className="rounded-full px-4 sm:px-5 py-2 text-xs sm:text-sm font-semibold bg-emerald-700 text-white hover:bg-emerald-600 transition shadow-sm font-body cursor-pointer"
            >
              Sign Up Free →
            </Button>
          </Link>
        </div>
      </header>

      {/* Hero Section */}
      <main className="relative z-10 flex-1 flex flex-col items-center w-full px-4 pt-1 md:pt-3 pb-16 overflow-visible">
        {/* 1. Badge (top) */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: 'easeOut' }}
          className="mb-5 inline-flex items-center gap-1.5 rounded-full border border-slate-300/80 bg-white/80 backdrop-blur-md px-4 py-1.5 text-xs sm:text-sm text-slate-700 font-body shadow-xs"
        >
          <span>Now live across Chennai</span>
          <span className="text-emerald-600">✨</span>
        </motion.div>

        {/* 2. Headline with 3D Kinetic Text Roll-In (matching text.mp4) */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.1, ease: 'easeOut' }}
          className="w-full flex justify-center"
        >
          <KineticHeadline />
        </motion.div>

        {/* 3. Subheadline */}
        <motion.p
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2, ease: 'easeOut' }}
          className="mt-3.5 text-center text-sm md:text-base text-slate-700 max-w-[650px] leading-relaxed font-body font-medium drop-shadow-xs"
        >
          Turn everyday sustainable actions in Chennai into verified Green Points. Report water leaks, rescue surplus meals, and ride the metro — then redeem points for exclusive partner merchant coupons and brand discounts.
        </motion.p>

        {/* 4. CTA Buttons */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.3, ease: 'easeOut' }}
          className="mt-4 flex items-center gap-3"
        >
          <Link href="/login">
            <Button
              className="rounded-full px-6 py-4 sm:py-5 text-sm font-semibold font-body bg-emerald-700 text-white hover:bg-emerald-600 transition shadow-md cursor-pointer"
            >
              Get Started Free →
            </Button>
          </Link>

          <Link href="/login">
            <Button
              variant="ghost"
              className="h-10 w-10 sm:h-11 sm:w-11 rounded-full border border-slate-200 bg-white/90 backdrop-blur-md shadow-[0_2px_12px_rgba(0,0,0,0.08)] hover:bg-white flex items-center justify-center p-0 transition cursor-pointer"
              aria-label="Play video demo"
            >
              <Play className="h-4 w-4 fill-slate-800 text-slate-800 ml-0.5" />
            </Button>
          </Link>
        </motion.div>

        {/* 5. Custom Coded Dashboard Preview */}
        <DashboardPreview />

        {/* 6. How Rewards Are Funded (Sponsor-backed coupon model) */}
        <section className="mt-16 w-full max-w-5xl bg-white/90 backdrop-blur-md border border-slate-200/90 rounded-3xl p-8 sm:p-10 shadow-sm text-left">
          <div className="max-w-2xl">
            <span className="text-xs font-bold uppercase tracking-wider text-emerald-800 bg-emerald-50 border border-emerald-200 px-3 py-1 rounded-full">
              Transparent Sustainability Economy
            </span>
            <h2 className="font-display text-2xl sm:text-3xl font-bold text-slate-900 mt-3">
              How Rewards Are Funded
            </h2>
            <p className="text-slate-600 text-sm mt-1">
              Green Points are not money and cannot be cashed out. Instead, they form a closed-loop sustainability incentive system funded by civic partners.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-8">
            <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-5">
              <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-800 font-bold flex items-center justify-center text-lg mb-3">
                1
              </div>
              <h3 className="font-bold text-slate-900 text-base">Partner &amp; CSR Funding</h3>
              <p className="text-xs text-slate-600 mt-2 leading-relaxed">
                Local grocery stores, sustainable retail brands, and corporate CSR programs allocate discount coupons and promo codes to encourage civic habits.
              </p>
            </div>

            <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-5">
              <div className="w-10 h-10 rounded-xl bg-purple-100 text-purple-800 font-bold flex items-center justify-center text-lg mb-3">
                2
              </div>
              <h3 className="font-bold text-slate-900 text-base">Verified Proof-of-Action</h3>
              <p className="text-xs text-slate-600 mt-2 leading-relaxed">
                Citizens earn Green Points (GP) strictly when sustainable actions are verified — whether scanning reuse bag QRs or resolving pipeline leaks.
              </p>
            </div>

            <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-5">
              <div className="w-10 h-10 rounded-xl bg-blue-100 text-blue-800 font-bold flex items-center justify-center text-lg mb-3">
                3
              </div>
              <h3 className="font-bold text-slate-900 text-base">Direct In-Store Redemption</h3>
              <p className="text-xs text-slate-600 mt-2 leading-relaxed">
                Points are redeemed for partner coupons directly in the app. QR tokens or codes are verified at checkout. No cash transfers or payouts exist.
              </p>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
