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
  phone: z.string().max(20).transform((v, ctx) => {
    const p = normaliseZwPhone(v);
    if (!p) ctx.addIssue({ code: 'custom', message: 'Enter an EcoCash number, e.g. 0771234567' });
    return p ?? '';
  }),
  regionConfirmed: z.literal(true, { message: 'Please confirm your PSN account is set to South Africa' }),
});
