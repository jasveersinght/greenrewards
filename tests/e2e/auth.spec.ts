import { test, expect } from '@playwright/test'

/**
 * Auth flow e2e spec — requires dev server running at BASE_URL.
 * Uses the /api/dev/otp endpoint to read the generated OTP in dev mode.
 */

test.describe('Login + OTP flow', () => {
  test('redirects unauthenticated user to /login', async ({ page }) => {
    await page.goto('/home')
    await expect(page).toHaveURL(/\/login/)
  })

  test('login page renders email input and submit button', async ({ page }) => {
    await page.goto('/login')
    await expect(page.locator('input[type="email"]')).toBeVisible()
    await expect(page.locator('button[type="submit"]')).toBeVisible()
  })

  test('sends OTP and shows code input', async ({ page }) => {
    await page.goto('/login')
    await page.fill('input[type="email"]', 'test-e2e@greenrewards.dev')
    await page.click('button[type="submit"]')
    // After sending OTP the page should show an OTP entry step
    await expect(page.locator('input[inputmode="numeric"], input[autocomplete="one-time-code"]')).toBeVisible({ timeout: 8000 })
  })

  test('dev OTP banner is visible in development mode', async ({ page }) => {
    await page.goto('/login')
    await page.fill('input[type="email"]', 'dev@greenrewards.dev')
    await page.click('button[type="submit"]')
    // Dev banner shows OTP
    await expect(page.locator('[data-testid="dev-otp-banner"], .dev-otp-banner, [class*="dev"]').first()).toBeVisible({ timeout: 8000 })
  })

  test('full login with dev OTP reaches home or onboarding', async ({ page }) => {
    const email = `e2e-${Date.now()}@greenrewards.dev`
    await page.goto('/login')
    await page.fill('input[type="email"]', email)
    await page.click('button[type="submit"]')

    // Wait for OTP input
    await page.waitForSelector('input[inputmode="numeric"], input[autocomplete="one-time-code"]', { timeout: 8000 })

    // Fetch OTP from dev API
    const otpRes = await page.request.get(`/api/dev/otp?email=${encodeURIComponent(email)}`)
    if (!otpRes.ok()) {
      test.skip(true, 'Dev OTP endpoint not available — skipping full login test')
      return
    }
    const { otp } = await otpRes.json()
    const otpInput = page.locator('input[inputmode="numeric"], input[autocomplete="one-time-code"]').first()
    await otpInput.fill(otp)
    await page.locator('button[type="submit"]').click()

    // Should land on onboarding (new user) or home (returning user)
    await expect(page).toHaveURL(/\/(onboarding|home)/, { timeout: 10000 })
  })
})

test.describe('Authenticated pages', () => {
  test('unauthenticated wallet access redirects to login', async ({ page }) => {
    await page.goto('/wallet')
    await expect(page).toHaveURL(/\/login/)
  })

  test('unauthenticated profile access redirects to login', async ({ page }) => {
    await page.goto('/profile')
    await expect(page).toHaveURL(/\/login/)
  })

  test('unauthenticated activity access redirects to login', async ({ page }) => {
    await page.goto('/activity')
    await expect(page).toHaveURL(/\/login/)
  })
})
