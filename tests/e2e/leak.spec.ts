import { test, expect } from '@playwright/test'

/**
 * Phase 4 E2E Spec — Leak Hunter Flow.
 */

test.describe('Leak Hunter Navigation & Permissions', () => {
  test('unauthenticated access to /leak redirects to /login', async ({ page }) => {
    await page.goto('/leak')
    await expect(page).toHaveURL(/\/login/)
  })

  test('unauthenticated access to /reviewer redirects to /login', async ({ page }) => {
    await page.goto('/reviewer')
    await expect(page).toHaveURL(/\/login/)
  })
})

test.describe('Full Leak Lifecycle (Report → Review → Repair → Closure)', () => {
  test('citizen reports leak, reviewer accepts for ₹100, and verifies repair for ₹150', async ({ page, browser }) => {
    // 1. Citizen login
    const citizenEmail = `citizen-leak-${Date.now()}@greenrewards.dev`
    await page.goto('/login')
    await page.fill('input[type="email"]', citizenEmail)
    await page.click('button[type="submit"]')

    await page.waitForSelector('input[inputmode="numeric"], input[autocomplete="one-time-code"]', { timeout: 8000 })
    const otpRes = await page.request.get(`/api/dev/otp?email=${encodeURIComponent(citizenEmail)}`)
    if (!otpRes.ok()) {
      test.skip(true, 'Dev OTP endpoint not available')
      return
    }
    const { otp } = await otpRes.json()
    await page.locator('input[inputmode="numeric"], input[autocomplete="one-time-code"]').first().fill(otp)
    await page.locator('button[type="submit"]').click()

    if (page.url().includes('/onboarding')) {
      await page.fill('input#displayName, input[name="displayName"]', 'Citizen Ramesh')
      await page.selectOption('select#locality, select[name="locality"]', 'Kattankulathur')
      await page.click('button[type="submit"]')
      await page.waitForURL(/\/home/, { timeout: 8000 })
    }

    // 2. Submit Leak Report via API
    const photoDataUrl = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=='
    const submitRes = await page.request.post('/api/leaks', {
      data: {
        lat: 12.8245,
        lng: 80.0435,
        category: 'ROAD',
        description: 'Burst underground water pipe spraying onto GST Road near SRM campus',
        photoUrl: photoDataUrl,
      },
    })
    expect(submitRes.ok()).toBe(true)
    const { caseId } = await submitRes.json()
    expect(caseId).toBeTruthy()

    // 3. Citizen views case page
    await page.goto(`/leak/${caseId}`)
    await expect(page.locator('h1')).toContainText('Leak #')
    await expect(page.locator('text=Under Review')).toBeVisible()

    // 4. Reviewer logs in via second browser context
    const reviewerContext = await browser.newContext()
    const reviewerPage = await reviewerContext.newPage()

    await reviewerPage.goto('/login')
    await reviewerPage.fill('input[type="email"]', 'reviewer@demo')
    await reviewerPage.click('button[type="submit"]')

    await reviewerPage.waitForSelector('input[inputmode="numeric"], input[autocomplete="one-time-code"]', { timeout: 8000 })
    const rOtpRes = await reviewerPage.request.get(`/api/dev/otp?email=reviewer@demo`)
    const { otp: rOtp } = await rOtpRes.json()
    await reviewerPage.locator('input[inputmode="numeric"], input[autocomplete="one-time-code"]').first().fill(rOtp)
    await reviewerPage.locator('button[type="submit"]').click()
    await reviewerPage.waitForURL(/\/home/, { timeout: 8000 })

    // Reviewer opens review decision page
    await reviewerPage.goto(`/reviewer/leaks/${caseId}`)
    await expect(reviewerPage.locator('h1')).toContainText('Review Leak #')

    // Reviewer approves the leak report -> Tier 1 Bounty (₹100)
    await reviewerPage.click('#approve-leak-btn')
    await expect(reviewerPage.locator('text=Report accepted and ₹100 Tier-1 bounty credited')).toBeVisible({ timeout: 6000 })

    // 5. Maintenance uploads repair evidence
    const repairRes = await reviewerPage.request.post(`/api/leaks/${caseId}/repair`, {
      data: {
        repairPhotoUrl: photoDataUrl,
        note: 'Pipe replaced and sealed by Chennai Metro Water crew.',
      },
    })
    expect(repairRes.ok()).toBe(true)

    // 6. Reviewer verifies closure -> Tier 2 Bonus (₹150)
    await reviewerPage.reload()
    await expect(reviewerPage.locator('#verify-repair-btn')).toBeVisible({ timeout: 5000 })
    await reviewerPage.click('#verify-repair-btn')
    await expect(reviewerPage.locator('text=Repair verified and ₹150 Tier-2 bonus credited')).toBeVisible({ timeout: 6000 })

    // 7. Verify citizen wallet now reflects the bounties
    await page.goto('/wallet')
    await expect(page.locator('text=₹250.00')).toBeVisible({ timeout: 6000 })

    await reviewerContext.close()
  })
})
