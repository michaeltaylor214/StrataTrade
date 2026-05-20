-- Migration 009: Audit Findings
-- Individual defects or issues identified during a building audit.

CREATE TYPE finding_severity AS ENUM ('low', 'medium', 'high', 'critical');
CREATE TYPE rectification_status AS ENUM (
  'pending',
  'quotes_requested',
  'quote_accepted',
  'in_progress',
  'completed',
  'waived'
);

CREATE TABLE IF NOT EXISTS audit_findings (
  id                     SERIAL PRIMARY KEY,
  audit_id               INTEGER NOT NULL REFERENCES building_audits(id) ON DELETE CASCADE,
  trade_category         trade_category NOT NULL,
  location_in_building   VARCHAR(300),
  description            TEXT NOT NULL,
  severity               finding_severity NOT NULL,
  requires_rectification BOOLEAN NOT NULL DEFAULT false,
  rectification_status   rectification_status NOT NULL DEFAULT 'pending',
  waive_reason           TEXT,
  photo_paths            TEXT[] NOT NULL DEFAULT '{}',
  created_at             TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at             TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_audit_findings_audit ON audit_findings(audit_id);
CREATE INDEX IF NOT EXISTS idx_audit_findings_rectification ON audit_findings(rectification_status)
  WHERE requires_rectification = true;
