# MyHome — Premium Home Services for Kuwait

> **Frontend demo.** There is no backend yet. All data is simulated in memory: sign-in codes, payments
> (KNET, card, Apple Pay, wallet), notifications and live tracking are **simulated**. No real SMS is sent and no money moves.

"MyHome" is a temporary brand name pending client approval.

## Repository layout

```
apps/
  mobile/        Expo SDK 58 + Expo Router app — Customer & Professional roles
    src/app/         routes: welcome, (auth), customer/(tabs), pro/(tabs), about
    src/components/  design system (components/ui) and feature components
    src/theme/       tokens, typography, fonts, layout direction
    src/i18n/        typed English & Arabic dictionaries (Arabic plural rules)
    src/data/        TanStack Query hooks over the MyHomeApi contract
    src/services/    API instance, on-device persistence, preferences
    assets/          brand marks + licensed photography (assets/images/sources.json)
    scripts/         build_assets.py — rebuilds photos and brand icons
  admin/         React web dashboard — operations, vendors, finance       (Stage 7)
packages/
  shared/        @myhome/shared — used by both apps
    src/brand/       brand.json (name, palette, fonts, contacts) · business.config.ts (fees, hours, policies)
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

### Run the mobile app

```bash
cd apps/mobile
npx expo start           # scan the QR code with Expo Go (Android / iOS)
npx expo start --web     # open in a browser
```

The demo state is saved on the device (a file on native, localStorage on web) and refreshed after 12 hours.
**Account → Reset demo data** restores it at any time.

## Demo accounts (simulated)

| Role       | Sign in with                      | Code |
| ---------- | --------------------------------- | ---- |
| Customer   | +965 5555 0101 (Noura Al-Kandari) | 1234 |
| Technician | +965 6000 1001 (Rajesh Kumar, AC) | 1234 |
| Admin      | admin@myhome.demo / `Demo@2026`   | —    |

Any other valid Kuwaiti mobile number signs in as a new customer.

The demo data is generated relative to the current time. At any moment there is a technician on the way to the demo customer, jobs today, open job offers, and four months of history. All names and companies are fictional.

## Rebranding

Edit `packages/shared/src/brand/brand.json` (name, Arabic name, tagline, palette, fonts, support contacts), then run
`python apps/mobile/scripts/build_assets.py --brand` to regenerate the app icon, adaptive icon, splash mark and favicon.
The app name in `app.config.ts` reads the same file. No other code hard-codes brand details.

Photography is listed in `apps/mobile/assets/images/sources.json` (Unsplash License — free for commercial use, no
attribution required). Fonts are Fraunces, Manrope and IBM Plex Sans Arabic (SIL Open Font License).

## Backend integration path

Screens depend only on the `MyHomeApi` interface (`packages/shared/src/api/contracts.ts`). When the backend is ready, implement that interface with an HTTP client and swap it in for `createMockApi()`. Pricing, status transitions and formatting rules in `src/domain` and `src/format` stay shared.

## Status

- [x] Stage 0 — repository and workspace setup
- [x] Stage 1 — shared types, Kuwait mock data, simulated API, formatters (106 tests)
- [x] Stage 2 — mobile foundation: design system, English/Arabic with instant RTL, light/dark, sign-in, role-based navigation
- [x] Stage 3 — customer discovery: personalised home, categories with sort/filter, bilingual search with recent searches, service details with live pricing, booking hand-off
- [x] Stage 4 — booking flow: saved addresses (add/edit/delete/default, Kuwaiti format with PACI), date & time from live availability, checkout with promo codes and simulated payment, duplicate-safe confirmation, booking details, demo tracking, reschedule and cancellation
- [x] Stage 5 — customer account: personal details, notification preferences, security, simulated wallet statement, notifications inbox (filters, grouping, deep links), simulated chat with professionals and customer-care requests; reload-safe checkout and current-slot marking when rescheduling
