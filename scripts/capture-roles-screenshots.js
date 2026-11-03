const { chromium } = require('playwright')
const path = require('path')
const fs = require('fs')

async function capture() {
  const outputDir = path.join(process.cwd(), 'docs', 'screenshots', 'roles')
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true })
  }

  const browser = await chromium.launch({
    headless: true,
    executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
  })
  const context = await browser.newContext({
    viewport: { width: 1280, height: 840 },
    deviceScaleFactor: 1.5,
  })
  const page = await context.newPage()

  console.log('📸 1. Capturing /login (Unified single login & quick demo access)...')
  await page.goto('http://localhost:3000/login', { waitUntil: 'networkidle' })
  // Open the demo accounts accordion
  try {
    const summary = page.locator('summary:has-text("View All Demo Accounts")')
    if (await summary.isVisible()) {
      await summary.click()
    }
  } catch (e) {
    console.log('Accordion click skipped:', e.message)
  }
  await page.waitForTimeout(600)
  await page.screenshot({
    path: path.join(outputDir, '01-login-single-entry.png'),
    fullPage: false,
  })

  console.log('📸 2. Capturing /choose-role as admin@demo (Admin, Reviewer, Citizen)...')
  const adminRes = await context.request.post('http://localhost:3000/api/auth/quick-login', {
    data: { email: 'admin@demo' },
  })
  const adminData = await adminRes.json()
  console.log('Admin quick-login response:', adminData.redirectUrl)
  await page.goto('http://localhost:3000/choose-role', { waitUntil: 'networkidle' })
  await page.waitForTimeout(600)
  await page.screenshot({
    path: path.join(outputDir, '02-choose-role-admin.png'),
    fullPage: false,
  })

  console.log('📸 3. Capturing /choose-role as shop@demo (Shopkeeper FreshMart, Citizen)...')
  await context.request.post('http://localhost:3000/api/auth/quick-login', {
    data: { email: 'shop@demo' },
  })
  await page.goto('http://localhost:3000/choose-role', { waitUntil: 'networkidle' })
  await page.waitForTimeout(600)
  await page.screenshot({
    path: path.join(outputDir, '03-choose-role-shopkeeper.png'),
    fullPage: false,
  })

  console.log('📸 4. Capturing Plumber Portal (/plumber)...')
  await context.request.post('http://localhost:3000/api/auth/quick-login', {
    data: { role: 'PLUMBER' },
  })
  await page.goto('http://localhost:3000/plumber', { waitUntil: 'networkidle' })
  await page.waitForTimeout(800)
  await page.screenshot({
    path: path.join(outputDir, '04-portal-plumber.png'),
    fullPage: false,
  })

  console.log('📸 5. Capturing Food Partner Portal (/partner)...')
  await context.request.post('http://localhost:3000/api/auth/quick-login', {
    data: { role: 'FOOD_PARTNER' },
  })
  await page.goto('http://localhost:3000/partner', { waitUntil: 'networkidle' })
  await page.waitForTimeout(800)
  await page.screenshot({
    path: path.join(outputDir, '05-portal-partner.png'),
    fullPage: false,
  })

  console.log('📸 6. Capturing Merchant Portal (/merchant)...')
  await context.request.post('http://localhost:3000/api/auth/quick-login', {
    data: { role: 'SHOPKEEPER' },
  })
  await page.goto('http://localhost:3000/merchant', { waitUntil: 'networkidle' })
  await page.waitForTimeout(800)
  await page.screenshot({
    path: path.join(outputDir, '06-portal-merchant.png'),
    fullPage: false,
  })

  console.log('📸 7. Capturing Admin Applications (/admin/applications)...')
  await context.request.post('http://localhost:3000/api/auth/quick-login', {
    data: { role: 'ADMIN' },
  })
  await page.goto('http://localhost:3000/admin/applications', { waitUntil: 'networkidle' })
  await page.waitForTimeout(800)
  await page.screenshot({
    path: path.join(outputDir, '07-portal-admin-applications.png'),
    fullPage: false,
  })

  console.log('📸 8. Capturing Admin Users (/admin/users)...')
  await page.goto('http://localhost:3000/admin/users', { waitUntil: 'networkidle' })
  await page.waitForTimeout(800)
  await page.screenshot({
    path: path.join(outputDir, '08-portal-admin-users.png'),
    fullPage: false,
  })

  console.log('📸 9. Capturing Citizen Role Application (/apply)...')
  await context.request.post('http://localhost:3000/api/auth/quick-login', {
    data: { role: 'CITIZEN' },
  })
  await page.goto('http://localhost:3000/apply', { waitUntil: 'networkidle' })
  await page.waitForTimeout(800)
  await page.screenshot({
    path: path.join(outputDir, '09-citizen-apply.png'),
    fullPage: false,
  })

  await browser.close()
  console.log('✅ All 9 role screenshots saved successfully!')
}

capture().catch(err => {
  console.error('Screenshot error:', err)
  process.exit(1)
})
