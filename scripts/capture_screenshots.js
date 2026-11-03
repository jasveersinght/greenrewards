const { chromium } = require('@playwright/test');
const fs = require('fs');
const path = require('path');

async function run() {
  const screenshotDir = path.resolve(process.cwd(), 'docs/screenshots/no-rupees');
  fs.mkdirSync(screenshotDir, { recursive: true });

  let browser;
  try {
    browser = await chromium.launch({ channel: 'msedge', headless: true });
  } catch (e) {
    try {
      browser = await chromium.launch({ channel: 'chrome', headless: true });
    } catch (e2) {
      browser = await chromium.launch({ headless: true });
    }
  }
  const context = await browser.newContext({
    viewport: { width: 1280, height: 800 },
  });

  // Login as CITIZEN first via quick-login
  const page = await context.newPage();
  console.log('Logging in...');
  await page.goto('http://localhost:3000/login');
  
  // Hit quick-login API to set cookie
  await page.request.post('http://localhost:3000/api/auth/quick-login', {
    data: { role: 'CITIZEN' },
  });

  const routes = [
    { name: '01-home', url: 'http://localhost:3000/home' },
    { name: '02-reuse', url: 'http://localhost:3000/reuse' },
    { name: '03-leak', url: 'http://localhost:3000/leak' },
    { name: '04-food', url: 'http://localhost:3000/food' },
    { name: '05-commute', url: 'http://localhost:3000/commute' },
    { name: '06-electricity', url: 'http://localhost:3000/electricity' },
    { name: '07-water', url: 'http://localhost:3000/water' },
    { name: '08-rewards', url: 'http://localhost:3000/rewards' },
    { name: '09-wallet', url: 'http://localhost:3000/wallet' },
  ];

  for (const r of routes) {
    console.log(`Navigating to ${r.url}...`);
    await page.goto(r.url, { waitUntil: 'networkidle' });
    const filePath = path.join(screenshotDir, `${r.name}.png`);
    await page.screenshot({ path: filePath, fullPage: true });
    console.log(`Saved screenshot: ${filePath}`);
  }

  await browser.close();
  console.log('All screenshots captured successfully!');
}

run().catch((err) => {
  console.error('Playwright error:', err);
  process.exit(1);
});
