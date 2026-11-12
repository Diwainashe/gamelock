import type { Env } from '../types';
import { transition } from '../domain/orderMachine';

/** Every minute: expire awaiting orders past their TTL. (Poll/retry steps join here for live mode.) */
export async function sweep(env: Env): Promise<void> {
  const now = new Date().toISOString();
  const { results } = await env.DB.prepare(
    `SELECT id FROM orders WHERE status = 'awaiting_payment' AND expires_at < ? LIMIT 50`,
  ).bind(now).all<{ id: string }>();
  for (const { id } of results) {
    await transition(env.DB, id, ['awaiting_payment'], 'expired', 'sweep.expired');
  }
}
