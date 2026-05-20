-- Migration 007: Compliance Obligations & Templates
-- Templates hold the standard obligations; per-scheme obligations reference the scheme.

CREATE TABLE IF NOT EXISTS compliance_obligation_templates (
  id                VARCHAR(50) PRIMARY KEY,  -- e.g. 'electrical_annual_inspection'
  trade_category    trade_category NOT NULL,
  obligation_name   VARCHAR(300) NOT NULL,
  frequency_months  INTEGER NOT NULL,
  requires_lift     BOOLEAN NOT NULL DEFAULT false, -- only add when scheme has_lift
  requires_pool     BOOLEAN NOT NULL DEFAULT false  -- only add when scheme has_pool
);

CREATE TABLE IF NOT EXISTS compliance_obligations (
  id                  SERIAL PRIMARY KEY,
  scheme_id           INTEGER NOT NULL REFERENCES schemes(id) ON DELETE CASCADE,
  template_id         VARCHAR(50) REFERENCES compliance_obligation_templates(id) ON DELETE SET NULL,
  trade_category      trade_category NOT NULL,
  obligation_name     VARCHAR(300) NOT NULL,
  frequency_months    INTEGER NOT NULL,
  last_completed_date DATE,
  next_due_date       DATE,
  is_active           BOOLEAN NOT NULL DEFAULT true,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_compliance_obligations_scheme ON compliance_obligations(scheme_id);
CREATE INDEX IF NOT EXISTS idx_compliance_obligations_due ON compliance_obligations(next_due_date) WHERE is_active = true;
