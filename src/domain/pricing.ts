/**
 * Integer-only price calculation (no float drift). Returns USD cents, rounded UP so we never sell below cost.
 * ZAR cards: fxMicro = micro-USD per 1 ZAR (55000 = $0.055). USD cards: face value is already dollars.
 * markupPct is an integer percent.
 */
export function priceCents(faceValue: number, faceCurrency: 'ZAR' | 'USD', fxMicro: number, markupPct: number): number {
  if (faceCurrency === 'USD') return faceValue * (100 + markupPct);
  return Math.ceil((faceValue * fxMicro * (100 + markupPct)) / 1_000_000);
}
