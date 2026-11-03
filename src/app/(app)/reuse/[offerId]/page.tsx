'use client'

import React, { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import StampCard from '@/components/wallet/StampCard'

export default function OfferDetailPage() {
  const params = useParams()
  const router = useRouter()
  const offerId = params.offerId as string

  const [offer, setOffer] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [claiming, setClaiming] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    async function fetchOffer() {
      try {
        const res = await fetch(`/api/offers/${offerId}`)
        if (!res.ok) throw new Error('Offer not found')
        const data = await res.json()
        setOffer(data)
      } catch (err: any) {
        setError(err.message)
      } finally {
        setLoading(false)
      }
    }
    fetchOffer()
  }, [offerId])

  async function handleClaim() {
    setClaiming(true)
    setError('')
    try {
      const res = await fetch('/api/claims', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ offerId }),
      })
      const data = await res.json()

      if (!res.ok) {
        setError(data.error ?? 'Failed to generate claim QR')
        return
      }

      router.push(`/reuse/claim/${data.claim.opaqueId}`)
    } catch (err: any) {
      setError(err.message ?? 'An error occurred')
    } finally {
      setClaiming(false)
    }
  }

  if (loading) {
    return (
      <div className="p-6 text-center text-gray-400">
        <div className="animate-spin text-3xl inline-block mb-3">🌿</div>
        <p className="text-sm">Loading offer details...</p>
      </div>
    )
  }

  if (error && !offer) {
    return (
      <div className="p-6 text-center">
        <p className="text-red-400 mb-4">{error}</p>
        <Link href="/reuse" className="btn-secondary py-2 px-4 inline-block text-sm">
          ← Back to Reuse Offers
        </Link>
      </div>
    )
  }

  const currentStamps = offer?.myCard?.stamps ?? 0

  return (
    <div className="space-y-6 pb-12 font-body">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link
          href="/reuse"
          className="text-slate-500 hover:text-emerald-700 text-xs sm:text-sm font-semibold flex items-center gap-1 transition-colors"
        >
          <span>← Back to Offers</span>
        </Link>
        <span className="text-slate-300">/</span>
        <h1 className="text-sm sm:text-base font-display font-bold text-slate-900 truncate">
          {offer.name}
        </h1>
      </div>

      <div className="space-y-6">
        {/* Stamp Card Progress */}
        <StampCard
          offerName={offer.name}
          partnerName={offer.partner.name}
          currentStamps={currentStamps}
          stampsNeeded={offer.stampsNeeded}
          voucherValuePaise={offer.voucherValuePaise}
          isSimulated={offer.partner.isSimulated}
          completedAt={offer.myCard?.completedAt}
        />

        {error && (
          <div className="p-4 bg-rose-50 border border-rose-200 text-rose-800 text-xs font-semibold rounded-2xl shadow-xs">
            {error}
          </div>
        )}

        {/* Claim Action CTA */}
        <div className="bg-white border border-slate-200/90 rounded-2xl p-6 text-center space-y-4 shadow-xs">
          <div>
            <h2 className="text-lg font-display font-bold text-slate-900">Ready at checkout?</h2>
            <p className="text-xs sm:text-sm text-slate-600 max-w-md mx-auto mt-1 leading-relaxed">
              Click below to generate your single-use 120-second dynamic QR code. Present it to the cashier when making a purchase with your reusable bag.
            </p>
          </div>

          <button
            type="button"
            disabled={claiming}
            onClick={handleClaim}
            id="generate-qr-btn"
            className="w-full py-3.5 px-6 rounded-xl text-sm font-semibold bg-emerald-700 text-white hover:bg-emerald-600 transition shadow-sm flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
          >
            {claiming ? (
              <span>⏳ Generating QR Code...</span>
            ) : (
              <>
                <span className="text-base">🛍️</span>
                <span>Claim Stamp with Reusable Bag</span>
              </>
            )}
          </button>
        </div>

        {/* Details & Conditions */}
        <div className="bg-white border border-slate-200/90 rounded-2xl p-6 space-y-4 shadow-xs">
          <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider">
            Terms &amp; Instructions
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
            <div className="bg-slate-50/80 p-4 rounded-xl border border-slate-200/80">
              <p className="font-semibold text-slate-900 mb-1">Reward</p>
              <p className="text-slate-600 leading-relaxed">{offer.rewardText}</p>
            </div>

            <div className="bg-slate-50/80 p-4 rounded-xl border border-slate-200/80">
              <p className="font-semibold text-slate-900 mb-1">Conditions</p>
              <p className="text-slate-600 leading-relaxed">{offer.conditions}</p>
            </div>

            <div className="bg-slate-50/80 p-4 rounded-xl border border-slate-200/80">
              <p className="font-semibold text-slate-900 mb-1">Redeemable Partner</p>
              <p className="text-slate-600 leading-relaxed">
                {offer.partner.name}
                {offer.partner.location?.address && ` (${offer.partner.location.address})`}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
