# MyHome — Premium Home Services for Kuwait

> **Frontend demo.** There is no backend yet. All data is simulated in memory: sign-in codes, payments
> (KNET, card, Apple Pay, wallet), notifications and live tracking are **simulated**. No real SMS is sent and no money moves.

"MyHome" is a temporary brand name pending client approval.

## Repository layout

```
apps/
  mobile/        Expo + React Native app — Customer & Technician roles   (Stage 2+)
  admin/         React web dashboard — operations, vendors, finance       (Stage 7)
packages/
  shared/        @myhome/shared — used by both apps
    src/brand/       brand.config.ts (name, palette, fonts, contacts) · business.config.ts (fees, hours, policies)
    src/types/       domain model (bookings, services, technicians, vendors, …)
    src/domain/      business rules: pricing, coupons, booking status machine, scheduling, Kuwait time
    src/format/      KWD money, +965 phones, dates/times, Kuwaiti addresses — English & Arabic
    src/geo/         Kuwait governorates and areas (EN/AR)
    src/text/        bilingual search (Arabic normalisation)
    src/api/         MyHomeApi contracts + ApiError — the interface the real backend client will implement
    src/mock/        @myhome/shared/mock — simulated backend + deterministic seed data
```

## Getting started

Requires Node 22.13 or later.

```bash
npm install
npm run check        # typecheck + lint + tests + formatting
npm test             # tests only
npm run format       # apply Prettier
```

## Demo accounts (simulated)

| Role       | Sign in with                      | Code |
| ---------- | --------------------------------- | ---- |
| Customer   | +965 5555 0101 (Noura Al-Kandari) | 1234 |
| Technician | +965 6000 1001 (Rajesh Kumar, AC) | 1234 |
| Admin      | admin@myhome.demo / `Demo@2026`   | —    |

Any other valid Kuwaiti mobile number signs in as a new customer.

The demo data is generated relative to the current time. At any moment there is a technician on the way to the demo customer, jobs today, open job offers, and four months of history. All names and companies are fictional.

## Rebranding

Edit `packages/shared/src/brand/brand.config.ts` (name, Arabic name, tagline, palette, fonts, support contacts) and replace the logo assets in each app. No other code hard-codes brand details.

## Backend integration path

Screens depend only on the `MyHomeApi` interface (`packages/shared/src/api/contracts.ts`). When the backend is ready, implement that interface with an HTTP client and swap it in for `createMockApi()`. Pricing, status transitions and formatting rules in `src/domain` and `src/format` stay shared.

## Status

- [x] Stage 0 — repository and workspace setup
- [x] Stage 1 — shared types, Kuwait mock data, simulated API, formatters (106 tests)
- [ ] Stage 2 — mobile foundation (design system, Arabic RTL, navigation, sign-in)
