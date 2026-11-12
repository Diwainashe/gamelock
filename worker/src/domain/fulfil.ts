import type { Env, OrderRow } from '../types';
import { transition } from './orderMachine';
import { getSupplier } from '../integrations/supplier';
import { encrypt } from '../lib/crypto';

/**
 * paid -> fulfilling -> complete (plan sections 3-4).
 * Spend-safety rules: supplier_ref is saved BEFORE paying; an ambiguous pay result
 * goes to fulfilment_unknown and is looked up, never re-paid.
 */
export async function fulfil(env: Env, orderId: string): Promise<void> {
  // Guard: only one caller can win this transition (double-spend protection).
  if (!(await transition(env.DB, orderId, ['paid'], 'fulfilling', 'fulfil.start'))) return;

  const order = await env.DB.prepare(
    `SELECT o.*, c.supplier_pkg FROM orders o JOIN catalog c ON c.sku_id = o.sku_id WHERE o.id = ?`,
  ).bind(orderId).first<OrderRow & { supplier_pkg: string }>();
  if (!order) return;

  const supplier = getSupplier(env);
  try {
    const { supplierRef } = await supplier.createPurchase(order.merchant_trace, { supplierPkg: order.supplier_pkg });
    await env.DB.prepare('UPDATE orders SET supplier_ref = ? WHERE id = ?').bind(supplierRef, orderId).run();

    try {
      await supplier.payPurchase(supplierRef);
    } catch (err) {
      await transition(env.DB, orderId, ['fulfilling'], 'fulfilment_unknown', 'supplier.pay_ambiguous', { err: String(err) });
      return;
    }

    const result = await supplier.getPurchase(supplierRef);
    if (result.state === 'delivered') {
      const { ct, iv } = await encrypt(result.pin ? `${result.code} / ${result.pin}` : result.code, env.CODE_ENC_KEY);
      await transition(env.DB, orderId, ['fulfilling'], 'complete', 'supplier.delivered', {}, { code_enc: ct, code_iv: iv });
      // Email would be sent here. Failure must never undo 'complete' (not wired in the demo).
    } else if (result.state === 'failed') {
      await transition(env.DB, orderId, ['fulfilling'], 'failed', 'supplier.failed', { reason: result.reason }, { refund_due: 1 });
    } else {
      await transition(env.DB, orderId, ['fulfilling'], 'fulfilment_unknown', 'supplier.pending');
    }
  } catch (err) {
    // Before any payment was attempted a failure is definitive; after, we cannot tell. Be conservative.
    await transition(env.DB, orderId, ['fulfilling'], 'fulfilment_unknown', 'supplier.error', { err: String(err) });
  }
}
