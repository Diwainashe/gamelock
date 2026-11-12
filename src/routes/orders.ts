import { Hono } from 'hono';
import type { Env, OrderRow } from '../types';
import { orderInput } from '../domain/validate';
import { priceCents } from '../domain/pricing';
import { transition } from '../domain/orderMachine';
import { fulfil } from '../domain/fulfil';
import { newId, newPublicToken, newTrace } from '../lib/ids';
import { decrypt } from '../lib/crypto';
import { mockInitiate } from '../integrations/paynow/mock';

export const orders = new Hono<{ Bindings: Env }>();

orders.post('/', async c => {
  const raw = await c.req.json().catch(() => null);
  const parsed = orderInput.safeParse(raw);
  if (!parsed.success) {
    return c.json({ error: parsed.error.issues[0]?.message ?? 'Invalid request' }, 400);
  }
  const { sku, email, phone } = parsed.data;

  const [product, fx] = await Promise.all([
    c.env.DB.prepare('SELECT sku_id, face_zar FROM catalog WHERE sku_id = ? AND active = 1').bind(sku)
      .first<{ sku_id: string; face_zar: number }>(),
    c.env.DB.prepare(`SELECT v FROM kv WHERE k = 'fx_zar_usd_micro'`).first<{ v: string }>(),
  ]);
  if (!product) return c.json({ error: 'That card is not available' }, 400);
  if (!fx) return c.json({ error: 'Prices are temporarily unavailable. Please try again soon.' }, 503);

  // Price lock: stored on the order; later FX changes never touch it.
  const amountCents = priceCents(product.face_zar, Number(fx.v), Number(c.env.MARKUP_PCT));
  const id = newId(), token = newPublicToken(), now = new Date();
  const expires = new Date(now.getTime() + Number(c.env.ORDER_TTL_MIN) * 60_000);

  await c.env.DB.prepare(
    `INSERT INTO orders (id, public_token, sku_id, email, phone, amount_cents, face_zar, status,
       merchant_trace, created_at, expires_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, 'created', ?, ?, ?, ?)`,
  ).bind(id, token, product.sku_id, email, phone, amountCents, product.face_zar,
    newTrace(), now.toISOString(), expires.toISOString(), now.toISOString()).run();

  if (c.env.PAYNOW_MODE !== 'mock') {
    await transition(c.env.DB, id, ['created'], 'failed', 'paynow.not_implemented');
    return c.json({ error: 'Live payments are not enabled yet' }, 503);
  }
  const { ref, pollUrl } = await mockInitiate();
  await transition(c.env.DB, id, ['created'], 'awaiting_payment', 'paynow.accepted', {}, { paynow_ref: ref, poll_url: pollUrl });

  return c.json({ token }, 201);
});

orders.get('/:token', async c => {
  const o = await c.env.DB.prepare(
    `SELECT o.*, c.name AS product_name FROM orders o JOIN catalog c ON c.sku_id = o.sku_id
     WHERE o.public_token = ?`,
  ).bind(c.req.param('token')).first<OrderRow & { product_name: string }>();
  if (!o) return c.json({ error: 'Order not found' }, 404);

  let code: string | undefined;
  if (o.status === 'complete' && o.code_enc && o.code_iv) {
    code = await decrypt(o.code_enc, o.code_iv, c.env.CODE_ENC_KEY);
  }
  c.header('Cache-Control', 'no-store');
  return c.json({
    status: o.status, product: o.product_name, amountCents: o.amount_cents, currency: 'USD',
    reference: o.public_token.slice(0, 8).toUpperCase(), expiresAt: o.expires_at,
    demo: c.env.PAYNOW_MODE === 'mock', code,
  });
});

// DEMO ONLY: stands in for the customer entering their EcoCash PIN. Absent when PAYNOW_MODE != mock.
orders.post('/:token/mock-pay', async c => {
  if (c.env.PAYNOW_MODE !== 'mock') return c.notFound();
  const body = await c.req.json().catch(() => ({})) as { outcome?: string };
  const o = await c.env.DB.prepare('SELECT id FROM orders WHERE public_token = ?')
    .bind(c.req.param('token')).first<{ id: string }>();
  if (!o) return c.json({ error: 'Order not found' }, 404);

  if (body.outcome === 'cancel') {
    await transition(c.env.DB, o.id, ['awaiting_payment'], 'failed', 'paynow.cancelled');
  } else if (await transition(c.env.DB, o.id, ['awaiting_payment', 'expired'], 'paid', 'paynow.paid')) {
    await fulfil(c.env, o.id);
  }
  return c.json({ ok: true });
});
