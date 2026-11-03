'use client'

import React, { useEffect, useRef } from 'react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import type { PinData } from './RewardsPinCard'

interface RewardsMapProps {
  pins: PinData[]
  center: { lat: number; lng: number }
  selectedPin: PinData | null
  onSelectPin: (pin: PinData) => void
}

const SECTION_EMOJIS: Record<string, string> = {
  REUSE: '♻️',
  FOOD: '🍱',
  LEAK: '💧',
  COMMUTE: '🚌',
  COMMUNITY: '🌿',
}

export default function RewardsMap({
  pins,
  center,
  selectedPin,
  onSelectPin,
}: RewardsMapProps) {
  const mapContainerRef = useRef<HTMLDivElement | null>(null)
  const mapInstanceRef = useRef<L.Map | null>(null)
  const markersRef = useRef<L.Marker[]>([])

  useEffect(() => {
    if (!mapContainerRef.current) return

    // If map already initialized, just update view
    if (mapInstanceRef.current) {
      mapInstanceRef.current.setView([center.lat, center.lng], 14)
      return
    }

    // Initialize Leaflet map
    const map = L.map(mapContainerRef.current, {
      center: [center.lat, center.lng],
      zoom: 14,
      zoomControl: false,
    })

    // OpenStreetMap dark-friendly tiles (CartoDB Dark Matter or OSM standard)
    L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
      attribution: '&copy; OpenStreetMap contributors &copy; CARTO',
      maxZoom: 19,
    }).addTo(map)

    L.control.zoom({ position: 'bottomright' }).addTo(map)

    // User location marker
    const userLocationIcon = L.divIcon({
      className: 'user-location-marker',
      html: `
        <div style="
          width: 18px;
          height: 18px;
          background: #3b82f6;
          border: 3px solid white;
          border-radius: 50%;
          box-shadow: 0 0 12px rgba(59, 130, 246, 0.8);
        "></div>
      `,
      iconSize: [18, 18],
      iconAnchor: [9, 9],
    })

    L.marker([center.lat, center.lng], { icon: userLocationIcon })
      .addTo(map)
      .bindPopup('<b>You are here</b><br/>Chennai Metropolitan Area')

    mapInstanceRef.current = map

    return () => {
      map.remove()
      mapInstanceRef.current = null
    }
  }, [center.lat, center.lng])

  // Update markers when pins or selectedPin changes
  useEffect(() => {
    const map = mapInstanceRef.current
    if (!map) return

    // Clear existing markers
    markersRef.current.forEach(m => m.remove())
    markersRef.current = []

    pins.forEach(pin => {
      const isSelected = selectedPin?.id === pin.id
      const emoji = SECTION_EMOJIS[pin.section] ?? '🌿'

      const customIcon = L.divIcon({
        className: 'custom-reward-pin',
        html: `
          <div style="
            width: ${isSelected ? '38px' : '32px'};
            height: ${isSelected ? '38px' : '32px'};
            background: ${isSelected ? '#22c55e' : '#111827'};
            border: 2px solid ${isSelected ? '#ffffff' : '#4b5563'};
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: ${isSelected ? '18px' : '15px'};
            box-shadow: 0 4px 10px rgba(0, 0, 0, 0.5);
            transition: all 0.2s ease-in-out;
            cursor: pointer;
          ">
            ${emoji}
          </div>
        `,
        iconSize: isSelected ? [38, 38] : [32, 32],
        iconAnchor: isSelected ? [19, 19] : [16, 16],
      })

      const marker = L.marker([pin.lat, pin.lng], { icon: customIcon })
        .addTo(map)
        .on('click', () => {
          onSelectPin(pin)
          map.panTo([pin.lat, pin.lng], { animate: true, duration: 0.5 })
        })

      markersRef.current.push(marker)
    })
  }, [pins, selectedPin, onSelectPin])

  return (
    <div
      ref={mapContainerRef}
      className="w-full h-full min-h-[350px] rounded-2xl overflow-hidden z-10"
      style={{ background: '#111827' }}
    />
  )
}
