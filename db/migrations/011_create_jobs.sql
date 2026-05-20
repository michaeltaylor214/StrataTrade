-- Migration 011: Jobs
-- Work assignments to trades. May originate from compliance, maintenance, or audit rectification.

CREATE TYPE job_type AS ENUM ('compliance', 'maintenance', 'rectification');
CREATE TYPE job_status AS ENUM (
  'pending_assignment',
  'assigned',
  'confirmed',
  'completed',
  'certificate_uploaded',
  'approved',
  'cancelled'
);

CREATE TABLE IF NOT EXISTS jobs (
  id                        SERIAL PRIMARY KEY,
  scheme_id                 INTEGER NOT NULL REFERENCES schemes(id) ON DELETE RESTRICT,
  compliance_obligation_id  INTEGER REFERENCES compliance_obligations(id) ON DELETE SET NULL,
  maintenance_request_id    INTEGER REFERENCES maintenance_requests(id) ON DELETE SET NULL,
  audit_finding_id          INTEGER REFERENCES audit_findings(id) ON DELETE SET NULL,
  trade_id                  INTEGER REFERENCES trades(id) ON DELETE SET NULL,
  job_type                  job_type NOT NULL,
  status                    job_status NOT NULL DEFAULT 'pending_assignment',
  scheduled_date            DATE,
  confirmation_token        UUID UNIQUE DEFAULT gen_random_uuid(),
  confirmation_token_expiry TIMESTAMPTZ,
  admin_notes               TEXT,
  cancellation_reason       TEXT,
  created_at                TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at                TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_jobs_scheme ON jobs(scheme_id);
CREATE INDEX IF NOT EXISTS idx_jobs_trade ON jobs(trade_id);
CREATE INDEX IF NOT EXISTS idx_jobs_status ON jobs(status);
CREATE INDEX IF NOT EXISTS idx_jobs_scheduled_date ON jobs(scheduled_date);
CREATE INDEX IF NOT EXISTS idx_jobs_confirmation_token ON jobs(confirmation_token);
CREATE INDEX IF NOT EXISTS idx_jobs_compliance_obligation ON jobs(compliance_obligation_id);
