export interface Env {
  DB: D1Database;
  PAYNOW_MODE: 'mock' | 'live';
  SUPPLIER: 'mock' | 'bitrefill';
  ORDER_TTL_MIN: string;
  MARKUP_PCT: string;
  CODE_ENC_KEY: string; // secret: base64, 32 bytes
}

export type Status =
  | 'created' | 'awaiting_payment' | 'paid' | 'fulfilling'
  | 'complete' | 'expired' | 'failed' | 'fulfilment_unknown';

export interface OrderRow {
  id: string; public_token: string; sku_id: string; email: string; phone: string;
  amount_cents: number; face_zar: number; status: Status; refund_due: number;
  needs_review: number; paynow_ref: string | null; poll_url: string | null;
  merchant_trace: string; supplier_ref: string | null;
  code_enc: ArrayBuffer | number[] | null; code_iv: ArrayBuffer | number[] | null;
  created_at: string; expires_at: string; updated_at: string;
}
