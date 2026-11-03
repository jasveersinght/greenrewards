'use client'

import { useState, useRef, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'

type Step = 'form' | 'otp'
type Mode = 'login' | 'signup'

const CHENNAI_LOCALITIES = [
  'T. Nagar',
  'Adyar',
  'Velachery',
  'Anna Nagar',
  'Guindy',
  'Mylapore',
  'Nungambakkam',
  'Tambaram',
  'Chromepet',
  'Pallavaram',
  'Perungudi',
  'Sholinganallur',
  'Perambur',
  'Kodambakkam',
  'Potheri',
  'Guduvancheri',
  'Maraimalai Nagar',
  'Besant Nagar',
  'Other Chennai Area',
]

function LoginForm() {
  const router = useRouter()
  const searchParams = useSearchParams()

  const initialMode = searchParams.get('mode') === 'signup' ? 'signup' : 'login'
  const [mode, setMode] = useState<Mode>(initialMode)
  const [step, setStep] = useState<Step>('form')

  // Inputs
  const [email, setEmail] = useState('')
  const [displayName, setDisplayName] = useState('')
  const [locality, setLocality] = useState('T. Nagar')
  const [otp, setOtp] = useState(['', '', '', '', '', ''])

  const [devOtp, setDevOtp] = useState<string | null>(null)
  const [currentUser, setCurrentUser] = useState<{ displayName: string; email: string } | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [cooldown, setCooldown] = useState(0)
  const inputRefs = useRef<(HTMLInputElement | null)[]>([])
  const isDev = process.env.NODE_ENV !== 'production'

  async function handleQuickLogin(role: string) {
    setLoading(true)
    setError('')
    try {
      const res = await fetch('/api/auth/quick-login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error || 'Quick login failed')
        return
      }
      router.push(data.redirectUrl || '/home')
    } catch {
      setError('Connection error. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  // Fetch current session for informative status without locking out the page
  useEffect(() => {
    fetch('/api/auth/me')
      .then(res => (res.ok ? res.json() : null))
      .then(data => {
        if (data?.user?.displayName) {
          setCurrentUser(data.user)
        }
      })
      .catch(() => {})
  }, [])

  // Countdown timer for resend cooldown
  useEffect(() => {
    if (cooldown <= 0) return
    const t = setTimeout(() => setCooldown(c => c - 1), 1000)
    return () => clearTimeout(t)
  }, [cooldown])

  async function handleSendOtp(e: React.FormEvent) {
    e.preventDefault()
    if (!email) return
    if (mode === 'signup' && !displayName.trim()) {
      setError('Please enter your full name')
      return
    }

    setLoading(true)
    setError('')
    try {
      const res = await fetch('/api/auth/send-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email,
          displayName: mode === 'signup' ? displayName.trim() : undefined,
          locality: mode === 'signup' ? locality : undefined,
          mode,
        }),
      })
      const data = await res.json()
      if (!res.ok) {
        if (res.status === 429) {
          setCooldown(data.cooldownRemaining ?? 60)
          setError(`Please wait ${data.cooldownRemaining}s before requesting another OTP`)
        } else {
          setError(data.error ?? 'Failed to send verification code')
        }
        return
      }

      setStep('otp')
      // Fetch dev OTP for banner
      if (isDev) {
        const devRes = await fetch(`/api/dev/otp?email=${encodeURIComponent(email)}`)
        const devData = await devRes.json()
        setDevOtp(devData.otp)
      }
      setTimeout(() => inputRefs.current[0]?.focus(), 100)
    } finally {
      setLoading(false)
    }
  }

  function handleOtpChange(index: number, value: string) {
    const digit = value.replace(/\D/g, '').slice(-1)
    const updated = [...otp]
    updated[index] = digit
    setOtp(updated)
    if (digit && index < 5) {
      inputRefs.current[index + 1]?.focus()
    }
    if (updated.every(d => d !== '')) {
      handleVerify(updated.join(''))
    }
  }

  function handleOtpKeyDown(index: number, e: React.KeyboardEvent) {
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      inputRefs.current[index - 1]?.focus()
    }
  }

  async function handleVerify(code?: string) {
    const finalCode = code ?? otp.join('')
    if (finalCode.length < 6) return
    setLoading(true)
    setError('')
    try {
      const res = await fetch('/api/auth/verify-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email,
          code: finalCode,
          displayName: mode === 'signup' ? displayName.trim() : undefined,
          locality: mode === 'signup' ? locality : undefined,
        }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(
          data.error === 'LOCKED'
            ? 'Too many attempts. Please request a new OTP.'
            : data.error === 'EXPIRED'
            ? 'OTP expired. Please request a new one.'
            : 'Invalid code. Please try again.'
        )
        setOtp(['', '', '', '', '', ''])
        setTimeout(() => inputRefs.current[0]?.focus(), 100)
        return
      }

      // If user profile is already set, they NEVER see onboarding again!
      if (data.needsOnboarding) {
        router.push('/onboarding')
      } else {
        router.push('/home')
      }
    } finally {
      setLoading(false)
    }
  }

  async function handleResend() {
    if (cooldown > 0) return
    setOtp(['', '', '', '', '', ''])
    setDevOtp(null)
    setError('')
    setCooldown(60)
    await handleSendOtp(new Event('submit') as any)
  }

  return (
    <div className="min-h-screen w-full flex flex-col items-center justify-start sm:justify-center py-8 sm:py-12 px-4 sm:px-6 bg-[#f8fafc] text-slate-900 font-body">
      <div className="w-full max-w-md my-auto flex flex-col items-center">
        {/* Brand Logo - Authentic Transparent Logo without AI box */}
        <Link href="/" className="mb-6 flex flex-col items-center group cursor-pointer">
          <div className="w-16 h-16 mb-2 flex items-center justify-center transform group-hover:scale-105 transition-transform">
            <img
              src="/logo.png"
              alt="Green Rewards Logo"
              className="w-16 h-16 object-contain"
            />
          </div>
          <h1 className="font-display text-3xl font-bold text-slate-900 tracking-tight group-hover:text-emerald-800 transition-colors">
            Green Rewards
          </h1>
          <p className="text-slate-500 text-xs sm:text-sm mt-0.5">Chennai Sustainable Living</p>
        </Link>

        {/* Card Container */}
        <div
          className="w-full bg-white border border-slate-200/90 rounded-3xl p-6 sm:p-8 shadow-xs animate-fade-in-up"
          style={{ animationDelay: '0.1s' }}
        >
          {/* Active Session Notice if already logged in */}
          {currentUser && (
            <div className="mb-4 p-3 bg-emerald-50 border border-emerald-200/80 rounded-2xl flex items-center justify-between gap-3 text-xs">
              <div className="truncate">
                <span className="text-emerald-900 font-semibold block truncate">
                  Logged in as <strong>{currentUser.displayName}</strong>
                </span>
                <span className="text-emerald-700 text-[11px] truncate block">{currentUser.email}</span>
              </div>
              <Link
                href="/home"
                className="px-3 py-1.5 bg-emerald-700 text-white font-semibold rounded-xl hover:bg-emerald-600 transition shrink-0 shadow-xs"
              >
                Go to Dashboard →
              </Link>
            </div>
          )}

          {/* Mode Tabs: Sign In / Create Account */}
          {step === 'form' && (
            <>
              {/* Quick Demo Access (1-Click) */}
              <div className="mb-6 p-4 bg-emerald-50/70 border border-emerald-200/90 rounded-2xl">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-900 flex items-center gap-1.5">
                    <span>⚡</span>
                    <span>Quick Demo Access (1-Click)</span>
                  </span>
                  <span className="text-[10px] text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full font-semibold">
                    Instant
                  </span>
                </div>
                <p className="text-[11px] text-emerald-800/90 mb-3">
                  Select a pre-configured role to demo instantly without typing or waiting:
                </p>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => handleQuickLogin('CITIZEN')}
                    disabled={loading}
                    className="flex flex-col items-start p-2.5 bg-white hover:bg-emerald-50 border border-emerald-200 rounded-xl transition text-left cursor-pointer group shadow-2xs"
                  >
                    <div className="flex items-center gap-1 text-xs font-bold text-slate-800 group-hover:text-emerald-800">
                      <span>👤</span>
                      <span>Citizen</span>
                    </div>
                    <span className="text-[10px] text-emerald-700 font-semibold">500 GP · Store</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleQuickLogin('MERCHANT')}
                    disabled={loading}
                    className="flex flex-col items-start p-2.5 bg-white hover:bg-emerald-50 border border-emerald-200 rounded-xl transition text-left cursor-pointer group shadow-2xs"
                  >
                    <div className="flex items-center gap-1 text-xs font-bold text-slate-800 group-hover:text-emerald-800">
                      <span>🏪</span>
                      <span>Merchant</span>
                    </div>
                    <span className="text-[10px] text-slate-500">QR Scan & Stamp</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleQuickLogin('ADMIN')}
                    disabled={loading}
                    className="flex flex-col items-start p-2.5 bg-white hover:bg-emerald-50 border border-emerald-200 rounded-xl transition text-left cursor-pointer group shadow-2xs"
                  >
                    <div className="flex items-center gap-1 text-xs font-bold text-slate-800 group-hover:text-emerald-800">
                      <span>⚙️</span>
                      <span>Admin</span>
                    </div>
                    <span className="text-[10px] text-blue-600 font-semibold">Settle · Reversal</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleQuickLogin('REVIEWER')}
                    disabled={loading}
                    className="flex flex-col items-start p-2.5 bg-white hover:bg-emerald-50 border border-emerald-200 rounded-xl transition text-left cursor-pointer group shadow-2xs"
                  >
                    <div className="flex items-center gap-1 text-xs font-bold text-slate-800 group-hover:text-emerald-800">
                      <span>🛡️</span>
                      <span>Reviewer</span>
                    </div>
                    <span className="text-[10px] text-slate-500">Audit & Verify</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleQuickLogin('SPONSOR')}
                    disabled={loading}
                    className="flex flex-col items-start p-2.5 bg-white hover:bg-emerald-50 border border-emerald-200 rounded-xl transition text-left cursor-pointer group shadow-2xs"
                  >
                    <div className="flex items-center gap-1 text-xs font-bold text-slate-800 group-hover:text-emerald-800">
                      <span>🏢</span>
                      <span>Sponsor</span>
                    </div>
                    <span className="text-[10px] text-slate-500">CSR Dashboard</span>
                  </button>
                </div>
              </div>

              <div className="flex items-center gap-3 my-4">
                <div className="h-px bg-slate-200 flex-1" />
                <span className="text-[11px] uppercase tracking-wider text-slate-400 font-semibold">Or use email</span>
                <div className="h-px bg-slate-200 flex-1" />
              </div>

              <div className="flex bg-slate-100/80 p-1 rounded-xl mb-6 border border-slate-200/60">
                <button
                  type="button"
                  onClick={() => {
                    setMode('login')
                    setError('')
                  }}
                  className={`flex-1 py-2 text-xs sm:text-sm font-semibold rounded-lg transition-all cursor-pointer ${
                    mode === 'login'
                      ? 'bg-white text-slate-900 shadow-xs'
                      : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  Sign In
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setMode('signup')
                    setError('')
                  }}
                  className={`flex-1 py-2 text-xs sm:text-sm font-semibold rounded-lg transition-all cursor-pointer ${
                    mode === 'signup'
                      ? 'bg-white text-slate-900 shadow-xs'
                      : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  Create Account
                </button>
              </div>
            </>
          )}

          {step === 'form' ? (
            <form onSubmit={handleSendOtp} className="space-y-4">
              <div>
                <h2 className="font-display text-xl sm:text-2xl font-bold text-slate-900">
                  {mode === 'login' ? 'Welcome Back' : 'Create Your Account'}
                </h2>
                <p className="text-slate-500 text-xs sm:text-sm mt-1">
                  {mode === 'login'
                    ? 'Enter your email to sign in directly to your citizen dashboard.'
                    : 'Set up your citizen profile once and earn verified sustainability rewards.'}
                </p>
              </div>

              {/* Sign Up Fields */}
              {mode === 'signup' && (
                <>
                  <div>
                    <label
                      htmlFor="displayName"
                      className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5"
                    >
                      Full Name
                    </label>
                    <input
                      id="displayName"
                      type="text"
                      value={displayName}
                      onChange={e => setDisplayName(e.target.value)}
                      className="gr-input"
                      placeholder="e.g. Priya Kumar"
                      required
                      minLength={2}
                      maxLength={50}
                      disabled={loading}
                    />
                  </div>

                  <div>
                    <label
                      htmlFor="locality"
                      className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5"
                    >
                      Locality / Area
                    </label>
                    <select
                      id="locality"
                      value={locality}
                      onChange={e => setLocality(e.target.value)}
                      className="gr-input bg-white cursor-pointer"
                      disabled={loading}
                    >
                      {CHENNAI_LOCALITIES.map(loc => (
                        <option key={loc} value={loc}>
                          {loc}
                        </option>
                      ))}
                    </select>
                  </div>
                </>
              )}

              {/* Email Address */}
              <div>
                <label
                  htmlFor="email"
                  className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5"
                >
                  Email address
                </label>
                <input
                  id="email"
                  type="email"
                  autoComplete="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  className="gr-input"
                  placeholder="you@example.com"
                  required
                  disabled={loading}
                />
              </div>

              {error && (
                <p className="text-rose-600 text-xs font-semibold" role="alert">
                  {error}
                </p>
              )}

              <button
                type="submit"
                className="btn-primary w-full py-3 text-sm font-semibold cursor-pointer"
                disabled={loading || !email || (mode === 'signup' && !displayName.trim())}
              >
                {loading
                  ? '⏳ Sending verification code...'
                  : mode === 'signup'
                  ? 'Create Account & Continue →'
                  : 'Sign In with Email →'}
              </button>

              <div className="text-center pt-2">
                {mode === 'login' ? (
                  <p className="text-xs text-slate-500">
                    New to Green Rewards?{' '}
                    <button
                      type="button"
                      onClick={() => {
                        setMode('signup')
                        setError('')
                      }}
                      className="font-bold text-emerald-700 hover:text-emerald-800 underline cursor-pointer"
                    >
                      Create an account
                    </button>
                  </p>
                ) : (
                  <p className="text-xs text-slate-500">
                    Already set up?{' '}
                    <button
                      type="button"
                      onClick={() => {
                        setMode('login')
                        setError('')
                      }}
                      className="font-bold text-emerald-700 hover:text-emerald-800 underline cursor-pointer"
                    >
                      Sign in here
                    </button>
                  </p>
                )}
              </div>
            </form>
          ) : (
            <div className="space-y-5">
              <div className="text-center">
                <h2 className="font-display text-xl font-bold text-slate-900">Check your email</h2>
                <p className="text-slate-500 text-xs sm:text-sm mt-1">
                  Enter the 6-digit verification code sent to{' '}
                  <strong className="text-slate-800">{email}</strong>
                </p>
                {mode === 'signup' && displayName && (
                  <p className="text-xs text-emerald-700 font-medium mt-1">
                    Profile ready for: <strong>{displayName}</strong> ({locality})
                  </p>
                )}
              </div>

              {/* Dev OTP Banner */}
              {isDev && devOtp && (
                <div className="p-3.5 bg-emerald-50 border border-emerald-200/90 rounded-2xl flex items-center justify-between gap-3 shadow-2xs" role="status" aria-label="Development OTP">
                  <div>
                    <span className="text-[11px] font-bold text-emerald-900 uppercase tracking-wider block">🛠️ Dev Code:</span>
                    <strong id="dev-otp-value" className="text-xl font-mono text-emerald-800 tracking-widest block font-bold">{devOtp}</strong>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      const digits = devOtp.split('')
                      setOtp(digits)
                      handleVerify(devOtp)
                    }}
                    className="px-3.5 py-2 bg-emerald-700 hover:bg-emerald-600 text-white text-xs font-bold rounded-xl shadow-xs transition cursor-pointer"
                  >
                    Auto-Fill &amp; Enter →
                  </button>
                </div>
              )}

              {/* OTP boxes */}
              <div className="otp-boxes" role="group" aria-label="One-time password input">
                {otp.map((digit, i) => (
                  <input
                    key={i}
                    ref={el => {
                      inputRefs.current[i] = el
                    }}
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]"
                    maxLength={1}
                    value={digit}
                    onChange={e => handleOtpChange(i, e.target.value)}
                    onKeyDown={e => handleOtpKeyDown(i, e)}
                    className="otp-box"
                    aria-label={`Digit ${i + 1}`}
                    id={`otp-digit-${i + 1}`}
                    disabled={loading}
                  />
                ))}
              </div>

              {/* Manual code entry fallback */}
              <details className="text-center">
                <summary className="text-xs text-slate-400 cursor-pointer">Enter code manually</summary>
                <div className="mt-2 flex gap-2">
                  <input
                    type="text"
                    className="gr-input text-center font-mono text-lg"
                    placeholder="123456"
                    maxLength={6}
                    onChange={e => {
                      const digits = e.target.value.replace(/\D/g, '').slice(0, 6)
                      setOtp(digits.padEnd(6, '').split('').slice(0, 6))
                    }}
                  />
                  <button
                    className="btn-primary"
                    style={{ width: 'auto', padding: '12px 16px' }}
                    onClick={() => handleVerify()}
                    disabled={loading}
                  >
                    ✓
                  </button>
                </div>
              </details>

              {error && (
                <p className="text-rose-600 text-xs font-semibold text-center" role="alert">
                  {error}
                </p>
              )}

              {loading && <p className="text-center text-slate-500 text-xs">Verifying &amp; logging in...</p>}

              <div className="flex gap-3">
                <button
                  className="btn-secondary"
                  style={{ flex: 1 }}
                  onClick={() => {
                    setStep('form')
                    setOtp(['', '', '', '', '', ''])
                    setError('')
                  }}
                >
                  ← Back
                </button>
                <button
                  className="btn-secondary"
                  style={{ flex: 1 }}
                  onClick={handleResend}
                  disabled={cooldown > 0}
                >
                  {cooldown > 0 ? `Resend (${cooldown}s)` : 'Resend Code'}
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <p className="mt-8 text-xs text-slate-400 text-center">
          Chennai Sustainability Initiative · Verified municipal &amp; citizen rewards
        </p>
      </div>
    </div>
  )
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#f8fafc]" />}>
      <LoginForm />
    </Suspense>
  )
}
