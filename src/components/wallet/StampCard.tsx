'use client'

import React from 'react'

interface StampCardProps {
  offerName: string
  partnerName: string
  currentStamps: number
  stampsNeeded: number
  voucherValuePaise: number
  isSimulated?: boolean
  completedAt?: Date | string | null
}

export default function StampCard({
  offerName,
  partnerName,
  currentStamps,
  stampsNeeded,
  voucherValuePaise,
  isSimulated = false,
  completedAt,
}: StampCardProps) {
  const percent = Math.min(100, Math.round((currentStamps / stampsNeeded) * 100))
  const voucherRupees = (voucherValuePaise / 100).toFixed(0)

  return (
    <div className="bg-white border border-emerald-200/80 rounded-2xl p-5 shadow-xs relative overflow-hidden font-body">
      {/* Background glow accent */}
      <div
        className="absolute -top-12 -right-12 w-36 h-36 bg-emerald-500/10 rounded-full blur-2xl pointer-events-none"
        aria-hidden="true"
      />

      <div className="flex items-start justify-between mb-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xl">♻️</span>
            <h3 className="font-display font-bold text-slate-900 text-lg leading-snug">{offerName}</h3>
          </div>
          <p className="text-xs text-slate-500 mt-1 flex items-center gap-1.5">
            <span className="font-medium text-slate-700">{partnerName}</span>
            {isSimulated && (
              <span className="px-1.5 py-0.2 bg-amber-50 text-amber-700 border border-amber-200 rounded text-[10px] uppercase font-semibold">
                Simulated
              </span>
            )}
          </p>
        </div>

        <div className="text-right shrink-0">
          <span className="px-3 py-1 bg-emerald-50 border border-emerald-200 text-emerald-800 font-bold text-xs rounded-full inline-block">
            ₹{voucherRupees} Voucher
          </span>
        </div>
      </div>

      {/* Stamp Slots */}
      <div className="flex items-center justify-between gap-2 my-5">
        {Array.from({ length: stampsNeeded }).map((_, index) => {
          const isStamped = index < currentStamps
          return (
            <div
              key={index}
              className={`flex-1 aspect-square max-w-14 rounded-xl flex flex-col items-center justify-center transition-all duration-300 relative ${
                isStamped
                  ? 'bg-emerald-600 text-white shadow-sm scale-105 border border-emerald-500'
                  : 'bg-slate-50 border-2 border-dashed border-slate-200 text-slate-400'
              }`}
            >
              {isStamped ? (
                <>
                  <span className="text-lg">🌿</span>
                  <span className="text-[9px] font-bold tracking-tight">STAMP {index + 1}</span>
                </>
              ) : (
                <>
                  <span className="text-sm font-semibold">{index + 1}</span>
                  <span className="text-[8px] uppercase tracking-wider text-slate-400 font-medium">Slot</span>
                </>
              )}
            </div>
          )
        })}
      </div>

      {/* Progress Bar & Status */}
      <div className="space-y-1.5">
        <div className="flex justify-between text-xs text-slate-600">
          <span>{currentStamps} of {stampsNeeded} stamps collected</span>
          <span className="text-emerald-700 font-bold">{percent}%</span>
        </div>
        <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
          <div
            className="bg-emerald-600 h-2 rounded-full transition-all duration-500"
            style={{ width: `${percent}%` }}
          />
        </div>
      </div>

      {completedAt && (
        <p className="text-[11px] text-emerald-800 font-semibold mt-3 text-center bg-emerald-50 border border-emerald-200 rounded-lg py-1.5">
          🎉 Milestone achieved! Voucher credited to your wallet.
        </p>
      )}
    </div>
  )
}
