import { test, expect } from '@playwright/test'

/**
 * Phase 2 E2E Spec — Reuse & Earn QR Stamp Flow.
 */

test.describe('Reuse & Earn Navigation', () => {
  test('unauthenticated access redirects to /login', async ({ page }) => {
    await page.goto('/reuse')
    await expect(page).toHaveURL(/\/login/)
  })

  test('unauthenticated merchant access redirects to /login', async ({ page }) => {
    await page.goto('/merchant')
    await expect(page).toHaveURL(/\/login/)
  })
})

test.describe('Full Reuse Claim & Stamp Flow', () => {
  test('customer claims QR and merchant verifies via 6-digit code', async ({ page, browser }) => {
    // 1. Log in as demo user
    const customerEmail = `reuse-user-${Date.now()}@greenrewards.dev`
    await page.goto('/login')
    await page.fill('input[type="email"]', customerEmail)
    await page.click('button[type="submit"]')

    // Wait for OTP input
    await page.waitForSelector('input[inputmode="numeric"], input[autocomplete="one-time-code"]', { timeout: 8000 })

    const otpRes = await page.request.get(`/api/dev/otp?email=${encodeURIComponent(customerEmail)}`)
    if (!otpRes.ok()) {
      test.skip(true, 'Dev OTP endpoint not available')
      return
    }
    const { otp } = await otpRes.json()
    const otpInput = page.locator('input[inputmode="numeric"], input[autocomplete="one-time-code"]').first()
    await otpInput.fill(otp)
    await page.locator('button[type="submit"]').click()

    // Handle onboarding if new
    if (page.url().includes('/onboarding')) {
      await page.fill('input#displayName, input[name="displayName"]', 'Priya Green')
      await page.selectOption('select#locality, select[name="locality"]', 'Potheri')
      await page.click('button[type="submit"]')
      await page.waitForURL(/\/home/, { timeout: 8000 })
    }

    // 2. Navigate to Reuse & Earn
    await page.goto('/reuse')
    await expect(page.locator('h1')).toContainText('Reuse & Earn')

    // Expect to see FreshMart Reusable Bag Stamp offer
    const offerCard = page.locator('text=FreshMart Reusable Bag Stamp').first()
    await expect(offerCard).toBeVisible()

    // 3. Open offer detail
    await page.click('a[href*="/reuse/offer-freshmart-reuse"], a:has-text("Start Earning"), a:has-text("Collect Next Stamp")')
    await expect(page.locator('h1')).toContainText('FreshMart Reusable Bag Stamp')

    // 4. Click Claim Stamp with Reusable Bag button
    await page.click('#generate-qr-btn')

    // Wait for dynamic QR code screen
    await page.waitForURL(/\/reuse\/claim\//, { timeout: 8000 })
    await expect(page.locator('text=Show to cashier')).toBeVisible()

    // Extract the 6-character fallback code from the screen
    const codeElement = page.locator('.font-mono.text-xl, font-mono').first()
    await expect(codeElement).toBeVisible()
    const claimCode = (await codeElement.textContent())?.trim()
    expect(claimCode).toBeTruthy()

    // 5. In a second context, login as merchant demo account
    const merchantContext = await browser.newContext()
    const merchantPage = await merchantContext.newPage()

    await merchantPage.goto('/login')
    await merchantPage.fill('input[type="email"]', 'merchant@demo')
    await merchantPage.click('button[type="submit"]')

    await merchantPage.waitForSelector('input[inputmode="numeric"], input[autocomplete="one-time-code"]', { timeout: 8000 })
    const mOtpRes = await merchantPage.request.get(`/api/dev/otp?email=merchant@demo`)
    const { otp: mOtp } = await mOtpRes.json()
    await merchantPage.locator('input[inputmode="numeric"], input[autocomplete="one-time-code"]').first().fill(mOtp)
    await merchantPage.locator('button[type="submit"]').click()
    await merchantPage.waitForURL(/\/home/, { timeout: 8000 })

    // 6. Merchant navigates to scanner
    await merchantPage.goto('/merchant/scan')
    await expect(merchantPage.locator('h1')).toContainText('Scan / Verify Stamp')

    // Enter the 6-character customer code
    await merchantPage.fill('input[placeholder*="7X9K2P"]', claimCode!)
    await merchantPage.click('button:has-text("Find")')

    // Verify customer preview is loaded
    await expect(merchantPage.locator('text=Customer Found')).toBeVisible({ timeout: 5000 })
    await expect(merchantPage.locator('text=FreshMart Reusable Bag Stamp')).toBeVisible()

    // Fill optional receipt ref and confirm
    await merchantPage.fill('#receipt-ref-input', 'REC-1042')
    await merchantPage.click('#confirm-stamp-btn')

    // Expect successful confirmation
    await expect(merchantPage.locator('text=Stamp Successfully Awarded!')).toBeVisible({ timeout: 6000 })

    // 7. Verify customer screen auto-updates via live polling!
    await expect(page.locator('text=Stamp Confirmed!')).toBeVisible({ timeout: 10000 })

    await merchantContext.close()
  })
})
