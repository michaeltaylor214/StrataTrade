-- Migration 016: Add NSW licence verification columns to trades table
-- Stores the result of the Service NSW Trades Register API check at registration time.
-- nsw_licence_verified: NULL = not checked (API not configured), TRUE = passed, FALSE = failed
-- nsw_licence_status:   human-readable status/reason from the API check

ALTER TABLE trades
  ADD COLUMN IF NOT EXISTS nsw_licence_verified BOOLEAN,
  ADD COLUMN IF NOT EXISTS nsw_licence_status   TEXT;

-- Make licence_number required going forward (existing rows may be NULL — leave them)
-- We don't ALTER COLUMN NOT NULL here to avoid breaking existing seeded records.
-- Enforcement is done at the application layer for new registrations.

COMMENT ON COLUMN trades.nsw_licence_verified IS
  'NULL = verification not run (API not configured); TRUE = NSW API verified; FALSE = NSW API check failed';

COMMENT ON COLUMN trades.nsw_licence_status IS
  'Status/reason returned from NSW Trades Register API verification';
