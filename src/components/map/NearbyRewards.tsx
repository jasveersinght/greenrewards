'use client'

import React, { useState, useEffect } from 'react'
import dynamic from 'next/dynamic'
import RewardsPinCard, { PinData } from './RewardsPinCard'

// Dynamically import map with SSR disabled for Leaflet safety
const RewardsMap = dynamic(() => import('./RewardsMap'), {
  ssr: false,
  loading: () => (
    <div className="w-full h-80 rounded-2xl bg-slate-100 border border-slate-200 flex flex-col items-center justify-center text-slate-500">
      <div className="animate-spin text-2xl mb-2">🗺️</div>
      <p className="text-xs font-medium">Loading map view...</p>
    </div>
  ),
})

const DEFAULT_CENTER = { lat: 12.8231, lng: 80.0444 } // Chennai South / Suburbs

const CATEGORIES = [
  { id: 'ALL', label: 'All', emoji: '🌟' },
  { id: 'REUSE', label: 'Reuse', emoji: '♻️' },
  { id: 'FOOD', label: 'Food', emoji: '🍱' },
  { id: 'LEAK', label: 'Leaks', emoji: '💧' },
  { id: 'COMMUTE', label: 'Commute', emoji: '🚌' },
]

export default function NearbyRewards() {
  const [isOpen, setIsOpen] = useState(false)
  const [viewMode, setViewMode] = useState<'map' | 'list'>('map')
  const [category, setCategory] = useState('ALL')
  const [center, setCenter] = useState(DEFAULT_CENTER)
  const [pins, setPins] = useState<PinData[]>([])
  const [selectedPin, setSelectedPin] = useState<PinData | null>(null)
  const [loading, setLoading] = useState(false)

  // Fetch pins when center or category changes
  useEffect(() => {
    async function fetchNearby() {
      setLoading(true)
      try {
        const url = `/api/nearby?lat=${center.lat}&lng=${center.lng}&radiusKm=15${
          category !== 'ALL' ? `&section=${category}` : ''
        }`
        const res = await fetch(url)
        if (res.ok) {
          const data = await res.json()
          setPins(data.pins ?? [])
          if (data.pins?.length > 0 && !selectedPin) {
            setSelectedPin(data.pins[0])
          }
        }
      } catch (err) {
        console.error('Failed to fetch nearby rewards:', err)
      } finally {
        setLoading(false)
      }
    }

    if (isOpen) {
      fetchNearby()
    }
  }, [isOpen, center, category])

  // Geolocation trigger
  function handleUseMyLocation() {
    if (typeof window !== 'undefined' && 'geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        pos => {
          setCenter({
            lat: pos.coords.latitude,
            lng: pos.coords.longitude,
          })
        },
        _err => {
          // If denied, fallback to default center
          setCenter(DEFAULT_CENTER)
        }
      )
    }
  }

  return (
    <>
      {/* Floating Action Button (Universal: bottom-20 on mobile, bottom-6 right-6 on desktop) */}
      <div className="fixed bottom-20 md:bottom-8 right-4 md:right-8 z-30 pointer-events-auto">
        <button
          type="button"
          onClick={() => setIsOpen(true)}
          id="nearby-rewards-fab"
          className="bg-emerald-700 hover:bg-emerald-600 text-white font-bold text-xs px-4 py-2.5 rounded-full shadow-lg border border-emerald-500/30 flex items-center gap-2 transform active:scale-95 transition-all cursor-pointer font-body"
        >
          <span className="text-sm">🗺️</span>
          <span>Nearby Rewards</span>
          {pins.length > 0 && (
            <span className="bg-white/25 px-1.5 py-0.2 rounded-full text-[10px]">
              {pins.length}
            </span>
          )}
        </button>
      </div>

      {/* Slide-up Drawer / Modal */}
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-slate-900/40 backdrop-blur-xs animate-fade-in p-0 sm:p-4">
          <div
            className="bg-white border border-slate-200 rounded-t-3xl sm:rounded-3xl w-full max-w-2xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden animate-slide-up"
            style={{ minHeight: '520px' }}
          >
            {/* Drawer Header */}
            <div className="p-4 border-b border-slate-200 flex items-center justify-between bg-slate-50/70">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xl">🗺️</span>
                  <h2 className="font-display font-bold text-slate-900 text-lg">Nearby Rewards</h2>
                </div>
                <p className="text-xs text-slate-500 mt-0.5">
                  Explore verified sustainable partners across Chennai
                </p>
              </div>

              <div className="flex items-center gap-2">
                {/* View Mode Toggle */}
                <div className="bg-slate-200/80 rounded-lg p-0.5 flex text-xs">
                  <button
                    type="button"
                    onClick={() => setViewMode('map')}
                    className={`px-3 py-1 rounded-md font-semibold transition-colors cursor-pointer ${
                      viewMode === 'map'
                        ? 'bg-white text-emerald-800 shadow-2xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    Map
                  </button>
                  <button
                    type="button"
                    onClick={() => setViewMode('list')}
                    className={`px-3 py-1 rounded-md font-semibold transition-colors cursor-pointer ${
                      viewMode === 'list'
                        ? 'bg-white text-emerald-800 shadow-2xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    List ({pins.length})
                  </button>
                </div>

                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600 hover:text-slate-900 flex items-center justify-center text-sm ml-1 cursor-pointer transition-colors"
                  aria-label="Close nearby drawer"
                >
                  ✕
                </button>
              </div>
            </div>

            {/* Category Filter Tabs */}
            <div className="px-4 py-2.5 bg-white border-b border-slate-200 flex items-center gap-2 overflow-x-auto no-scrollbar">
              {CATEGORIES.map(cat => {
                const active = category === cat.id
                return (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => setCategory(cat.id)}
                    className={`px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap flex items-center gap-1.5 transition-colors cursor-pointer ${
                      active
                        ? 'bg-emerald-50 text-emerald-800 border border-emerald-300 shadow-2xs'
                        : 'bg-slate-100 text-slate-600 border border-slate-200/80 hover:bg-slate-200/70'
                    }`}
                  >
                    <span>{cat.emoji}</span>
                    <span>{cat.label}</span>
                  </button>
                )
              })}

              <button
                type="button"
                onClick={handleUseMyLocation}
                className="ml-auto text-[11px] font-semibold text-emerald-700 hover:text-emerald-800 whitespace-nowrap px-2.5 py-1 rounded-md hover:bg-emerald-50 flex items-center gap-1 cursor-pointer transition-colors"
                title="Locate me"
              >
                <span>📍</span>
                <span>My Location</span>
              </button>
            </div>

            {/* Content Area (Map or List) */}
            <div className="flex-1 relative overflow-y-auto p-4 bg-slate-50/50">
              {loading && (
                <div className="absolute top-2 right-4 z-20 bg-white/95 border border-slate-200 px-3 py-1 rounded-full text-[11px] text-emerald-700 font-semibold flex items-center gap-1.5 shadow-md">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
                  <span>Updating...</span>
                </div>
              )}

              {viewMode === 'map' ? (
                <div className="h-full min-h-[380px] flex flex-col relative">
                  <div className="flex-1 rounded-2xl overflow-hidden border border-slate-200 shadow-inner">
                    <RewardsMap
                      pins={pins}
                      center={center}
                      selectedPin={selectedPin}
                      onSelectPin={setSelectedPin}
                    />
                  </div>

                  {/* Selected Pin Bottom Preview Card */}
                  {selectedPin && (
                    <div className="mt-3">
                      <RewardsPinCard
                        pin={selectedPin}
                        onClose={() => setSelectedPin(null)}
                      />
                    </div>
                  )}
                </div>
              ) : (
                <div className="space-y-3 pb-6">
                  {pins.length === 0 ? (
                    <div className="p-8 text-center text-slate-500 text-xs font-medium">
                      No reward locations found in this radius.
                    </div>
                  ) : (
                    pins.map(pin => (
                      <RewardsPinCard key={pin.id} pin={pin} />
                    ))
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  )
}
