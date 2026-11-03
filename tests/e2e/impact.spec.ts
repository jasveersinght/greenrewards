import { test, expect } from '@playwright/test';

test.describe('City Impact & Sponsor Portal Navigation', () => {
  test('public/unauthenticated access to sponsor page', async ({ page }) => {
    await page.goto('/sponsor');
    await expect(page.locator('h1')).toContainText('Funder & Sponsor Portal');
    await expect(page.locator('text=Citizen Reach by Locality')).toBeVisible();
    await expect(page.locator('text=k-Anonymity (k=5) Active')).toBeVisible();
  });
});

test.describe('Admin Impact Flow', () => {
  test('admin logs in and navigates to City Sustainability & Impact dashboard', async ({ page }) => {
    const adminEmail = 'admin@demo';
    await page.goto('/login');
    await page.fill('input[type="email"]', adminEmail);
    await page.click('button[type="submit"]');

    await page.waitForSelector('input[inputmode="numeric"], input[autocomplete="one-time-code"]', { timeout: 8000 });

    const otpRes = await page.request.get(`/api/dev/otp?email=${encodeURIComponent(adminEmail)}`);
    if (!otpRes.ok()) {
      test.skip(true, 'Dev OTP endpoint not available');
      return;
    }
    const { otp } = await otpRes.json();
    const otpInput = page.locator('input[inputmode="numeric"], input[autocomplete="one-time-code"]').first();
    await otpInput.fill(otp);
    await page.locator('button[type="submit"]').click();

    await page.waitForURL(/\/home/, { timeout: 8000 });

    // Go to Admin Impact
    await page.goto('/admin/impact');
    await expect(page.locator('h2')).toContainText('City Sustainability & Impact');
    await expect(page.locator('text=Total Carbon Footprint Reduction')).toBeVisible();
    await expect(page.locator('text=Single-Use Bags Avoided')).toBeVisible();
    await expect(page.locator('text=Surplus Meals Rescued')).toBeVisible();
    await expect(page.locator('text=Clean Transit Journeys')).toBeVisible();
  });
});
