CREATE TABLE orders (
  id             TEXT PRIMARY KEY,
  public_token   TEXT NOT NULL UNIQUE,
  sku_id         TEXT NOT NULL,
  email          TEXT NOT NULL,
  phone          TEXT,                       -- E.164; null for card payments
  method         TEXT NOT NULL CHECK (method IN ('ecocash','card')),
  amount_cents   INTEGER NOT NULL,
  face_value     INTEGER NOT NULL,           -- card face value, in face_currency
  face_currency  TEXT NOT NULL,
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
  sku_id        TEXT PRIMARY KEY,
  platform      TEXT NOT NULL,              -- psn | xbox | steam | nintendo
  platform_name TEXT NOT NULL,
  name          TEXT NOT NULL,              -- full product name
  region        TEXT NOT NULL,
  region_short  TEXT NOT NULL,
  needs_region  INTEGER NOT NULL,           -- 1 = customer must confirm account region
  face_value    INTEGER NOT NULL,
  face_currency TEXT NOT NULL,              -- ZAR | USD
  sort          INTEGER NOT NULL,
  supplier_pkg  TEXT,
  active        INTEGER NOT NULL DEFAULT 1,
  synced_at     TEXT
);

CREATE TABLE kv (k TEXT PRIMARY KEY, v TEXT, updated_at TEXT);

-- Demo seed. Only PlayStation (ZA) is in the implementation plan; the other platforms are
-- demo-only products that the mock supplier will happily "deliver".
-- FX: micro-USD per 1 ZAR (55000 = $0.055). ZWG per USD is display-only.
INSERT INTO catalog (sku_id, platform, platform_name, name, region, region_short, needs_region, face_value, face_currency, sort, supplier_pkg, synced_at) VALUES
 ('psn-za-150',   'psn',      'PlayStation', 'PlayStation Store card', 'South Africa',  'ZA',     1,  150, 'ZAR', 10, 'demo&psn-za-150',   datetime('now')),
 ('psn-za-250',   'psn',      'PlayStation', 'PlayStation Store card', 'South Africa',  'ZA',     1,  250, 'ZAR', 11, 'demo&psn-za-250',   datetime('now')),
 ('psn-za-500',   'psn',      'PlayStation', 'PlayStation Store card', 'South Africa',  'ZA',     1,  500, 'ZAR', 12, 'demo&psn-za-500',   datetime('now')),
 ('psn-za-1000',  'psn',      'PlayStation', 'PlayStation Store card', 'South Africa',  'ZA',     1, 1000, 'ZAR', 13, 'demo&psn-za-1000',  datetime('now')),
 ('xbox-us-10',   'xbox',     'Xbox',        'Xbox gift card',         'United States', 'US',     1,   10, 'USD', 20, 'demo&xbox-us-10',   datetime('now')),
 ('xbox-us-25',   'xbox',     'Xbox',        'Xbox gift card',         'United States', 'US',     1,   25, 'USD', 21, 'demo&xbox-us-25',   datetime('now')),
 ('xbox-us-50',   'xbox',     'Xbox',        'Xbox gift card',         'United States', 'US',     1,   50, 'USD', 22, 'demo&xbox-us-50',   datetime('now')),
 ('steam-gl-5',   'steam',    'Steam',       'Steam Wallet code',      'Global',        'Global', 0,    5, 'USD', 30, 'demo&steam-gl-5',   datetime('now')),
 ('steam-gl-10',  'steam',    'Steam',       'Steam Wallet code',      'Global',        'Global', 0,   10, 'USD', 31, 'demo&steam-gl-10',  datetime('now')),
 ('steam-gl-20',  'steam',    'Steam',       'Steam Wallet code',      'Global',        'Global', 0,   20, 'USD', 32, 'demo&steam-gl-20',  datetime('now')),
 ('steam-gl-50',  'steam',    'Steam',       'Steam Wallet code',      'Global',        'Global', 0,   50, 'USD', 33, 'demo&steam-gl-50',  datetime('now')),
 ('nintendo-us-10','nintendo','Nintendo',    'Nintendo eShop card',    'United States', 'US',     1,   10, 'USD', 40, 'demo&nintendo-us-10', datetime('now')),
 ('nintendo-us-20','nintendo','Nintendo',    'Nintendo eShop card',    'United States', 'US',     1,   20, 'USD', 41, 'demo&nintendo-us-20', datetime('now')),
 ('nintendo-us-35','nintendo','Nintendo',    'Nintendo eShop card',    'United States', 'US',     1,   35, 'USD', 42, 'demo&nintendo-us-35', datetime('now'));

INSERT INTO kv VALUES ('fx_zar_usd_micro', '55000', datetime('now')), ('fx_usd_zwg', '26.9', datetime('now'));
