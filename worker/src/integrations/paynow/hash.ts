// Paynow hash scheme (plan section 5): SHA-512 over field VALUES in order, + integration key, uppercase hex.
export async function paynowHash(values: string[], key: string): Promise<string> {
  const data = new TextEncoder().encode(values.join('') + key);
  const buf = await crypto.subtle.digest('SHA-512', data);
  return [...new Uint8Array(buf)].map(b => b.toString(16).padStart(2, '0')).join('').toUpperCase();
}

export function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

/** Inbound: values in RECEIVED order, skipping "hash" itself (case-insensitive). */
export async function verifyInbound(form: URLSearchParams, key: string): Promise<boolean> {
  const vals: string[] = [];
  let given = '';
  for (const [k, v] of form) { if (k.toLowerCase() === 'hash') given = v; else vals.push(v); }
  const expected = await paynowHash(vals, key);
  return timingSafeEqual(expected, given.toUpperCase());
}
