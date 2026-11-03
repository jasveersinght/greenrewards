'use client'

import React, { useState } from 'react'
import Link from 'next/link'
import QrScanner from '@/components/shared/QrScanner'
import { ArrowLeft, CheckCircle2, QrCode } from 'lucide-react'

export default function MerchantScanPage() {
  const [mode, setMode] = useState<'REUSE' | 'FOOD'>('REUSE')
  const [claimData, setClaimData] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [receiptRef, setReceiptRef] = useState('')
  const [confirming, setConfirming] = useState(false)
  const [confirmResult, setConfirmResult] = useState<any>(null)

  // Food pickup state
  const [foodCode, setFoodCode] = useState('')
  const [foodResult, setFoodResult] = useState<any>(null)

  // Lookup claim on scan or code submission
  async function handleScan(codeOrOpaqueId: string) {
    if (mode === 'FOOD') {
      handleConfirmFood(codeOrOpaqueId)
      return
    }

    setLoading(true)
    setError(null)
    setConfirmResult(null)

    try {
      const res = await fetch(`/api/claims/${encodeURIComponent(codeOrOpaqueId)}`)
      const data = await res.json()

      if (!res.ok) {
        setError(data.error ?? 'Claim not found or invalid.')
        setClaimData(null)
        return
      }

      setClaimData(data)
    } catch (err: any) {
      setError(err?.message ?? 'Failed to look up claim.')
    } finally {
      setLoading(false)
    }
  }

  // Confirm food pickup
  async function handleConfirmFood(codeToUse?: string) {
    const targetCode = (codeToUse || foodCode).trim().toUpperCase()
    if (!targetCode) {
      setError('Please enter a 4-character pickup code')
      return
    }

    setConfirming(true)
    setError(null)
    setFoodResult(null)

    try {
      const res = await fetch(`/api/food/reservations/${encodeURIComponent(targetCode)}/confirm`, {
        method: 'POST',
      })
      const data = await res.json()
      if (!res.ok) {
        throw new Error(data.error ?? 'Failed to confirm food pickup')
      }
      setFoodResult(data.reservation)
      setFoodCode('')
    } catch (err: any) {
      setError(err.message)
    } finally {
      setConfirming(false)
    }
  }

  // Confirm claim
  async function handleConfirm() {
    if (!claimData) return
    setConfirming(true)
    setError(null)

    try {
      const res = await fetch(`/api/claims/${claimData.claim.opaqueId}/confirm`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ receiptRef: receiptRef.trim() || undefined }),
      })
      const data = await res.json()

      if (!res.ok) {
        setError(data.error ?? 'Failed to confirm stamp')
        return
      }

      setConfirmResult(data)
      setClaimData(null)
      setReceiptRef('')
    } catch (err: any) {
      setError(err?.message ?? 'An error occurred during confirmation.')
    } finally {
      setConfirming(false)
    }
  }

  function handleReset() {
    setClaimData(null)
    setConfirmResult(null)
    setFoodResult(null)
    setError(null)
    setReceiptRef('')
    setFoodCode('')
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6 pb-16 font-body">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-bold text-slate-900 flex items-center gap-2">
            <span>📷</span>
            <span>Counter Verification</span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            Verify reusable bags or confirm surplus food pickups
          </p>
        </div>

        <div className="flex bg-slate-100 p-1 rounded-xl text-xs border border-slate-200">
          <button
            type="button"
            onClick={() => { setMode('REUSE'); handleReset(); }}
            className={`px-3 py-1.5 rounded-lg font-semibold transition cursor-pointer ${
              mode === 'REUSE' ? 'bg-white text-emerald-800 shadow-xs' : 'text-slate-500 hover:text-slate-900'
            }`}
          >
            ♻️ Reusable
          </button>
          <button
            type="button"
            onClick={() => { setMode('FOOD'); handleReset(); }}
            className={`px-3 py-1.5 rounded-lg font-semibold transition cursor-pointer ${
              mode === 'FOOD' ? 'bg-white text-emerald-800 shadow-xs' : 'text-slate-500 hover:text-slate-900'
            }`}
          >
            🍱 Food Pickup
          </button>
        </div>
      </div>

      {mode === 'FOOD' && (
        <div className="space-y-4">
          {foodResult ? (
            <div className="bg-white border border-slate-200/90 rounded-3xl p-6 sm:p-8 text-center shadow-xs">
              <div className="w-16 h-16 bg-emerald-50 text-emerald-700 rounded-2xl flex items-center justify-center text-3xl mx-auto mb-4 border border-emerald-200 shadow-xs">
                ✓
              </div>
              <h2 className="font-display text-2xl font-bold text-slate-900">Food Pickup Verified!</h2>
              <p className="text-xs sm:text-sm text-emerald-800 mt-1 font-medium">
                Meal handed to customer. ₹10 Food Saver reward credited to customer wallet.
              </p>
              <div className="my-5 p-4 bg-slate-50 rounded-2xl text-xs text-left border border-slate-200 space-y-1.5">
                <div className="flex justify-between">
                  <span className="text-slate-500">Pickup Code:</span>
                  <span className="font-mono font-bold text-slate-900">{foodResult.pickupCode}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Status:</span>
                  <span className="text-emerald-800 font-bold">{foodResult.status}</span>
                </div>
              </div>
              <button
                type="button"
                onClick={handleReset}
                className="w-full py-3.5 bg-emerald-700 hover:bg-emerald-600 text-white font-semibold rounded-xl transition text-sm shadow-sm cursor-pointer"
              >
                Verify Another Pickup →
              </button>
            </div>
          ) : (
            <div className="bg-white border border-slate-200/90 rounded-3xl p-6 sm:p-8 text-center shadow-xs">
              <div className="text-3xl mb-2">🍱</div>
              <h2 className="font-display text-xl font-bold text-slate-900">Enter Customer Pickup Code</h2>
              <p className="text-xs sm:text-sm text-slate-500 mt-1 mb-5">
                Ask customer for the 4-character pickup code displayed on their screen.
              </p>

              <div className="max-w-xs mx-auto space-y-4">
                <input
                  type="text"
                  maxLength={4}
                  value={foodCode}
                  onChange={(e) => setFoodCode(e.target.value.toUpperCase())}
                  placeholder="e.g. 7K4W"
                  className="w-full bg-slate-50 border-2 border-slate-200 focus:border-emerald-600 rounded-2xl py-3 text-center text-3xl font-mono font-bold tracking-widest text-slate-900 uppercase outline-none transition-colors"
                />

                <button
                  type="button"
                  disabled={confirming || foodCode.length < 4}
                  onClick={() => handleConfirmFood()}
                  className="w-full py-3.5 bg-emerald-700 hover:bg-emerald-600 text-white font-semibold rounded-xl transition text-sm shadow-sm disabled:opacity-50 cursor-pointer"
                >
                  {confirming ? 'Checking...' : '✓ Confirm Pickup & Release'}
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {mode === 'REUSE' && (
        <>
          {error && (
            <div className="p-4 bg-rose-50 border border-rose-200 text-rose-800 text-xs font-semibold rounded-2xl flex items-start gap-2 shadow-xs">
              <span className="text-base shrink-0">⚠️</span>
              <div className="flex-1">
                <p className="font-semibold">Verification Alert</p>
                <p className="mt-0.5 text-rose-700">{error}</p>
              </div>
              <button
                type="button"
                onClick={() => setError(null)}
                className="text-slate-400 hover:text-slate-700 cursor-pointer"
              >
                ✕
              </button>
            </div>
          )}

          {/* Confirmation Success View */}
          {confirmResult && (
            <div className="bg-white border border-slate-200/90 rounded-3xl p-6 sm:p-8 text-center shadow-xs">
              <div className="w-16 h-16 bg-emerald-50 text-emerald-700 rounded-2xl flex items-center justify-center text-3xl mx-auto mb-4 border border-emerald-200 shadow-xs">
                ✓
              </div>
              <h2 className="font-display text-2xl font-bold text-slate-900">Stamp Successfully Awarded!</h2>
              <p className="text-sm text-emerald-800 mt-2 font-medium">
                {confirmResult.message}
              </p>

              {confirmResult.voucherIssued && (
                <div className="my-5 p-4 bg-amber-50 border border-amber-200 rounded-2xl">
                  <span className="text-2xl block mb-1">🎉</span>
                  <p className="font-bold text-amber-900 text-sm">Customer Earned a Voucher!</p>
                  <p className="text-xs text-amber-700 mt-1">
                    Value: ₹{(confirmResult.voucherValuePaise / 100).toFixed(0)} credited to customer&apos;s wallet.
                  </p>
                </div>
              )}

              <button
                type="button"
                onClick={handleReset}
                className="w-full mt-6 py-3.5 bg-emerald-700 hover:bg-emerald-600 text-white font-semibold rounded-xl text-sm transition shadow-sm cursor-pointer"
              >
                Scan Next Customer →
              </button>
            </div>
          )}

          {/* Claim Detail Preview (Before Confirmation) */}
          {!confirmResult && claimData && (
            <div className="bg-white border border-slate-200/90 rounded-3xl p-6 space-y-4 shadow-xs">
              <div className="flex items-start justify-between">
                <div>
                  <span className="text-xs uppercase tracking-wider text-emerald-700 font-bold">
                    Customer Found
                  </span>
                  <h2 className="font-display text-xl font-bold text-slate-900 mt-0.5">
                    {claimData.user.displayName}
                  </h2>
                  <p className="text-xs text-slate-500">{claimData.user.locality}</p>
                </div>

                <span className={`px-3 py-1 text-xs rounded-full font-bold border ${
                  claimData.validation.valid
                    ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                    : 'bg-rose-50 text-rose-800 border-rose-200'
                }`}>
                  {claimData.validation.valid ? 'Valid Code' : claimData.validation.error}
                </span>
              </div>

              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-2 text-xs">
                <div className="flex justify-between">
                  <span className="text-slate-500">Offer:</span>
                  <span className="text-slate-900 font-semibold">{claimData.offer.name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Current Progress:</span>
                  <span className="text-emerald-800 font-bold">
                    {claimData.currentStamps} / {claimData.offer.stampsNeeded} stamps
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Code:</span>
                  <span className="text-slate-900 font-mono font-bold tracking-widest">{claimData.claim.code}</span>
                </div>
              </div>

              {claimData.validation.valid ? (
                <div className="space-y-3 pt-2">
                  <div>
                    <label htmlFor="receipt-ref-input" className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                      Bill / Receipt Reference (Optional)
                    </label>
                    <input
                      id="receipt-ref-input"
                      type="text"
                      value={receiptRef}
                      onChange={(e) => setReceiptRef(e.target.value)}
                      placeholder="e.g. BILL-9042"
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-slate-900 text-sm focus:outline-none focus:border-emerald-500"
                    />
                  </div>

                  <button
                    type="button"
                    id="confirm-stamp-btn"
                    disabled={confirming}
                    onClick={handleConfirm}
                    className="w-full py-3.5 bg-emerald-700 hover:bg-emerald-600 text-white font-semibold rounded-xl text-sm transition shadow-sm cursor-pointer disabled:opacity-50"
                  >
                    {confirming ? 'Confirming...' : '✓ Confirm & Award Stamp'}
                  </button>

                  <button
                    type="button"
                    onClick={handleReset}
                    className="w-full py-2 text-xs text-slate-500 hover:text-slate-800 cursor-pointer"
                  >
                    Cancel / Choose Another
                  </button>
                </div>
              ) : (
                <div className="text-center pt-2">
                  <button
                    type="button"
                    onClick={handleReset}
                    className="py-2.5 px-6 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold cursor-pointer"
                  >
                    ← Scan Another Code
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Scanner & Manual Input View (Initial State) */}
          {!confirmResult && !claimData && (
            <div className="space-y-4">
              {loading ? (
                <div className="p-8 text-center text-slate-400 bg-white border border-slate-200/90 rounded-3xl shadow-xs">
                  <div className="animate-spin text-3xl inline-block mb-3">🔍</div>
                  <p className="text-sm font-medium">Looking up claim code...</p>
                </div>
              ) : (
                <QrScanner onScan={handleScan} />
              )}
            </div>
          )}
        </>
      )}
    </div>
  )
}
