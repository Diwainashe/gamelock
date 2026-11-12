CREATE TABLE orders (
  id             TEXT PRIMARY KEY,
  public_token   TEXT NOT NULL UNIQUE,
  sku_id         TEXT NOT NULL,
  email          TEXT NOT NULL,
  phone          TEXT NOT NULL,
  amount_cents   INTEGER NOT NULL,
  face_zar       INTEGER NOT NULL,
  status         TEXT NOT NULL CHECK (status IN
                   ('created','awaiting_payment','paid','fulfilling','complete',
                    'expired','failed','fulfilment_unknown')),
  refund_due     INTEGER NOT NULL DEFAULT 0,
  needs_review   INTEGER NOT NULL DEFAULT 0,
  paynow_ref     TEXT,
  poll_url       TEXT,
  merchant_trace TEXT NOT NULL UNIQUE,
  supplier_ref   TEXT,
  code_enc       BLOB,
  code_iv        BLOB,
  code_purged_at TEXT,
  created_at     TEXT NOT NULL,
  expires_at     TEXT NOT NULL,
  updated_at     TEXT NOT NULL
);
CREATE INDEX idx_orders_status ON orders(status, updated_at);

CREATE TABLE order_events (
  id       INTEGER PRIMARY KEY AUTOINCREMENT,
  order_id TEXT NOT NULL REFERENCES orders(id),
  at       TEXT NOT NULL,
  kind     TEXT NOT NULL,
  detail   TEXT
);

CREATE TABLE catalog (
  sku_id TEXT PRIMARY KEY, name TEXT, face_zar INTEGER,
  supplier_pkg TEXT, active INTEGER, synced_at TEXT
);

CREATE TABLE kv (k TEXT PRIMARY KEY, v TEXT, updated_at TEXT);

-- Demo seed. ZAR face values; FX is micro-USD per 1 ZAR (55000 = $0.055).
INSERT INTO catalog VALUES
 ('psn-za-100',  'PlayStation Store R100',  100,  'demo&100',  1, datetime('now')),
 ('psn-za-200',  'PlayStation Store R200',  200,  'demo&200',  1, datetime('now')),
 ('psn-za-500',  'PlayStation Store R500',  500,  'demo&500',  1, datetime('now')),
 ('psn-za-1000', 'PlayStation Store R1000', 1000, 'demo&1000', 1, datetime('now'));
INSERT INTO kv VALUES ('fx_zar_usd_micro', '55000', datetime('now'));
