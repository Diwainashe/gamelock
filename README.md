# GameLock

Demo storefront for game gift cards, paid with EcoCash. Built to the *PSN Gift Card Store - Implementation
and Integration Plan* (Cloudflare Worker + Hono + D1), styled to the "Neon arcade" direction of the Claude Design file
(dark by default, light toggle, USD/ZWG toggle).

**Status: demo.** Payments and the supplier are mocked. No real money moves, codes are fake (`DEMO-XXXX-...`).

## Run it

```bash
npm install
cp .dev.vars.example .dev.vars   # demo encryption key
npm run db:local                 # create local D1 + seed catalog
npm run dev                      # http://localhost:8787
npm test && npm run typecheck
```

Flow: pick a card -> value -> enter email + EcoCash number (or choose card) -> order page ("approve on your phone") ->
click **Simulate: approve payment** (demo-only button, standing in for the PIN prompt) -> code appears.

## Where the demo goes beyond the plan (read before showing anyone)

- **Xbox, Steam and Nintendo cards are demo-only.** The plan covers ZA PlayStation codes only. The other platforms
  exist so the design can be shown in full; the mock supplier "delivers" any SKU. Remove them from
  `migrations/0001_init.sql` (or set `active = 0`) before a live launch.
- **ZWG is display-only.** The toggle converts at a placeholder rate (26.9). Orders are always created and charged in USD.
- **"Visa / Mastercard" is a mock too.** The order page says "Finish paying on the Paynow page" but no redirect happens.
  The plan's live path is Paynow `initiatetransaction` + redirect.
- **No email is sent.** The store copy says "We email it too" (from the design); that is not built yet.
- **Turnstile is a placeholder box**, and there are no throttles or spend caps yet.
- **Fonts are self-hosted** (Unbounded, Manrope; SIL OFL, licences in `public/fonts/`) instead of Google Fonts, to keep
  the CSP strict and the page light on mobile data.

## What exists vs the plan

| Plan item | State |
|---|---|
| Order state machine (atomic conditional UPDATE + event row) | Done |
| Price lock, integer-only pricing, input validation (Zod, E.164 ZW numbers) | Done |
| AES-256-GCM code storage, `no-store`, strict CSP headers | Done |
| Mock Paynow + mock supplier behind adapters (`PAYNOW_MODE`, `SUPPLIER`) | Done |
| Paynow SHA-512 hash helper + tests | Done (not yet wired) |
| Cron sweep (expire stale orders) | Done |
| Region guide / redeem guide pages | Placeholder copy, needs screenshots + policy text |
| Live Paynow client, Bitrefill client, email, Turnstile, throttles, daily caps, admin, alerts, catalogue/FX sync, code purge | **Not built** (plan phases P2-P5) |

The mock-pay endpoint (`POST /api/orders/:token/mock-pay`) returns 404 unless `PAYNOW_MODE=mock`.
**Never deploy this publicly with `PAYNOW_MODE=mock` as a real store**: anyone could mark orders paid.

## Deploy the demo (Cloudflare free tier)

```bash
npx wrangler d1 create gamelock          # paste database_id into wrangler.toml
npx wrangler d1 migrations apply gamelock --remote
npx wrangler secret put CODE_ENC_KEY     # openssl rand -base64 32
npx wrangler deploy
```
