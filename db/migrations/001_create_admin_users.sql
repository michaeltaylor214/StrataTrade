-- Migration 001: Admin Users
-- Platform owner accounts. Seeded, no self-registration.

CREATE TABLE IF NOT EXISTS admin_users (
  id                    SERIAL PRIMARY KEY,
  name                  VARCHAR(200) NOT NULL,
  email                 VARCHAR(255) NOT NULL UNIQUE,
  password_hash         TEXT NOT NULL,
  force_password_change BOOLEAN NOT NULL DEFAULT true,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_admin_users_email ON admin_users(email);
