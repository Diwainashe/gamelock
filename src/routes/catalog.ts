import { Hono } from 'hono';
import type { Env } from '../types';
import { priceCents } from '../domain/pricing';

export const catalog = new Hono<{ Bindings: Env }>();

interface Row {
  sku_id: string; platform: string; platform_name: string; name: string; region: string;
  region_short: string; needs_region: number; face_value: number; face_currency: 'ZAR' | 'USD';
}

catalog.get('/', async c => {
  const kv = await c.env.DB.prepare(`SELECT k, v FROM kv WHERE k IN ('fx_zar_usd_micro', 'fx_usd_zwg')`)
    .all<{ k: string; v: string }>();
  const fx = Object.fromEntries(kv.results.map(r => [r.k, r.v]));
  if (!fx['fx_zar_usd_micro']) return c.json({ error: 'Prices are temporarily unavailable' }, 503);

  const { results } = await c.env.DB.prepare(
    `SELECT sku_id, platform, platform_name, name, region, region_short, needs_region, face_value, face_currency
     FROM catalog WHERE active = 1 ORDER BY sort`,
  ).all<Row>();
  const markup = Number(c.env.MARKUP_PCT);
  return c.json({
    currency: 'USD',
    zwgPerUsd: Number(fx['fx_usd_zwg'] ?? 0) || null, // display only: orders are always charged in USD
    products: results.map(p => ({
      sku: p.sku_id, platform: p.platform, platformName: p.platform_name, name: p.name,
      region: p.region, regionShort: p.region_short, needsRegion: p.needs_region === 1,
      faceValue: p.face_value, faceCurrency: p.face_currency,
      priceCents: priceCents(p.face_value, p.face_currency, Number(fx['fx_zar_usd_micro']), markup),
    })),
  });
});
