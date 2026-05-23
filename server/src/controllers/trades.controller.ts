import { Request, Response } from 'express';
import pool from '../db';

export async function listTrades(req: Request, res: Response): Promise<void> {
  const { category, isActive } = req.query as Record<string, string>;

  const conditions: string[] = [];
  const params: unknown[] = [];
  let p = 1;

  if (category)  { conditions.push(`trade_category = $${p++}`); params.push(category); }
  if (isActive !== undefined) { conditions.push(`is_active = $${p++}`); params.push(isActive === 'true'); }

  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

  const result = await pool.query(
    `SELECT id, full_name, company_name, abn, trade_category, licence_number,
            insurance_expiry_date, email, is_active, rating, created_at,
            nsw_licence_verified, nsw_licence_status,
            CASE WHEN insurance_expiry_date < NOW() + INTERVAL '30 days' THEN true ELSE false END AS insurance_expiring_soon
     FROM trades ${where} ORDER BY company_name`,
    params
  );
  res.json(result.rows);
}

export async function getTrade(req: Request, res: Response): Promise<void> {
  const { id } = req.params;

  const result = await pool.query(
    `SELECT id, full_name, company_name, abn, trade_category, licence_number,
            insurance_expiry_date, email, is_active, rating, created_at,
            nsw_licence_verified, nsw_licence_status,
            CASE WHEN insurance_expiry_date < NOW() + INTERVAL '30 days' THEN true ELSE false END AS insurance_expiring_soon
     FROM trades WHERE id = $1`,
    [id]
  );
  if (result.rows.length === 0) { res.status(404).json({ error: 'Trade not found' }); return; }
  res.json(result.rows[0]);
}

export async function getTradeProfile(req: Request, res: Response): Promise<void> {
  const user = req.user!;
  const result = await pool.query(
    `SELECT id, full_name, company_name, abn, trade_category, licence_number,
            insurance_expiry_date, email, is_active, rating, created_at,
            nsw_licence_verified, nsw_licence_status
     FROM trades WHERE id = $1`,
    [user.userId]
  );
  if (result.rows.length === 0) { res.status(404).json({ error: 'Trade not found' }); return; }
  res.json(result.rows[0]);
}

export async function updateTrade(req: Request, res: Response): Promise<void> {
  const { id } = req.params;
  const { isActive, rating, licenceNumber, insuranceExpiryDate } = req.body as Record<string, unknown>;

  const result = await pool.query(
    `UPDATE trades SET
       is_active = COALESCE($1, is_active),
       rating = COALESCE($2, rating),
       licence_number = COALESCE($3, licence_number),
       insurance_expiry_date = COALESCE($4, insurance_expiry_date),
       updated_at = NOW()
     WHERE id = $5 RETURNING id, full_name, company_name, email, trade_category, is_active, rating`,
    [isActive, rating, licenceNumber, insuranceExpiryDate, id]
  );
  if (result.rows.length === 0) { res.status(404).json({ error: 'Trade not found' }); return; }
  res.json(result.rows[0]);
}

export async function getTradeJobHistory(req: Request, res: Response): Promise<void> {
  const { id } = req.params;
  const user = req.user!;

  // Trades can only view their own history
  const tradeId = user.role === 'trade' ? user.userId : Number(id);
  if (user.role === 'trade' && tradeId !== user.userId) {
    res.status(403).json({ error: 'Forbidden' }); return;
  }

  const result = await pool.query(
    `SELECT j.id, j.job_type, j.status, j.scheduled_date, j.admin_notes,
            s.name AS scheme_name, s.address AS scheme_address,
            co.obligation_name
     FROM jobs j
     JOIN schemes s ON s.id = j.scheme_id
     LEFT JOIN compliance_obligations co ON co.id = j.compliance_obligation_id
     WHERE j.trade_id = $1
     ORDER BY j.scheduled_date DESC NULLS LAST`,
    [tradeId]
  );
  res.json(result.rows);
}

export async function getTradeJobs(req: Request, res: Response): Promise<void> {
  const user = req.user!;

  const result = await pool.query(
    `SELECT j.id, j.job_type, j.status, j.scheduled_date,
            s.name AS scheme_name, s.address AS scheme_address,
            co.obligation_name,
            (SELECT rejection_reason FROM job_documents
             WHERE job_id = j.id AND rejection_reason IS NOT NULL
             ORDER BY uploaded_at DESC LIMIT 1) AS rejection_reason
     FROM jobs j
     JOIN schemes s ON s.id = j.scheme_id
     LEFT JOIN compliance_obligations co ON co.id = j.compliance_obligation_id
     WHERE j.trade_id = $1
     ORDER BY j.scheduled_date DESC NULLS LAST`,
    [user.userId]
  );
  res.json(result.rows);
}

export async function getTradeQuotesForPortal(req: Request, res: Response): Promise<void> {
  const user = req.user!;

  const result = await pool.query(
    `SELECT q.id, q.quote_request_id, q.amount AS submitted_amount, q.status AS quote_status,
            q.token_expiry AS expires_at,
            qr.description_of_works, qr.status AS request_status,
            s.name AS scheme_name,
            t.trade_category
     FROM quotes q
     JOIN quote_requests qr ON qr.id = q.quote_request_id
     JOIN schemes s ON s.id = qr.scheme_id
     JOIN trades t ON t.id = q.trade_id
     WHERE q.trade_id = $1
     ORDER BY q.created_at DESC`,
    [user.userId]
  );
  res.json(result.rows);
}

export async function tradeDashboard(req: Request, res: Response): Promise<void> {
  const user = req.user!;

  const [upcoming, awaitingAction, openQuotes] = await Promise.all([
    pool.query(
      `SELECT j.id, j.scheduled_date, j.job_type, j.status,
              s.name AS scheme_name, s.address AS scheme_address
       FROM jobs j JOIN schemes s ON s.id = j.scheme_id
       WHERE j.trade_id = $1 AND j.status = 'confirmed' AND j.scheduled_date >= CURRENT_DATE
       ORDER BY j.scheduled_date`,
      [user.userId]
    ),
    pool.query(
      `SELECT j.id, j.scheduled_date, j.job_type, j.status,
              s.name AS scheme_name
       FROM jobs j JOIN schemes s ON s.id = j.scheme_id
       WHERE j.trade_id = $1 AND j.status IN ('assigned','certificate_uploaded')
       ORDER BY j.scheduled_date`,
      [user.userId]
    ),
    pool.query(
      `SELECT q.id, q.quote_request_id, qr.description_of_works, s.name AS scheme_name
       FROM quotes q
       JOIN quote_requests qr ON qr.id = q.quote_request_id
       JOIN schemes s ON s.id = qr.scheme_id
       WHERE q.trade_id = $1 AND q.amount = 0 AND qr.status = 'open'`,
      [user.userId]
    ),
  ]);

  res.json({
    upcomingJobs: upcoming.rows,
    awaitingAction: awaitingAction.rows,
    openQuoteRequests: openQuotes.rows,
  });
}
