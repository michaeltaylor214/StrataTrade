-- Migration 003: Strata Managers
-- Users who belong to a strata company and manage schemes.

CREATE TABLE IF NOT EXISTS strata_managers (
  id                SERIAL PRIMARY KEY,
  strata_company_id INTEGER NOT NULL REFERENCES strata_companies(id) ON DELETE RESTRICT,
  name              VARCHAR(200) NOT NULL,
  email             VARCHAR(255) NOT NULL UNIQUE,
  password_hash     TEXT NOT NULL,
  is_active         BOOLEAN NOT NULL DEFAULT true,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_strata_managers_email ON strata_managers(email);
CREATE INDEX IF NOT EXISTS idx_strata_managers_company ON strata_managers(strata_company_id);
