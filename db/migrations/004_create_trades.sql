-- Migration 004: Trades (Subcontractors)
-- Trade businesses that perform compliance and maintenance work.

CREATE TYPE trade_category AS ENUM (
  'Electrical',
  'Fire Safety',
  'Plumbing',
  'Lift',
  'Pool',
  'Building/General'
);

CREATE TABLE IF NOT EXISTS trades (
  id                    SERIAL PRIMARY KEY,
  full_name             VARCHAR(200) NOT NULL,
  company_name          VARCHAR(300) NOT NULL,
  abn                   VARCHAR(20) NOT NULL,
  trade_category        trade_category NOT NULL,
  licence_number        VARCHAR(100),
  insurance_expiry_date DATE,
  email                 VARCHAR(255) NOT NULL UNIQUE,
  password_hash         TEXT NOT NULL,
  is_active             BOOLEAN NOT NULL DEFAULT false, -- admin must activate after review
  rating                NUMERIC(3,1),                  -- 0.0 to 5.0, set by admin
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_trades_email ON trades(email);
CREATE INDEX IF NOT EXISTS idx_trades_category ON trades(trade_category);
CREATE INDEX IF NOT EXISTS idx_trades_insurance_expiry ON trades(insurance_expiry_date);
