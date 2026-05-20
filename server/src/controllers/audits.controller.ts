import { Request, Response } from 'express';
import pool from '../db';
import { uploadFile } from '../services/storage.service';
import { emailStrataAuditReady } from '../services/email.service';

// ---------------------------------------------------------------------------
// Building Audits
// ---------------------------------------------------------------------------

export async function listAudits(req: Request, res: Response): Promise<void> {
  const { schemeId } = req.query as Record<string, string>;
  const user = req.user!;

  const conditions: string[] = [];
  const params: unknown[] = [];
  let p = 1;

  if (schemeId) { conditions.push(`ba.scheme_id = $${p++}`); params.push(schemeId); }

  if (user.role === 'strata_manager') {
    conditions.push(`s.strata_company_id = $${p++}`);
    params.push(user.strataCompanyId);
  }

  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

  const result = await pool.query(
    `SELECT ba.*, s.name AS scheme_name, a.name AS conducted_by_name
     FROM building_audits ba
     JOIN schemes s ON s.id = ba.scheme_id
     JOIN admin_users a ON a.id = ba.conducted_by
     ${where}
     ORDER BY ba.audit_date DESC`,
    params
  );
  res.json(result.rows);
}

export async function getAudit(req: Request, res: Response): Promise<void> {
  const { id } = req.params;
  const user = req.user!;

  const audit = await pool.query(
    `SELECT ba.*, s.name AS scheme_name, s.address AS scheme_address,
            s.strata_company_id, a.name AS conducted_by_name
     FROM building_audits ba
     JOIN schemes s ON s.id = ba.scheme_id
     JOIN admin_users a ON a.id = ba.conducted_by
     WHERE ba.id = $1`,
    [id]
  );

  if (audit.rows.length === 0) { res.status(404).json({ error: 'Audit not found' }); return; }

  if (user.role === 'strata_manager' && audit.rows[0].strata_company_id !== user.strataCompanyId) {
    res.status(403).json({ error: 'Forbidden' }); return;
  }

  const findings = await pool.query(
    'SELECT * FROM audit_findings WHERE audit_id = $1 ORDER BY severity DESC, created_at',
    [id]
  );

  res.json({ ...audit.rows[0], findings: findings.rows });
}

export async function createAudit(req: Request, res: Response): Promise<void> {
  const { schemeId, auditDate } = req.body as Record<string, unknown>;
  const user = req.user!;

  if (!schemeId || !auditDate) {
    res.status(400).json({ error: 'schemeId and auditDate are required' }); return;
  }

  const result = await pool.query(
    `INSERT INTO building_audits (scheme_id, conducted_by, audit_date, status)
     VALUES ($1,$2,$3,'draft') RETURNING *`,
    [schemeId, user.userId, auditDate]
  );

  // Mark scheme audit as in_progress
  await pool.query(
    `UPDATE schemes SET audit_status = 'in_progress', updated_at = NOW() WHERE id = $1`,
    [schemeId]
  );

  res.status(201).json(result.rows[0]);
}

export async function updateAudit(req: Request, res: Response): Promise<void> {
  const { id } = req.params;
  const { overallCondition, summaryNotes, status } = req.body as Record<string, unknown>;

  const result = await pool.query(
    `UPDATE building_audits SET
       overall_condition = COALESCE($1, overall_condition),
       summary_notes = COALESCE($2, summary_notes),
       status = COALESCE($3, status),
       updated_at = NOW()
     WHERE id = $4 RETURNING *`,
    [overallCondition, summaryNotes, status, id]
  );

  if (result.rows.length === 0) { res.status(404).json({ error: 'Audit not found' }); return; }

  // When submitted, update scheme status and notify strata managers
  if (status === 'submitted') {
    const audit = result.rows[0];
    await pool.query(
      `UPDATE schemes SET audit_status = 'completed', updated_at = NOW() WHERE id = $1`,
      [audit.scheme_id]
    );

    const schemeData = await pool.query(
      `SELECT s.name, s.id, s.strata_company_id FROM schemes s WHERE s.id = $1`,
      [audit.scheme_id]
    );
    if (schemeData.rows.length > 0) {
      const { name, id: sid, strata_company_id } = schemeData.rows[0];
      const managers = await pool.query(
        'SELECT name, email FROM strata_managers WHERE strata_company_id = $1 AND is_active = true',
        [strata_company_id]
      );
      for (const mgr of managers.rows) {
        await emailStrataAuditReady({
          managerEmail: mgr.email,
          managerName: mgr.name,
          schemeName: name,
          schemeId: sid,
        }).catch(() => null);
      }
    }
  }

  res.json(result.rows[0]);
}

// ---------------------------------------------------------------------------
// Audit Findings
// ---------------------------------------------------------------------------

export async function createFinding(req: Request, res: Response): Promise<void> {
  const { auditId } = req.params;
  const {
    tradeCategory, locationInBuilding, description,
    severity, requiresRectification,
  } = req.body as Record<string, unknown>;

  if (!tradeCategory || !description || !severity) {
    res.status(400).json({ error: 'tradeCategory, description, and severity are required' }); return;
  }

  const photos: string[] = [];

  // Handle photo uploads if present
  const files = req.files as Express.Multer.File[] | undefined;
  if (files) {
    for (const file of files.slice(0, 5)) {
      const { relativePath } = await uploadFile(file, `audits/${auditId}/photos`);
      photos.push(relativePath);
    }
  }

  const result = await pool.query(
    `INSERT INTO audit_findings
       (audit_id, trade_category, location_in_building, description, severity, requires_rectification, photo_paths)
     VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *`,
    [auditId, tradeCategory, locationInBuilding || null, description,
     severity, requiresRectification ?? false, photos]
  );

  res.status(201).json(result.rows[0]);
}

export async function updateFinding(req: Request, res: Response): Promise<void> {
  const { id } = req.params;
  const {
    tradeCategory, locationInBuilding, description, severity,
    requiresRectification, rectificationStatus, waiveReason,
  } = req.body as Record<string, unknown>;

  const result = await pool.query(
    `UPDATE audit_findings SET
       trade_category = COALESCE($1, trade_category),
       location_in_building = COALESCE($2, location_in_building),
       description = COALESCE($3, description),
       severity = COALESCE($4, severity),
       requires_rectification = COALESCE($5, requires_rectification),
       rectification_status = COALESCE($6, rectification_status),
       waive_reason = COALESCE($7, waive_reason),
       updated_at = NOW()
     WHERE id = $8 RETURNING *`,
    [tradeCategory, locationInBuilding, description, severity,
     requiresRectification, rectificationStatus, waiveReason, id]
  );

  if (result.rows.length === 0) { res.status(404).json({ error: 'Finding not found' }); return; }
  res.json(result.rows[0]);
}

export async function deleteFinding(req: Request, res: Response): Promise<void> {
  const { id } = req.params;
  await pool.query('DELETE FROM audit_findings WHERE id = $1', [id]);
  res.status(204).send();
}

/** Get all rectification-required findings for a scheme (for the Rectification Panel). */
export async function listRectificationFindings(req: Request, res: Response): Promise<void> {
  const { schemeId } = req.params;
  const user = req.user!;

  const scheme = await pool.query('SELECT strata_company_id FROM schemes WHERE id = $1', [schemeId]);
  if (scheme.rows.length === 0) { res.status(404).json({ error: 'Scheme not found' }); return; }
  if (user.role === 'strata_manager' && scheme.rows[0].strata_company_id !== user.strataCompanyId) {
    res.status(403).json({ error: 'Forbidden' }); return;
  }

  const result = await pool.query(
    `SELECT af.*, ba.audit_date, ba.id AS audit_id
     FROM audit_findings af
     JOIN building_audits ba ON ba.id = af.audit_id
     WHERE ba.scheme_id = $1 AND af.requires_rectification = true
     ORDER BY af.severity DESC, af.created_at`,
    [schemeId]
  );
  res.json(result.rows);
}
