import { Request, Response } from 'express';
import pool from '../db';
import { uploadFile } from '../services/storage.service';
import {
  emailAdminMaintenanceRequest,
  emailBuildingRequestReceived,
  emailBuildingJobCreated,
  emailStrataMaintenanceRequest,
} from '../services/email.service';

export async function listRequests(req: Request, res: Response): Promise<void> {
  const user = req.user!;
  const { schemeId, status } = req.query as Record<string, string>;

  const conditions: string[] = [];
  const params: unknown[] = [];
  let p = 1;

  if (user.role === 'strata_manager') {
    conditions.push(`s.strata_company_id = $${p++}`);
    params.push(user.strataCompanyId);
  }
  if (user.role === 'building_manager') {
    conditions.push(`mr.submitted_by_role = 'building_manager' AND mr.submitted_by_id = $${p++}`);
    params.push(user.userId);
  }
  if (schemeId) { conditions.push(`mr.scheme_id = $${p++}`); params.push(schemeId); }
  if (status)   { conditions.push(`mr.status = $${p++}`); params.push(status); }

  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

  const result = await pool.query(
    `SELECT mr.*, s.name AS scheme_name
     FROM maintenance_requests mr
     JOIN schemes s ON s.id = mr.scheme_id
     ${where}
     ORDER BY mr.created_at DESC`,
    params
  );
  res.json(result.rows);
}

export async function getRequest(req: Request, res: Response): Promise<void> {
  const { id } = req.params;
  const user = req.user!;

  const result = await pool.query(
    `SELECT mr.*, s.name AS scheme_name, s.strata_company_id
     FROM maintenance_requests mr
     JOIN schemes s ON s.id = mr.scheme_id
     WHERE mr.id = $1`,
    [id]
  );

  if (result.rows.length === 0) { res.status(404).json({ error: 'Request not found' }); return; }
  const req_ = result.rows[0];

  if (user.role === 'strata_manager' && req_.strata_company_id !== user.strataCompanyId) {
    res.status(403).json({ error: 'Forbidden' }); return;
  }
  if (user.role === 'building_manager' &&
      !(req_.submitted_by_role === 'building_manager' && req_.submitted_by_id === user.userId)) {
    res.status(403).json({ error: 'Forbidden' }); return;
  }

  res.json(req_);
}

export async function createRequest(req: Request, res: Response): Promise<void> {
  const user = req.user!;
  const { schemeId, title, description, priority } = req.body as Record<string, string>;

  if (!schemeId || !title || !description) {
    res.status(400).json({ error: 'schemeId, title, and description are required' }); return;
  }

  // Building managers can only submit for their scheme
  if (user.role === 'building_manager' && Number(schemeId) !== user.schemeId) {
    res.status(403).json({ error: 'You can only submit requests for your assigned building' }); return;
  }

  const photos: string[] = [];
  const files = req.files as Express.Multer.File[] | undefined;
  if (files) {
    for (const file of files.slice(0, 5)) {
      const { relativePath } = await uploadFile(file, `maintenance/${schemeId}/photos`);
      photos.push(relativePath);
    }
  }

  const result = await pool.query(
    `INSERT INTO maintenance_requests
       (scheme_id, submitted_by_role, submitted_by_id, title, description, priority, photo_paths)
     VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *`,
    [schemeId, user.role, user.userId, title.trim(), description.trim(),
     priority || 'medium', photos]
  );

  const mr = result.rows[0];
  const scheme = await pool.query('SELECT name, strata_company_id FROM schemes WHERE id = $1', [schemeId]);
  const schemeName = scheme.rows[0]?.name || 'Unknown';

  // Notify admin
  await emailAdminMaintenanceRequest({
    requestId: mr.id,
    schemeName,
    title: mr.title,
    priority: mr.priority,
    submittedByRole: user.role,
  }).catch(() => null);

  // Acknowledge to building manager submitter
  if (user.role === 'building_manager') {
    const bm = await pool.query('SELECT name, email FROM building_managers WHERE id = $1', [user.userId]);
    if (bm.rows.length > 0) {
      await emailBuildingRequestReceived({
        managerEmail: bm.rows[0].email,
        managerName: bm.rows[0].name,
        requestTitle: mr.title,
      }).catch(() => null);
    }

    // Also notify strata managers
    const managers = await pool.query(
      'SELECT name, email FROM strata_managers WHERE strata_company_id = $1 AND is_active = true',
      [scheme.rows[0].strata_company_id]
    );
    for (const mgr of managers.rows) {
      await emailStrataMaintenanceRequest({
        managerEmail: mgr.email,
        managerName: mgr.name,
        schemeName,
        requestTitle: mr.title,
        priority: mr.priority,
      }).catch(() => null);
    }
  }

  res.status(201).json(mr);
}

export async function respondToRequest(req: Request, res: Response): Promise<void> {
  const { id } = req.params;
  const { action, adminResponse, tradeId, scheduledDate } = req.body as Record<string, unknown>;

  if (!action) { res.status(400).json({ error: 'action is required (create_job | quote_request | decline)' }); return; }

  const mr = await pool.query(
    'SELECT * FROM maintenance_requests WHERE id = $1',
    [id]
  );
  if (mr.rows.length === 0) { res.status(404).json({ error: 'Request not found' }); return; }

  if (action === 'decline') {
    if (!adminResponse) { res.status(400).json({ error: 'adminResponse (decline reason) is required' }); return; }
    await pool.query(
      `UPDATE maintenance_requests SET status = 'declined', admin_response = $1, updated_at = NOW() WHERE id = $2`,
      [adminResponse, id]
    );
    res.json({ message: 'Request declined' });
    return;
  }

  if (action === 'create_job') {
    await pool.query(
      `UPDATE maintenance_requests SET status = 'job_created', admin_response = $1, updated_at = NOW() WHERE id = $2`,
      [adminResponse || null, id]
    );

    // Create the job
    const { v4: uuidv4 } = await import('uuid');
    const token = uuidv4();
    const tokenExpiry = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    const job = await pool.query(
      `INSERT INTO jobs (scheme_id, maintenance_request_id, job_type, trade_id, scheduled_date, status, confirmation_token, confirmation_token_expiry)
       VALUES ($1,$2,'maintenance',$3,$4,
         CASE WHEN $3 IS NOT NULL THEN 'assigned'::job_status ELSE 'pending_assignment'::job_status END,
         $5,$6) RETURNING *`,
      [mr.rows[0].scheme_id, id, tradeId || null, scheduledDate || null, token, tokenExpiry]
    );

    // Notify building manager if they submitted it
    if (mr.rows[0].submitted_by_role === 'building_manager') {
      const bm = await pool.query('SELECT name, email FROM building_managers WHERE id = $1', [mr.rows[0].submitted_by_id]);
      if (bm.rows.length > 0) {
        await emailBuildingJobCreated({
          managerEmail: bm.rows[0].email,
          managerName: bm.rows[0].name,
          requestTitle: mr.rows[0].title,
        }).catch(() => null);
      }
    }

    res.json({ message: 'Job created', job: job.rows[0] });
    return;
  }

  res.status(400).json({ error: `Unknown action: ${action}` });
}
