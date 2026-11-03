'use client'

import React, { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, MapPin, Camera } from 'lucide-react'

const CATEGORIES = [
  { id: 'ROAD', label: 'Road / Footpath', emoji: '🛣️' },
  { id: 'STATION', label: 'Station / Bus Stand', emoji: '🚉' },
  { id: 'PARK', label: 'Public Park / Playground', emoji: '🌳' },
  { id: 'OTHER_PUBLIC', label: 'Other Public Area', emoji: '🏛️' },
]

export default function ReportLeakPage() {
  const router = useRouter()
  const [photoPreview, setPhotoPreview] = useState<string | null>(null)
  const [category, setCategory] = useState<string>('ROAD')
  const [description, setDescription] = useState<string>('')
  const [lat, setLat] = useState<number>(12.8231)
  const [lng, setLng] = useState<number>(80.0444)
  const [locating, setLocating] = useState<boolean>(false)
  const [submitting, setSubmitting] = useState<boolean>(false)
  const [error, setError] = useState<string | null>(null)

  function handlePhotoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = () => {
      setPhotoPreview(reader.result as string)
    }
    reader.readAsDataURL(file)
  }

  function handleUseMyLocation() {
    if (typeof window !== 'undefined' && 'geolocation' in navigator) {
      setLocating(true)
      navigator.geolocation.getCurrentPosition(
        pos => {
          setLat(pos.coords.latitude)
          setLng(pos.coords.longitude)
          setLocating(false)
        },
        _err => {
          setLocating(false)
        }
      )
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    if (!photoPreview) {
      setError('Please capture or upload a clear photo of the water leak.')
      return
    }

    if (description.trim().length < 5) {
      setError('Please add a brief description of the leak location and severity.')
      return
    }

    setSubmitting(true)
    try {
      const res = await fetch('/api/leaks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          lat,
          lng,
          category,
          description: description.trim(),
          photoUrl: photoPreview,
        }),
      })

      const data = await res.json()
      if (!res.ok) {
        setError(data.error ?? 'Failed to submit leak report')
        return
      }

      router.push(`/leak/${data.caseId}`)
    } catch (err: any) {
      setError(err?.message ?? 'An error occurred during submission.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6 pb-16 font-body">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link
          href="/leak"
          className="text-slate-500 hover:text-emerald-700 text-xs sm:text-sm font-semibold flex items-center gap-1 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Leak Hunter</span>
        </Link>
        <span className="text-slate-300">/</span>
        <h1 className="text-sm sm:text-base font-display font-bold text-slate-900 truncate">
          Report Public Water Leak
        </h1>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        {error && (
          <div className="p-4 bg-rose-50 border border-rose-200 text-rose-800 text-xs font-semibold rounded-2xl shadow-xs">
            ⚠️ {error}
          </div>
        )}

        {/* Photo Capture Section */}
        <div className="bg-white border border-slate-200/90 rounded-2xl p-6 text-center shadow-xs">
          <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-3 text-left">
            1. Photo Evidence (Required)
          </span>

          {photoPreview ? (
            <div className="relative mx-auto w-full max-w-sm aspect-video rounded-2xl overflow-hidden border border-slate-200 shadow-sm">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={photoPreview}
                alt="Captured leak preview"
                className="w-full h-full object-cover"
              />
              <button
                type="button"
                onClick={() => setPhotoPreview(null)}
                className="absolute top-3 right-3 bg-slate-900/80 hover:bg-slate-900 text-white px-3 py-1 rounded-full text-xs font-semibold transition cursor-pointer"
              >
                Change Photo
              </button>
            </div>
          ) : (
            <label className="cursor-pointer block border-2 border-dashed border-slate-200 hover:border-emerald-500 bg-slate-50/50 rounded-2xl p-8 transition-colors">
              <Camera className="w-8 h-8 text-emerald-600 mx-auto mb-2" />
              <p className="text-slate-900 font-semibold text-sm">Take Photo or Upload</p>
              <p className="text-xs text-slate-500 mt-1 max-w-xs mx-auto">
                Ensure the pipe, puddle, or leak stream is clearly visible.
              </p>
              <input
                type="file"
                accept="image/*"
                capture="environment"
                onChange={handlePhotoUpload}
                className="hidden"
                id="leak-photo-input"
              />
            </label>
          )}
        </div>

        {/* Public Category Selection */}
        <div className="bg-white border border-slate-200/90 rounded-2xl p-6 shadow-xs">
          <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-3">
            2. Public Location Type
          </span>

          <div className="grid grid-cols-2 gap-3">
            {CATEGORIES.map(cat => {
              const isSelected = category === cat.id
              return (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => setCategory(cat.id)}
                  className={`p-3.5 rounded-xl border text-left flex items-center gap-2.5 transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-emerald-50 border-emerald-500 text-emerald-950 shadow-xs'
                      : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  <span className="text-xl shrink-0">{cat.emoji}</span>
                  <span className="text-xs font-semibold leading-tight">{cat.label}</span>
                </button>
              )
            })}
          </div>
          <p className="text-[11px] text-slate-500 mt-2.5">
            Note: Private household leaks should be logged under Save Water.
          </p>
        </div>

        {/* Location Pin */}
        <div className="bg-white border border-slate-200/90 rounded-2xl p-6 shadow-xs">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              3. Map Coordinates
            </span>
            <button
              type="button"
              onClick={handleUseMyLocation}
              disabled={locating}
              className="text-xs text-emerald-700 hover:text-emerald-800 font-semibold flex items-center gap-1 cursor-pointer"
            >
              <MapPin className="w-3.5 h-3.5" />
              <span>{locating ? 'Locating...' : 'Use Current GPS'}</span>
            </button>
          </div>

          <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs flex justify-between items-center text-slate-600">
            <span>Coordinates:</span>
            <span className="font-mono text-slate-900 font-bold">
              {lat.toFixed(4)}, {lng.toFixed(4)}
            </span>
          </div>
          <p className="text-[11px] text-slate-400 mt-2">
            Nearby open cases within 50m are automatically grouped to avoid duplicate dispatching.
          </p>
        </div>

        {/* Description */}
        <div className="bg-white border border-slate-200/90 rounded-2xl p-6 shadow-xs">
          <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-2">
            4. Description
          </span>

          <textarea
            rows={3}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="e.g. Broken water valve spraying onto footpath near Guindy bus shelter."
            className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3.5 text-slate-900 text-xs focus:outline-none focus:border-emerald-500 focus:bg-white transition-colors"
          />
        </div>

        {/* Submit Action Button */}
        <button
          type="submit"
          disabled={submitting}
          id="submit-leak-btn"
          className="w-full py-4 text-sm font-semibold rounded-2xl bg-emerald-700 hover:bg-emerald-600 text-white transition shadow-md flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
        >
          {submitting ? (
            <span>⏳ Submitting Leak Report...</span>
          ) : (
            <>
              <span>🚀</span>
              <span>Submit Report &amp; Claim ₹100 Bounty</span>
            </>
          )}
        </button>
      </form>
    </div>
  )
}
