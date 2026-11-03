'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import QrScanner from '@/components/shared/QrScanner';
import { ArrowLeft, CheckCircle2, QrCode, Tag, RotateCcw, Utensils, AlertCircle } from 'lucide-react';

export default function MerchantScanPage() {
  const [mode, setMode] = useState<'REUSE' | 'COUPON' | 'FOOD'>('REUSE');
  const [claimData, setClaimData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [receiptRef, setReceiptRef] = useState('');
  const [confirming, setConfirming] = useState(false);
  const [confirmResult, setConfirmResult] = useState<any>(null);
  const [reuseCodeInput, setReuseCodeInput] = useState('');

  // Coupon state
  const [couponCodeInput, setCouponCodeInput] = useState('');
  const [couponDetails, setCouponDetails] = useState<any>(null);
  const [couponSuccess, setCouponSuccess] = useState<any>(null);

  // Food pickup state
  const [foodCode, setFoodCode] = useState('');
  const [foodResult, setFoodResult] = useState<any>(null);

  // Lookup claim or coupon on scan or code submission
  async function handleScan(scannedText: string) {
    let lookupCode = scannedText.trim();
    try {
      const parsed = JSON.parse(lookupCode);
      if (parsed.code) lookupCode = parsed.code;
      else if (parsed.opaqueId) lookupCode = parsed.opaqueId;
    } catch {
      // Plain string
    }

    if (mode === 'FOOD') {
      handleConfirmFood(lookupCode);
      return;
    }

    if (mode === 'COUPON') {
      handleLookupCoupon(lookupCode);
      return;
    }

    setLoading(true);
    setError(null);
    setConfirmResult(null);

    try {
      const res = await fetch(`/api/claims/${encodeURIComponent(lookupCode)}`);
      const data = await res.json();

      if (!res.ok) {
        setError(data.error ?? 'Claim not found or invalid.');
        setClaimData(null);
        return;
      }

      setClaimData(data);
    } catch (err: any) {
      setError(err?.message ?? 'Failed to look up claim.');
    } finally {
      setLoading(false);
    }
  }

  // Lookup Coupon
  async function handleLookupCoupon(codeToLookup?: string) {
    const code = (codeToLookup || couponCodeInput).trim().toUpperCase();
    if (!code) {
      setError('Please enter or scan a coupon code');
      return;
    }

    setLoading(true);
    setError(null);
    setCouponDetails(null);
    setCouponSuccess(null);

    try {
      const res = await fetch('/api/merchant/coupons/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Coupon code not found or invalid');
        return;
      }
      setCouponDetails(data);
    } catch (err: any) {
      setError(err?.message || 'Failed to verify coupon');
    } finally {
      setLoading(false);
    }
  }

  // Use / Mark Coupon as Redeemed
  async function handleUseCoupon() {
    if (!couponDetails) return;
    setConfirming(true);
    setError(null);

    try {
      const res = await fetch('/api/merchant/coupons/use', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: couponDetails.code }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Failed to mark coupon as used');
        return;
      }
      setCouponSuccess(data);
      setCouponDetails(null);
      setCouponCodeInput('');
    } catch (err: any) {
      setError(err?.message || 'Error occurred while redeeming coupon');
    } finally {
      setConfirming(false);
    }
  }

  // Confirm food pickup
  async function handleConfirmFood(codeToUse?: string) {
    const targetCode = (codeToUse || foodCode).trim().toUpperCase();
    if (!targetCode) {
      setError('Please enter a 4-character pickup code');
      return;
    }

    setConfirming(true);
    setError(null);
    setFoodResult(null);

    try {
      const res = await fetch(`/api/food/reservations/${encodeURIComponent(targetCode)}/confirm`, {
        method: 'POST',
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error ?? 'Failed to confirm food pickup');
      }
      setFoodResult(data.reservation);
      setFoodCode('');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setConfirming(false);
    }
  }

  // Confirm reuse claim
  async function handleConfirmReuse() {
    if (!claimData) return;
    setConfirming(true);
    setError(null);

    try {
      const res = await fetch(`/api/claims/${claimData.claim.opaqueId}/confirm`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ receiptRef: receiptRef.trim() || undefined }),
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error ?? 'Failed to confirm stamp');
        return;
      }

      setConfirmResult(data);
      setClaimData(null);
      setReceiptRef('');
    } catch (err: any) {
      setError(err?.message ?? 'An error occurred during confirmation.');
    } finally {
      setConfirming(false);
    }
  }

  function handleReset() {
    setClaimData(null);
    setConfirmResult(null);
    setCouponDetails(null);
    setCouponSuccess(null);
    setFoodResult(null);
    setError(null);
    setReceiptRef('');
    setFoodCode('');
    setCouponCodeInput('');
    setReuseCodeInput('');
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6 pb-16 font-body">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-bold text-slate-900 flex items-center gap-2">
            <span>📷</span>
            <span>Counter Terminal</span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            Verify reusable bags, redeem customer coupons, or confirm surplus meals
          </p>
        </div>

        {/* Mode Selector */}
        <div className="flex bg-slate-100 p-1 rounded-xl text-xs border border-slate-200">
          <button
            type="button"
            onClick={() => { setMode('REUSE'); handleReset(); }}
            className={`px-3 py-1.5 rounded-lg font-semibold transition cursor-pointer flex items-center gap-1 ${
              mode === 'REUSE' ? 'bg-white text-emerald-800 shadow-xs' : 'text-slate-500 hover:text-slate-900'
            }`}
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reuse Stamp</span>
          </button>
          <button
            type="button"
            onClick={() => { setMode('COUPON'); handleReset(); }}
            className={`px-3 py-1.5 rounded-lg font-semibold transition cursor-pointer flex items-center gap-1 ${
              mode === 'COUPON' ? 'bg-white text-emerald-800 shadow-xs' : 'text-slate-500 hover:text-slate-900'
            }`}
          >
            <Tag className="w-3.5 h-3.5" />
            <span>Redeem Coupon</span>
          </button>
          <button
            type="button"
            onClick={() => { setMode('FOOD'); handleReset(); }}
            className={`px-3 py-1.5 rounded-lg font-semibold transition cursor-pointer flex items-center gap-1 ${
              mode === 'FOOD' ? 'bg-white text-emerald-800 shadow-xs' : 'text-slate-500 hover:text-slate-900'
            }`}
          >
            <Utensils className="w-3.5 h-3.5" />
            <span>Food Pickup</span>
          </button>
        </div>
      </div>

      {error && (
        <div className="p-4 bg-rose-50 border border-rose-200 text-rose-800 text-xs font-semibold rounded-2xl flex items-start gap-2 shadow-xs">
          <AlertCircle className="w-4 h-4 shrink-0 text-rose-600 mt-0.5" />
          <div className="flex-1">
            <p className="font-semibold">Terminal Alert</p>
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

      {/* MODE 1: REDEEM COUPON */}
      {mode === 'COUPON' && (
        <div className="space-y-4">
          {couponSuccess ? (
            <div className="bg-white border border-slate-200/90 rounded-3xl p-6 sm:p-8 text-center shadow-xs">
              <div className="w-16 h-16 bg-emerald-50 text-emerald-700 rounded-2xl flex items-center justify-center text-3xl mx-auto mb-4 border border-emerald-200 shadow-xs">
                ✓
              </div>
              <h2 className="font-display text-2xl font-bold text-slate-900">Coupon Successfully Redeemed!</h2>
              <div className="text-emerald-700 font-extrabold text-lg mt-1">
                {couponSuccess.faceValueText}
              </div>
              <p className="text-xs sm:text-sm text-slate-600 mt-2 font-medium">
                Discount applied. Coupon has been marked as used and reserved Green Points redeemed.
              </p>
              <div className="my-5 p-4 bg-slate-50 rounded-2xl text-xs text-left border border-slate-200 space-y-1.5 font-mono">
                <div className="flex justify-between">
                  <span className="text-slate-500">Coupon Code:</span>
                  <span className="font-bold text-slate-900">{couponSuccess.code}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Points Redeemed:</span>
                  <span className="text-emerald-800 font-bold">{couponSuccess.pointsSpent} GP</span>
                </div>
              </div>
              <button
                type="button"
                onClick={handleReset}
                className="w-full py-3.5 bg-emerald-700 hover:bg-emerald-600 text-white font-semibold rounded-xl transition text-sm shadow-sm cursor-pointer"
              >
                Scan Next Coupon →
              </button>
            </div>
          ) : couponDetails ? (
            <div className="bg-white border border-slate-200/90 rounded-3xl p-6 sm:p-8 shadow-xs">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <span className="text-[11px] font-bold text-slate-600 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                    {couponDetails.funderName}
                  </span>
                  <h3 className="text-xl font-bold text-slate-900 mt-1">{couponDetails.title}</h3>
                  <div className="text-emerald-700 font-black text-lg mt-0.5">
                    {couponDetails.faceValueText}
                  </div>
                </div>
                <span
                  className={`text-xs font-bold px-2.5 py-1 rounded-full ${
                    couponDetails.canBeUsed
                      ? 'bg-emerald-100 text-emerald-800'
                      : 'bg-rose-100 text-rose-800'
                  }`}
                >
                  {couponDetails.canBeUsed ? 'VALID' : couponDetails.status}
                </span>
              </div>

              <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 text-xs space-y-2 mb-6">
                <div className="flex justify-between text-slate-600">
                  <span>Customer:</span>
                  <span className="font-bold text-slate-900">{couponDetails.customerName}</span>
                </div>
                {couponDetails.minSpendText && (
                  <div className="flex justify-between text-slate-600">
                    <span>Minimum Spend:</span>
                    <span className="font-bold text-slate-900">{couponDetails.minSpendText}</span>
                  </div>
                )}
                <div className="flex justify-between text-slate-600">
                  <span>Valid Until:</span>
                  <span className="font-bold text-slate-900">
                    {couponDetails.expiresAt
                      ? new Date(couponDetails.expiresAt).toLocaleDateString('en-IN')
                      : 'No Expiry'}
                  </span>
                </div>
                <div className="flex justify-between text-slate-600">
                  <span>Code:</span>
                  <span className="font-mono font-bold text-slate-900">{couponDetails.code}</span>
                </div>
              </div>

              {couponDetails.canBeUsed ? (
                <div className="flex gap-3">
                  <button
                    type="button"
                    disabled={confirming}
                    onClick={handleUseCoupon}
                    className="flex-1 py-3.5 bg-emerald-700 hover:bg-emerald-600 text-white font-semibold rounded-xl transition text-sm shadow-sm disabled:opacity-50 cursor-pointer"
                  >
                    {confirming ? 'Redeeming...' : '✓ Mark as Used'}
                  </button>
                  <button
                    type="button"
                    onClick={handleReset}
                    className="py-3.5 px-5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-xl text-sm transition"
                  >
                    Cancel
                  </button>
                </div>
              ) : (
                <div>
                  <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl mb-4 text-center font-bold">
                    This coupon cannot be redeemed ({couponDetails.status}).
                  </div>
                  <button
                    type="button"
                    onClick={handleReset}
                    className="w-full py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-xl text-xs transition"
                  >
                    Back to Scan
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              <QrScanner
                onScan={(code) => handleScan(code)}
              />

              <div className="bg-white border border-slate-200/90 rounded-2xl p-5 text-center shadow-xs">
                <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block mb-2">
                  Or Enter 8-Character Code Manually
                </span>
                <div className="flex gap-2 max-w-sm mx-auto">
                  <input
                    type="text"
                    value={couponCodeInput}
                    onChange={(e) => setCouponCodeInput(e.target.value.toUpperCase())}
                    placeholder="e.g. ECO-4892"
                    className="flex-1 bg-slate-50 border border-slate-200 focus:border-emerald-600 rounded-xl px-3 py-2 text-center font-mono font-bold text-sm uppercase outline-none"
                  />
                  <button
                    type="button"
                    disabled={loading || !couponCodeInput.trim()}
                    onClick={() => handleLookupCoupon()}
                    className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition disabled:opacity-50"
                  >
                    {loading ? 'Checking...' : 'Verify'}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* MODE 2: REUSE STAMPS */}
      {mode === 'REUSE' && (
        <div className="space-y-4">
          {confirmResult ? (
            <div className="bg-white border border-slate-200/90 rounded-3xl p-6 sm:p-8 text-center shadow-xs">
              <div className="w-16 h-16 bg-emerald-50 text-emerald-700 rounded-2xl flex items-center justify-center text-3xl mx-auto mb-4 border border-emerald-200 shadow-xs">
                ✓
              </div>
              <h2 className="font-display text-2xl font-bold text-slate-900">Stamp Successfully Awarded!</h2>
              <p className="text-sm text-emerald-800 mt-2 font-medium">
                {confirmResult.message}
              </p>
              <button
                type="button"
                onClick={handleReset}
                className="w-full mt-6 py-3.5 bg-emerald-700 hover:bg-emerald-600 text-white font-semibold rounded-xl transition text-sm shadow-sm cursor-pointer"
              >
                Scan Next Customer →
              </button>
            </div>
          ) : claimData ? (
            <div className="bg-white border border-slate-200/90 rounded-3xl p-6 sm:p-8 shadow-xs">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <span className="text-[11px] font-bold text-emerald-800 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200 uppercase tracking-wider">
                    Reusable Bag Stamp Claim
                  </span>
                  <h3 className="text-xl font-bold text-slate-900 mt-1">{claimData.offer?.name}</h3>
                  <p className="text-xs text-slate-500 mt-0.5">{claimData.offer?.partner?.name || 'Partner Store'}</p>
                </div>
                <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-800">
                  {claimData.claim?.status || 'PENDING'}
                </span>
              </div>

              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 text-xs space-y-2 mb-6">
                <div className="flex justify-between text-slate-600">
                  <span>Customer:</span>
                  <span className="font-bold text-slate-900">{claimData.user?.displayName || 'Citizen'}</span>
                </div>
                <div className="flex justify-between text-slate-600">
                  <span>Claim Code:</span>
                  <span className="font-mono font-bold text-slate-900">{claimData.claim?.code}</span>
                </div>
                <div className="flex justify-between text-slate-600">
                  <span>Current Stamp Progress:</span>
                  <span className="font-bold text-emerald-800">
                    {claimData.stampCard?.stamps ?? 0} / {claimData.offer?.stampsNeeded ?? 5} Stamps
                  </span>
                </div>
                <div className="flex justify-between text-slate-600">
                  <span>Reward per Stamp:</span>
                  <span className="font-bold text-slate-900">10 Green Points</span>
                </div>
              </div>

              <div className="mb-5">
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Receipt Reference / Bill Number (Optional)
                </label>
                <input
                  type="text"
                  value={receiptRef}
                  onChange={(e) => setReceiptRef(e.target.value)}
                  placeholder="e.g. BILL-9821 or cash memo"
                  className="w-full bg-slate-50 border border-slate-200 focus:border-emerald-600 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 outline-none"
                />
              </div>

              <div className="flex gap-3">
                <button
                  type="button"
                  disabled={confirming}
                  onClick={handleConfirmReuse}
                  className="flex-1 py-3.5 bg-emerald-700 hover:bg-emerald-600 text-white font-semibold rounded-xl transition text-sm shadow-sm disabled:opacity-50 cursor-pointer"
                >
                  {confirming ? 'Confirming...' : '✓ Confirm Stamp & Award Points'}
                </button>
                <button
                  type="button"
                  onClick={handleReset}
                  className="py-3.5 px-5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-xl text-xs transition cursor-pointer"
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <QrScanner
                onScan={(code) => handleScan(code)}
              />

              <div className="bg-white border border-slate-200/90 rounded-2xl p-5 text-center shadow-xs">
                <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block mb-2">
                  Or Enter 6-Character Claim Code Manually
                </span>
                <div className="flex gap-2 max-w-sm mx-auto">
                  <input
                    type="text"
                    value={reuseCodeInput}
                    onChange={(e) => setReuseCodeInput(e.target.value.toUpperCase())}
                    placeholder="e.g. 7X8K2P or paste QR code"
                    className="flex-1 bg-slate-50 border border-slate-200 focus:border-emerald-600 rounded-xl px-3 py-2 text-center font-mono font-bold text-sm uppercase outline-none"
                  />
                  <button
                    type="button"
                    disabled={loading || !reuseCodeInput.trim()}
                    onClick={() => handleScan(reuseCodeInput)}
                    className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition disabled:opacity-50 cursor-pointer"
                  >
                    {loading ? 'Checking...' : 'Verify Claim'}
                  </button>
                </div>
                <p className="text-[11px] text-slate-400 mt-2">
                  Enter the 6-character code shown below the customer&apos;s QR code.
                </p>
              </div>
            </div>
          )}
        </div>
      )}

      {/* MODE 3: FOOD PICKUP */}
      {mode === 'FOOD' && (
        <div className="space-y-4">
          {foodResult ? (
            <div className="bg-white border border-slate-200/90 rounded-3xl p-6 sm:p-8 text-center shadow-xs">
              <div className="w-16 h-16 bg-emerald-50 text-emerald-700 rounded-2xl flex items-center justify-center text-3xl mx-auto mb-4 border border-emerald-200 shadow-xs">
                ✓
              </div>
              <h2 className="font-display text-2xl font-bold text-slate-900">Food Pickup Verified!</h2>
              <p className="text-xs sm:text-sm text-emerald-800 mt-1 font-medium">
                Meal handed to customer. 15 Green Points pending settlement.
              </p>
              <button
                type="button"
                onClick={handleReset}
                className="w-full mt-6 py-3.5 bg-emerald-700 hover:bg-emerald-600 text-white font-semibold rounded-xl transition text-sm shadow-sm cursor-pointer"
              >
                Verify Another Pickup →
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              <QrScanner
                onScan={(code) => handleScan(code)}
              />

              <div className="bg-white border border-slate-200/90 rounded-3xl p-6 sm:p-8 text-center shadow-xs">
                <div className="text-3xl mb-2">🍱</div>
                <h2 className="font-display text-xl font-bold text-slate-900">Or Enter 4-Character Pickup Code</h2>
                <p className="text-xs sm:text-sm text-slate-500 mt-1 mb-5">
                  Ask customer for the 4-character pickup code displayed on their reservation.
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
            </div>
          )}
        </div>
      )}
    </div>
  );
}
