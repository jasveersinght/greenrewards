/**
 * Geo Domain Logic — Haversine distance, formatting, radius filtering,
 * and strict privacy enforcement for public location pins.
 */

const EARTH_RADIUS_METERS = 6_371_000

/**
 * Calculates great-circle distance between two points in meters
 * using the Haversine formula.
 */
export function haversineDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const toRad = (deg: number) => (deg * Math.PI) / 180

  const dLat = toRad(lat2 - lat1)
  const dLon = toRad(lon2 - lon1)

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) *
      Math.cos(toRad(lat2)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2)

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  return Math.round(EARTH_RADIUS_METERS * c)
}

/**
 * Human-readable distance formatting (e.g. "350 m" or "2.4 km").
 */
export function formatDistance(meters: number): string {
  if (meters < 1000) {
    return `${Math.round(meters)} m`
  }
  const km = meters / 1000
  return `${km < 10 ? km.toFixed(1) : Math.round(km)} km`
}

/**
 * Check if a target coordinate is within a given radius in meters.
 */
export function isWithinRadius(
  userLat: number,
  userLng: number,
  targetLat: number,
  targetLng: number,
  radiusMeters: number
): boolean {
  return haversineDistance(userLat, userLng, targetLat, targetLng) <= radiusMeters
}

export interface LocationRecord {
  id: string
  lat: number
  lng: number
  address?: string | null
  isPublic: boolean
}

/**
 * Strict privacy enforcement filter.
 * NEVER allow private household locations to be returned in public discovery.
 */
export function filterPublicLocations<T extends LocationRecord>(locations: T[]): T[] {
  return locations.filter((loc) => loc.isPublic === true)
}
