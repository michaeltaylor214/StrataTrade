-- Migration 008: Building Audits
-- Initial site inspection conducted by admin when a scheme is onboarded.

CREATE TYPE building_condition AS ENUM ('good', 'fair', 'poor');
CREATE TYPE audit_record_status AS ENUM ('draft', 'submitted', 'reviewed');

CREATE TABLE IF NOT EXISTS building_audits (
  id               SERIAL PRIMARY KEY,
  scheme_id        INTEGER NOT NULL REFERENCES schemes(id) ON DELETE RESTRICT,
  conducted_by     INTEGER NOT NULL REFERENCES admin_users(id) ON DELETE RESTRICT,
  audit_date       DATE NOT NULL,
  overall_condition building_condition,
  summary_notes    TEXT,
  status           audit_record_status NOT NULL DEFAULT 'draft',
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_building_audits_scheme ON building_audits(scheme_id);
