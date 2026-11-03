import { test, expect } from '@playwright/test'

/**
 * Phase 3 E2E Spec — Nearby Rewards Discovery & Privacy Scoping.
 */

test.describe('Nearby API & Privacy Guarantees', () => {
  test('returns public locations around SRM IST Kattankulathur', async ({ request }) => {
    const res = await request.get('/api/nearby?lat=12.8231&lng=80.0444&radiusKm=15')
    expect(res.ok()).toBe(true)

    const data = await res.json()
    expect(data.count).toBeGreaterThan(0)
    expect(data.pins).toBeInstanceOf(Array)

    // Verify distance sorting: pin 0 is closest
    if (data.pins.length >= 2) {
      expect(data.pins[0].distanceMeters).toBeLessThanOrEqual(data.pins[1].distanceMeters)
    }

    // Verify required pin properties
    const firstPin = data.pins[0]
    expect(firstPin).toHaveProperty('id')
    expect(firstPin).toHaveProperty('lat')
    expect(firstPin).toHaveProperty('lng')
    expect(firstPin).toHaveProperty('partnerName')
    expect(firstPin).toHaveProperty('distanceFormatted')
  })

  test('never returns private locations (isPublic: false)', async ({ request }) => {
    const res = await request.get('/api/nearby?lat=12.8231&lng=80.0444&radiusKm=50')
    expect(res.ok()).toBe(true)
    const data = await res.json()

    // No private addresses should ever be leaked
    data.pins.forEach((pin: any) => {
      expect(pin.isPublic).not.toBe(false)
    })
  })

  test('filters by section correctly', async ({ request }) => {
    const res = await request.get('/api/nearby?section=REUSE')
    expect(res.ok()).toBe(true)
    const data = await res.json()

    data.pins.forEach((pin: any) => {
      expect(pin.section).toBe('REUSE')
    })
  })
})

test.describe('Coming Soon Campaign & Remind Me', () => {
  test('unauthenticated remind check returns reminded: false', async ({ request }) => {
    const res = await request.get('/api/campaigns/campaign-commute-1/remind')
    expect(res.ok()).toBe(true)
    const data = await res.json()
    expect(data.reminded).toBe(false)
  })
})
