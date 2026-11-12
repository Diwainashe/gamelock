import type { Supplier } from './types';

/** Deterministic fake codes derived from the supplier ref, so re-fetching is stable. */
async function fakeCode(ref: string): Promise<string> {
  const h = new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(ref)));
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  const chars = [...h.slice(0, 12)].map(b => alphabet[b % alphabet.length]);
  return `DEMO-${chars.slice(0, 4).join('')}-${chars.slice(4, 8).join('')}-${chars.slice(8, 12).join('')}`;
}

export const mockSupplier: Supplier = {
  async syncCatalog() { return []; },
  async createPurchase(ref) { return { supplierRef: `mock-${ref}` }; },
  async payPurchase() { /* no-op */ },
  async getPurchase(supplierRef) {
    return { state: 'delivered', code: await fakeCode(supplierRef) };
  },
};
