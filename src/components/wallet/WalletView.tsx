'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import QRCode from 'qrcode';
import {
  Wallet,
  Clock,
  AlertTriangle,
  Gift,
  ArrowDownLeft,
  ArrowUpRight,
  ShieldCheck,
  Copy,
  Check,
  QrCode,
  ExternalLink,
  Store,
  Tag,
  Sparkles,
} from 'lucide-react';

interface PendingLot {
  amountPoints: number;
  availableAt: string | Date;
  refType: string;
  refId: string;
}

interface CouponCodeData {
  id: string;
  code: string;
  status: 'AVAILABLE' | 'ASSIGNED' | 'USED' | 'EXPIRED' | 'CANCELLED';
  assignedAt: string | Date | null;
  expiresAt: string | Date | null;
  usedAt: string | Date | null;
  catalogItem: {
    id: string;
    title: string;
    description: string;
    pointsPrice: number;
    faceValueText: string;
    minSpendText: string | null;
    validMerchantIds: string | null;
    kind: 'PLATFORM_QR' | 'IMPORTED_CODE';
    funder: {
      name: string;
      isSimulated: boolean;
    };
  };
}

interface LedgerItem {
  id: string;
  type: string;
  account: string;
  entrySide?: string | null;
  amountPoints?: number | null;
  stamps?: number | null;
  note?: string | null;
  createdAt: string | Date;
  campaign?: { name: string } | null;
}

interface WalletViewProps {
  initialBalance: {
    availablePoints: number;
    pendingPoints: number;
    expiringSoonPoints: number;
    stamps: number;
    pendingLots: PendingLot[];
  };
  initialCoupons: CouponCodeData[];
  initialLedger: LedgerItem[];
}

export default function WalletView({
  initialBalance,
  initialCoupons,
  initialLedger,
}: WalletViewProps) {
  const [activeTab, setActiveTab] = useState<'overview' | 'coupons' | 'history'>('overview');
  const [balance, setBalance] = useState(initialBalance);
  const [coupons, setCoupons] = useState<CouponCodeData[]>(initialCoupons);
  const [ledger, setLedger] = useState<LedgerItem[]>(initialLedger);
  const [selectedQrCoupon, setSelectedQrCoupon] = useState<CouponCodeData | null>(null);
  const [qrDataUrl, setQrDataUrl] = useState<string>('');
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  // Generate QR image when modal opens
  useEffect(() => {
    if (selectedQrCoupon) {
      QRCode.toDataURL(selectedQrCoupon.code, { width: 260, margin: 2 })
        .then((url) => setQrDataUrl(url))
        .catch((err) => console.error('QR Gen Error:', err));
    } else {
      setQrDataUrl('');
    }
  }, [selectedQrCoupon]);

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedCode(text);
    setTimeout(() => setCopiedCode(null), 2000);
  };

  return (
    <div className="space-y-8 font-body">
      {/* Page Title & Cryptographic verification badge */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-emerald-700 bg-emerald-50 w-fit px-3 py-1 rounded-full border border-emerald-200 mb-2">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
            <span>Cryptographic SHA-256 Verified Ledger</span>
          </div>
          <h1 className="font-display text-3xl sm:text-4xl font-bold text-slate-900 tracking-tight">
            Green Points Wallet
          </h1>
          <p className="text-slate-600 text-sm mt-1">
            Redeem points for sponsor coupons, track settlement, and monitor double-entry history.
          </p>
        </div>

        <Link
          href="/rewards"
          className="inline-flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs px-4 py-2.5 rounded-xl shadow-xs transition-colors self-start sm:self-center"
        >
          <Gift className="w-4 h-4" />
          <span>Explore Rewards Store</span>
        </Link>
      </div>

      {/* Main KPI Cards: Available, Pending, Expiring Soon, Stamps */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Available Points */}
        <div className="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-xs relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-600 uppercase tracking-wider">
              Available Points
            </span>
            <span className="p-2 rounded-xl bg-emerald-50 text-emerald-700">
              <Wallet className="w-4 h-4" />
            </span>
          </div>
          <div className="mt-2">
            <span className="font-display text-3xl font-bold text-slate-900">
              {balance.availablePoints.toLocaleString()}
            </span>
            <span className="text-xs font-bold text-emerald-700 ml-1.5">GP</span>
            <p className="text-xs text-slate-600 mt-1">Ready to redeem for store coupons</p>
          </div>
        </div>

        {/* Pending Points */}
        <div className="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-xs relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-600 uppercase tracking-wider">
              Pending Points
            </span>
            <span className="p-2 rounded-xl bg-amber-50 text-amber-700">
              <Clock className="w-4 h-4" />
            </span>
          </div>
          <div className="mt-2">
            <span className="font-display text-3xl font-bold text-slate-900">
              {balance.pendingPoints.toLocaleString()}
            </span>
            <span className="text-xs font-bold text-amber-700 ml-1.5">GP</span>
            <p className="text-xs text-slate-600 mt-1">Settles after verification window</p>
          </div>
        </div>

        {/* Expiring Soon */}
        <div className="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-xs relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-600 uppercase tracking-wider">
              Expiring Soon
            </span>
            <span className="p-2 rounded-xl bg-rose-50 text-rose-700">
              <AlertTriangle className="w-4 h-4" />
            </span>
          </div>
          <div className="mt-2">
            <span className="font-display text-3xl font-bold text-slate-900">
              {balance.expiringSoonPoints.toLocaleString()}
            </span>
            <span className="text-xs font-bold text-rose-700 ml-1.5">GP</span>
            <p className="text-xs text-slate-600 mt-1">Expiring within the next 30 days</p>
          </div>
        </div>

        {/* Digital Stamps */}
        <div className="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-xs relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-600 uppercase tracking-wider">
              Digital Stamps
            </span>
            <span className="p-2 rounded-xl bg-purple-50 text-purple-700">
              <Sparkles className="w-4 h-4" />
            </span>
          </div>
          <div className="mt-2">
            <span className="font-display text-3xl font-bold text-slate-900">
              {balance.stamps}
            </span>
            <span className="text-xs font-bold text-purple-700 ml-1.5">Stamps</span>
            <p className="text-xs text-slate-600 mt-1">5 stamps = 40 GP card bonus</p>
          </div>
        </div>
      </div>

      {/* Tabs Switcher: Overview / My Coupons / History */}
      <div className="border-b border-slate-200">
        <div className="flex gap-4">
          {[
            { id: 'overview', label: 'Wallet Overview' },
            { id: 'coupons', label: `My Coupons (${coupons.length})` },
            { id: 'history', label: 'Points Ledger History' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`pb-3 text-xs font-bold border-b-2 transition-all ${
                activeTab === tab.id
                  ? 'border-emerald-600 text-emerald-800'
                  : 'border-transparent text-slate-500 hover:text-slate-800 hover:border-slate-300'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Tab 1: Overview (Pending Lots + Quick Actions) */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          {/* Pending Lots */}
          <div className="bg-white border border-slate-200/90 rounded-2xl p-6 shadow-xs">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-sm font-bold text-slate-900">Pending Points Schedule</h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Points become available for redemption automatically after the settlement window.
                </p>
              </div>
              <span className="text-xs font-bold text-slate-500 bg-slate-100 px-2.5 py-1 rounded-md">
                {balance.pendingLots.length} Pending {balance.pendingLots.length === 1 ? 'Lot' : 'Lots'}
              </span>
            </div>

            {balance.pendingLots.length === 0 ? (
              <div className="text-center py-8 text-xs text-slate-400">
                No points currently pending settlement.
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {balance.pendingLots.map((lot, idx) => (
                  <div key={idx} className="py-3 flex items-center justify-between text-xs">
                    <div className="flex items-center gap-3">
                      <span className="p-2 rounded-lg bg-amber-50 text-amber-700">
                        <Clock className="w-4 h-4" />
                      </span>
                      <div>
                        <div className="font-bold text-slate-900">
                          +{lot.amountPoints} GP ({lot.refType})
                        </div>
                        <div className="text-slate-500 text-[11px] mt-0.5">
                          Available on {new Date(lot.availableAt).toLocaleDateString('en-IN', {
                            month: 'short',
                            day: 'numeric',
                            year: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </div>
                      </div>
                    </div>
                    <span className="text-[11px] font-bold text-amber-800 bg-amber-50 border border-amber-200 px-2.5 py-1 rounded-full">
                      Pending
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Tab 2: My Coupons */}
      {activeTab === 'coupons' && (
        <div className="space-y-4">
          {coupons.length === 0 ? (
            <div className="bg-white border border-slate-200/90 rounded-2xl p-12 text-center shadow-xs">
              <Gift className="w-12 h-12 text-slate-300 mx-auto mb-3" />
              <h3 className="font-bold text-slate-900 text-sm">No coupons yet</h3>
              <p className="text-slate-500 text-xs mt-1 mb-4">
                Redeem your available Green Points for discount coupons at partner stores.
              </p>
              <Link
                href="/rewards"
                className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-xl text-xs font-bold hover:bg-emerald-700 transition-colors"
              >
                Browse Rewards Store
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {coupons.map((c) => {
                const isQR = c.catalogItem.kind === 'PLATFORM_QR';
                const isOnline = c.catalogItem.validMerchantIds === 'online code';
                const isUsed = c.status === 'USED';
                const isExpired = c.status === 'EXPIRED';

                return (
                  <div
                    key={c.id}
                    className={`bg-white border rounded-2xl p-5 shadow-xs flex flex-col justify-between transition-all ${
                      isUsed || isExpired ? 'opacity-60 border-slate-200' : 'border-slate-300 hover:border-emerald-300'
                    }`}
                  >
                    <div>
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <span className="text-[11px] font-bold text-slate-600 bg-slate-100 border border-slate-200 px-2 py-0.5 rounded">
                          {c.catalogItem.funder.name}
                        </span>
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                            isUsed
                              ? 'bg-slate-100 text-slate-600'
                              : isExpired
                              ? 'bg-rose-100 text-rose-700'
                              : 'bg-emerald-100 text-emerald-800'
                          }`}
                        >
                          {c.status}
                        </span>
                      </div>

                      <h4 className="font-bold text-slate-900 text-sm">{c.catalogItem.title}</h4>
                      <div className="text-emerald-700 font-extrabold text-xs mt-1">
                        {c.catalogItem.faceValueText}
                      </div>
                      {c.catalogItem.minSpendText && (
                        <div className="text-[11px] text-slate-500 mt-0.5">
                          {c.catalogItem.minSpendText}
                        </div>
                      )}

                      {/* Code display */}
                      <div className="mt-4 bg-slate-50 border border-slate-200 rounded-xl p-2.5 flex items-center justify-between font-mono text-xs">
                        <span className="font-bold text-slate-900 tracking-wider select-all">
                          {c.code}
                        </span>
                        <button
                          onClick={() => copyToClipboard(c.code)}
                          className="text-slate-500 hover:text-slate-900 p-1"
                          title="Copy Code"
                        >
                          {copiedCode === c.code ? (
                            <Check className="w-3.5 h-3.5 text-emerald-600" />
                          ) : (
                            <Copy className="w-3.5 h-3.5" />
                          )}
                        </button>
                      </div>
                    </div>

                    <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
                      <span className="text-[11px] text-slate-400">
                        {c.expiresAt
                          ? `Valid until ${new Date(c.expiresAt).toLocaleDateString('en-IN')}`
                          : 'No expiry'}
                      </span>

                      {!isUsed && !isExpired && (
                        isQR ? (
                          <button
                            onClick={() => setSelectedQrCoupon(c)}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-bold transition-colors"
                          >
                            <QrCode className="w-3.5 h-3.5" />
                            <span>Show QR</span>
                          </button>
                        ) : (
                          <button
                            onClick={() => copyToClipboard(c.code)}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold transition-colors"
                          >
                            <Copy className="w-3.5 h-3.5" />
                            <span>{copiedCode === c.code ? 'Copied!' : 'Copy Code'}</span>
                          </button>
                        )
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Tab 3: History (Double-Entry Ledger) */}
      {activeTab === 'history' && (
        <div className="bg-white border border-slate-200/90 rounded-2xl overflow-hidden shadow-xs">
          <div className="p-4 border-b border-slate-100 flex justify-between items-center">
            <h3 className="text-xs font-bold text-slate-600 uppercase tracking-wider">
              Points Ledger Audit Trail
            </h3>
            <span className="text-xs text-slate-400">Double-entry balanced</span>
          </div>

          {ledger.length === 0 ? (
            <div className="p-12 text-center text-xs text-slate-400">
              No points transactions recorded yet.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="ledger-table w-full text-left" aria-label="Transaction history">
                <thead>
                  <tr>
                    <th>Type</th>
                    <th>Account</th>
                    <th>Points</th>
                    <th>Reference / Note</th>
                    <th>Date &amp; Time</th>
                  </tr>
                </thead>
                <tbody>
                  {ledger.map((e) => {
                    const isCredit = e.entrySide === 'CREDIT' || (!e.entrySide && (e.amountPoints ?? 0) >= 0);
                    return (
                      <tr key={e.id} className="hover:bg-slate-50/70 transition-colors">
                        <td>
                          <div className="flex items-center gap-2">
                            <span
                              className={`p-1 rounded-md ${
                                isCredit ? 'bg-emerald-50 text-emerald-600' : 'bg-slate-100 text-slate-600'
                              }`}
                            >
                              {isCredit ? <ArrowDownLeft className="w-3.5 h-3.5" /> : <ArrowUpRight className="w-3.5 h-3.5" />}
                            </span>
                            <span className="font-semibold text-slate-900 text-xs">{e.type}</span>
                          </div>
                        </td>
                        <td>
                          <span className="font-mono text-[11px] text-slate-600 bg-slate-100 px-2 py-0.5 rounded">
                            {e.account}
                          </span>
                        </td>
                        <td>
                          <span className={`font-bold text-xs ${isCredit ? 'text-emerald-700' : 'text-slate-700'}`}>
                            {isCredit ? '+' : '-'}{Math.abs(e.amountPoints ?? 0)} GP
                          </span>
                        </td>
                        <td>
                          <div className="text-slate-600 text-xs">
                            {e.campaign?.name || e.note || 'Points Ledger Transfer'}
                          </div>
                        </td>
                        <td>
                          <span className="text-slate-500 text-xs whitespace-nowrap">
                            {new Date(e.createdAt).toLocaleString('en-IN', {
                              dateStyle: 'medium',
                              timeStyle: 'short',
                            })}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* QR Code Presentation Modal */}
      {selectedQrCoupon && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
          <div className="bg-white border border-slate-200 rounded-3xl max-w-sm w-full p-6 shadow-2xl text-center">
            <h3 className="font-bold text-slate-900 text-base mb-1">
              {selectedQrCoupon.catalogItem.title}
            </h3>
            <div className="text-emerald-700 font-extrabold text-sm mb-4">
              {selectedQrCoupon.catalogItem.faceValueText}
            </div>

            {/* QR Code Box */}
            <div className="p-4 bg-white border-2 border-dashed border-emerald-300 rounded-2xl inline-block mb-4 shadow-xs">
              {qrDataUrl ? (
                <img src={qrDataUrl} alt="Coupon QR Code" className="w-48 h-48 mx-auto" />
              ) : (
                <div className="w-48 h-48 bg-slate-100 animate-pulse rounded-lg" />
              )}
            </div>

            {/* Unhideable 8-character code */}
            <div className="bg-slate-100 border border-slate-200 rounded-xl p-3 mb-4">
              <div className="text-[10px] uppercase font-bold text-slate-600 mb-0.5">
                Redemption Code
              </div>
              <div className="font-mono text-xl font-black text-slate-900 tracking-wider select-all">
                {selectedQrCoupon.code}
              </div>
            </div>

            <p className="text-[11px] text-slate-500 mb-5">
              Show this QR code or provide the 8-character code to the merchant at checkout.
            </p>

            <button
              onClick={() => setSelectedQrCoupon(null)}
              className="w-full py-2.5 px-4 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition-colors"
            >
              Done
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
