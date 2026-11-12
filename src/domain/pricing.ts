/**
 * Integer-only price calculation (no float drift).
 * fxMicro: micro-USD per 1 ZAR (55000 = $0.055). markupPct: integer percent.
 * Returns USD cents, rounded UP so we never sell below cost.
 */
export function priceCents(faceZar: number, fxMicro: number, markupPct: number): number {
  return Math.ceil((faceZar * fxMicro * (100 + markupPct)) / 1_000_000);
}
