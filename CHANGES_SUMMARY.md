# 📋 Changes Summary: Green Points, Unified Auth & Multi-Role Architecture

## 1. Metrics & Test Counts

| Metric | Before Upgrade | Points Engine | Multi-Role & Portals | Cross-Portal Workflows | Total Delta |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Test Suites (Vitest)** | 12 files passed | 17 files passed | 18 files passed | **19 files passed** | **+7 suites** |
| **Total Unit Tests** | 102 passed, 0 failed | 128 passed, 0 failed | 143 passed, 0 failed | **148 passed, 0 failed** | **+46 tests** |
| **Production Routes** | 55 compiled | 67 compiled | 83 compiled | **83 compiled** | **+28 routes** |
| **TypeScript / Build Errors**| 0 | 0 | 0 | **0** | **Zero errors** |

---

## 2. Summary of Changes

### Step 1: Points Ledger (Rupees Replaced with Green Points)
- Replaced paise calculations with integer Green Points (`amountPoints`).
- Implemented double-entry balancing with balanced DEBIT and CREDIT records per `transactionId`.
- Added accounts: `SPONSOR_POOL`, `USER_PENDING`, `USER_AVAILABLE`, `USER_RESERVED`, `REDEEMED`, `EXPIRED`, `REVERSED`.
- Points lifecycle: earned points enter `USER_PENDING` with `availableAt = now + 7 days` (or 1 minute in demo mode via `DEMO_FAST_SETTLE=true`).
- Settled points expire after 12 months (FIFO lot management).
- Centralized earning table and caps in `src/server/domain/pointsConfig.ts`:
  - Reuse stamp: `10 GP` | 5-stamp card bonus: `40 GP`
  - Leak report accepted: `50 GP` | Verified repair closed: `100 GP` to original reporter
  - Food pickup: `15 GP`
  - Transit trip: `5 GP` | 5-trip streak bonus: `25 GP`
  - Electricity 10% reduction: `150 GP`
  - Water repair verified: `75 GP`
- Enforced caps in `src/server/domain/caps.ts`: reuse max 2/day/shop; leak max 3/month; transit max 2/day; global ceiling 500 GP/month. Over-cap actions record with 0 GP and informative messages.

### Step 2: Removal of UPI Cashout & Rupee Rewards
- Deleted all withdrawal routes, UI forms, and ledger disbursement mechanisms.
- Updated user-facing copy: removed all instances of "1 point = ₹1", cash-out, and rupee rewards.
- Rupee symbol (₹) is strictly preserved for real monetary values (discounted surplus food prices, electricity bill amounts, coupon face values like "₹30 off on ₹300+").

### Step 3: Coupon Store & Redemption Lifecycle
- Added Prisma models: `Funder`, `CouponCatalogItem`, `CouponCode`, `Redemption`.
- Added Citizen Rewards Store at `/rewards`: filterable by *Near Me*, *Online*, and *Affordable Now*.
- Built atomic redemption transaction with `Idempotency-Key` deduplication.
- Built Wallet -> **My Coupons** tab with dynamic QR code presentation and unhideable 8-character codes (`PLATFORM_QR`) and copy buttons (`IMPORTED_CODE`).
- Added Merchant Counter terminal at `/merchant/scan`: **Redeem Coupon** tab verifies codes and marks coupons as used.
- Added lazy refund for expired unused coupons moving points from `USER_RESERVED` back to `USER_AVAILABLE`.
- Updated Sponsor Portal (`/sponsor`): tracks coupons funded, issued, used, remaining stock, and redemption rate %, with k-anonymity privacy protection (suppresses user counts under 5).

### Step 4: Concurrency Safety & Security Hardening
- **Single-stamp reuse race fixed:** Used Prisma atomic conditional update `updateMany({ where: { id, usedAt: null, expiresAt: { gt: now } } })` checking `count === 1`.
- **Leak double-bounty prevented:** Atomic status transitions. Prevented original reporter from reviewing or verifying their own report closure (`SELF_VERIFICATION_NOT_ALLOWED`). Tier 2 bonus strictly awarded to the original reporter.
- **Electricity challenge baseline fixed:** Normalized bimonthly bills (59 to 62 days) into `unitsPerDay`. Compares reduction against own actual historical baseline (same period last year or 3-bill average). Disregards self-reported profile survey inputs. Minimum 3 historical bills required.
- **OTP brute-force defense:** 5 wrong attempt lockout and invalidation, 10-minute expiry window.
- **RBAC protection:** CITIZEN role denied (403) from accessing merchant, reviewer, and admin routes.
- **Cryptographic ledger chain:** SHA-256 tamper-evident hash chaining across all `LedgerEntry` records (`prevHash` -> `hash`). Verifiable via `GET /api/admin/ledger/verify`.
- **Dev Role Switcher:** Gated strictly behind `process.env.NODE_ENV === 'development' && process.env.ENABLE_DEV_ROLE_SWITCH === 'true'`.

### Step 5: UI & Copy Overhaul
- **Navbars (`AppNavbar`, `BottomNav`):** Added *Rewards* (`/rewards`) link; replaced ₹ balance with `GP` balance pill.
- **Wallet Page (`/wallet`):** Displays Available Points, Pending Points Schedule (with "Available on <date>"), Expiring Soon (next 30 days), My Coupons, and Double-Entry Ledger History.
- **Merchant Scan (`/merchant/scan`):** Added *Redeem Coupon* tab with lookup, coupon details card, and "Mark as Used" button.
- **Admin Page (`/admin`):** Added *Run Settlement Now* button, *Verify Ledger Integrity* button, and coupon store metrics.
- **Admin Impact (`/admin/impact`):** Replaced hard claims with action counts and scientific emission factor models (CEA 0.82 kg CO2/kWh, CMWSSB leak volume).
- **Landing Page & DashboardPreview (`/`):** Replaced fintech cash balance with 480 GP balance, 3 coupon cards, and added "How Rewards Are Funded" section.

### Step 6: Database Seeding (`prisma/seed.ts`)
- Seeded 3 simulated funders: `FreshMart Grocery` (`MERCHANT`), `EcoBrand CSR` (`SPONSOR`), `GreenBite Organic` (`BRAND`).
- Seeded 6 coupon catalog items (prices 100–300 GP) with 60 unguessable coupon codes.
- Granted `500 GP` available Green Points to demo citizen (`user@demo`) for immediate redemption testing.

### Step 7: LAN & Mobile Styling Fixes
- Restored `@tailwindcss/turbopack` CSS loader in `next.config.ts`, fixing broken/missing Tailwind CSS utilities and generating the complete 105KB stylesheet.
- Added `allowedDevOrigins` in `next.config.ts` allowing `192.168.1.11` and `localhost` so Next.js 16 HMR does not block cross-origin requests.
- Relaxed auth email validation to support `@demo` handles and alias `@demo.com` seamlessly to seeded accounts.
- Added 1-Click Quick Demo Sign-In and dev auto-fill OTP buttons on `/login`.

### Step 8: Elimination of All Rupee Rewards & Source-of-Truth Single Point Engine
- **Single Source of Truth (`src/server/domain/pointsConfig.ts`)**:
  - Centralized canonical reward text and badges:
    - Reuse & Earn: `"10 pts per stamp · +40 bonus at 5 stamps"`
    - Leak Hunter: `"50 pts accepted · +100 when repaired"`
    - Food Rescue: `"15 pts per pickup"`
    - Green Commute: `"5 pts per trip · +25 for 5 trips/week"`
    - Electricity: `"150 pts for 10% less vs your own bills"`
    - Save Water: `"75 pts per verified repair"`
  - Enforced zero tolerance for monetary phrases: replaced "city bounties" with "earn Green Points", "transit rewards" with "Green Points", and all rupee bonus/credit wording with Green Points.
- **Strict Allowlist for Rupee Symbols (`₹`)**:
  - Rupee symbols are strictly forbidden on challenge badges, reward labels, and user wallet balances.
  - ₹ is allowed exclusively for genuine commercial values:
    1. Food Rescue item discounted and original pricing (`₹49`, `₹60`, etc.).
    2. Utility electricity bill charges and calculated bill rupees saved (`₹102`, TANGEDCO bills).
    3. Rewards Store partner coupon face values and minimum spend thresholds (`₹30 off on ₹300+`).
    4. Admin CSR sponsor budget amounts.
- **Vitest Guard Regression Test (`tests/unit/noRupeeGuard.test.ts`)**:
  - Scans `src/` and `prisma/seed.ts` for `₹`, `Rs`, `INR`, and `rupee`.
  - Automatically fails if an un-allowlisted reward string or hardcoded rupee bonus is detected.
  - Renders and validates home dashboard active challenge copy.
- **Visual Browser Verification & Automated Screenshots**:
  - Script: `scripts/capture_screenshots.js` (using Playwright).
  - Captured full-page screenshots to `docs/screenshots/no-rupees/`:
    - `01-home.png`
    - `02-reuse.png`
    - `03-leak.png`
    - `04-food.png`
    - `05-commute.png`
    - `06-electricity.png`
    - `07-water.png`
    - `08-rewards.png`
    - `09-wallet.png`
  - Visually confirmed zero rupee symbols appear on any reward badge, challenge card, or wallet portfolio card.

---

## 3. Files Touched

```text
Database:
  prisma/schema.prisma
  prisma/seed.ts

Domain Logic:
  src/server/domain/pointsConfig.ts
  src/server/domain/caps.ts
  src/server/domain/ledgerChain.ts
  src/server/domain/electricityChallenge.ts
  src/server/domain/wallet.ts

Services:
  src/server/services/walletService.ts
  src/server/services/couponService.ts
  src/server/services/claimService.ts
  src/server/services/leakService.ts
  src/server/services/foodService.ts
  src/server/services/commuteService.ts
  src/server/services/waterService.ts
  src/server/services/electricityService.ts
  src/server/services/authService.ts

API Routes:
  src/app/api/rewards/route.ts
  src/app/api/rewards/redeem/route.ts
  src/app/api/rewards/my-coupons/route.ts
  src/app/api/merchant/coupons/verify/route.ts
  src/app/api/merchant/coupons/use/route.ts
  src/app/api/admin/jobs/settle-points/route.ts
  src/app/api/admin/jobs/expire-points/route.ts
  src/app/api/admin/ledger/verify/route.ts
  src/app/api/admin/catalog/route.ts
  src/app/api/admin/catalog/[id]/codes/route.ts
  src/app/api/dev/switch-role/route.ts
  src/app/api/wallet/ledger/route.ts
  src/app/api/claims/[opaqueId]/confirm/route.ts
  src/app/api/leaks/[id]/verify/route.ts

UI Components & Pages:
  src/app/(app)/rewards/page.tsx
  src/app/(app)/wallet/page.tsx
  src/components/wallet/WalletView.tsx
  src/app/merchant/scan/page.tsx
  src/app/admin/page.tsx
  src/components/admin/AdminOperations.tsx
  src/app/admin/impact/page.tsx
  src/app/sponsor/page.tsx
  src/app/page.tsx
  src/components/landing/DashboardPreview.tsx
  src/components/layout/AppNavbar.tsx
  src/components/layout/BottomNav.tsx
  src/app/layout.tsx
  package.json
  next.config.ts

Unit Tests:
  tests/unit/concurrencyAndCoupons.test.ts
  tests/unit/ledgerTamper.test.ts
  tests/unit/electricityChallenge.test.ts
  tests/unit/pointsAndCaps.test.ts
  tests/unit/wallet.test.ts

Documentation:
  README.md
  DECISIONS.md
  CHANGES_SUMMARY.md
```

---

## 4. Unfinished Items
**None.** All requirements specified in Steps 0 through 8 were implemented, validated, and verified with 100% test pass rate and clean Next.js production builds.

---

## 5. How to Demo Each Feature

### A. Demo Green Points & Instant Coupon Redemption (Citizen Flow)
1. Sign in as demo citizen: `user@demo` (OTP is printed to your terminal console).
2. Look at the top-right navbar: your balance is **500 GP** (pre-seeded).
3. Navigate to **Rewards** (`/rewards`):
   - Browse the 6 sponsor coupons from FreshMart, EcoBrand, and GreenBite.
   - Click the **Affordable Now** filter.
   - Click **Redeem** on **FreshMart ₹30 Off** (100 GP). Review terms in modal and click **Redeem for 100 GP**.
   - Note the unguessable assigned coupon code (e.g. `FM30-86D1-5EC0`).
4. Click **View in Wallet** or go to `/wallet`:
   - Your Available balance is now **400 GP**.
   - Click the **My Coupons** tab. See your active coupon.
   - Click **Show QR** to view the scannable dynamic QR code and 8-character redemption code.

### B. Demo In-Store Coupon Redemption (Merchant Flow)
1. Sign in as merchant: `merchant@demo`.
2. Navigate to `/merchant/scan`.
3. Click the **Redeem Coupon** tab.
4. Paste or enter the 8-character coupon code from Step A (e.g. `FM30-86D1-5EC0`) and click **Verify**.
5. The terminal renders coupon details: *FreshMart ₹30 Off on ₹300+*, Customer: *Priya Kumar*, Status: *VALID*.
6. Click **✓ Mark as Used**.
7. The terminal confirms redemption, marks the coupon code as `USED`, and updates the double-entry ledger (`USER_RESERVED` -> `REDEEMED`).

### C. Demo Admin Settlement & Cryptographic Ledger Audit (Admin Flow)
1. Sign in as admin: `admin@demo`.
2. Navigate to `/admin`.
3. Under **System Operations & Verification**:
   - Click **Verify Ledger Integrity**: audits all SHA-256 cryptographic chain hashes from genesis to head and displays `✓ Ledger verified intact across X entries!`.
   - Click **Run Settlement Now (Demo)**: runs the settlement engine immediately, moving matured pending points into available points.

---

### Step 9: Unified Authentication, Role Continuation Screen (`/choose-role`) & Portals

1. **Elimination of Admin Login Page**:
   - Zero separate admin login screens or links anywhere in the application.
   - Unified `/login` accepting Email OR Username handle (e.g. `admin.demo` or `user@demo`).
   - Quick Demo Access buttons for all 7 roles + collapsible accordion listing all seeded demo accounts with 1-click credential fill.

2. **Role Picker (`/choose-role`)**:
   - Multi-role continuation screen ("How do you want to continue, <name>?") shown when an authenticated user holds 2+ granted roles or is an administrative staff account.
   - Large cards featuring icons, partner names (e.g. *FreshMart, Potheri* or *Quick Fix Plumbing*), and clear capability descriptions.
   - Cards appear strictly for roles granted in the database. Choosing a role never grants it.
   - Includes "Remember my choice on this device" preference checkbox.
   - Single-role citizens skip the picker and navigate directly to `/home`.

3. **Server-Side Session Storage & Dynamic RBAC**:
   - Session table (`Session`) stores `activeRole` on the server.
   - Every request re-evaluates the user's active role against live `RoleGrant` rows. If an admin revokes a grant while the user is logged in, their session automatically falls back to `CITIZEN` on the very next lookup.
   - Navbar avatar dropdown displays "You're using: [Role]", with a direct "Switch role" link to `/choose-role` for users holding multiple grants.
   - Non-citizen portals display a persistent mode badge (e.g. *Shopkeeper mode*, *Plumber mode*, *Food Partner mode*, *Admin mode*).

4. **Role Application Flow (`/apply`)**:
   - Dedicated application portal where citizens can apply for:
     - `Shopkeeper` (shop name, address, category, phone, description)
     - `Plumber` (business name, service area, phone, description)
     - `Food Partner (NGO)` (NGO name, drop-off locality, phone, description)
     - `Sponsor` (company name, locality, phone, CSR description)
   - `ADMIN` and `REVIEWER` cannot be applied for (granted by system administrators only).
   - Admin review at `/admin/applications`: filter tabs (All, Pending, Approved, Rejected) and modals to Approve (automatically creates `Partner`, links `RoleGrant`, logs audit entry, sends notification) or Reject with reason.

5. **Staff Administration & Lockout Prevention**:
   - Staff accounts holding `ADMIN` are required to have usernames starting with `admin` prefix (e.g. `admin.demo`). Public signups and username edits cannot take any handle starting with `admin` or lookalikes (`adm1n`, `_admin`, `.admin`, etc.).
   - Admin users management at `/admin/users`: view all users and staff, toggle roles, and create new staff members with reserved prefix enforcement.
   - Lockout prevention guards:
     - Cannot remove own last admin role (`CANNOT_REMOVE_OWN_LAST_ADMIN_ROLE`).
     - Cannot remove last system administrator (`CANNOT_REMOVE_LAST_SYSTEM_ADMIN`).
   - Partners directory at `/admin/partners`: toggle `isSimulated` status on any partner or funder.

6. **Dedicated Portals for Every Role**:
   - **Citizen** (`/home`): Green Points balance, action cards, nearby rewards map, impact overview.
   - **Shopkeeper** (`/merchant`): Scan customer reuse QR codes, confirm bag stamps, redeem store coupons.
   - **Plumber** (`/plumber`): Browse available plumbing job requests, manage active jobs with stage tracker (`REQUESTED` -> `ACCEPTED` -> `VISITED` -> `REPAIRED` -> `VERIFIED`), view citizen address, log before/after photos and meter readings.
   - **Food Partner / NGO** (`/partner`): Surplus food rescue parcels, intake inspection releasing 15 GP to volunteer courier, manage collection centre hubs, track volunteer deliveries.
   - **Reviewer** (`/reviewer`): Review water leak reports, inspect plumber/household repair proofs, audit commute transit tickets.
   - **Sponsor** (`/sponsor`): CSR campaign funding, coupon issuance & inventory metrics with k-anonymity privacy protection.
   - **Admin** (`/admin`): Applications review (`/admin/applications`), users & staff management (`/admin/users`), partners directory (`/admin/partners`), cryptographic ledger verification, points settlement.

7. **Visual Verification Screenshots (`docs/screenshots/roles/`)**:
   - `01-login-single-entry.png`: Unified single login + quick demo access accordion.
   - `02-choose-role-admin.png`: Multi-role continuation screen for `admin@demo` showing Admin, Reviewer, and Citizen.
   - `03-choose-role-shopkeeper.png`: Role continuation screen for `shop@demo` showing Shopkeeper (FreshMart) and Citizen.
   - `04-portal-plumber.png`: Plumber portal (`/plumber`) with stage tracker and active repair claims.
   - `05-portal-partner.png`: Food Partner portal (`/partner`) with donation parcels and collection centres.
   - `06-portal-merchant.png`: Merchant portal (`/merchant`) with Shopkeeper mode badge and quick role switcher.
   - `07-portal-admin-applications.png`: Admin review portal (`/admin/applications`) with pending application from `user2@demo`.
   - `08-portal-admin-users.png`: Admin user management (`/admin/users`) with role grants and staff creation modal.
   - `09-citizen-apply.png`: Citizen role application form (`/apply`).

### Step 10: Real-Time Cross-Portal Connectivity & Counter Terminal Manual Verification
- **Shopkeeper Counter Terminal Manual Code Verification (`/merchant/scan`)**:
  - Added dedicated manual code verification inputs alongside camera QR scanning across all 3 modes:
    - **Reuse Stamp**: Enter 6-character alphanumeric claim code (or paste JSON QR payload). Displays customer name, offer, and current stamp count (`3/5 Stamps`), with receipt reference and "✓ Confirm Stamp & Award Points" button.
    - **Redeem Coupon**: Enter 8-character coupon code (e.g. `ECO-4892`). Displays face value, customer, and "Confirm & Mark Redeemed" button.
    - **Food Pickup**: QR scanner + manual 4-character pickup code input (e.g. `7K4W`). Confirming verifies pickup and credits 15 GP to the citizen.
- **Robust QR/JSON Handling**:
  - `getClaimDetails` and `confirmClaim` in `src/server/services/claimService.ts` automatically parse JSON payloads (`{"opaqueId":"...","code":"..."}`) if scanned by high-res cameras or pasted from text clips.
- **Citizen <-> Shopkeeper Real-Time Feedback**:
  - `QrDisplay.tsx` continuously polls `/api/claims/${opaqueId}` every 2 seconds. As soon as the shopkeeper clicks confirm on `/merchant/scan`, the citizen screen instantly updates to `"✅ Stamp Confirmed! +10 Green Points added to your ledger."`
- **End-to-End Water & Plumber Workflow**:
  - Citizens on `/water` can submit a plumbing assistance request selecting fixture category (`TAP`, `PIPE`, `TOILET`, `METER`, `TANK`), locality, address, and notes. Includes a 1-click **"Use Sample Photo"** button for instant testing.
  - Plumbers on `/plumber` instantly see new requests under **Available Requests**, click **Accept Job** (which securely reveals the customer's street address), and advance stages (`ACCEPTED` -> `VISITED` -> `REPAIRED`).
  - Citizens see live status badges (`Awaiting Plumber`, `Plumber Accepted`, `Plumber Visited`, `Review in Progress`, `✓ 75 GP Awarded`) with a **"↻ Update Feed"** button.
  - Reviewers on `/reviewer` audit completed repairs via `WaterReviewCard` with fixture details and notes, awarding 75 Green Points upon verification.
- **Role Application & Instant Session Switching**:
  - Applications submitted at `/apply` immediately appear under `/admin/applications`.
  - Admin approval automatically provisions a Partner record and grants the role.
  - Role switcher re-issues session cookies so the user can immediately switch to their new role without re-logging in.
- **Comprehensive Vitest Integration Suite (`tests/unit/crossPortalWorkflows.test.ts`)**:
  - 5 tests covering all cross-portal workflows:
    1. Reusable bag stamp claim verification by shopkeeper via 6-character code.
    2. Reusable bag stamp claim verification via QR payload JSON string.
    3. Water leak request -> Plumber job acceptance -> Reviewer closure & 75 GP award.
    4. Food rescue reservation -> Shopkeeper 4-character code pickup confirmation.
    5. Role application submission -> Admin approval -> Partner & RoleGrant verification.

---

## 4. How to Demo Every Role

### 1. Citizen Demo (`user@demo`)
- Sign in on `/login` using `user@demo` (or click "Citizen" in Quick Demo).
- Lands directly on `/home` (no picker, single role).
- View available **500 GP** balance, browse sustainable actions, and redeem partner coupons in the Rewards Store (`/rewards`).

### 2. Shopkeeper Demo (`shop@demo`)
- Sign in on `/login` using `shop@demo`.
- Lands on `/choose-role` showing **Shopkeeper - FreshMart Grocery** and **Citizen**.
- Select **Shopkeeper**: lands on `/merchant` with "Shopkeeper mode" navbar badge.
- Open `/merchant/scan` to verify customer stamp claims or redeem coupon codes.

### 3. Plumber Demo (`plumber@demo`)
- Sign in on `/login` using `plumber@demo`.
- Lands on `/choose-role` showing **Plumber - Quick Fix Plumbing** and **Citizen**.
- Select **Plumber**: lands on `/plumber` with "Plumber mode" badge.
- View available household plumbing jobs in Potheri/Kattankulathur, accept jobs, advance stages (`ACCEPTED` -> `REPAIRED`), view citizen address, and record meter readings.

### 4. Food Partner / NGO Demo (`ngo@demo`)
- Sign in on `/login` using `ngo@demo`.
- Lands on `/choose-role` showing **Food Partner - Simulated Food Bank** and **Citizen**.
- Select **Food Partner**: lands on `/partner` with "Food Partner mode" badge.
- View incoming surplus food donation batches from Annapoorna Kitchen and inspect incoming volunteer parcel deliveries releasing 15 GP to courier.

### 5. Reviewer Demo (`reviewer@demo`)
- Sign in on `/login` using `reviewer@demo`.
- Lands on `/choose-role` showing **Reviewer** and **Citizen**.
- Select **Reviewer**: lands on `/reviewer` with "Reviewer mode" badge.
- Review community leak reports, inspect plumbing repairs, and verify transit tickets.

### 6. Sponsor Demo (`sponsor@demo`)
- Sign in on `/login` using `sponsor@demo`.
- Lands on `/choose-role` showing **Sponsor - EcoBrand CSR** and **Citizen**.
- Select **Sponsor**: lands on `/sponsor` with "Sponsor mode" badge.
- View corporate sustainability impact, budget utilization, and coupon issuance metrics.

### 7. Administrator Demo (`admin@demo` or `@admin.demo`)
- Sign in on `/login` entering username `admin.demo` or email `admin@demo`.
- Lands on `/choose-role` showing all 3 granted roles: **Admin**, **Reviewer**, and **Citizen**.
- Select **Admin**: lands on `/admin` with "Admin mode" badge.
- Click **Role Applications** (`/admin/applications`): review pending application from `Arjun Sharma (user2@demo)` for Sharma Organics & Cafe. Click **Review** and **Approve**.
- Click **Users & Roles** (`/admin/users`): inspect staff accounts with reserved `admin.` handles, toggle roles, test self-lockout prevention.
- Click **Partners & Funders** (`/admin/partners`): toggle simulated vs real partner status.
- Verify ledger cryptographic integrity and run points settlement engine.
