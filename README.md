# 🌱 Green Rewards — Civic Sustainability Platform

A full-stack, enterprise-grade sustainability platform for Chennai, incentivizing civic habits through verified proof-of-action and sponsor-backed discount coupons.

Built with **Next.js 16 (App Router)**, **React 19**, **TypeScript**, **Tailwind CSS**, **Prisma ORM 7** (SQLite for zero-config local dev / PostgreSQL-ready), and **Vitest**.

---

## 🚀 Key Features & Architectural Upgrades

### 1. Green Points (GP) & Non-Monetary Incentive Economy
- **No Cash-Outs:** Deprecated UPI cashouts. Rewards are issued as **Green Points (GP)** redeemable strictly for sponsor-funded merchant coupons and promo codes.
- **Double-Entry Ledger:** Balanced DEBIT and CREDIT entries sharing a `transactionId` across accounts: `USER_AVAILABLE`, `USER_PENDING`, `USER_RESERVED`, `SPONSOR_POOL`, `REDEEMED`, `EXPIRED`, `REVERSED`.
- **Earning Table:**
  - Reusable Bag Stamp: `10 GP` (Card completion bonus: `40 GP`)
  - Water Leak Report Accepted: `50 GP` (Verified Repair closed: `100 GP` to original reporter)
  - Food Rescue Pickup: `15 GP`
  - Clean Transit Trip: `5 GP` (5-trip streak bonus: `25 GP`)
  - Electricity 10% Reduction vs Own Baseline: `150 GP`
  - Household Plumbing Repair Verified: `75 GP`
- **Anti-Spam Caps:** Daily reuse limit (2 stamps/shop/day), monthly leak limit (3/user/month), daily transit limit (2/day), global ceiling (`500 GP`/user/month).

### 2. Coupon Store & Merchant Checkout
- **Catalog Grid (`/rewards`):** Citizen rewards store filtered by *Near Me*, *Online*, and *Affordable Now*.
- **Atomic Redemptions:** In a single ACID transaction, stock is atomically reserved, an unguessable code assigned, and points moved from `USER_AVAILABLE` to `USER_RESERVED`.
- **Counter Verification (`/merchant/scan`):** Merchants can scan dynamic QR codes or enter 8-character codes to redeem coupons, confirm reusable bag stamps, or confirm surplus food pickups.
- **Lazy Settlement & Refund:** Unused expired coupons automatically refund points from `USER_RESERVED` back to `USER_AVAILABLE`.

### 3. Concurrency Safety & Race Condition Defense
- **Atomic Compare-and-Swap:** Uses Prisma conditional updates `updateMany({ where: { id, usedAt: null, expiresAt: { gt: now } }, data: { usedAt: now, status: 'CONFIRMED' } })` checking `count === 1`. Prevents double-confirmations or negative stock under parallel requests.

### 4. Cryptographic Tamper-Evident Ledger
- **SHA-256 Chaining:** Every `LedgerEntry` links to `prevHash` of the immediately preceding entry. Any direct database tampering breaks the cryptographic chain and is detected via `GET /api/admin/ledger/verify`.

### 5. Electricity Baseline Normalization
- **Bimonthly Days Normalization:** TNPDCL cycles (59 to 62 days) are normalized into `unitsPerDay`. Compares reduction strictly against the user's own actual bills (same billing period last year, or 3-bill historical average), strictly ignoring self-reported profile survey inputs.

---

## 🛠️ Quick Start

### 1. Prerequisites & Environment
Ensure Node.js 20+ is installed. Clone the repository and install dependencies:
```bash
npm install
```

Verify your environment settings in `.env.local`:
```bash
DEMO_FAST_SETTLE="true"       # Settle pending points in 1 minute instead of 7 days
ENABLE_DEV_ROLE_SWITCH="true"  # Enables developer role switching in local dev
```

### 2. Seed Database
Seed simulated funders, coupon catalog items, and demo accounts:
```bash
npx prisma db push
npm run db:seed
```

### 3. Run Development Server
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) to view the application.

### 4. Run Test Suite
```bash
npm test
```
Executes all 16 Vitest test suites (125 tests) covering concurrency, cryptographic tampering, points caps, electricity challenge normalization, and role-based access control.

---

## 🎭 Demo Credentials & User Personas

OTPs are printed to the developer console on login in development mode.

| Persona | Email | Description |
| :--- | :--- | :--- |
| **Citizen (Demo)** | `user@demo` | Priya Kumar — seeded with 500 GP for instant coupon redemption testing |
| **Citizen 2** | `user2@demo` | Arjun Sharma |
| **Merchant** | `merchant@demo` | FreshMart Grocery counter terminal at Potheri |
| **Reviewer** | `reviewer@demo` | Authority reviewer for water leaks & commute tickets |
| **Sponsor** | `sponsor@demo` | EcoBrand CSR funder analytics portal |
| **Admin** | `admin@demo` | Full administrative control, settlement trigger & ledger verification |

---

## 🧪 Demo Script

1. **Sign in as Citizen (`user@demo`)**:
   - Navigate to `/rewards` to view the Rewards Store.
   - Click **Redeem** on the *FreshMart ₹30 Off* coupon (100 GP). Confirm redemption.
   - Go to `/wallet` and open the **My Coupons** tab. Click **Show QR** to view the dynamic QR code and 8-character redemption code.
2. **Switch to Merchant (`merchant@demo`)**:
   - Go to `/merchant/scan` and select the **Redeem Coupon** tab.
   - Enter the 8-character coupon code from step 1.
   - View coupon details and click **Mark as Used**. Observe instant points settlement (`RESERVED` -> `REDEEMED`).
3. **Switch to Admin (`admin@demo`)**:
   - Go to `/admin`.
   - Click **Verify Ledger Integrity** to audit the append-only SHA-256 cryptographic chain.
   - Click **Run Settlement Now (Demo)** to settle pending points immediately.
