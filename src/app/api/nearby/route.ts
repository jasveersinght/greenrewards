import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/server/db'
import {
  haversineDistance,
  formatDistance,
  filterPublicLocations,
} from '@/server/domain/geo'

// Default fallback center: Chennai South
const DEFAULT_LAT = 12.8231
const DEFAULT_LNG = 80.0444

export async function GET(req: NextRequest) {
  const url = new URL(req.url)
  const lat = parseFloat(url.searchParams.get('lat') ?? `${DEFAULT_LAT}`)
  const lng = parseFloat(url.searchParams.get('lng') ?? `${DEFAULT_LNG}`)
  const radiusKm = parseFloat(url.searchParams.get('radiusKm') ?? '15')
  const sectionFilter = url.searchParams.get('section')?.toUpperCase()

  const radiusMeters = radiusKm * 1000

  // 1. Fetch only public locations
  const rawLocations = await prisma.location.findMany({
    where: { isPublic: true },
    include: {
      partners: {
        include: {
          offers: {
            where: { active: true },
            take: 1,
          },
          campaigns: {
            where: { status: { in: ['ACTIVE', 'COMING_SOON'] } },
            take: 1,
          },
        },
      },
    },
  })

  // 2. Strict privacy check layer
  const publicLocations = filterPublicLocations(rawLocations)

  // 3. Map and compute distance
  const pins = publicLocations
    .map(loc => {
      const partner = loc.partners[0] ?? null
      const offer = partner?.offers?.[0] ?? null
      const campaign = partner?.campaigns?.[0] ?? null

      // Determine category/section for styling
      let section = 'COMMUNITY'
      let actionUrl = '/home'
      let rewardText = 'Sustainable Community Partner'

      if (partner?.type === 'SHOP') {
        section = 'REUSE'
        actionUrl = offer ? `/reuse/${offer.id}` : '/reuse'
        rewardText = offer ? offer.rewardText : 'Stamp Card Rewards'
      } else if (partner?.type === 'RESTAURANT' || partner?.type === 'FOOD_PARTNER') {
        section = 'FOOD'
        actionUrl = '/food'
        rewardText = 'Surplus Food Rescue & Cashback'
      } else if (partner?.type === 'AUTHORITY') {
        section = 'LEAK'
        actionUrl = '/leak'
        rewardText = 'Public Water Leak Bounties'
      } else if (partner?.type === 'OPERATOR') {
        section = 'COMMUTE'
        actionUrl = '/commute'
        rewardText = 'Metro & Bus Journey Rewards'
      }

      const distanceMeters = haversineDistance(lat, lng, loc.lat, loc.lng)

      return {
        id: loc.id,
        lat: loc.lat,
        lng: loc.lng,
        address: loc.address ?? 'Chennai, Tamil Nadu',
        partnerId: partner?.id ?? null,
        partnerName: partner?.name ?? 'Green Rewards Location',
        partnerType: partner?.type ?? 'COMMUNITY',
        isSimulated: partner?.isSimulated ?? false,
        section,
        offerName: offer?.name ?? campaign?.name ?? null,
        rewardText,
        actionUrl,
        distanceMeters,
        distanceFormatted: formatDistance(distanceMeters),
      }
    })
    .filter(pin => {
      if (pin.distanceMeters > radiusMeters) return false
      if (sectionFilter && sectionFilter !== 'ALL' && pin.section !== sectionFilter) {
        return false
      }
      return true
    })
    .sort((a, b) => a.distanceMeters - b.distanceMeters)

  return NextResponse.json({
    center: { lat, lng },
    radiusKm,
    count: pins.length,
    pins,
  })
}
