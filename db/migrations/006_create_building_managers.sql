-- Migration 006: Building Managers
-- On-site contacts for individual schemes. One per scheme, optional.

CREATE TABLE IF NOT EXISTS building_managers (
  id            SERIAL PRIMARY KEY,
  scheme_id     INTEGER NOT NULL REFERENCES schemes(id) ON DELETE RESTRICT,
  name          VARCHAR(200) NOT NULL,
  email         VARCHAR(255) NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  phone         VARCHAR(50),
  is_active     BOOLEAN NOT NULL DEFAULT true,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_building_managers_scheme ON building_managers(scheme_id);
CREATE INDEX IF NOT EXISTS idx_building_managers_email ON building_managers(email);
