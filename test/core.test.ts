import { describe, it, expect } from 'vitest';
import { priceCents } from '../src/domain/pricing';
import { normaliseZwPhone, orderInput } from '../src/domain/validate';
import { encrypt, decrypt } from '../src/lib/crypto';
import { paynowHash, verifyInbound, timingSafeEqual } from '../src/integrations/paynow/hash';

const KEY = btoa('0123456789abcdef0123456789abcdef'); // 32 bytes

describe('pricing', () => {
  it('rounds up in integer cents', () => {
    expect(priceCents(100, 55000, 8)).toBe(594);
    expect(priceCents(1, 55000, 8)).toBe(6); // 5.94c -> 6c, never below cost
  });
});

describe('phone validation', () => {
  it.each(['0771234567', '+263771234567', '263 77 123 4567', '078-123-4567'])('accepts %s', p => {
    expect(normaliseZwPhone(p)).toMatch(/^\+2637[78]\d{7}$/);
  });
  it.each(['0711234567', '0271234567', '12345', '+27821234567', ''])('rejects %s', p => {
    expect(normaliseZwPhone(p)).toBeNull();
  });
  it('requires region confirmation', () => {
    const r = orderInput.safeParse({ sku: 'x', email: 'a@b.co', phone: '0771234567', regionConfirmed: false });
    expect(r.success).toBe(false);
  });
});

describe('AES-GCM', () => {
  it('round-trips', async () => {
    const { ct, iv } = await encrypt('ABCD-1234', KEY);
    expect(await decrypt(ct, iv, KEY)).toBe('ABCD-1234');
  });
  it('detects tampering', async () => {
    const { ct, iv } = await encrypt('ABCD-1234', KEY);
    const bad = new Uint8Array(ct); bad[0] = (bad[0] ?? 0) ^ 1;
    await expect(decrypt(bad.buffer, iv, KEY)).rejects.toThrow();
  });
  it('uses a fresh IV each time', async () => {
    const a = await encrypt('x', KEY), b = await encrypt('x', KEY);
    expect(new Uint8Array(a.iv)).not.toEqual(new Uint8Array(b.iv));
  });
});

describe('paynow hash', () => {
  it('verifies inbound in received order and rejects tampering', async () => {
    const key = 'integration-key';
    const hash = await paynowHash(['REF1', 'Paid', '5.94'], key);
    const ok = new URLSearchParams([['reference', 'REF1'], ['status', 'Paid'], ['amount', '5.94'], ['hash', hash]]);
    expect(await verifyInbound(ok, key)).toBe(true);
    const bad = new URLSearchParams([['reference', 'REF1'], ['status', 'Paid'], ['amount', '0.01'], ['hash', hash]]);
    expect(await verifyInbound(bad, key)).toBe(false);
  });
  it('timingSafeEqual handles length mismatch', () => {
    expect(timingSafeEqual('abc', 'abcd')).toBe(false);
    expect(timingSafeEqual('abc', 'abc')).toBe(true);
  });
});
