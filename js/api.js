// API layer. With GL_CONFIG.api set it calls the real Worker; otherwise it runs a faithful in-browser simulation
// (same endpoints, validation, pricing and order states as worker/), so the site works on any static host.
// Demo only: orders live in this browser's localStorage and "codes" are random fakes.
(() => {
  const BASE = (window.GL_CONFIG && window.GL_CONFIG.api || '').replace(/\/$/, '');

  // ---- seed data (mirrors worker/migrations/0001_init.sql) ----
  const P = (sku, platform, platformName, name, region, regionShort, needsRegion, faceValue, faceCurrency) =>
    ({ sku, platform, platformName, name, region, regionShort, needsRegion, faceValue, faceCurrency });
  const PRODUCTS = [
    ...[150, 250, 500, 1000].map(v => P(`psn-za-${v}`, 'psn', 'PlayStation', 'PlayStation Store card', 'South Africa', 'ZA', true, v, 'ZAR')),
    ...[10, 25, 50].map(v => P(`xbox-us-${v}`, 'xbox', 'Xbox', 'Xbox gift card', 'United States', 'US', true, v, 'USD')),
    ...[5, 10, 20, 50].map(v => P(`steam-gl-${v}`, 'steam', 'Steam', 'Steam Wallet code', 'Global', 'Global', false, v, 'USD')),
    ...[10, 20, 35].map(v => P(`nintendo-us-${v}`, 'nintendo', 'Nintendo', 'Nintendo eShop card', 'United States', 'US', true, v, 'USD')),
  ];
  const FX_ZAR_MICRO = 55000;   // micro-USD per 1 ZAR
  const ZWG_PER_USD = 26.9;     // display only
  const MARKUP_PCT = 8;
  const TTL_MS = 15 * 60_000;
  const FULFIL_MS = 2500;       // simulated supplier latency after payment

  /** Integer-only, rounded up (same formula as worker/src/domain/pricing.ts). */
  const priceCents = (v, cur) => cur === 'USD' ? v * (100 + MARKUP_PCT) : Math.ceil((v * FX_ZAR_MICRO * (100 + MARKUP_PCT)) / 1_000_000);

  function normaliseZwPhone(input) {
    const m = /^(?:\+?263|0)(7[78]\d{7})$/.exec(String(input || '').replace(/[\s\-()]/g, ''));
    return m ? `+263${m[1]}` : null;
  }

  // ---- storage (falls back to memory if localStorage is blocked) ----
  const KEY = 'gl-orders';
  let mem = {};
  const load = () => { try { return JSON.parse(localStorage.getItem(KEY) || '{}'); } catch { return mem; } };
  const save = o => { mem = o; try { localStorage.setItem(KEY, JSON.stringify(o)); } catch { /* memory only */ } };
  const hex = n => [...crypto.getRandomValues(new Uint8Array(n))].map(b => b.toString(16).padStart(2, '0')).join('');
  const fakeCode = () => {
    const pool = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789', r = crypto.getRandomValues(new Uint8Array(12));
    const c = [...r].map(b => pool[b % pool.length]);
    return `DEMO-${c.slice(0, 4).join('')}-${c.slice(4, 8).join('')}-${c.slice(8).join('')}`;
  };
  const fail = (status, message) => Object.assign(new Error(message), { status });

  /** Time-driven transitions, applied whenever an order is read (stands in for the worker's cron sweep). */
  function advance(o) {
    const now = Date.now();
    if (o.status === 'awaiting_payment' && now > o.expiresAt) o.status = 'expired';
    if (o.status === 'paid' && now - o.paidAt > FULFIL_MS) { o.status = 'complete'; o.code = fakeCode(); }
    return o;
  }

  function mock(path, opts = {}) {
    const method = (opts.method || 'GET').toUpperCase();
    const body = opts.body ? JSON.parse(opts.body) : {};
    let m;

    if (method === 'GET' && path === '/api/catalog') {
      return { currency: 'USD', zwgPerUsd: ZWG_PER_USD, products: PRODUCTS.map(p => ({ ...p, priceCents: priceCents(p.faceValue, p.faceCurrency) })) };
    }

    if (method === 'POST' && path === '/api/orders') {
      const { sku, method: pay, regionConfirmed } = body, email = String(body.email || '').trim();
      const p = PRODUCTS.find(x => x.sku === sku);
      if (!/^\S+@\S+\.\S+$/.test(email) || email.length > 254) throw fail(400, 'Enter a valid email address');
      if (pay !== 'ecocash' && pay !== 'card') throw fail(400, 'Choose a payment method');
      const phone = pay === 'ecocash' ? normaliseZwPhone(body.phone) : null;
      if (pay === 'ecocash' && !phone) throw fail(400, 'Enter an EcoCash number, e.g. 077 123 4567');
      if (!p) throw fail(400, 'That card is not available');
      if (p.needsRegion && regionConfirmed !== true) throw fail(400, `Please confirm your account region is ${p.region}`);
      const token = hex(16), now = Date.now(), orders = load();
      orders[token] = { sku, method: pay, phone, email, amountCents: priceCents(p.faceValue, p.faceCurrency), // price lock
        status: 'awaiting_payment', createdAt: now, expiresAt: now + TTL_MS };
      save(orders);
      return { token };
    }

    if ((m = /^\/api\/orders\/([0-9a-f]+)$/.exec(path)) && method === 'GET') {
      const orders = load(), o = orders[m[1]];
      if (!o) throw fail(404, 'Order not found');
      const before = o.status; advance(o); if (o.status !== before) save(orders);
      const p = PRODUCTS.find(x => x.sku === o.sku);
      return { status: o.status, product: p.name, platform: p.platform, region: p.region, faceValue: p.faceValue, faceCurrency: p.faceCurrency,
        method: o.method, phoneHint: o.phone ? `${o.phone.slice(0, 7)} ••• ${o.phone.slice(-4)}` : null,
        amountCents: o.amountCents, currency: 'USD', reference: m[1].slice(0, 8).toUpperCase(), expiresAt: new Date(o.expiresAt).toISOString(),
        demo: true, code: o.status === 'complete' ? o.code : undefined };
    }

    if ((m = /^\/api\/orders\/([0-9a-f]+)\/mock-pay$/.exec(path)) && method === 'POST') {
      const orders = load(), o = orders[m[1]];
      if (!o) throw fail(404, 'Order not found');
      advance(o);
      // Only awaiting/expired orders can move; repeats are harmless (same guard as the Worker's conditional UPDATE).
      if (body.outcome === 'cancel') { if (o.status === 'awaiting_payment') o.status = 'failed'; }
      else if (o.status === 'awaiting_payment' || o.status === 'expired') { o.status = 'paid'; o.paidAt = Date.now(); }
      save(orders);
      return { ok: true };
    }
    throw fail(404, 'Not found');
  }

  window.GL_API = async function api(path, opts = {}) {
    if (BASE) {
      const res = await fetch(BASE + path, opts);
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw Object.assign(new Error(data.error || 'Something went wrong'), { status: res.status });
      return data;
    }
    await new Promise(r => setTimeout(r, 120)); // brief latency so loading states are visible
    return mock(path, opts);
  };
})();
