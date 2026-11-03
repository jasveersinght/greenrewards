'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Gift, Sparkles, Store, Globe, CheckCircle2, AlertCircle, ArrowRight, Clock, ShieldCheck } from 'lucide-react';

interface CouponItem {
  id: string;
  title: string;
  description: string;
  funderName: string;
  funderType: string;
  isSimulated: boolean;
  pointsPrice: number;
  faceValueText: string;
  minSpendText: string | null;
  validMerchantIds: string | null;
  stockRemaining: number;
  validUntil: string;
  kind: 'PLATFORM_QR' | 'IMPORTED_CODE';
}

export default function RewardsCatalogPage() {
  const [catalog, setCatalog] = useState<CouponItem[]>([]);
  const [userPoints, setUserPoints] = useState<number>(0);
  const [filter, setFilter] = useState<'all' | 'nearMe' | 'online' | 'affordable'>('all');
  const [loading, setLoading] = useState<boolean>(true);
  const [selectedItem, setSelectedItem] = useState<CouponItem | null>(null);
  const [redeeming, setRedeeming] = useState<boolean>(false);
  const [redeemSuccess, setRedeemSuccess] = useState<any | null>(null);
  const [redeemError, setRedeemError] = useState<string | null>(null);

  const fetchCatalog = async (currentFilter: string) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/rewards?filter=${currentFilter}`);
      const data = await res.json();
      if (res.ok) {
        setCatalog(data.catalog || []);
        setUserPoints(data.userAvailablePoints || 0);
      }
    } catch (err) {
      console.error('Failed to load rewards:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCatalog(filter);
  }, [filter]);

  const handleRedeem = async () => {
    if (!selectedItem) return;
    setRedeeming(true);
    setRedeemError(null);

    const idempotencyKey = crypto.randomUUID();

    try {
      const res = await fetch('/api/rewards/redeem', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Idempotency-Key': idempotencyKey,
        },
        body: JSON.stringify({ catalogItemId: selectedItem.id }),
      });

      const data = await res.json();
      if (!res.ok) {
        setRedeemError(data.error || 'Failed to redeem coupon');
      } else {
        setRedeemSuccess(data);
        setUserPoints((prev) => Math.max(0, prev - selectedItem.pointsPrice));
        // refresh catalog stock
        fetchCatalog(filter);
      }
    } catch (err: any) {
      setRedeemError(err.message || 'Network error during redemption');
    } finally {
      setRedeeming(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50/60 pb-20 pt-6">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8 bg-white border border-slate-200/80 rounded-2xl p-6 shadow-xs">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="p-1.5 rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-200">
                <Gift className="w-5 h-5" />
              </span>
              <h1 className="text-2xl font-bold font-display text-slate-900 tracking-tight">
                Rewards Store
              </h1>
            </div>
            <p className="text-sm text-slate-600">
              Redeem your verified Green Points for sponsor-funded merchant coupons & promo codes.
            </p>
          </div>

          <div className="flex items-center gap-3 bg-emerald-50 border border-emerald-200/80 rounded-xl px-4 py-3 shrink-0">
            <div>
              <div className="text-[11px] font-semibold text-emerald-800 uppercase tracking-wider">
                Available Green Points
              </div>
              <div className="text-2xl font-black text-emerald-900">
                {userPoints.toLocaleString()} <span className="text-sm font-bold text-emerald-700">GP</span>
              </div>
            </div>
            <Link
              href="/wallet"
              className="text-xs font-bold text-emerald-700 hover:text-emerald-900 bg-white border border-emerald-200 rounded-lg px-2.5 py-1.5 shadow-2xs transition-colors"
            >
              My Coupons
            </Link>
          </div>
        </div>

        {/* Filter Tabs */}
        <div className="flex items-center gap-2 mb-6 overflow-x-auto pb-1">
          {[
            { id: 'all', label: 'All Rewards' },
            { id: 'nearMe', label: 'Local Merchants' },
            { id: 'online', label: 'Online Codes' },
            { id: 'affordable', label: 'Affordable Now' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setFilter(tab.id as any)}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all shrink-0 ${
                filter === tab.id
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'bg-white border border-slate-200/80 text-slate-600 hover:text-slate-900 hover:bg-slate-50'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Catalog Grid */}
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3, 4, 5, 6].map((n) => (
              <div key={n} className="h-64 rounded-2xl bg-slate-200/60 animate-pulse border border-slate-200/80" />
            ))}
          </div>
        ) : catalog.length === 0 ? (
          <div className="bg-white border border-slate-200/80 rounded-2xl p-12 text-center max-w-md mx-auto shadow-xs">
            <Gift className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <h3 className="text-base font-bold text-slate-900">No Rewards Found</h3>
            <p className="text-xs text-slate-500 mt-1 mb-4">
              There are currently no active rewards matching your selected filter. Check back soon!
            </p>
            <button
              onClick={() => setFilter('all')}
              className="px-4 py-2 bg-emerald-600 text-white rounded-xl text-xs font-bold hover:bg-emerald-700 transition-colors"
            >
              View All Rewards
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {catalog.map((item) => {
              const canAfford = userPoints >= item.pointsPrice;
              const isOnline = item.validMerchantIds === 'online code';

              return (
                <div
                  key={item.id}
                  className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-xs hover:shadow-md transition-all flex flex-col justify-between group"
                >
                  <div>
                    {/* Top row: Funder & Kind badges */}
                    <div className="flex items-start justify-between gap-2 mb-3">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-slate-700 bg-slate-100 border border-slate-200 px-2 py-0.5 rounded-md">
                          {isOnline ? <Globe className="w-3 h-3 text-slate-500" /> : <Store className="w-3 h-3 text-slate-500" />}
                          <span>{item.funderName}</span>
                        </span>
                        {item.isSimulated && (
                          <span className="text-[10px] font-bold text-amber-800 bg-amber-50 border border-amber-200 px-1.5 py-0.2 rounded">
                            Simulated partner
                          </span>
                        )}
                      </div>
                      <span className="text-[11px] font-bold text-slate-500 bg-slate-50 px-2 py-0.5 rounded-md border border-slate-200/60 shrink-0">
                        {item.stockRemaining} left
                      </span>
                    </div>

                    {/* Title & Face Value */}
                    <h3 className="text-base font-bold text-slate-900 group-hover:text-emerald-700 transition-colors line-clamp-1">
                      {item.title}
                    </h3>
                    <div className="mt-1 text-sm font-black text-emerald-700">
                      {item.faceValueText}
                    </div>
                    {item.minSpendText && (
                      <div className="text-[11px] text-slate-500 mt-0.5">
                        {item.minSpendText}
                      </div>
                    )}

                    <p className="text-xs text-slate-600 mt-2 line-clamp-2">
                      {item.description}
                    </p>
                  </div>

                  {/* Bottom section: Price & CTA */}
                  <div className="mt-5 pt-4 border-t border-slate-100 flex items-center justify-between gap-3">
                    <div>
                      <div className="text-[10px] uppercase font-bold text-slate-600">Points Cost</div>
                      <div className="text-lg font-black text-slate-900">
                        {item.pointsPrice} <span className="text-xs font-bold text-emerald-700">GP</span>
                      </div>
                    </div>

                    <button
                      onClick={() => {
                        setSelectedItem(item);
                        setRedeemError(null);
                        setRedeemSuccess(null);
                      }}
                      className={`px-4 py-2 rounded-xl text-xs font-bold transition-all shadow-2xs flex items-center gap-1.5 ${
                        canAfford
                          ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                          : 'bg-slate-100 text-slate-400 hover:bg-slate-200 hover:text-slate-600'
                      }`}
                    >
                      <span>Redeem</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Confirmation Modal */}
        {selectedItem && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs">
            <div className="bg-white border border-slate-200 rounded-3xl max-w-md w-full p-6 shadow-xl animate-in fade-in zoom-in-95 duration-150">
              {redeemSuccess ? (
                <div>
                  <div className="w-12 h-12 bg-emerald-100 text-emerald-700 rounded-2xl flex items-center justify-center mx-auto mb-4">
                    <CheckCircle2 className="w-7 h-7" />
                  </div>
                  <h3 className="text-lg font-bold text-center text-slate-900 mb-1">
                    Redemption Successful!
                  </h3>
                  <p className="text-xs text-center text-slate-600 mb-4">
                    Your coupon code has been reserved. You can view its QR code and details in your wallet anytime.
                  </p>

                  <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 text-center mb-6">
                    <div className="text-[11px] font-semibold text-slate-500 uppercase">Coupon Code</div>
                    <div className="text-xl font-mono font-black text-slate-900 tracking-wider mt-0.5">
                      {redeemSuccess.couponCode}
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <Link
                      href="/wallet"
                      className="flex-1 py-2.5 px-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold text-center transition-colors shadow-xs"
                    >
                      View in Wallet
                    </Link>
                    <button
                      onClick={() => setSelectedItem(null)}
                      className="flex-1 py-2.5 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-colors"
                    >
                      Close
                    </button>
                  </div>
                </div>
              ) : (
                <div>
                  <div className="flex items-start justify-between gap-3 mb-4">
                    <div>
                      <span className="text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                        {selectedItem.faceValueText}
                      </span>
                      <h3 className="text-lg font-bold text-slate-900 mt-1">
                        Confirm Redemption
                      </h3>
                    </div>
                    <button
                      onClick={() => setSelectedItem(null)}
                      className="text-slate-400 hover:text-slate-600 text-sm p-1"
                    >
                      ✕
                    </button>
                  </div>

                  <p className="text-xs text-slate-600 mb-4">
                    You are redeeming <strong>{selectedItem.title}</strong> by {selectedItem.funderName}.
                  </p>

                  {/* Pricing Breakdown */}
                  <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-3.5 space-y-2 mb-4 text-xs">
                    <div className="flex justify-between text-slate-600">
                      <span>Available Balance:</span>
                      <span className="font-bold text-slate-900">{userPoints} GP</span>
                    </div>
                    <div className="flex justify-between text-slate-600">
                      <span>Coupon Price:</span>
                      <span className="font-bold text-rose-600">-{selectedItem.pointsPrice} GP</span>
                    </div>
                    <div className="border-t border-slate-200 pt-2 flex justify-between font-bold text-slate-900">
                      <span>Balance After:</span>
                      <span className="text-emerald-700">{userPoints - selectedItem.pointsPrice} GP</span>
                    </div>
                  </div>

                  {redeemError && (
                    <div className="mb-4 p-3 bg-rose-50 border border-rose-200 rounded-xl flex items-center gap-2 text-rose-700 text-xs">
                      <AlertCircle className="w-4 h-4 shrink-0" />
                      <span>{redeemError}</span>
                    </div>
                  )}

                  {userPoints < selectedItem.pointsPrice ? (
                    <div className="text-center text-xs text-rose-600 bg-rose-50 p-2.5 rounded-xl border border-rose-200 font-semibold mb-4">
                      You need {selectedItem.pointsPrice - userPoints} more Green Points to redeem this reward.
                    </div>
                  ) : null}

                  <div className="flex gap-2">
                    <button
                      disabled={redeeming || userPoints < selectedItem.pointsPrice}
                      onClick={handleRedeem}
                      className="flex-1 py-2.5 px-4 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-xl text-xs font-bold text-center transition-all shadow-xs"
                    >
                      {redeeming ? 'Redeeming...' : `Redeem for ${selectedItem.pointsPrice} GP`}
                    </button>
                    <button
                      disabled={redeeming}
                      onClick={() => setSelectedItem(null)}
                      className="py-2.5 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-colors"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
