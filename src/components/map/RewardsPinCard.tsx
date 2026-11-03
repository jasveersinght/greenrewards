'use client'

import React from 'react'
import Link from 'next/link'

export interface PinData {
  id: string
  lat: number
  lng: number
  address: string
  partnerId?: string | null
  partnerName: string
  partnerType: string
  isSimulated: boolean
  section: string
  offerName?: string | null
  rewardText: string
  actionUrl: string
  distanceFormatted: string
}

interface RewardsPinCardProps {
  pin: PinData
  onClose?: () => void
}

export default function RewardsPinCard({ pin, onClose }: RewardsPinCardProps) {
  const SECTION_CONFIG: Record<string, { emoji: string; color: string; border: string }> = {
    REUSE: { emoji: '♻️', color: 'text-emerald-700 bg-emerald-50', border: 'border-emerald-200' },
    FOOD: { emoji: '🍱', color: 'text-amber-700 bg-amber-50', border: 'border-amber-200' },
    LEAK: { emoji: '💧', color: 'text-blue-700 bg-blue-50', border: 'border-blue-200' },
    COMMUTE: { emoji: '🚌', color: 'text-purple-700 bg-purple-50', border: 'border-purple-200' },
    COMMUNITY: { emoji: '🌿', color: 'text-teal-700 bg-teal-50', border: 'border-teal-200' },
  }

  const config = SECTION_CONFIG[pin.section] ?? SECTION_CONFIG.COMMUNITY

  return (
    <div className="bg-white border border-slate-200/90 rounded-2xl p-4 shadow-xl relative animate-fade-in-up">
      {onClose && (
        <button
          type="button"
          onClick={onClose}
          className="absolute top-3 right-3 text-slate-400 hover:text-slate-700 p-1 text-xs"
          aria-label="Close pin preview"
        >
          ✕
        </button>
      )}

      <div className="flex items-start gap-3">
        <div className={`w-11 h-11 rounded-xl flex items-center justify-center text-xl shrink-0 border ${config.border} ${config.color}`}>
          {config.emoji}
        </div>

        <div className="flex-1 pr-6">
          <div className="flex items-center gap-1.5 flex-wrap">
            <h3 className="font-bold text-slate-900 text-sm">{pin.partnerName}</h3>
            {pin.isSimulated && (
              <span className="px-1.5 py-0.2 bg-amber-50 text-amber-700 border border-amber-200 rounded text-[9px] uppercase font-semibold">
                Simulated
              </span>
            )}
          </div>
          <p className="text-xs text-slate-500 mt-0.5 line-clamp-1">{pin.address}</p>
        </div>
      </div>

      <div className="mt-3.5 pt-3 border-t border-slate-100 flex items-center justify-between">
        <div className="space-y-0.5">
          <div className="text-[11px] text-slate-500">Reward Offer</div>
          <div className="text-xs font-bold text-emerald-700 flex items-center gap-1">
            <span>🎁</span>
            <span>{pin.rewardText}</span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-[11px] text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full font-medium">
            📍 {pin.distanceFormatted}
          </span>
          <Link
            href={pin.actionUrl}
            className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white transition-colors"
          >
            Claim →
          </Link>
        </div>
      </div>
    </div>
  )
}
