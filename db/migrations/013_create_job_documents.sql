-- Migration 013: Job Documents
-- Files uploaded against a job: certificates, photos, completion notes, audit photos.

CREATE TYPE document_type AS ENUM (
  'certificate',
  'photo',
  'completion_note',
  'audit_photo',
  'maintenance_photo',
  'legacy_document'
);

CREATE TABLE IF NOT EXISTS job_documents (
  id                SERIAL PRIMARY KEY,
  job_id            INTEGER REFERENCES jobs(id) ON DELETE CASCADE,
  scheme_id         INTEGER REFERENCES schemes(id) ON DELETE CASCADE, -- for scheme-level docs (legacy uploads)
  document_type     document_type NOT NULL,
  file_path         TEXT NOT NULL,      -- relative path, never absolute
  original_filename VARCHAR(500),
  file_size_bytes   INTEGER,
  mime_type         VARCHAR(100),
  uploaded_by_role  VARCHAR(50),        -- 'trade', 'admin', 'strata_manager', 'building_manager'
  uploaded_by_id    INTEGER,
  approved_by_admin BOOLEAN NOT NULL DEFAULT false,
  rejection_reason  TEXT,
  uploaded_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT job_or_scheme_required CHECK (job_id IS NOT NULL OR scheme_id IS NOT NULL)
);

CREATE INDEX IF NOT EXISTS idx_job_documents_job ON job_documents(job_id);
CREATE INDEX IF NOT EXISTS idx_job_documents_scheme ON job_documents(scheme_id);
CREATE INDEX IF NOT EXISTS idx_job_documents_approved ON job_documents(approved_by_admin) WHERE job_id IS NOT NULL;
