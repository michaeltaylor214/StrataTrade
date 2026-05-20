-- Migration 005: Schemes
-- Individual property complexes (strata schemes) managed by a strata company.

CREATE TYPE audit_status AS ENUM ('pending', 'in_progress', 'completed');

CREATE TABLE IF NOT EXISTS schemes (
  id                SERIAL PRIMARY KEY,
  strata_company_id INTEGER NOT NULL REFERENCES strata_companies(id) ON DELETE RESTRICT,
  name              VARCHAR(300) NOT NULL,
  address           TEXT NOT NULL,
  building_class    VARCHAR(100),
  number_of_lots    INTEGER,
  has_lift          BOOLEAN NOT NULL DEFAULT false,
  has_pool          BOOLEAN NOT NULL DEFAULT false,
  notes             TEXT,
  audit_status      audit_status NOT NULL DEFAULT 'pending',
  onboarded_at      TIMESTAMPTZ,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_schemes_company ON schemes(strata_company_id);
