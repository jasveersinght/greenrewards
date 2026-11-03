'use client';

import React, { useState } from 'react';
import { Play, ShieldCheck, AlertCircle, CheckCircle2, RefreshCw, Gift } from 'lucide-react';

export default function AdminOperations() {
  const [settling, setSettling] = useState(false);
  const [settleResult, setSettleResult] = useState<any>(null);

  const [verifying, setVerifying] = useState(false);
  const [verifyResult, setVerifyResult] = useState<any>(null);

  const handleSettlePoints = async () => {
    setSettling(true);
    setSettleResult(null);
    try {
      const res = await fetch('/api/admin/jobs/settle-points', { method: 'POST' });
      const data = await res.json();
      setSettleResult(data);
    } catch (err: any) {
      setSettleResult({ error: err.message || 'Settlement failed' });
    } finally {
      setSettling(false);
    }
  };

  const handleVerifyLedger = async () => {
    setVerifying(true);
    setVerifyResult(null);
    try {
      const res = await fetch('/api/admin/ledger/verify');
      const data = await res.json();
      setVerifyResult(data);
    } catch (err: any) {
      setVerifyResult({ verified: false, error: err.message || 'Verification failed' });
    } finally {
      setVerifying(false);
    }
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {/* Settlement Job Card */}
      <div className="bg-white border border-slate-200/90 rounded-2xl p-6 shadow-xs flex flex-col justify-between">
        <div>
          <div className="flex items-center justify-between mb-2">
            <span className="p-2 rounded-xl bg-amber-50 text-amber-700">
              <Play className="w-4 h-4" />
            </span>
            <span className="text-[11px] font-bold text-amber-800 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full">
              Settlement Engine
            </span>
          </div>
          <h3 className="font-bold text-slate-900 text-sm">Points Settlement Job</h3>
          <p className="text-xs text-slate-500 mt-1 mb-4">
            Runs FIFO transition moving matured points from <code>USER_PENDING</code> to <code>USER_AVAILABLE</code>. (Also triggers lazily upon wallet access).
          </p>

          {settleResult && (
            <div className={`p-3 rounded-xl text-xs mb-4 ${
              settleResult.error
                ? 'bg-rose-50 border border-rose-200 text-rose-700'
                : 'bg-emerald-50 border border-emerald-200 text-emerald-800'
            }`}>
              {settleResult.error ? (
                <div className="flex items-center gap-1.5">
                  <AlertCircle className="w-3.5 h-3.5" />
                  <span>{settleResult.error}</span>
                </div>
              ) : (
                <div className="flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Settled {settleResult.settledCount ?? 0} lots successfully.</span>
                </div>
              )}
            </div>
          )}
        </div>

        <button
          onClick={handleSettlePoints}
          disabled={settling}
          className="w-full py-2.5 px-4 bg-slate-900 hover:bg-slate-800 disabled:opacity-50 text-white font-bold text-xs rounded-xl transition flex items-center justify-center gap-2 cursor-pointer shadow-xs"
        >
          {settling ? (
            <>
              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
              <span>Running Settlement...</span>
            </>
          ) : (
            <>
              <Play className="w-3.5 h-3.5" />
              <span>Run Settlement Now (Demo)</span>
            </>
          )}
        </button>
      </div>

      {/* Ledger Integrity Verification Card */}
      <div className="bg-white border border-slate-200/90 rounded-2xl p-6 shadow-xs flex flex-col justify-between">
        <div>
          <div className="flex items-center justify-between mb-2">
            <span className="p-2 rounded-xl bg-emerald-50 text-emerald-700">
              <ShieldCheck className="w-4 h-4" />
            </span>
            <span className="text-[11px] font-bold text-emerald-800 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">
              SHA-256 Chain
            </span>
          </div>
          <h3 className="font-bold text-slate-900 text-sm">Cryptographic Ledger Integrity</h3>
          <p className="text-xs text-slate-500 mt-1 mb-4">
            Audits every double-entry transaction hash back to the genesis block. Guarantees tamper-evidence.
          </p>

          {verifyResult && (
            <div className={`p-3 rounded-xl text-xs mb-4 ${
              verifyResult.verified
                ? 'bg-emerald-50 border border-emerald-200 text-emerald-800'
                : 'bg-rose-50 border border-rose-200 text-rose-700'
            }`}>
              {verifyResult.verified ? (
                <div className="flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                  <span className="font-medium">
                    Ledger verified intact across {verifyResult.totalEntries} entries!
                  </span>
                </div>
              ) : (
                <div className="flex items-center gap-1.5">
                  <AlertCircle className="w-3.5 h-3.5 text-rose-600" />
                  <span>Ledger chain broken: {verifyResult.error}</span>
                </div>
              )}
            </div>
          )}
        </div>

        <button
          onClick={handleVerifyLedger}
          disabled={verifying}
          className="w-full py-2.5 px-4 bg-emerald-700 hover:bg-emerald-600 disabled:opacity-50 text-white font-bold text-xs rounded-xl transition flex items-center justify-center gap-2 cursor-pointer shadow-xs"
        >
          {verifying ? (
            <>
              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
              <span>Verifying Hashes...</span>
            </>
          ) : (
            <>
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>Verify Ledger Integrity</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
}
