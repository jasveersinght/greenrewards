import { test, expect } from '@playwright/test';

test.describe('Save Electricity & Water Navigation', () => {
  test('unauthenticated access to electricity redirects to /login', async ({ page }) => {
    await page.goto('/electricity');
    await expect(page).toHaveURL(/\/login/);
  });

  test('unauthenticated access to water redirects to /login', async ({ page }) => {
    await page.goto('/water');
    await expect(page).toHaveURL(/\/login/);
  });
});

test.describe('Save Electricity & Water Flow', () => {
  test('user visits electricity page, views reduction challenge and bills', async ({ page }) => {
    const userEmail = `telemetry-user-${Date.now()}@greenrewards.dev`;
    await page.goto('/login');
    await page.fill('input[type="email"]', userEmail);
    await page.click('button[type="submit"]');

    await page.waitForSelector('input[inputmode="numeric"], input[autocomplete="one-time-code"]', { timeout: 8000 });

    const otpRes = await page.request.get(`/api/dev/otp?email=${encodeURIComponent(userEmail)}`);
    if (!otpRes.ok()) {
      test.skip(true, 'Dev OTP endpoint not available');
      return;
    }
    const { otp } = await otpRes.json();
    const otpInput = page.locator('input[inputmode="numeric"], input[autocomplete="one-time-code"]').first();
    await otpInput.fill(otp);
    await page.locator('button[type="submit"]').click();

    if (page.url().includes('/onboarding')) {
      await page.fill('input#displayName, input[name="displayName"]', 'Green Eco User');
      await page.selectOption('select#locality, select[name="locality"]', 'Potheri');
      await page.click('button[type="submit"]');
      await page.waitForURL(/\/home/, { timeout: 8000 });
    }

    // Go to Electricity
    await page.goto('/electricity');
    await expect(page.locator('h1')).toContainText('Save Electricity');
    await expect(page.locator('text=10% Electricity Reduction Reward')).toBeVisible();
    await expect(page.locator('text=Connected Smart Monitors')).toBeVisible();

    // Go to Water
    await page.goto('/water');
    await expect(page.locator('h1')).toContainText('Save Water');
    await expect(page.locator('text=Fixed a Leaking Tap or Pipe?')).toBeVisible();
    await expect(page.locator('text=Daily Consumption')).toBeVisible();
  });
});
