import { newTrace } from '../../lib/ids';

/**
 * Mock of Paynow's express (remotetransaction) "accepted" response.
 * The live client will POST to Paynow and return the same shape.
 */
export async function mockInitiate(): Promise<{ ref: string; pollUrl: string }> {
  const ref = `MOCK-${newTrace().slice(0, 8).toUpperCase()}`;
  return { ref, pollUrl: `mock://paynow/${ref}` };
}
