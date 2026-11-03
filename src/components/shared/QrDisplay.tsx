'use client'

import React, { useEffect, useState, useRef } from 'react'
import QRCode from 'qrcode'
import Link from 'next/link'

interface QrDisplayProps {
  opaqueId: string
  code: string
  payload: string
  expiresAt: string | Date
  offerName: string
  partnerName: string
  onConfirmed?: () => void
}

export default function QrDisplay({
  opaqueId,
  code,
  payload,
  expiresAt,
  offerName,
  partnerName,
  onConfirmed,
}: QrDisplayProps) {
  const [qrUrl, setQrUrl] = useState<string>('')
  const [timeLeft, setTimeLeft] = useState<number>(120)
  const [copied, setCopied] = useState<boolean>(false)
  const [isConfirmed, setIsConfirmed] = useState<boolean>(false)
  const [confirmedData, setConfirmedData] = useState<any>(null)
  const totalSeconds = 120

  // 1. Generate QR code data URL
  useEffect(() => {
    QRCode.toDataURL(payload, {
      width: 280,
      margin: 2,
      color: {
        dark: '#030712',
        light: '#f9fafb',
      },
    })
      .then(setQrUrl)
      .catch(console.error)
  }, [payload])

  // 2. Countdown timer
  useEffect(() => {
    const expiryTime = new Date(expiresAt).getTime()

    const updateTimer = () => {
      const remaining = Math.max(0, Math.floor((expiryTime - Date.now()) / 1000))
      setTimeLeft(remaining)
    }

    updateTimer()
    const interval = setInterval(updateTimer, 1000)
    return () => clearInterval(interval)
  }, [expiresAt])

  // 3. Polling claim status every 2 seconds until confirmed or expired
  useEffect(() => {
    if (isConfirmed || timeLeft <= 0) return

    const poll = async () => {
      try {
        const res = await fetch(`/api/claims/${opaqueId}`)
        if (res.ok) {
          const data = await res.json()
          if (data.claim?.status === 'CONFIRMED') {
            setIsConfirmed(true)
            setConfirmedData(data)
            onConfirmed?.()
          }
        }
      } catch (e) {
        // Ignore transient poll errors
      }
    }

    const interval = setInterval(poll, 2000)
    return () => clearInterval(interval)
  }, [opaqueId, isConfirmed, timeLeft, onConfirmed])

  function handleCopy() {
    navigator.clipboard.writeText(code)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const isExpired = timeLeft <= 0

  if (isConfirmed) {
    return (
      <div className="bg-gradient-to-b from-emerald-50 to-white border border-emerald-200/90 rounded-3xl p-6 sm:p-8 text-center animate-fade-in-up font-body shadow-sm">
        <div className="w-16 h-16 bg-emerald-100 text-emerald-700 rounded-2xl flex items-center justify-center text-3xl mx-auto mb-4 border border-emerald-200 shadow-xs">
          ✅
        </div>
        <h2 className="font-display text-2xl font-bold text-slate-900">Stamp Confirmed!</h2>
        <p className="text-slate-600 text-xs sm:text-sm mt-1">
          {partnerName} confirmed your reusable bag.
        </p>

        {confirmedData?.claim?.receiptRef && (
          <p className="text-xs text-slate-400 mt-1">
            Receipt: #{confirmedData.claim.receiptRef}
          </p>
        )}

        <div className="mt-6 p-5 bg-emerald-50/60 border border-emerald-200/80 rounded-2xl">
          <p className="text-xs font-semibold text-emerald-800 uppercase tracking-wider">Card Progress</p>
          <p className="font-display text-3xl font-bold text-slate-900 mt-1">
            {confirmedData?.currentStamps ?? '1'} / {confirmedData?.offer?.stampsNeeded ?? '5'} Stamps
          </p>
        </div>

        <div className="mt-6 flex flex-col gap-2.5">
          <Link href="/wallet" className="w-full py-3 bg-emerald-700 hover:bg-emerald-600 text-white font-semibold rounded-xl text-sm transition shadow-sm">
            View in Wallet
          </Link>
          <Link href="/reuse" className="w-full py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-xl text-sm transition">
            Back to Reuse Offers
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white border border-slate-200/90 rounded-3xl p-6 text-center max-w-sm mx-auto shadow-md font-body">
      <div className="mb-4">
        <span className="inline-block px-2.5 py-0.5 bg-emerald-50 border border-emerald-200 text-[10px] uppercase tracking-wider text-emerald-800 font-bold rounded-full">
          Show to cashier
        </span>
        <h2 className="font-display text-xl font-bold text-slate-900 mt-1.5">{offerName}</h2>
        <p className="text-xs text-slate-500">{partnerName}</p>
      </div>

      {/* QR Code Container */}
      <div className="relative mx-auto w-64 h-64 bg-slate-50 rounded-2xl p-3 flex items-center justify-center border border-slate-200 shadow-inner">
        {isExpired ? (
          <div className="text-center p-4">
            <span className="text-3xl block mb-2">⏱️</span>
            <p className="text-slate-900 font-bold text-sm font-display">QR Code Expired</p>
            <p className="text-slate-500 text-xs mt-1">Please generate a new claim code.</p>
          </div>
        ) : qrUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={qrUrl} alt="Claim QR Code" className="w-full h-full object-contain rounded-lg" />
        ) : (
          <div className="animate-pulse text-slate-400 text-xs">Generating QR...</div>
        )}

        {!isExpired && (
          <div className="absolute -bottom-3 bg-slate-900 text-white text-[11px] px-3.5 py-1 rounded-full shadow-md flex items-center gap-1.5 font-semibold">
            <span className={`w-2 h-2 rounded-full ${timeLeft < 20 ? 'bg-rose-400 animate-ping' : 'bg-emerald-400'}`} />
            <span>{timeLeft}s remaining</span>
          </div>
        )}
      </div>

      {/* Fallback 6-Character Code */}
      <div className="mt-7 pt-4 border-t border-slate-100">
        <p className="text-xs text-slate-500">Cashier can also enter code:</p>
        <div className="flex items-center justify-center gap-2 mt-2">
          <div className="bg-slate-100 border border-slate-200 rounded-xl px-4 py-2 font-mono text-xl tracking-widest text-slate-900 font-bold">
            {code}
          </div>
          <button
            type="button"
            onClick={handleCopy}
            className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs rounded-xl font-semibold transition-colors cursor-pointer"
          >
            {copied ? '✓ Copied' : 'Copy'}
          </button>
        </div>
      </div>

      {isExpired ? (
        <button
          type="button"
          onClick={() => window.location.reload()}
          className="w-full mt-5 py-3 bg-emerald-700 hover:bg-emerald-600 text-white font-semibold rounded-xl text-sm transition shadow-sm cursor-pointer"
        >
          🔄 Refresh New Code
        </button>
      ) : (
        <p className="text-[11px] text-slate-400 mt-4 leading-relaxed">
          Hold screen steady for merchant scanner. Code refreshes every 2 minutes for security.
        </p>
      )}
    </div>
  )
}
