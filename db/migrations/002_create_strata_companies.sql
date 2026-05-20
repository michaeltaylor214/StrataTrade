-- Migration 002: Strata Companies
-- Strata management companies that use the platform.

CREATE TABLE IF NOT EXISTS strata_companies (
  id              SERIAL PRIMARY KEY,
  name            VARCHAR(300) NOT NULL,
  address         TEXT,
  contact_name    VARCHAR(200),
  contact_email   VARCHAR(255),
  contact_phone   VARCHAR(50),
  company_code    VARCHAR(20) NOT NULL UNIQUE, -- used by strata managers to self-register
  is_active       BOOLEAN NOT NULL DEFAULT true,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_strata_companies_code ON strata_companies(company_code);
