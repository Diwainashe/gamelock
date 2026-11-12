import { z } from 'zod';

/** Normalise to E.164 and accept only Zimbabwean EcoCash numbers (077 / 078). */
export function normaliseZwPhone(input: string): string | null {
  const digits = input.replace(/[\s\-()]/g, '');
  const m = /^(?:\+?263|0)(7[78]\d{7})$/.exec(digits);
  return m ? `+263${m[1]}` : null;
}

export const orderInput = z.object({
  sku: z.string().min(1).max(64),
  email: z.string().trim().email('Enter a valid email address').max(254),
  method: z.enum(['ecocash', 'card']),
  phone: z.string().max(20).optional(),
  regionConfirmed: z.boolean().optional(),
}).superRefine((v, ctx) => {
  if (v.method === 'ecocash' && !normaliseZwPhone(v.phone ?? '')) {
    ctx.addIssue({ code: 'custom', path: ['phone'], message: 'Enter an EcoCash number, e.g. 077 123 4567' });
  }
});
