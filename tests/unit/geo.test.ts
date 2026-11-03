import { describe, it, expect } from 'vitest'
import {
  haversineDistance,
  formatDistance,
  isWithinRadius,
  filterPublicLocations,
} from '@/server/domain/geo'

describe('haversineDistance', () => {
  it('returns 0 for identical coordinates', () => {
    const dist = haversineDistance(12.8231, 80.0444, 12.8231, 80.0444)
    expect(dist).toBe(0)
  })

  it('calculates realistic distance between SRM Main Gate and Potheri Stand (~600m)', () => {
    // SRM Main Gate: 12.8231, 80.0444
    // Potheri Stand: 12.8189, 80.0478
    const dist = haversineDistance(12.8231, 80.0444, 12.8189, 80.0478)
    expect(dist).toBeGreaterThan(400)
    expect(dist).toBeLessThan(800)
  })
})

describe('formatDistance', () => {
  it('formats under 1km in meters', () => {
    expect(formatDistance(350)).toBe('350 m')
    expect(formatDistance(999)).toBe('999 m')
  })

  it('formats 1km and above with decimal', () => {
    expect(formatDistance(1500)).toBe('1.5 km')
    expect(formatDistance(5200)).toBe('5.2 km')
    expect(formatDistance(15000)).toBe('15 km')
  })
})

describe('isWithinRadius', () => {
  const userLat = 12.8231
  const userLng = 80.0444

  it('returns true when target is inside radius', () => {
    // Potheri Stand is ~600m away, radius 1000m
    expect(isWithinRadius(userLat, userLng, 12.8189, 80.0478, 1000)).toBe(true)
  })

  it('returns false when target exceeds radius', () => {
    // Guduvancheri Station (~3.5km away), radius 1000m
    expect(isWithinRadius(userLat, userLng, 12.8451, 80.0582, 1000)).toBe(false)
  })
})

describe('filterPublicLocations (Privacy Enforcement)', () => {
  it('strips private locations and retains only isPublic=true', () => {
    const locations = [
      { id: '1', lat: 12.82, lng: 80.04, isPublic: true },
      { id: '2', lat: 12.83, lng: 80.05, isPublic: false },
      { id: '3', lat: 12.84, lng: 80.06, isPublic: true },
    ]
    const result = filterPublicLocations(locations)
    expect(result).toHaveLength(2)
    expect(result.map(l => l.id)).toEqual(['1', '3'])
    expect(result.some(l => !l.isPublic)).toBe(false)
  })
})
