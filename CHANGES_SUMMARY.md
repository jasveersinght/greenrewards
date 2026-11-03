# 📋 Changes Summary: Green Points & Coupon Store Upgrade

## 1. Metrics & Test Counts

| Metric | Before Upgrade | After Upgrade | Delta |
| :--- | :--- | :--- | :--- |
| **Test Suites (Vitest)** | 12 files passed | **16 files passed** | **+4 suites** |
| **Total Unit Tests** | 102 passed, 0 failed | **125 passed, 0 failed** | **+23 tests** |
| **Production Routes** | 55 compiled | **66 compiled** | **+11 routes** |
| **TypeScript / Build Errors**| 0 | **0** | Clean |

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
