# GameLock

Demo storefront for game gift cards paid with EcoCash. **Plain HTML, CSS and JavaScript** - no build step, no server.
Styled to the "Neon arcade" direction of the Claude Design file (dark by default, light toggle, USD/ZWG toggle).

## Run it

**GitHub Pages:** Settings -> Pages -> *Deploy from a branch* -> pick this branch, folder **/ (root)**. The site is then at
`https://<user>.github.io/gamelock/`. All links are relative, so the sub-path works. (If you pointed Pages at `/docs`,
switch it to `/ (root)`: the site lives in the repo root.)

**Locally:** open `index.html` through any static server (pages use `fetch`/`localStorage`, so not `file://`):

```bash
python3 -m http.server 8000      # then visit http://localhost:8000
```

## How the demo behaves

Flow: pick a card -> value -> email + EcoCash number (or card) -> order page -> click **Simulate: approve payment**
(stands in for the EcoCash PIN prompt) -> a fake code appears after ~2.5 s.

Everything runs in the browser (`js/api.js`): prices, validation and order states mirror the real back end.
Orders are stored in **this browser's localStorage**, so the order link only works in the browser that created it, and the
"code" is a random `DEMO-XXXX-XXXX-XXXX` string. No money moves and nothing is sent anywhere.

Things in the demo that go beyond the implementation plan (which covers ZA PlayStation only):

- **Xbox, Steam and Nintendo cards are demo-only** (in `js/api.js`). Remove them before a live launch.
- **ZWG is display-only** (placeholder rate 26.9); orders are always priced in USD.
- **"Visa / Mastercard" is a mock**; no Paynow page opens.
- **No email is sent**, although the store copy says "We email it too" (from the design).
- **Turnstile is a placeholder box.** Help screenshots and the refund wording are placeholders.
- **Do not use this as a real store.** Anyone can mark an order paid; the simulate button is the whole payment step.

## Layout

```
index.html product.html checkout.html order.html help/index.html   the five screens
css/style.css          design tokens + styles (arcade direction)
js/config.js           site config (API mode)
js/api.js              in-browser API simulation (or calls the Worker if configured)
js/common.js           shared helpers, header, card art
js/{store,product,checkout,order,help}.js   page logic
fonts/                 Unbounded + Manrope (SIL OFL, licences included)
worker/                OPTIONAL real back end (see below)
```

## Optional: real back end (`worker/`)

A Cloudflare Worker + D1 implementation of the same API per the implementation plan (order state machine with atomic
transitions, AES-GCM code storage, price lock, mock Paynow + supplier). Not needed for the Pages demo. Live Paynow and
Bitrefill clients, email, Turnstile, throttles and admin are **not built**.

```bash
cd worker && npm install
cp .dev.vars.example .dev.vars && npm run db:local
npx wrangler dev --var ALLOWED_ORIGIN:http://localhost:8000   # API on :8787
npm test && npm run typecheck
```

Then set `window.GL_CONFIG = { api: 'http://localhost:8787' }` in `js/config.js` and serve the site as above.
For a deployed Worker, set `ALLOWED_ORIGIN` in `worker/wrangler.toml` to your Pages origin (e.g. `https://<user>.github.io`).
