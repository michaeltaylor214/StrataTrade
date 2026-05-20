import { Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import pool from '../db';
import {
  emailTradeJobAssigned,
  emailAdminCertUploaded,
  emailTradeRejection,
  emailStrataCertApproved,
  emailBuildingJobCompleted,
} from '../services/email.service';
import { uploadFile } from '../services/storage.service';

const APP_URL = () => process.env.APP_URL || 'http://localhost:3000';

// ---------------------------------------------------------------------------
// List & filter jobs
// ---------------------------------------------------------------------------
export async function listJobs(req: Request, res: Response): Promise<void> {
  const user = req.user!;
  const { schemeId, status, jobType, tradeCategory, from, to } = req.query as Record<string, string>;

  const conditions: string[] = [];
  const params: unknown[] = [];
  let p = 1;

  if (user.role === 'strata_manager') {
    conditions.push(`s.strata_company_id = $${p++}`);
    params.push(user.strataCompanyId);
  }
  if (user.role === 'building_manager') {
    conditions.push(`j.scheme_id = $${p++}`);
    params.push(user.schemeId);
  }
  if (user.role === 'trade') {
    conditions.push(`j.trade_id = $${p++}`);
    params.push(user.userId);
  }
  if (schemeId) { conditions.push(`j.scheme_id = $${p++}`); params.push(schemeId); }
  if (status) { conditions.push(`j.status = $${p++}`); params.push(status); }
  if (jobType) { conditions.push(`j.job_type = $${p++}`); params.push(jobType); }
  if (from) { conditions.push(`j.scheduled_date >= $${p++}`); params.push(from); }
  if (to) { conditions.push(`j.scheduled_date <= $${p++}`); params.push(to); }

  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

  const result = await pool.query(
    `SELECT j.*,
            s.name AS scheme_name, s.address AS scheme_address,
            t.full_name AS trade_name, t.company_name AS trade_company, t.trade_category,
            t.email AS trade_email,
            co.obligation_name
     FROM jobs j
     JOIN schemes s ON s.id = j.scheme_id
     LEFT JOIN trades t ON t.id = j.trade_id
     LEFT JOIN compliance_obligations co ON co.id = j.compliance_obligation_id
     ${where}
     ORDER BY j.scheduled_date ASC NULLS LAST, j.created_at DESC`,
    params
  );
  res.json(result.rows);
}

export async function getJob(req: Request, res: Response): Promise<void> {
  const { id } = req.params;
  const user = req.user!;

  const result = await pool.query(
    `SELECT j.*,
            s.name AS scheme_name, s.address AS scheme_address,
            s.strata_company_id,
            t.full_name AS trade_name, t.company_name AS trade_company, t.trade_category,
            t.email AS trade_email,
            co.obligation_name
     FROM jobs j
     JOIN schemes s ON s.id = j.scheme_id
     LEFT JOIN trades t ON t.id = j.trade_id
     LEFT JOIN compliance_obligations co ON co.id = j.compliance_obligation_id
     WHERE j.id = $1`,
    [id]
  );

  if (result.rows.length === 0) { res.status(404).json({ error: 'Job not found' }); return; }
  const job = result.rows[0];

  if (user.role === 'strata_manager' && job.strata_company_id !== user.strataCompanyId) {
    res.status(403).json({ error: 'Forbidden' }); return;
  }
  if (user.role === 'building_manager' && job.scheme_id !== user.schemeId) {
    res.status(403).json({ error: 'Forbidden' }); return;
  }
  if (user.role === 'trade' && job.trade_id !== user.userId) {
    res.status(403).json({ error: 'Forbidden' }); return;
  }

  res.json(job);
}

// ---------------------------------------------------------------------------
// Create job (admin)
// ---------------------------------------------------------------------------
export async function createJob(req: Request, res: Response): Promise<void> {
  const { schemeId, jobType, tradeId, scheduledDate, adminNotes,
          complianceObligationId, maintenanceRequestId, auditFindingId } = req.body as Record<string, unknown>;

  if (!schemeId || !jobType) {
    res.status(400).json({ error: 'schemeId and jobType are required' }); return;
  }

  const confirmToken = uuidv4();
  const tokenExpiry = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

  const result = await pool.query(
    `INSERT INTO jobs
       (scheme_id, job_type, trade_id, scheduled_date, admin_notes,
        compliance_obligation_id, maintenance_request_id, audit_finding_id,
        status, confirmation_token, confirmation_token_expiry)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,
       CASE WHEN $3 IS NOT NULL THEN 'assigned'::job_status ELSE 'pending_assignment'::job_status END,
       $9, $10)
     RETURNING *`,
    [schemeId, jobType, tradeId || null, scheduledDate || null, adminNotes || null,
     complianceObligationId || null, maintenanceRequestId || null, auditFindingId || null,
     confirmToken, tokenExpiry]
  );

  const job = result.rows[0];

  // If trade assigned, send notification email
  if (tradeId) {
    await notifyTradeAssigned(job.id).catch(() => null);
  }

  res.status(201).json(job);
}

// ---------------------------------------------------------------------------
// Assign / reassign trade (admin)
// ---------------------------------------------------------------------------
export async function assignTrade(req: Request, res: Response): Promise<void> {
  const { id } = req.params;
  const { tradeId, scheduledDate } = req.body as Record<string, unknown>;

  if (!tradeId) { res.status(400).json({ error: 'tradeId is required' }); return; }

  const tokenExpiry = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  const confirmToken = uuidv4();

  const result = await pool.query(
    `UPDATE jobs SET
       trade_id = $1,
       scheduled_date = COALESCE($2, scheduled_date),
       status = 'assigned',
       confirmation_token = $3,
       confirmation_token_expiry = $4,
       updated_at = NOW()
     WHERE id = $5 RETURNING *`,
    [tradeId, scheduledDate || null, confirmToken, tokenExpiry, id]
  );

  if (result.rows.length === 0) { res.status(404).json({ error: 'Job not found' }); return; }

  await notifyTradeAssigned(result.rows[0].id).catch(() => null);
  res.json(result.rows[0]);
}

// ---------------------------------------------------------------------------
// Trade confirms job (token-based, no login required)
// ---------------------------------------------------------------------------
export async function confirmJob(req: Request, res: Response): Promise<void> {
  const { token } = req.params;

  const result = await pool.query(
    `SELECT j.*, s.name AS scheme_name, s.address AS scheme_address,
            t.full_name AS trade_name, t.email AS trade_email
     FROM jobs j
     JOIN schemes s ON s.id = j.scheme_id
     JOIN trades t ON t.id = j.trade_id
     WHERE j.confirmation_token = $1
       AND j.confirmation_token_expiry > NOW()
       AND j.status = 'assigned'`,
    [token]
  );

  if (result.rows.length === 0) {
    res.status(400).json({ error: 'Invalid or expired confirmation link' }); return;
  }

  await pool.query(
    `UPDATE jobs SET status = 'confirmed', updated_at = NOW() WHERE id = $1`,
    [result.rows[0].id]
  );

  res.json({ message: 'Job confirmed. Thank you — we will be in touch with further details.' });
}

// ---------------------------------------------------------------------------
// Trade requests reschedule (token-based)
// ---------------------------------------------------------------------------
export async function requestReschedule(req: Request, res: Response): Promise<void> {
  const { token } = req.params;
  const { message } = req.body as { message?: string };

  const result = await pool.query(
    `SELECT j.*, s.name AS scheme_name, t.email AS trade_email, t.full_name AS trade_name
     FROM jobs j
     JOIN schemes s ON s.id = j.scheme_id
     JOIN trades t ON t.id = j.trade_id
     WHERE j.confirmation_token = $1 AND j.confirmation_token_expiry > NOW()`,
    [token]
  );

  if (result.rows.length === 0) {
    res.status(400).json({ error: 'Invalid or expired link' }); return;
  }

  const job = result.rows[0];
  // Add reschedule request to admin_notes
  const note = `\n[Reschedule request from ${job.trade_name}]: ${message || '(no message)'}`;
  await pool.query(
    `UPDATE jobs SET admin_notes = CONCAT(COALESCE(admin_notes,''), $1), updated_at = NOW() WHERE id = $2`,
    [note, job.id]
  );

  res.json({ message: 'Your reschedule request has been noted. The admin will be in touch.' });
}

// ---------------------------------------------------------------------------
// Upload certificate / photos (trade portal)
// ---------------------------------------------------------------------------
export async function uploadJobDocuments(req: Request, res: Response): Promise<void> {
  const { id } = req.params;
  const user = req.user!;
  const { completionNotes } = req.body as { completionNotes?: string };

  const job = await pool.query(
    `SELECT j.*, s.name AS scheme_name, t.full_name AS trade_name, t.email AS trade_email
     FROM jobs j JOIN schemes s ON s.id = j.scheme_id JOIN trades t ON t.id = j.trade_id
     WHERE j.id = $1`,
    [id]
  );

  if (job.rows.length === 0) { res.status(404).json({ error: 'Job not found' }); return; }
  if (user.role === 'trade' && job.rows[0].trade_id !== user.userId) {
    res.status(403).json({ error: 'Forbidden' }); return;
  }

  const files = req.files as { [fieldname: string]: Express.Multer.File[] } | undefined;
  const uploadedDocs: unknown[] = [];

  // Certificate
  const certFiles = files?.certificate;
  if (certFiles && certFiles.length > 0) {
    const { relativePath } = await uploadFile(certFiles[0], `jobs/${id}/certificates`);
    const doc = await pool.query(
      `INSERT INTO job_documents (job_id, document_type, file_path, original_filename, file_size_bytes, mime_type, uploaded_by_role, uploaded_by_id)
       VALUES ($1,'certificate',$2,$3,$4,$5,'trade',$6) RETURNING *`,
      [id, relativePath, certFiles[0].originalname, certFiles[0].size, certFiles[0].mimetype, user.userId]
    );
    uploadedDocs.push(doc.rows[0]);
  }

  // Photos
  const photoFiles = files?.photos ?? [];
  for (const photo of photoFiles.slice(0, 10)) {
    const { relativePath } = await uploadFile(photo, `jobs/${id}/photos`);
    const doc = await pool.query(
      `INSERT INTO job_documents (job_id, document_type, file_path, original_filename, file_size_bytes, mime_type, uploaded_by_role, uploaded_by_id)
       VALUES ($1,'photo',$2,$3,$4,$5,'trade',$6) RETURNING *`,
      [id, relativePath, photo.originalname, photo.size, photo.mimetype, user.userId]
    );
    uploadedDocs.push(doc.rows[0]);
  }

  // Completion note (stored as a special text document)
  if (completionNotes?.trim()) {
    const doc = await pool.query(
      `INSERT INTO job_documents (job_id, document_type, file_path, uploaded_by_role, uploaded_by_id)
       VALUES ($1,'completion_note',$2,'trade',$3) RETURNING *`,
      [id, completionNotes.trim(), user.userId]
    );
    uploadedDocs.push(doc.rows[0]);
  }

  // Update job status
  await pool.query(
    `UPDATE jobs SET status = 'certificate_uploaded', updated_at = NOW() WHERE id = $1`,
    [id]
  );

  // Notify admin
  await emailAdminCertUploaded({
    jobId: Number(id),
    schemeName: job.rows[0].scheme_name,
    tradeName: job.rows[0].trade_name,
  }).catch(() => null);

  res.json({ message: 'Documents uploaded. Awaiting admin approval.', documents: uploadedDocs });
}

// ---------------------------------------------------------------------------
// Admin: approve / reject certificate
// ---------------------------------------------------------------------------
export async function approveDocument(req: Request, res: Response): Promise<void> {
  const { docId } = req.params;

  const result = await pool.query(
    `UPDATE job_documents SET approved_by_admin = true WHERE id = $1 RETURNING *`,
    [docId]
  );
  if (result.rows.length === 0) { res.status(404).json({ error: 'Document not found' }); return; }

  const doc = result.rows[0];

  // Mark job approved
  await pool.query(
    `UPDATE jobs SET status = 'approved', updated_at = NOW() WHERE id = $1`,
    [doc.job_id]
  );

  // Notify strata managers and building manager
  const jobData = await pool.query(
    `SELECT s.name AS scheme_name, s.strata_company_id, s.id AS scheme_id,
            bm.email AS bm_email, bm.name AS bm_name
     FROM jobs j
     JOIN schemes s ON s.id = j.scheme_id
     LEFT JOIN building_managers bm ON bm.scheme_id = s.id
     WHERE j.id = $1`,
    [doc.job_id]
  );

  if (jobData.rows.length > 0) {
    const { scheme_name, strata_company_id, scheme_id, bm_email, bm_name } = jobData.rows[0];

    const managers = await pool.query(
      'SELECT name, email FROM strata_managers WHERE strata_company_id = $1 AND is_active = true',
      [strata_company_id]
    );

    for (const mgr of managers.rows) {
      await emailStrataCertApproved({
        managerEmail: mgr.email,
        managerName: mgr.name,
        schemeName: scheme_name,
        jobId: doc.job_id,
      }).catch(() => null);
    }

    if (bm_email) {
      await emailBuildingJobCompleted({
        managerEmail: bm_email,
        managerName: bm_name,
        requestTitle: scheme_name,
        portalUrl: `${APP_URL()}/building`,
      }).catch(() => null);
    }
  }

  res.json(result.rows[0]);
}

export async function rejectDocument(req: Request, res: Response): Promise<void> {
  const { docId } = req.params;
  const { reason } = req.body as { reason?: string };

  if (!reason) { res.status(400).json({ error: 'reason is required' }); return; }

  const result = await pool.query(
    `UPDATE job_documents SET rejection_reason = $1 WHERE id = $2 RETURNING *`,
    [reason, docId]
  );
  if (result.rows.length === 0) { res.status(404).json({ error: 'Document not found' }); return; }

  // Revert job to completed (not certificate_uploaded)
  await pool.query(
    `UPDATE jobs SET status = 'completed', updated_at = NOW() WHERE id = $1`,
    [result.rows[0].job_id]
  );

  // Notify trade
  const tradeData = await pool.query(
    `SELECT t.email, t.full_name FROM jobs j JOIN trades t ON t.id = j.trade_id WHERE j.id = $1`,
    [result.rows[0].job_id]
  );
  if (tradeData.rows.length > 0) {
    await emailTradeRejection({
      tradeEmail: tradeData.rows[0].email,
      tradeName: tradeData.rows[0].full_name,
      jobId: result.rows[0].job_id,
      reason,
      reuploadUrl: `${APP_URL()}/trade/jobs/${result.rows[0].job_id}`,
    }).catch(() => null);
  }

  res.json(result.rows[0]);
}

// ---------------------------------------------------------------------------
// Cancel job (admin)
// ---------------------------------------------------------------------------
export async function cancelJob(req: Request, res: Response): Promise<void> {
  const { id } = req.params;
  const { reason } = req.body as { reason?: string };

  const result = await pool.query(
    `UPDATE jobs SET status = 'cancelled', cancellation_reason = $1, updated_at = NOW()
     WHERE id = $2 RETURNING *`,
    [reason || null, id]
  );
  if (result.rows.length === 0) { res.status(404).json({ error: 'Job not found' }); return; }
  res.json(result.rows[0]);
}

// ---------------------------------------------------------------------------
// List documents for a job
// ---------------------------------------------------------------------------
export async function listJobDocuments(req: Request, res: Response): Promise<void> {
  const { id } = req.params;
  const user = req.user!;

  const result = await pool.query(
    `SELECT jd.*
     FROM job_documents jd
     JOIN jobs j ON j.id = jd.job_id
     WHERE jd.job_id = $1
       AND (
         $2 = 'admin'
         OR ($2 = 'trade' AND j.trade_id = $3)
         OR jd.approved_by_admin = true
       )
     ORDER BY jd.uploaded_at DESC`,
    [id, user.role, user.userId]
  );
  res.json(result.rows);
}

// ---------------------------------------------------------------------------
// Dashboard summary (admin)
// ---------------------------------------------------------------------------
export async function adminDashboard(req: Request, res: Response): Promise<void> {
  const [
    activeSchemes,
    dueThisMonth,
    overdueJobs,
    awaitingApproval,
    openRequests,
    openQuotes,
    needsAssignment,
    unconfirmed,
  ] = await Promise.all([
    pool.query(`SELECT COUNT(*)::int AS count FROM schemes`),
    pool.query(`SELECT COUNT(*)::int AS count FROM jobs WHERE scheduled_date BETWEEN NOW() AND NOW() + INTERVAL '30 days' AND status NOT IN ('cancelled','approved')`),
    pool.query(`SELECT COUNT(*)::int AS count FROM jobs WHERE scheduled_date < NOW() AND status NOT IN ('completed','certificate_uploaded','approved','cancelled')`),
    pool.query(`SELECT COUNT(*)::int AS count FROM job_documents WHERE approved_by_admin = false AND document_type = 'certificate'`),
    pool.query(`SELECT COUNT(*)::int AS count FROM maintenance_requests WHERE status = 'submitted'`),
    pool.query(`SELECT COUNT(*)::int AS count FROM quote_requests WHERE status = 'open'`),
    pool.query(`SELECT COUNT(*)::int AS count FROM jobs WHERE status = 'pending_assignment'`),
    pool.query(`SELECT COUNT(*)::int AS count FROM jobs WHERE status = 'assigned' AND updated_at < NOW() - INTERVAL '48 hours'`),
  ]);

  res.json({
    activeSchemes: activeSchemes.rows[0].count,
    dueThisMonth: dueThisMonth.rows[0].count,
    overdueJobs: overdueJobs.rows[0].count,
    awaitingApproval: awaitingApproval.rows[0].count,
    openMaintenanceRequests: openRequests.rows[0].count,
    openQuoteRequests: openQuotes.rows[0].count,
    needsAssignment: needsAssignment.rows[0].count,
    unconfirmed48hrs: unconfirmed.rows[0].count,
  });
}

// ---------------------------------------------------------------------------
// Internal helper: send job-assigned email to trade
// ---------------------------------------------------------------------------
async function notifyTradeAssigned(jobId: number): Promise<void> {
  const data = await pool.query(
    `SELECT j.id, j.scheduled_date, j.confirmation_token, j.job_type,
            s.address AS scheme_address,
            t.email AS trade_email, t.full_name AS trade_name,
            co.obligation_name
     FROM jobs j
     JOIN schemes s ON s.id = j.scheme_id
     JOIN trades t ON t.id = j.trade_id
     LEFT JOIN compliance_obligations co ON co.id = j.compliance_obligation_id
     WHERE j.id = $1`,
    [jobId]
  );

  if (data.rows.length === 0) return;
  const j = data.rows[0];

  await emailTradeJobAssigned({
    tradeEmail: j.trade_email,
    tradeName: j.trade_name,
    jobId: j.id,
    schemeAddress: j.scheme_address,
    scheduledDate: j.scheduled_date ? new Date(j.scheduled_date).toLocaleDateString('en-AU') : 'TBC',
    worksDescription: j.obligation_name || `${j.job_type} job`,
    confirmUrl: `${APP_URL()}/api/jobs/confirm/${j.confirmation_token}`,
    rescheduleUrl: `${APP_URL()}/api/jobs/reschedule/${j.confirmation_token}`,
  });
}
