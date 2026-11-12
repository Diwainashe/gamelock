// AES-256-GCM for stored gift codes. Fresh 12-byte IV per code.
const fromB64 = (s: string) => Uint8Array.from(atob(s), c => c.charCodeAt(0));

async function importKey(keyB64: string | undefined): Promise<CryptoKey> {
  if (!keyB64) throw new Error('CODE_ENC_KEY is not set (copy .dev.vars.example to .dev.vars)');
  const raw = fromB64(keyB64);
  // Demo key is shorter than 32 bytes; derive a fixed-size key so local dev "just works".
  const material = raw.length === 32 ? raw : new Uint8Array(await crypto.subtle.digest('SHA-256', raw));
  return crypto.subtle.importKey('raw', material, 'AES-GCM', false, ['encrypt', 'decrypt']);
}

export async function encrypt(plain: string, keyB64: string | undefined) {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const ct = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv }, await importKey(keyB64), new TextEncoder().encode(plain));
  return { ct, iv: iv.buffer as ArrayBuffer };
}

export async function decrypt(
  ct: ArrayBuffer | number[], iv: ArrayBuffer | number[], keyB64: string | undefined,
): Promise<string> {
  const plain = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv: new Uint8Array(iv) }, await importKey(keyB64), new Uint8Array(ct));
  return new TextDecoder().decode(plain);
}
