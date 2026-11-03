import { test, expect } from '@playwright/test';

test.describe('Food Rescue Navigation', () => {
  test('unauthenticated access redirects to /login', async ({ page }) => {
    await page.goto('/food');
    await expect(page).toHaveURL(/\/login/);
  });
});

test.describe('Food Rescue Flow', () => {
  test('user views surplus meals and switches tabs', async ({ page }) => {
    const userEmail = `food-saver-${Date.now()}@greenrewards.dev`;
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
      await page.fill('input#displayName, input[name="displayName"]', 'Food Rescuer');
      await page.selectOption('select#locality, select[name="locality"]', 'Potheri');
      await page.click('button[type="submit"]');
      await page.waitForURL(/\/home/, { timeout: 8000 });
    }

    // Go to Food Rescue
    await page.goto('/food');
    await expect(page.locator('h1')).toContainText('Food Rescue');

    // Check tabs
    await expect(page.locator('button:has-text("Discount Meals")')).toBeVisible();
    await expect(page.locator('button:has-text("Community Parcels")')).toBeVisible();
    await expect(page.locator('button:has-text("My Pickups")')).toBeVisible();

    // Click Community Parcels tab
    await page.click('button:has-text("Community Parcels")');
    await expect(page.locator('text=Destination NGO')).toBeVisible();

    // Click My Pickups tab
    await page.click('button:has-text("My Pickups")');
  });
});
