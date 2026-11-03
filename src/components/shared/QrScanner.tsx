'use client'

import React, { useEffect, useRef, useState } from 'react'

interface QrScannerProps {
  onScan: (decodedText: string) => void
  disabled?: boolean
}

export default function QrScanner({ onScan, disabled = false }: QrScannerProps) {
  const [manualCode, setManualCode] = useState('')
  const [cameraActive, setCameraActive] = useState(false)
  const [cameraError, setCameraError] = useState<string | null>(null)
  const scannerRef = useRef<any>(null)
  const containerId = 'qr-reader-container'

  const startScanner = async () => {
    setCameraError(null)
    setCameraActive(true)

    try {
      // Dynamic import to avoid SSR issues with navigator
      const { Html5Qrcode } = await import('html5-qrcode')
      const scanner = new Html5Qrcode(containerId)
      scannerRef.current = scanner

      await scanner.start(
        { facingMode: 'environment' },
        {
          fps: 10,
          qrbox: { width: 250, height: 250 },
        },
        (decodedText) => {
          // If JSON payload was encoded
          try {
            const parsed = JSON.parse(decodedText)
            onScan(parsed.opaqueId ?? parsed.code ?? decodedText)
          } catch {
            onScan(decodedText)
          }
          stopScanner()
        },
        () => {
          // Frame error (no QR detected in frame) - ignore
        }
      )
    } catch (err: any) {
      console.warn('Camera scan failed to start:', err)
      setCameraError(err?.message || 'Could not access camera. Please enter the 6-character code below.')
      setCameraActive(false)
    }
  }

  const stopScanner = async () => {
    if (scannerRef.current) {
      try {
        await scannerRef.current.stop()
        scannerRef.current.clear()
      } catch (e) {
        console.error(e)
      }
      scannerRef.current = null
    }
    setCameraActive(false)
  }

  useEffect(() => {
    return () => {
      if (scannerRef.current) {
        scannerRef.current.stop().catch(() => {})
      }
    }
  }, [])

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!manualCode.trim()) return
    onScan(manualCode.trim().toUpperCase())
  }

  return (
    <div className="space-y-4 font-body">
      {/* Camera Video Section */}
      <div className="bg-white border border-slate-200/90 rounded-2xl p-6 text-center shadow-xs">
        <div
          id={containerId}
          className={`w-full max-w-sm mx-auto overflow-hidden rounded-xl border border-slate-200 ${cameraActive ? 'min-h-[260px]' : 'hidden'}`}
        />

        {!cameraActive ? (
          <div className="py-4">
            <div className="w-14 h-14 bg-emerald-50 text-emerald-700 rounded-2xl flex items-center justify-center text-2xl mx-auto mb-3 border border-emerald-200 shadow-xs">
              📷
            </div>
            <p className="font-display text-lg font-bold text-slate-900">Scan Customer QR Code</p>
            <p className="text-xs text-slate-500 mt-1 max-w-xs mx-auto">
              Scan the customer&apos;s 120-second dynamic QR code to issue their reusable bag stamp.
            </p>
            <button
              type="button"
              disabled={disabled}
              onClick={startScanner}
              className="mt-4 py-2.5 px-6 rounded-xl bg-emerald-700 hover:bg-emerald-600 text-white font-semibold text-xs transition shadow-sm cursor-pointer disabled:opacity-50"
            >
              Open Camera Scanner
            </button>
          </div>
        ) : (
          <div className="mt-3">
            <button
              type="button"
              onClick={stopScanner}
              className="px-4 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-full transition cursor-pointer"
            >
              Cancel Camera Scan
            </button>
          </div>
        )}

        {cameraError && (
          <div className="mt-3 text-xs text-amber-800 bg-amber-50 border border-amber-200 rounded-xl p-3 text-left">
            ⚠️ {cameraError}
          </div>
        )}
      </div>

      {/* Manual Code Input Fallback */}
      <div className="bg-white border border-slate-200/90 rounded-2xl p-6 shadow-xs">
        <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
          Or Enter 6-Character Code Manually
        </p>
        <form onSubmit={handleManualSubmit} className="flex gap-2">
          <input
            type="text"
            value={manualCode}
            onChange={(e) => setManualCode(e.target.value.toUpperCase())}
            placeholder="e.g. 7X9K2P"
            maxLength={10}
            className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-slate-900 font-mono uppercase tracking-widest text-center text-lg focus:outline-none focus:border-emerald-500 focus:bg-white transition-colors"
            disabled={disabled}
          />
          <button
            type="submit"
            disabled={disabled || !manualCode.trim()}
            className="px-5 py-2.5 rounded-xl bg-emerald-700 hover:bg-emerald-600 text-white font-semibold text-sm transition shadow-sm cursor-pointer disabled:opacity-50"
          >
            Find
          </button>
        </form>
      </div>
    </div>
  )
}
