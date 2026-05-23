import { Request, Response } from 'express';
import pool from '../db';

// ---------------------------------------------------------------------------
// Strata Companies
// ---------------------------------------------------------------------------

export async function listCompanies(req: Request, res: Response): Promise<void> {
  const result = await pool.query(
    'SELECT * FROM strata_companies ORDER BY name'
  );
  res.json(result.rows);
}

export async function createCompany(req: Request, res: Response): Promise<void> {
  const { name, address, contactName, contactEmail, contactPhone } = req.body as Record<string, string>;
  if (!name) { res.status(400).json({ error: 'name is required' }); return; }

  // Generate a unique company code
  const code = `${name.replace(/[^A-Z0-9]/gi, '').toUpperCase().slice(0, 4)}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;

  const result = await pool.query(
    `INSERT INTO strata_companies (name, address, contact_name, contact_email, contact_phone, company_code)
     VALUES ($1,$2,$3,$4,$5,$6) RETURNING *`,
    [name, address || null, contactName || null, contactEmail || null, contactPhone || null, code]
  );
  res.status(201).json(result.rows[0]);
}

export async function getCompany(req: Request, res: Response): Promise<void> {
  const { id } = req.params;

  const companyResult = await pool.query(
    'SELECT * FROM strata_companies WHERE id = $1',
    [id]
  );
  if (companyResult.rows.length === 0) { res.status(404).json({ error: 'Company not found' }); return; }

  const schemesResult = await pool.query(
    `SELECT s.*,
            COALESCE(json_agg(
              json_build_object(
                'id', spt.id,
                'trade_id', spt.trade_id,
                'trade_category', spt.trade_category,
                'trade_company', t.company_name,
                'trade_name', t.full_name
              )
            ) FILTER (WHERE spt.id IS NOT NULL), '[]') AS preferred_trades
     FROM schemes s
     LEFT JOIN scheme_preferred_trades spt ON spt.scheme_id = s.id
     LEFT JOIN trades t ON t.id = spt.trade_id
     WHERE s.strata_company_id = $1
     GROUP BY s.id
     ORDER BY s.name`,
    [id]
  );

  res.json({ ...companyResult.rows[0], schemes: schemesResult.rows });
}

export async function addPreferredTrade(req: Request, res: Response): Promise<void> {
  const { schemeId } = req.params;
  const { tradeId, tradeCategory } = req.body as { tradeId: number; tradeCategory: string };

  if (!tradeId || !tradeCategory) {
    res.status(400).json({ error: 'tradeId and tradeCategory are required' }); return;
  }

  const result = await pool.query(
    `INSERT INTO scheme_preferred_trades (scheme_id, trade_id, trade_category)
     VALUES ($1, $2, $3)
     ON CONFLICT (scheme_id, trade_category) DO UPDATE SET trade_id = EXCLUDED.trade_id
     RETURNING *`,
    [schemeId, tradeId, tradeCategory]
  );
  res.json(result.rows[0]);
}

export async function removePreferredTrade(req: Request, res: Response): Promise<void> {
  const { id } = req.params;
  await pool.query('DELETE FROM scheme_preferred_trades WHERE id = $1', [id]);
  res.status(204).send();
}

export async function updateCompany(req: Request, res: Response): Promise<void> {
  const { id } = req.params;
  const { name, address, contactName, contactEmail, contactPhone, isActive } = req.body as Record<string, unknown>;

  const result = await pool.query(
    `UPDATE strata_companies SET
       name = COALESCE($1, name),
       address = COALESCE($2, address),
       contact_name = COALESCE($3, contact_name),
       contact_email = COALESCE($4, contact_email),
       contact_phone = COALESCE($5, contact_phone),
       is_active = COALESCE($6, is_active),
       updated_at = NOW()
     WHERE id = $7 RETURNING *`,
    [name, address, contactName, contactEmail, contactPhone, isActive, id]
  );
  if (result.rows.length === 0) { res.status(404).json({ error: 'Company not found' }); return; }
  res.json(result.rows[0]);
}

export async function deleteCompany(req: Request, res: Response): Promise<void> {
  const { id } = req.params;
  try {
    await pool.query('DELETE FROM strata_companies WHERE id = $1', [id]);
    res.status(204).send();
  } catch {
    res.status(409).json({ error: 'Cannot delete — company has existing schemes or managers' });
  }
}

// ---------------------------------------------------------------------------
// Schemes
// ---------------------------------------------------------------------------

export async function listSchemes(req: Request, res: Response): Promise<void> {
  const user = req.user!;

  let query: string;
  let params: unknown[];

  if (user.role === 'admin') {
    query = `
      SELECT s.*, sc.name AS company_name,
             bm.name AS building_manager_name, bm.email AS building_manager_email
      FROM schemes s
      JOIN strata_companies sc ON sc.id = s.strata_company_id
      LEFT JOIN building_managers bm ON bm.scheme_id = s.id
      ORDER BY sc.name, s.name`;
    params = [];
  } else if (user.role === 'strata_manager') {
    query = `
      SELECT s.*, sc.name AS company_name,
             bm.name AS building_manager_name, bm.email AS building_manager_email
      FROM schemes s
      JOIN strata_companies sc ON sc.id = s.strata_company_id
      LEFT JOIN building_managers bm ON bm.scheme_id = s.id
      WHERE s.strata_company_id = $1
      ORDER BY s.name`;
    params = [user.strataCompanyId];
  } else {
    res.status(403).json({ error: 'Forbidden' }); return;
  }

  const result = await pool.query(query, params);
  res.json(result.rows);
}

export async function getScheme(req: Request, res: Response): Promise<void> {
  const { id } = req.params;
  const user = req.user!;

  const result = await pool.query(
    `SELECT s.*, sc.name AS company_name,
            bm.id AS bm_id, bm.name AS building_manager_name, bm.email AS building_manager_email
     FROM schemes s
     JOIN strata_companies sc ON sc.id = s.strata_company_id
     LEFT JOIN building_managers bm ON bm.scheme_id = s.id
     WHERE s.id = $1`,
    [id]
  );

  if (result.rows.length === 0) { res.status(404).json({ error: 'Scheme not found' }); return; }

  const scheme = result.rows[0];

  // Enforce access control
  if (user.role === 'strata_manager' && scheme.strata_company_id !== user.strataCompanyId) {
    res.status(403).json({ error: 'Forbidden' }); return;
  }
  if (user.role === 'building_manager' && scheme.id !== user.schemeId) {
    res.status(403).json({ error: 'Forbidden' }); return;
  }

  res.json(scheme);
}

export async function createScheme(req: Request, res: Response): Promise<void> {
  const {
    strataCompanyId, name, address, buildingClass,
    numberOfLots, hasLift, hasPool, notes,
  } = req.body as Record<string, unknown>;

  if (!strataCompanyId || !name || !address) {
    res.status(400).json({ error: 'strataCompanyId, name, and address are required' }); return;
  }

  const result = await pool.query(
    `INSERT INTO schemes
       (strata_company_id, name, address, building_class, number_of_lots, has_lift, has_pool, notes, onboarded_at)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,NOW()) RETURNING *`,
    [strataCompanyId, name, address, buildingClass || null, numberOfLots || null,
     hasLift ?? false, hasPool ?? false, notes || null]
  );
  res.status(201).json(result.rows[0]);
}

export async function updateScheme(req: Request, res: Response): Promise<void> {
  const { id } = req.params;
  const { name, address, buildingClass, numberOfLots, hasLift, hasPool, notes, auditStatus } = req.body as Record<string, unknown>;

  const result = await pool.query(
    `UPDATE schemes SET
       name = COALESCE($1, name),
       address = COALESCE($2, address),
       building_class = COALESCE($3, building_class),
       number_of_lots = COALESCE($4, number_of_lots),
       has_lift = COALESCE($5, has_lift),
       has_pool = COALESCE($6, has_pool),
       notes = COALESCE($7, notes),
       audit_status = COALESCE($8, audit_status),
       updated_at = NOW()
     WHERE id = $9 RETURNING *`,
    [name, address, buildingClass, numberOfLots, hasLift, hasPool, notes, auditStatus, id]
  );
  if (result.rows.length === 0) { res.status(404).json({ error: 'Scheme not found' }); return; }
  res.json(result.rows[0]);
}

export async function deleteScheme(req: Request, res: Response): Promise<void> {
  const { id } = req.params;
  try {
    await pool.query('DELETE FROM schemes WHERE id = $1', [id]);
    res.status(204).send();
  } catch {
    res.status(409).json({ error: 'Cannot delete — scheme has existing records' });
  }
}

// ---------------------------------------------------------------------------
// Compliance Obligations
// ---------------------------------------------------------------------------

export async function listTemplates(req: Request, res: Response): Promise<void> {
  const result = await pool.query('SELECT * FROM compliance_obligation_templates ORDER BY trade_category, obligation_name');
  res.json(result.rows);
}

export async function listObligations(req: Request, res: Response): Promise<void> {
  const { schemeId } = req.params;
  const user = req.user!;

  // Verify scheme access
  const scheme = await pool.query('SELECT strata_company_id FROM schemes WHERE id = $1', [schemeId]);
  if (scheme.rows.length === 0) { res.status(404).json({ error: 'Scheme not found' }); return; }
  if (user.role === 'strata_manager' && scheme.rows[0].strata_company_id !== user.strataCompanyId) {
    res.status(403).json({ error: 'Forbidden' }); return;
  }
  if (user.role === 'building_manager' && Number(schemeId) !== user.schemeId) {
    res.status(403).json({ error: 'Forbidden' }); return;
  }

  const result = await pool.query(
    'SELECT * FROM compliance_obligations WHERE scheme_id = $1 ORDER BY trade_category, obligation_name',
    [schemeId]
  );
  res.json(result.rows);
}

export async function applyTemplates(req: Request, res: Response): Promise<void> {
  const { schemeId } = req.params;

  const scheme = await pool.query('SELECT * FROM schemes WHERE id = $1', [schemeId]);
  if (scheme.rows.length === 0) { res.status(404).json({ error: 'Scheme not found' }); return; }
  const s = scheme.rows[0];

  // Insert obligations from templates, skipping ones already present
  await pool.query(
    `INSERT INTO compliance_obligations (scheme_id, template_id, trade_category, obligation_name, frequency_months)
     SELECT $1, t.id, t.trade_category, t.obligation_name, t.frequency_months
     FROM compliance_obligation_templates t
     WHERE (t.requires_lift = false OR $2 = true)
       AND (t.requires_pool = false OR $3 = true)
     ON CONFLICT DO NOTHING`,
    [schemeId, s.has_lift, s.has_pool]
  );

  const result = await pool.query(
    'SELECT * FROM compliance_obligations WHERE scheme_id = $1 ORDER BY trade_category',
    [schemeId]
  );
  res.json(result.rows);
}

export async function createObligation(req: Request, res: Response): Promise<void> {
  const { schemeId } = req.params;
  const { tradeCategory, obligationName, frequencyMonths, lastCompletedDate, nextDueDate } = req.body as Record<string, unknown>;

  if (!tradeCategory || !obligationName || !frequencyMonths) {
    res.status(400).json({ error: 'tradeCategory, obligationName, and frequencyMonths are required' }); return;
  }

  const result = await pool.query(
    `INSERT INTO compliance_obligations
       (scheme_id, trade_category, obligation_name, frequency_months, last_completed_date, next_due_date)
     VALUES ($1,$2,$3,$4,$5,$6) RETURNING *`,
    [schemeId, tradeCategory, obligationName, frequencyMonths, lastCompletedDate || null, nextDueDate || null]
  );
  res.status(201).json(result.rows[0]);
}

export async function updateObligation(req: Request, res: Response): Promise<void> {
  const { id } = req.params;
  const { obligationName, frequencyMonths, lastCompletedDate, nextDueDate, isActive } = req.body as Record<string, unknown>;

  const result = await pool.query(
    `UPDATE compliance_obligations SET
       obligation_name = COALESCE($1, obligation_name),
       frequency_months = COALESCE($2, frequency_months),
       last_completed_date = COALESCE($3, last_completed_date),
       next_due_date = COALESCE($4, next_due_date),
       is_active = COALESCE($5, is_active),
       updated_at = NOW()
     WHERE id = $6 RETURNING *`,
    [obligationName, frequencyMonths, lastCompletedDate, nextDueDate, isActive, id]
  );
  if (result.rows.length === 0) { res.status(404).json({ error: 'Obligation not found' }); return; }
  res.json(result.rows[0]);
}

export async function deleteObligation(req: Request, res: Response): Promise<void> {
  const { id } = req.params;
  await pool.query('DELETE FROM compliance_obligations WHERE id = $1', [id]);
  res.status(204).send();
}

/** Compute RAG compliance status for a scheme. */
export async function getSchemeComplianceStatus(req: Request, res: Response): Promise<void> {
  const { schemeId } = req.params;

  const result = await pool.query(
    `SELECT
       SUM(CASE WHEN next_due_date < NOW() THEN 1 ELSE 0 END)::int AS overdue,
       SUM(CASE WHEN next_due_date BETWEEN NOW() AND NOW() + INTERVAL '30 days' THEN 1 ELSE 0 END)::int AS due_soon
     FROM compliance_obligations
     WHERE scheme_id = $1 AND is_active = true`,
    [schemeId]
  );

  const { overdue, due_soon } = result.rows[0];
  let status: 'green' | 'amber' | 'red' = 'green';
  if (overdue > 0) status = 'red';
  else if (due_soon > 0) status = 'amber';

  res.json({ status, overdue: overdue ?? 0, dueSoon: due_soon ?? 0 });
}
