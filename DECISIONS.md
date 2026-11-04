# Project Upgrade: Decisions Log

All architectural choices and resolutions for ambiguous specifications are recorded here.

## Baseline
- Date: 2026-11-03
- Initial test count: 102 passed across 12 suites, 0 failures.
- Initial build: 55 static and dynamic routes compiled with 0 errors.

## Architectural Decisions

### 1. Points Ledger & Double-Entry Accounting
- **Decision:** Shifted user-facing balances from paise (`amountPaise`) to Green Points (`amountPoints`: Int) with balanced DEBIT and CREDIT sides sharing a unique `transactionId`.
- **Reasoning:** In compliance with non-monetary regulatory and platform rules, Green Points are strictly incentive units and cannot be converted to rupees or withdrawn.
- **Account Types:** `SPONSOR_POOL`, `USER_PENDING`, `USER_AVAILABLE`, `USER_RESERVED`, `REDEEMED`, `EXPIRED`, `REVERSED`.
- **Settlement & Expiry:** Pending points mature after 7 days (or 1 minute when `DEMO_FAST_SETTLE=true`). Settled points expire after 12 months.

### 2. Elimination of UPI Cashout & Rupee Rewards
- **Decision:** Fully removed UPI withdrawal endpoints, forms, and ledger disbursement mechanisms.
- **Reasoning:** Points are not cash; the app partners with merchants and CSR sponsors to provide funded coupons and vouchers instead of cash transfers. The rupee symbol (₹) is kept exclusively for real financial values (food prices, utility bills, coupon face values like "₹30 off on ₹300+").

### 3. Concurrency Safety Across SQLite and PostgreSQL
- **Decision:** Applied atomic conditional updates using Prisma's `updateMany({ where: { id, usedAt: null, expiresAt: { gt: now } }, data: { usedAt: now, status: 'CONFIRMED' } })` checking `count === 1`.
- **Reasoning:** Prevents parallel requests from racing to double-confirm claims, double-claim bounties, or drive coupon stock into negative numbers.

### 4. Cryptographic Tamper-Evident Ledger
- **Decision:** Implemented SHA-256 hash chaining on all `LedgerEntry` records (`prevHash` -> `hash`).
- **Reasoning:** Provides an audit trail verifiable back to the genesis block via `GET /api/admin/ledger/verify`. Any manual DB tampering immediately flags the exact mismatched entry ID.

### 5. Electricity Challenge Baseline Normalization
- **Decision:** TNPDCL bimonthly bills vary between 59 and 62 days. Normalized consumption into `unitsPerDay`. Evaluates reduction against the citizen's own actual historical baseline (same billing period last year, or 3-bill historical average).
- **Reasoning:** Completely disregards self-reported profile survey inputs to prevent artificial baselines. Users with fewer than 3 historical bills are flagged ineligible until sufficient history is provided.

### 6. Dev Role Switcher
- **Decision:** Added `POST /api/dev/switch-role` restricted strictly to `process.env.NODE_ENV === 'development' && process.env.ENABLE_DEV_ROLE_SWITCH === 'true'`.
- **Reasoning:** Enables rapid local demonstration and automated testing across `CITIZEN`, `MERCHANT`, `REVIEWER`, `SPONSOR`, and `ADMIN` personas without compromising production security.

### 7. Reward Labels Single Source of Truth & Zero-Rupee Guard Test
- **Decision:** Consolidated all challenge and action reward badges and copy into `src/server/domain/pointsConfig.ts` with helper functions (`SECTION_REWARD_LABELS`, `SECTION_REWARD_BADGES`, `formatReward()`).
- **Reasoning:** Prevents copy drift and ensures all challenge cards (Reuse, Leak Hunter, Food Rescue, Green Commute, Electricity, Water) derive labels strictly from the points configuration.
- **Rule:** The rupee symbol (`₹`) and monetary terms ("Rs", "INR", "cash", "withdraw", "bounty", "credit") are strictly forbidden on challenge badges, reward labels, and wallet balances. ₹ is permitted ONLY for real consumer prices: food item purchase prices, utility bill amounts, and coupon face values (`faceValueText`).
- **Guard Test:** Added Vitest unit test `tests/unit/noRupeeGuard.test.ts` scanning `src/` and `prisma/seed.ts` for rupee references, failing on un-allowlisted instances or hardcoded reward amounts.
- **Next.js 16 Production Build:** Updated `package.json` `"build"` script to use `next build --webpack` to avoid Turbopack CSS worker IPC panic on Windows (`leaflet.css.css` evaluate_webpack_loader child process crash).

### 8. Unified Authentication & Multi-Role Architecture
- **Single Login Page:** Completely eliminated separate admin login pages or buttons. All users (Citizens, Shopkeepers, Plumbers, Reviewers, Food Partners, Sponsors, Admins) log in via `/login` using Email OR Username handle + OTP.
- **Role Continuation Screen (`/choose-role`):** When a user holds 2 or more granted roles or is an administrative staff member, they are presented with a role picker ("How do you want to continue, <name>?"). Cards with icon, business name, and permission descriptions are displayed strictly for granted roles. Single-role citizens skip the picker and land directly on `/home`.
- **Database-Backed Sessions (`Session` table):** The user's chosen `activeRole` is stored in the database session record (`Session.activeRole`). On every request, `verifySession()` confirms the active role against live `RoleGrant` rows. If a grant is revoked by an admin, the active session automatically falls back to `CITIZEN`.
- **Admin Self-Lockout & System Lockout Prevention:** The role revocation endpoint (`/api/admin/users/[id]/roles`) explicitly blocks an admin from removing their own last ADMIN role (`CANNOT_REMOVE_OWN_LAST_ADMIN_ROLE`) and prevents removing the last system administrator (`CANNOT_REMOVE_LAST_SYSTEM_ADMIN`).
- **Staff Username Namespace:** All staff accounts holding the `ADMIN` role are required to have a handle starting with `admin` (e.g. `admin.demo`, `admin.kavitha`). Public registrations and citizen profile updates reject any username starting with `admin` or homoglyphs/lookalikes (`adm1n`, `_admin`, `.admin`, etc.).

### 9. Cross-Portal Real-Time Connectivity & Counter Terminal Manual Verification
- **Shopkeeper Counter Terminal Manual Code Verification:** On `/merchant/scan`, all 3 counter operations (Reusable Bag Stamp claims, Store Coupon redemption, and Food Rescue surplus pickups) feature both a live camera QR scanner and a dedicated manual alphanumeric code input box. This allows shopkeepers to manually type or paste the 6-character claim code, 8-character coupon code, or 4-character food pickup code.
- **Robust QR/JSON Payload Decoding:** Enhanced `getClaimDetails` and `confirmClaim` to seamlessly decode JSON string payloads (`{"opaqueId":"...","code":"..."}`) when scanned or pasted into the manual input box.
- **Citizen <-> Shopkeeper Real-Time Feedback:** `QrDisplay.tsx` polls `/api/claims/${opaqueId}` every 2 seconds. When the Shopkeeper confirms the stamp on `/merchant/scan`, the citizen's screen immediately transitions to "Stamp Confirmed! +10 Green Points added to your ledger."
- **Citizen <-> Plumber <-> Reviewer Water Flow:** Citizens on `/water` can submit a repair request for community plumbers (`repairStage: 'REQUESTED'`). Plumbers on `/plumber` instantly see it in "Available Requests", accept the job (which reveals the customer address), and mark it as visited and repaired. Reviewers on `/reviewer` audit the claim with full fixture context and verify it, crediting 75 Green Points to the citizen's wallet.
- **Citizen <-> Admin Role Application Flow:** When citizens apply for Partner roles (Shopkeeper, Plumber, Food Partner, Sponsor) at `/apply`, requests appear under `/admin/applications`. Approving an application creates the Partner record and grants the role, instantly enabling the user to switch roles via `/choose-role` or the navbar avatar menu.

- **Citizen Role Applications (`/apply`):** Citizens can apply for `SHOPKEEPER`, `PLUMBER`, `FOOD_PARTNER`, or `SPONSOR`. Applications are reviewed and approved/rejected with reason at `/admin/applications`. Approving an application automatically creates the `Partner` record, links it, and grants the role. `ADMIN` and `REVIEWER` roles cannot be applied for and are grantable by administrators only.
- **Dedicated Portals for Every Role:**
  * `CITIZEN` -> `/home`
  * `SHOPKEEPER` -> `/merchant` (Counter Terminal at `/merchant/scan`)
  * `PLUMBER` -> `/plumber`
  * `REVIEWER` -> `/reviewer`
  * `FOOD_PARTNER` -> `/partner`
  * `SPONSOR` -> `/sponsor`
  * `ADMIN` -> `/admin`

### 10. Plumber Portal Access & Admin Role Switching Fix
- **Problem:** When opening the Plumber portal from Admin or clicking Plumber on `/choose-role`, users experienced unexpected redirects to `/login`.
- **Root Causes:**
  1. *Token Mismatch on Role Switch:* When switching roles via `POST /api/auth/choose-role`, a re-issued JWT was saved to the cookie, but the existing database `Session` row still contained the old token string. Subsequent server layout calls (`getSession()`) looking up `token` failed to find a match and triggered `if (!session) redirect('/login')`.
  2. *Admin Multi-Role Privileges:* Superuser `admin@demo` accounts previously only held explicit DB grants for `['ADMIN', 'REVIEWER', 'CITIZEN']`. Switching to `PLUMBER` or visiting `/plumber` failed authorization checks.
  3. *Client-side Soft Navigation:* `router.push('/plumber')` sometimes performed RSC fetches before the new cookie was registered in the browser, causing stale unauthenticated responses.
  4. *Partner Profile Mismatch:* `session.partnerIds[0]` assumed the first linked partner was always the active role's partner, which mismatched when a user or administrator held multiple partner grants.
- **Fixes Applied:**
  1. *Database Self-Healing Sessions (`src/server/session.ts`):* If `verifySession` receives a cryptographically valid JWT whose DB row was replaced or touched, it automatically re-syncs the token or restores the DB session row so users are never ejected to `/login`.
  2. *Universal Portal Privileges for Admins:* Users with the `ADMIN` role grant or staff usernames are granted access across all 7 portals (`/plumber`, `/merchant`, `/reviewer`, `/partner`, `/sponsor`, `/admin`, `/home`).
  3. *Type-Specific Partner Matching:* Plumber layout and endpoints look up partners with `type: 'PLUMBER'` matching the user's granted partner IDs, falling back to the default certified plumbing partner for admins.
  4. *Reliable Full Navigations:* Updated `choose-role` and login redirects to use `window.location.href`, guaranteeing cookie attachment on initial document fetch.
  5. *Direct Portal Navigation in Admin Dashboard:* Added an "Operator Portals" section to `src/app/admin/layout.tsx` (sidebar) and `src/app/admin/page.tsx` (dashboard quick access) allowing admins to directly access the Plumber Portal, Shopkeeper Terminal, Reviewer Queue, and Food Partner Hub with one click.
  - Citizen (`/home`)
  - Shopkeeper (`/merchant`): Scan customer reuse stamps, verify claims, redeem coupons
  - Plumber (`/plumber`): View available plumbing jobs, manage active repair stages (`REQUESTED` -> `ACCEPTED` -> `VISITED` -> `REPAIRED` -> `VERIFIED`), view citizen address, log before/after photos and meter readings
  - Food Partner (`/partner`): Surplus food parcel donation requests, parcel intake inspection releasing 15 GP to volunteer courier, collection centre hubs, volunteer missions
  - Reviewer (`/reviewer`): Audit leak reports, verify water repair claims, review commute tickets
  - Sponsor (`/sponsor`): CSR sustainability dashboards, coupon issuance & metrics
  - Admin (`/admin`): Applications queue (`/admin/applications`), user & staff management with role toggles (`/admin/users`), partners directory with simulated toggles (`/admin/partners`), points settlement, and ledger cryptographic verification
- **Edge Middleware Decoupling (`sessionToken.ts`):** Next.js middleware runs in Edge/proxy context where Prisma and Node.js native bindings cannot execute. We decoupled JWT signing/verification (`src/server/sessionToken.ts`) using Edge-safe `jose` for route gating in `middleware.ts`, while keeping full database-backed live session verification (`src/server/session.ts`) in Server Components and API routes.


