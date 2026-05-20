-- Migration 014: Invoices
-- Financial records for completed jobs. Admin-managed, not automated.

CREATE TYPE payment_status AS ENUM ('unpaid', 'paid');
CREATE TYPE client_payment_status AS ENUM ('unpaid', 'invoiced', 'paid');

CREATE TABLE IF NOT EXISTS invoices (
  id                      SERIAL PRIMARY KEY,
  job_id                  INTEGER NOT NULL UNIQUE REFERENCES jobs(id) ON DELETE RESTRICT,
  trade_cost              NUMERIC(12,2) NOT NULL,
  margin_percent          NUMERIC(5,2) NOT NULL DEFAULT 0,
  client_charge           NUMERIC(12,2) NOT NULL,   -- computed: trade_cost * (1 + margin_percent/100)
  trade_payment_status    payment_status NOT NULL DEFAULT 'unpaid',
  client_payment_status   client_payment_status NOT NULL DEFAULT 'unpaid',
  notes                   TEXT,
  created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at              TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_invoices_job ON invoices(job_id);
CREATE INDEX IF NOT EXISTS idx_invoices_trade_payment ON invoices(trade_payment_status);
CREATE INDEX IF NOT EXISTS idx_invoices_client_payment ON invoices(client_payment_status);
