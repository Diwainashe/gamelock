import type { Status } from '../types';

/** Legal edges only. Numbers refer to the transition table in the plan (section 3). */
const LEGAL: Record<Status, Status[]> = {
  created: ['awaiting_payment', 'failed'],                       // 1
  awaiting_payment: ['paid', 'expired', 'failed'],               // 2, 5
  expired: ['paid'],                                             // 6
  paid: ['fulfilling'],                                          // 3
  fulfilling: ['complete', 'failed', 'fulfilment_unknown'],      // 4, 7, 8
  fulfilment_unknown: ['complete', 'failed'],
  complete: [],
  failed: [],
};

type Settable = 'paynow_ref' | 'poll_url' | 'supplier_ref' | 'code_enc' | 'code_iv'
  | 'refund_due' | 'needs_review';

/**
 * One conditional UPDATE + one event row, applied atomically in a single D1 batch.
 * Returns false if the order was not in an expected `from` state (someone else moved it):
 * callers must stop quietly. This is what makes retries and double clicks harmless.
 */
export async function transition(
  db: D1Database, id: string, from: Status[], to: Status, kind: string,
  detail: Record<string, unknown> = {}, set: Partial<Record<Settable, string | number | ArrayBuffer | null>> = {},
): Promise<boolean> {
  for (const f of from) {
    if (!LEGAL[f].includes(to)) throw new Error(`Illegal transition ${f} -> ${to}`);
  }
  const now = new Date().toISOString();
  const cols = Object.keys(set);
  const sets = ['status = ?', 'updated_at = ?', ...cols.map(c => `${c} = ?`)].join(', ');
  const marks = from.map(() => '?').join(',');

  const update = db.prepare(`UPDATE orders SET ${sets} WHERE id = ? AND status IN (${marks})`)
    .bind(to, now, ...cols.map(c => set[c as Settable] ?? null), id, ...from);
  // changes() refers to the UPDATE above (same connection, sequential in the batch).
  const event = db.prepare(
    `INSERT INTO order_events (order_id, at, kind, detail) SELECT ?, ?, ?, ? WHERE changes() = 1`,
  ).bind(id, now, kind, JSON.stringify({ to, ...detail }));

  const [res] = await db.batch([update, event]);
  return (res?.meta.changes ?? 0) === 1;
}
