-- Migration 010: Maintenance Requests
-- Ad-hoc work requests submitted by building managers or strata managers.

CREATE TYPE submitter_role AS ENUM ('building_manager', 'strata_manager');
CREATE TYPE request_priority AS ENUM ('low', 'medium', 'high', 'urgent');
CREATE TYPE request_status AS ENUM (
  'submitted',
  'under_review',
  'job_created',
  'completed',
  'declined'
);

CREATE TABLE IF NOT EXISTS maintenance_requests (
  id                  SERIAL PRIMARY KEY,
  scheme_id           INTEGER NOT NULL REFERENCES schemes(id) ON DELETE RESTRICT,
  submitted_by_role   submitter_role NOT NULL,
  submitted_by_id     INTEGER NOT NULL,          -- FK enforced at app level (different tables by role)
  title               VARCHAR(300) NOT NULL,
  description         TEXT NOT NULL,
  priority            request_priority NOT NULL DEFAULT 'medium',
  photo_paths         TEXT[] NOT NULL DEFAULT '{}',
  status              request_status NOT NULL DEFAULT 'submitted',
  admin_response      TEXT,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_maintenance_requests_scheme ON maintenance_requests(scheme_id);
CREATE INDEX IF NOT EXISTS idx_maintenance_requests_status ON maintenance_requests(status);
CREATE INDEX IF NOT EXISTS idx_maintenance_requests_submitter ON maintenance_requests(submitted_by_role, submitted_by_id);
