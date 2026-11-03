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
