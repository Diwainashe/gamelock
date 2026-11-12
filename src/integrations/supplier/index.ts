import type { Env } from '../../types';
import type { Supplier } from './types';
import { mockSupplier } from './mock';

export function getSupplier(env: Env): Supplier {
  if (env.SUPPLIER === 'mock') return mockSupplier;
  throw new Error(`SUPPLIER=${env.SUPPLIER} is not implemented yet`);
}
