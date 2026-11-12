const hex = (n: number) =>
  [...crypto.getRandomValues(new Uint8Array(n))].map(b => b.toString(16).padStart(2, '0')).join('');

export const newId = () => crypto.randomUUID();
/** 128-bit token for the customer's order URL. */
export const newPublicToken = () => hex(16);
/** Paynow merchanttrace: max 32 chars, unique. */
export const newTrace = () => hex(12);
