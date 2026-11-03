# Architectural Decisions — Green Rewards

This document records the architectural and design decisions made for the Green Rewards platform.

---

## ADR 001: Session & Authentication
* **Decision**: Stateless JWT signed via `jose`, stored in an `httpOnly`, `SameSite=Lax`, secure cookie (`gr_session`).
* **Rationale**: Avoids database round-trips on every authenticated page load and API route. Provides tamper-proof user ID and role claims accessible in edge middleware and server components.

## ADR 002: Passwordless Email OTP
* **Decision**: 6-digit cryptographic OTP (`crypto.randomInt`), stored hashed with `bcryptjs` (salt rounds: 10), with a 10-minute expiry, 5-attempt rate limit lockout, and 60-second resend cooldown.
* **Rationale**: Eliminates password management and credential stuffing risks while keeping onboarding frictionless. Plaintext OTPs are never stored in the database. In local dev mode, the OTP is printed to the server console and exposed via a dev-only banner and endpoint for testing.

## ADR 003: Monetary Values in Integer Paise
* **Decision**: All monetary balances, vouchers, and rewards are stored as integer paise (`Int` / `BigInt`, 100 paise = ₹1.00). Floating-point types are strictly forbidden for currency.
* **Rationale**: Eliminates IEEE 754 floating-point rounding inaccuracies in financial ledgering and budget deductions.

## ADR 004: Double-Entry / Append-Only Ledger for Wallet Balances
* **Decision**: User wallet balances (`availablePaise`, `pendingPaise`, `stamps`) are never mutated in-place on user records; instead, they are derived from an immutable, append-only `LedgerEntry` stream.
* **Rationale**: Complete audit trail, idempotency, fraud detection, and easy dispute reconciliation.

## ADR 005: Database Compatibility & SQLite in Development
* **Decision**: Prisma ORM with `@prisma/adapter-better-sqlite3` and SQLite (`dev.db`) for lightweight local development, seeded with Chennai (SRM IST Kattankulathur) locations and test partners.
* **Rationale**: Zero external Docker/Postgres daemon prerequisites needed to spin up, run tests, and develop locally.

## ADR 006: Simulated Partner and Authority Flags
* **Decision**: All partner accounts (Chennai Metro Water, SRM EcoCell, GreenHands NGO, EcoBrand, etc.) have an explicit `isSimulated: true` flag in the database and a visible badge in the UI.
* **Rationale**: Clear visual transparency that rewards and partners in this demo/academic environment are simulated while maintaining full functional reality.

## ADR 007: Privacy & Public Location Scoping
* **Decision**: Locations have an `isPublic` flag; private user addresses and household leak submissions are never surfaced via public map discovery endpoints (`/api/nearby`). This is enforced both at the SQL query level and through a pure domain `filterPublicLocations` guard.
* **Rationale**: Protects citizen privacy and complies with data protection standards.

## ADR 008: Dynamic QR Claims with 120-Second TTL and 6-Character Fallback
* **Decision**: Single-use dynamic claims are minted with an opaque ID and a 120-second TTL. A human-readable 6-character uppercase alphanumeric code (excluding ambiguous characters `0/O`, `1/I`, `8/B`) is displayed alongside the QR code.
* **Rationale**: Prevents screenshot sharing, replay attacks, and offline hoarding of stamp claims. The 6-character fallback guarantees high reliability if the merchant's camera or barcode scanner struggles with low lighting or damaged camera lenses.

## ADR 009: Atomic Stamp Confirmation & Auto-Voucher Milestone Fulfillment
* **Decision**: Merchant verification runs inside a single Prisma `$transaction` that validates claim freshness, merchant partner authorization, and daily limits; marks the claim confirmed; updates the user's `StampCard`; appends an `EARN_STAMP` entry to the double-entry ledger; and, if the milestone is reached (e.g. 5 stamps), automatically mints a 30-day `Voucher` and credits the user's available wallet balance.
* **Rationale**: Eliminates race conditions, duplicate stamps, and desynchronization between stamp counts and issued vouchers.

## ADR 010: Client-Side Leaflet Map Wrapper & OpenStreetMap CartoDB Tiles
* **Decision**: Interactive map rendering uses Leaflet with custom DOM divIcons and CartoDB Voyager tiles, encapsulated in a client-only component loaded with `next/dynamic` (`ssr: false`).
* **Rationale**: Avoids server-side `window is not defined` errors during Next.js SSR/prerender while providing a fast, zero-API-key mapping solution with custom emoji category pins.

## ADR 011: Public Leak Case Deduplication (50m Clustering) & Two-Tier Bounties
* **Decision**: New citizen leak reports within 50 meters of an existing open case (`SUBMITTED`, `ACCEPTED`, `ASSIGNED`, `REPAIRED`) are automatically joined to the existing case as a duplicate report (`isDuplicate: true`), triggering a `DUPLICATE_JOINED` event. Bounties are staged into two tiers: Tier 1 (₹100 upon reviewer acceptance) and Tier 2 (₹150 upon verified repair confirmation). Reviewers cannot adjudicate their own reported cases.
* **Rationale**: Prevents notification storms and fragmented tracking for the same municipal pipe burst, while incentivizing both discovery and verified resolution.

## ADR 012: Concurrency-Safe Atomic Food Inventory Reservations
* **Decision**: Surplus food listings track `quantity` and `reserved`. Reservations require an atomic transactional decrement where `reserved + requestedQuantity <= quantity`. Expired reservations (>60 minutes unclaimed) are eligible for automatic release back to available stock.
* **Rationale**: Prevents overselling of perishable inventory under concurrent customer checkouts without requiring pessimistic table locks.

## ADR 013: Commute Ticket SHA-256 Deduplication & Reviewer Verification Queue
* **Decision**: Transit ticket submissions calculate a deterministic SHA-256 hash combining normalized ticket/pass ID and image content. Re-submissions of identical tickets are immediately rejected. Reviewers evaluate ticket legitimacy in the `/reviewer` queue; reaching 5 approved trips triggers automatic issuance of a ₹100 cash voucher.
* **Rationale**: Eliminates replay fraud and fraudulent photo reusing while incentivizing public transport adoption.

## ADR 014: Minimum 3 Billing Cycles for Energy Reduction Baselines
* **Decision**: Energy baseline calculation requires at least 3 historical billing cycles before evaluating percentage reductions. If usage drops by ≥10% compared to baseline, a ₹200 wallet reward is unlocked.
* **Rationale**: Prevents seasonal anomalies and single-month spikes from skewing baseline averages, ensuring sound scientific measurement.

## ADR 015: k-Anonymity (k=5) Privacy Protection for Sponsor Reports
* **Decision**: Any geographical, demographic, or locality cohort with fewer than 5 active citizens is automatically suppressed as `< 5` in sponsor and public aggregate views.
* **Rationale**: Protects citizen privacy and complies with data protection regulations by preventing reverse re-identification of individual households.
