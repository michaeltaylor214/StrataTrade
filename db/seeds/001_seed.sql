-- StrataTrade Seed Data
-- Run after all migrations. Idempotent via ON CONFLICT DO NOTHING.

-- ============================================================
-- 1. Admin user
-- Password: changeme123  (bcrypt hash generated with 12 rounds)
-- force_password_change = true so admin must reset on first login
-- ============================================================
INSERT INTO admin_users (name, email, password_hash, force_password_change)
VALUES (
  'Platform Admin',
  'admin@platform.com',
  '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBpj2xXqXHkBGa', -- changeme123
  true
)
ON CONFLICT (email) DO NOTHING;

-- ============================================================
-- 2. Standard Compliance Obligation Templates
-- ============================================================
INSERT INTO compliance_obligation_templates (id, trade_category, obligation_name, frequency_months, requires_lift, requires_pool) VALUES
  ('electrical_annual_inspection',      'Electrical',       'Annual Common Area Electrical Inspection',       12, false, false),
  ('electrical_rcd_quarterly',          'Electrical',       'Quarterly RCD Testing',                          3,  false, false),
  ('electrical_thermographic_5yr',      'Electrical',       '5-Year Thermographic Switchboard Inspection',    60, false, false),
  ('fire_annual_statement',             'Fire Safety',      'Annual Fire Safety Statement',                   12, false, false),
  ('fire_extinguisher_6month',          'Fire Safety',      '6-Monthly Fire Extinguisher Service',            6,  false, false),
  ('plumbing_backflow_annual',          'Plumbing',         'Annual Backflow Prevention Inspection',          12, false, false),
  ('lift_inspection_6month',            'Lift',             '6-Monthly Lift Inspection',                      6,  true,  false),
  ('pool_safety_annual',                'Pool',             'Annual Pool Safety Inspection',                  12, false, true)
ON CONFLICT (id) DO NOTHING;

-- ============================================================
-- 3. Sample Strata Company
-- ============================================================
INSERT INTO strata_companies (name, address, contact_name, contact_email, contact_phone, company_code)
VALUES (
  'Harbour View Strata Management',
  '42 George Street, Sydney NSW 2000',
  'Jane Wilson',
  'jane@harbourviewstrata.com.au',
  '02 9000 1234',
  'HVST-001'
)
ON CONFLICT (company_code) DO NOTHING;

-- ============================================================
-- 4. Strata Manager
-- Password: manager123
-- ============================================================
INSERT INTO strata_managers (strata_company_id, name, email, password_hash)
SELECT
  sc.id,
  'Jane Wilson',
  'jane@harbourviewstrata.com.au',
  '$2b$12$K7mTtIzPhSC2AoFmqA5vhOQRp1Zzr7Q5eI0b7OTkB5lX3U2y8q.dK' -- manager123
FROM strata_companies sc
WHERE sc.company_code = 'HVST-001'
ON CONFLICT (email) DO NOTHING;

-- ============================================================
-- 5. Sample Schemes
-- ============================================================
INSERT INTO schemes (strata_company_id, name, address, building_class, number_of_lots, has_lift, has_pool, audit_status, onboarded_at)
SELECT
  sc.id,
  'Harbour Tower Apartments',
  '15 Marine Parade, Manly NSW 2095',
  'Class 2',
  48,
  true,
  true,
  'completed',
  NOW() - INTERVAL '3 months'
FROM strata_companies sc WHERE sc.company_code = 'HVST-001'
ON CONFLICT DO NOTHING;

INSERT INTO schemes (strata_company_id, name, address, building_class, number_of_lots, has_lift, has_pool, audit_status, onboarded_at)
SELECT
  sc.id,
  'Parkside Villas',
  '7 Rose Street, Chatswood NSW 2067',
  'Class 2',
  24,
  false,
  false,
  'pending',
  NOW() - INTERVAL '1 month'
FROM strata_companies sc WHERE sc.company_code = 'HVST-001'
ON CONFLICT DO NOTHING;

-- ============================================================
-- 6. Building Manager (assigned to Harbour Tower)
-- Password: building123
-- ============================================================
INSERT INTO building_managers (scheme_id, name, email, password_hash, phone)
SELECT
  s.id,
  'Tom Nguyen',
  'tom.nguyen@harbourtower.com.au',
  '$2b$12$7RvG3cXkPmLbVhQ8JuNWVuQJXyF3aG2hZ4mC6nE1kD5tX9wB7p.2S', -- building123
  '0412 345 678'
FROM schemes s WHERE s.name = 'Harbour Tower Apartments'
ON CONFLICT (email) DO NOTHING;

-- ============================================================
-- 7. Sample Trades
-- Password: trade123
-- ============================================================
INSERT INTO trades (full_name, company_name, abn, trade_category, licence_number, insurance_expiry_date, email, password_hash, is_active)
VALUES (
  'Robert Chen',
  'Chen Electrical Services',
  '12 345 678 901',
  'Electrical',
  'EC123456',
  CURRENT_DATE + INTERVAL '8 months',
  'robert@chenelectrical.com.au',
  '$2b$12$9SmU5cXwPnMbVhR8KuOWVuQJXyG4bH3iZ5nD7oF2lE6uY0vA8r.3T', -- trade123
  true
),
(
  'Sarah Mitchell',
  'SafeGuard Fire Protection',
  '98 765 432 109',
  'Fire Safety',
  'FS789012',
  CURRENT_DATE + INTERVAL '5 months',
  'sarah@safeguardfire.com.au',
  '$2b$12$9SmU5cXwPnMbVhR8KuOWVuQJXyG4bH3iZ5nD7oF2lE6uY0vA8r.3T', -- trade123
  true
)
ON CONFLICT (email) DO NOTHING;

-- ============================================================
-- 8. Compliance Obligations for Harbour Tower
--    (apply all templates; has_lift=true, has_pool=true)
-- ============================================================
INSERT INTO compliance_obligations (scheme_id, template_id, trade_category, obligation_name, frequency_months, last_completed_date, next_due_date)
SELECT
  s.id,
  t.id,
  t.trade_category,
  t.obligation_name,
  t.frequency_months,
  CURRENT_DATE - INTERVAL '6 months',
  CASE
    WHEN t.frequency_months = 3  THEN CURRENT_DATE + INTERVAL '1 month'
    WHEN t.frequency_months = 6  THEN CURRENT_DATE + INTERVAL '2 months'
    WHEN t.frequency_months = 12 THEN CURRENT_DATE + INTERVAL '6 months'
    WHEN t.frequency_months = 60 THEN CURRENT_DATE + INTERVAL '4 years'
  END
FROM compliance_obligation_templates t
CROSS JOIN schemes s
WHERE s.name = 'Harbour Tower Apartments'
  AND (t.requires_lift = false OR s.has_lift = true)
  AND (t.requires_pool = false OR s.has_pool = true)
ON CONFLICT DO NOTHING;

-- ============================================================
-- 9. Sample Building Audit for Harbour Tower (completed)
-- ============================================================
WITH audit AS (
  INSERT INTO building_audits (scheme_id, conducted_by, audit_date, overall_condition, summary_notes, status)
  SELECT
    s.id,
    a.id,
    CURRENT_DATE - INTERVAL '2 months',
    'fair',
    'General condition is fair. Fire safety equipment is well-maintained. Electrical switchboard shows signs of age and requires thermographic inspection. Pool area safety signage requires immediate update.',
    'submitted'
  FROM schemes s, admin_users a
  WHERE s.name = 'Harbour Tower Apartments'
    AND a.email = 'admin@platform.com'
  RETURNING id
)
INSERT INTO audit_findings (audit_id, trade_category, location_in_building, description, severity, requires_rectification, rectification_status)
SELECT
  audit.id,
  finding.trade_category::trade_category,
  finding.location,
  finding.description,
  finding.severity::finding_severity,
  finding.requires_rectification,
  finding.rectification_status::rectification_status
FROM audit
CROSS JOIN (VALUES
  ('Electrical',    'Level 3 Electrical Switchboard', 'Surface rust visible on switchboard door. Wiring appears original to building (circa 2005). Thermographic inspection recommended.', 'medium', true,  'pending'),
  ('Fire Safety',   'Basement Car Park',              'Two fire extinguishers were outside service date by 6 weeks. Both have since been serviced and tagged. No further action required.', 'low',    false, 'completed'),
  ('Pool',          'Rooftop Pool Deck',              'Pool safety signage does not meet current NSW requirements. Depth markers are faded. Emergency phone inoperable.', 'critical', true, 'quotes_requested')
) AS finding(trade_category, location, description, severity, requires_rectification, rectification_status)
ON CONFLICT DO NOTHING;

-- Update scheme audit_status to completed
UPDATE schemes SET audit_status = 'completed' WHERE name = 'Harbour Tower Apartments';
