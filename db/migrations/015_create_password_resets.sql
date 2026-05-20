-- Migration 015: Password Reset Tokens
-- Supports password reset via email for all user types.

CREATE TABLE IF NOT EXISTS password_reset_tokens (
  id          SERIAL PRIMARY KEY,
  user_role   VARCHAR(50) NOT NULL,   -- 'admin', 'strata_manager', 'building_manager', 'trade'
  user_id     INTEGER NOT NULL,
  token       UUID NOT NULL UNIQUE DEFAULT gen_random_uuid(),
  expires_at  TIMESTAMPTZ NOT NULL,
  used_at     TIMESTAMPTZ,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_password_resets_token ON password_reset_tokens(token);
CREATE INDEX IF NOT EXISTS idx_password_resets_user ON password_reset_tokens(user_role, user_id);
