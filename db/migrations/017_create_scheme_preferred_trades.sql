-- Stores the preferred (default) trade contractor for each trade category at a scheme.
-- Only one trade per category per scheme (upsert replaces on conflict).
CREATE TABLE IF NOT EXISTS scheme_preferred_trades (
  id             SERIAL PRIMARY KEY,
  scheme_id      INTEGER NOT NULL REFERENCES schemes(id)  ON DELETE CASCADE,
  trade_id       INTEGER NOT NULL REFERENCES trades(id)   ON DELETE CASCADE,
  trade_category TEXT    NOT NULL,
  created_at     TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (scheme_id, trade_category)
);
