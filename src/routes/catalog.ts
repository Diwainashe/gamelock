import { Hono } from 'hono';
import type { Env } from '../types';
import { priceCents } from '../domain/pricing';

export const catalog = new Hono<{ Bindings: Env }>();

catalog.get('/', async c => {
  const fx = await c.env.DB.prepare(`SELECT v FROM kv WHERE k = 'fx_zar_usd_micro'`).first<{ v: string }>();
  if (!fx) return c.json({ error: 'Prices are temporarily unavailable' }, 503);
  const { results } = await c.env.DB.prepare(
    `SELECT sku_id, name, face_zar FROM catalog WHERE active = 1 ORDER BY face_zar`,
  ).all<{ sku_id: string; name: string; face_zar: number }>();
  const markup = Number(c.env.MARKUP_PCT);
  return c.json({
    currency: 'USD',
    products: results.map(p => ({
      sku: p.sku_id, name: p.name, faceZar: p.face_zar,
      priceCents: priceCents(p.face_zar, Number(fx.v), markup),
    })),
  });
});
