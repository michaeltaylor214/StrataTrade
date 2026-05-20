-- Migration 012: Quote Requests and Quotes
-- Multi-quote process for rectification works or maintenance.

CREATE TYPE quote_request_status AS ENUM ('open', 'quotes_received', 'accepted', 'cancelled');
CREATE TYPE quote_status AS ENUM ('submitted', 'accepted', 'declined');

CREATE TABLE IF NOT EXISTS quote_requests (
  id                      SERIAL PRIMARY KEY,
  audit_finding_id        INTEGER REFERENCES audit_findings(id) ON DELETE SET NULL,
  maintenance_request_id  INTEGER REFERENCES maintenance_requests(id) ON DELETE SET NULL,
  scheme_id               INTEGER NOT NULL REFERENCES schemes(id) ON DELETE RESTRICT,
  description_of_works    TEXT NOT NULL,
  status                  quote_request_status NOT NULL DEFAULT 'open',
  ready_for_review        BOOLEAN NOT NULL DEFAULT false, -- admin marks when ready for strata manager
  created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at              TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS quotes (
  id               SERIAL PRIMARY KEY,
  quote_request_id INTEGER NOT NULL REFERENCES quote_requests(id) ON DELETE CASCADE,
  trade_id         INTEGER NOT NULL REFERENCES trades(id) ON DELETE RESTRICT,
  amount           NUMERIC(12,2) NOT NULL,
  notes            TEXT,
  valid_until      DATE,
  status           quote_status NOT NULL DEFAULT 'submitted',
  quote_token      UUID NOT NULL UNIQUE DEFAULT gen_random_uuid(),
  token_expiry     TIMESTAMPTZ,
  submitted_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_quote_requests_scheme ON quote_requests(scheme_id);
CREATE INDEX IF NOT EXISTS idx_quote_requests_status ON quote_requests(status);
CREATE INDEX IF NOT EXISTS idx_quotes_request ON quotes(quote_request_id);
CREATE INDEX IF NOT EXISTS idx_quotes_trade ON quotes(trade_id);
CREATE INDEX IF NOT EXISTS idx_quotes_token ON quotes(quote_token);
