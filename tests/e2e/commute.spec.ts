import { test, expect } from '@playwright/test';

test.describe('Green Commute Navigation', () => {
  test('unauthenticated access redirects to /login', async ({ page }) => {
    await page.goto('/commute');
    await expect(page).toHaveURL(/\/login/);
  });
});

test.describe('Green Commute Flow', () => {
  test('user views commute challenge and progress bar', async ({ page }) => {
    const userEmail = `commute-user-${Date.now()}@greenrewards.dev`;
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
      await page.fill('input#displayName, input[name="displayName"]', 'Commuter');
      await page.selectOption('select#locality, select[name="locality"]', 'Potheri');
      await page.click('button[type="submit"]');
      await page.waitForURL(/\/home/, { timeout: 8000 });
    }

    // Go to Commute page
    await page.goto('/commute');
    await expect(page.locator('h1')).toContainText('Green Commute');
    await expect(page.locator('text=5-Trip Green Commute Challenge')).toBeVisible();

    // Verify progress info and submit button
    await expect(page.locator('text=Milestone Progress')).toBeVisible();
    await expect(page.locator('button:has-text("Submit Transit Ticket")')).toBeVisible();
  });
});
