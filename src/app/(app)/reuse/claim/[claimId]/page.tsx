'use client'

import React, { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import QrDisplay from '@/components/shared/QrDisplay'

export default function ClaimQrPage() {
  const params = useParams()
  const claimId = params.claimId as string

  const [claimData, setClaimData] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    async function loadClaim() {
      try {
        const res = await fetch(`/api/claims/${claimId}`)
        if (!res.ok) throw new Error('Claim not found or expired')
        const data = await res.json()
        setClaimData(data)
      } catch (err: any) {
        setError(err.message)
      } finally {
        setLoading(false)
      }
    }
    loadClaim()
  }, [claimId])

  if (loading) {
    return (
      <div className="p-8 text-center text-slate-400 font-body">
        <div className="animate-spin text-3xl inline-block mb-3">🌿</div>
        <p className="text-sm">Loading dynamic QR code...</p>
      </div>
    )
  }

  if (error || !claimData) {
    return (
      <div className="p-8 text-center space-y-4 font-body bg-white border border-slate-200/90 rounded-3xl max-w-md mx-auto shadow-xs">
        <div className="w-14 h-14 bg-rose-50 text-rose-600 border border-rose-200 rounded-full flex items-center justify-center text-2xl mx-auto">
          ⚠️
        </div>
        <h2 className="text-lg font-display font-bold text-slate-900">QR Code Unavailable</h2>
        <p className="text-sm text-slate-500">{error || 'This QR code may have expired.'}</p>
        <Link href="/reuse" className="inline-block py-2.5 px-6 text-sm font-semibold bg-emerald-700 hover:bg-emerald-600 text-white rounded-xl transition shadow-sm">
          Return to Reuse Offers
        </Link>
      </div>
    )
  }

  const payload = JSON.stringify({
    opaqueId: claimData.claim.opaqueId,
    code: claimData.claim.code,
  })

  return (
    <div className="space-y-6 pb-12 font-body">
      <div className="flex items-center gap-3">
        <Link href="/reuse" className="text-slate-500 hover:text-emerald-700 text-xs sm:text-sm font-semibold flex items-center gap-1 transition-colors">
          <span>← Back to Offers</span>
        </Link>
        <span className="text-slate-300">/</span>
        <h1 className="text-sm sm:text-base font-display font-bold text-slate-900">
          Claim QR Code
        </h1>
      </div>

      <div>
        <QrDisplay
          opaqueId={claimData.claim.opaqueId}
          code={claimData.claim.code}
          payload={payload}
          expiresAt={claimData.claim.expiresAt}
          offerName={claimData.offer.name}
          partnerName={claimData.offer.partnerName}
        />
      </div>
    </div>
  )
}
