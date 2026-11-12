# GameLock

Demo storefront for ZA-region PlayStation gift cards, paid with EcoCash. Built to the
*PSN Gift Card Store - Implementation and Integration Plan* (Cloudflare Worker + Hono + D1).

**Status: demo.** Payments and the supplier are mocked. No real money moves, codes are fake (`DEMO-XXXX-...`).

## Run it

```bash
npm install
cp .dev.vars.example .dev.vars   # demo encryption key
npm run db:local                 # create local D1 + seed catalog
npm run dev                      # http://localhost:8787
npm test && npm run typecheck
```

Flow: pick a card -> enter email + EcoCash number -> order page ("approve on your phone") ->
click **Simulate: approve payment** (demo-only button, standing in for the PIN prompt) -> code appears.

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
