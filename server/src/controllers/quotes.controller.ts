import { Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import pool from '../db';
import {
  emailTradeQuoteRequest,
  emailTradeQuoteAccepted,
  emailStrataQuoteReady,
  emailAdminQuoteSubmitted,
} from '../services/email.service';

const APP_URL = () => process.env.APP_URL || 'http://localhost:3000';

// ---------------------------------------------------------------------------
// Quote Requests
// ---------------------------------------------------------------------------

export async function listQuoteRequests(req: Request, res: Response): Promise<void> {
  const user = req.user!;
  const { schemeId, status } = req.query as Record<string, string>;

  const conditions: string[] = [];
  const params: unknown[] = [];
  let p = 1;

  if (user.role === 'strata_manager') {
    conditions.push(`s.strata_company_id = $${p++}`);
    params.push(user.strataCompanyId);
    // Strata managers only see requests ready for review
    conditions.push(`qr.ready_for_review = true`);
  }
  if (schemeId) { conditions.push(`qr.scheme_id = $${p++}`); params.push(schemeId); }
  if (status)   { conditions.push(`qr.status = $${p++}`); params.push(status); }

  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

  const result = await pool.query(
    `SELECT qr.*, s.name AS scheme_name, s.address AS scheme_address,
            COUNT(q.id)::int AS quote_count
     FROM quote_requests qr
     JOIN schemes s ON s.id = qr.scheme_id
     LEFT JOIN quotes q ON q.quote_request_id = qr.id
     ${where}
     GROUP BY qr.id, s.name, s.address
     ORDER BY qr.created_at DESC`,
    params
  );
  res.json(result.rows);
}

export async function getQuoteRequest(req: Request, res: Response): Promise<void> {
  const { id } = req.params;
  const user = req.user!;

  const qr = await pool.query(
    `SELECT qr.*, s.name AS scheme_name, s.address AS scheme_address,
            s.strata_company_id
     FROM quote_requests qr
     JOIN schemes s ON s.id = qr.scheme_id
     WHERE qr.id = $1`,
    [id]
  );
  if (qr.rows.length === 0) { res.status(404).json({ error: 'Quote request not found' }); return; }

  if (user.role === 'strata_manager' && qr.rows[0].strata_company_id !== user.strataCompanyId) {
    res.status(403).json({ error: 'Forbidden' }); return;
  }

  // Load quotes
  const quotesResult = await pool.query(
    `SELECT q.*, t.trade_category, t.company_name
     FROM quotes q
     JOIN trades t ON t.id = q.trade_id
     WHERE q.quote_request_id = $1
     ORDER BY q.submitted_at`,
    [id]
  );

  // For strata manager, hide trade name — show category only
  let quotes = quotesResult.rows;
  if (user.role === 'strata_manager') {
    quotes = quotes.map(q => {
      const { trade_id: _tid, ...rest } = q;
      return { ...rest, trade_name: `Licensed ${q.trade_category}` };
    });
  }

  res.json({ ...qr.rows[0], quotes });
}

export async function createQuoteRequest(req: Request, res: Response): Promise<void> {
  const { schemeId, descriptionOfWorks, auditFindingId, maintenanceRequestId, inviteTradeIds } = req.body as Record<string, unknown>;

  if (!schemeId || !descriptionOfWorks) {
    res.status(400).json({ error: 'schemeId and descriptionOfWorks are required' }); return;
  }

  const result = await pool.query(
    `INSERT INTO quote_requests (scheme_id, description_of_works, audit_finding_id, maintenance_request_id)
     VALUES ($1,$2,$3,$4) RETURNING *`,
    [schemeId, descriptionOfWorks, auditFindingId || null, maintenanceRequestId || null]
  );

  const qr = result.rows[0];

  // Update audit finding status if applicable
  if (auditFindingId) {
    await pool.query(
      `UPDATE audit_findings SET rectification_status = 'quotes_requested', updated_at = NOW() WHERE id = $1`,
      [auditFindingId]
    );
  }

  // Send quote invitations to specified trades
  if (Array.isArray(inviteTradeIds) && inviteTradeIds.length > 0) {
    const scheme = await pool.query('SELECT address FROM schemes WHERE id = $1', [schemeId]);
    const suburb = extractSuburb(scheme.rows[0]?.address || '');

    for (const tradeId of inviteTradeIds) {
      const trade = await pool.query('SELECT email, full_name FROM trades WHERE id = $1 AND is_active = true', [tradeId]);
      if (trade.rows.length === 0) continue;

      const token = uuidv4();
      const tokenExpiry = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

      // Insert a placeholder quote row so trade can submit via token
      await pool.query(
        `INSERT INTO quotes (quote_request_id, trade_id, amount, status, quote_token, token_expiry)
         VALUES ($1,$2,0,'submitted',$3,$4)
         ON CONFLICT DO NOTHING`,
        [qr.id, tradeId, token, tokenExpiry]
      );

      await emailTradeQuoteRequest({
        tradeEmail: trade.rows[0].email,
        tradeName: trade.rows[0].full_name,
        quoteRequestId: qr.id,
        suburb,
        worksDescription: String(descriptionOfWorks),
        submitUrl: `${APP_URL()}/submit-quote/${token}`,
      }).catch(() => null);
    }
  }

  res.status(201).json(qr);
}

/** Admin marks a quote request as ready for strata manager review. */
export async function markReadyForReview(req: Request, res: Response): Promise<void> {
  const { id } = req.params;

  const result = await pool.query(
    `UPDATE quote_requests SET ready_for_review = true, status = 'quotes_received', updated_at = NOW()
     WHERE id = $1 RETURNING *`,
    [id]
  );
  if (result.rows.length === 0) { res.status(404).json({ error: 'Quote request not found' }); return; }

  const qr = result.rows[0];
  const schemeData = await pool.query(
    'SELECT s.name, s.strata_company_id FROM schemes s WHERE s.id = $1',
    [qr.scheme_id]
  );
  if (schemeData.rows.length > 0) {
    const { name: schemeName, strata_company_id } = schemeData.rows[0];
    const managers = await pool.query(
      'SELECT name, email FROM strata_managers WHERE strata_company_id = $1 AND is_active = true',
      [strata_company_id]
    );
    for (const mgr of managers.rows) {
      await emailStrataQuoteReady({
        managerEmail: mgr.email,
        managerName: mgr.name,
        schemeName,
        quoteRequestId: qr.id,
      }).catch(() => null);
    }
  }

  res.json(result.rows[0]);
}

// ---------------------------------------------------------------------------
// Quotes
// ---------------------------------------------------------------------------

/** Submit a quote via token (no login required). */
export async function submitQuoteByToken(req: Request, res: Response): Promise<void> {
  const { token } = req.params;
  const { amount, notes, validUntil } = req.body as Record<string, unknown>;

  if (!amount) { res.status(400).json({ error: 'amount is required' }); return; }

  const quote = await pool.query(
    `SELECT q.*, t.email AS trade_email, t.full_name AS trade_name,
            qr.scheme_id, s.name AS scheme_name
     FROM quotes q
     JOIN trades t ON t.id = q.trade_id
     JOIN quote_requests qr ON qr.id = q.quote_request_id
     JOIN schemes s ON s.id = qr.scheme_id
     WHERE q.quote_token = $1 AND q.token_expiry > NOW()`,
    [token]
  );

  if (quote.rows.length === 0) {
    res.status(400).json({ error: 'Invalid or expired quote token' }); return;
  }

  const q = quote.rows[0];

  await pool.query(
    `UPDATE quotes SET amount = $1, notes = $2, valid_until = $3, submitted_at = NOW(), updated_at = NOW()
     WHERE quote_token = $4`,
    [amount, notes || null, validUntil || null, token]
  );

  await emailAdminQuoteSubmitted({
    quoteRequestId: q.quote_request_id,
    schemeName: q.scheme_name,
    tradeName: q.trade_name,
    amount: Number(amount),
  }).catch(() => null);

  res.json({ message: 'Quote submitted successfully. Thank you.' });
}

/** Submit a quote from trade portal (authenticated). */
export async function submitQuoteAuthenticated(req: Request, res: Response): Promise<void> {
  const user = req.user!;
  const { quoteRequestId, amount, notes, validUntil } = req.body as Record<string, unknown>;

  if (!quoteRequestId || !amount) {
    res.status(400).json({ error: 'quoteRequestId and amount are required' }); return;
  }

  const existing = await pool.query(
    'SELECT id FROM quotes WHERE quote_request_id = $1 AND trade_id = $2',
    [quoteRequestId, user.userId]
  );

  if (existing.rows.length > 0) {
    // Update existing
    await pool.query(
      `UPDATE quotes SET amount = $1, notes = $2, valid_until = $3, submitted_at = NOW(), updated_at = NOW()
       WHERE quote_request_id = $4 AND trade_id = $5`,
      [amount, notes || null, validUntil || null, quoteRequestId, user.userId]
    );
  } else {
    // New quote
    const token = uuidv4();
    const tokenExpiry = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    await pool.query(
      `INSERT INTO quotes (quote_request_id, trade_id, amount, notes, valid_until, quote_token, token_expiry)
       VALUES ($1,$2,$3,$4,$5,$6,$7)`,
      [quoteRequestId, user.userId, amount, notes || null, validUntil || null, token, tokenExpiry]
    );
  }

  const qr = await pool.query(
    'SELECT qr.scheme_id, s.name AS scheme_name FROM quote_requests qr JOIN schemes s ON s.id = qr.scheme_id WHERE qr.id = $1',
    [quoteRequestId]
  );
  const trade = await pool.query('SELECT full_name FROM trades WHERE id = $1', [user.userId]);

  await emailAdminQuoteSubmitted({
    quoteRequestId: Number(quoteRequestId),
    schemeName: qr.rows[0]?.scheme_name || 'Unknown',
    tradeName: trade.rows[0]?.full_name || 'Unknown',
    amount: Number(amount),
  }).catch(() => null);

  res.json({ message: 'Quote submitted successfully.' });
}

/** Accept a quote — creates a job, notifies trade. */
export async function acceptQuote(req: Request, res: Response): Promise<void> {
  const { quoteId } = req.params;
  const { scheduledDate } = req.body as Record<string, unknown>;

  const quote = await pool.query(
    `SELECT q.*, qr.scheme_id, qr.description_of_works, qr.audit_finding_id, qr.maintenance_request_id,
            t.email AS trade_email, t.full_name AS trade_name,
            s.name AS scheme_name, s.address AS scheme_address
     FROM quotes q
     JOIN quote_requests qr ON qr.id = q.quote_request_id
     JOIN trades t ON t.id = q.trade_id
     JOIN schemes s ON s.id = qr.scheme_id
     WHERE q.id = $1`,
    [quoteId]
  );

  if (quote.rows.length === 0) { res.status(404).json({ error: 'Quote not found' }); return; }
  const q = quote.rows[0];

  // Mark this quote accepted, others declined
  await pool.query(`UPDATE quotes SET status = 'accepted', updated_at = NOW() WHERE id = $1`, [quoteId]);
  await pool.query(
    `UPDATE quotes SET status = 'declined', updated_at = NOW() WHERE quote_request_id = $1 AND id != $2`,
    [q.quote_request_id, quoteId]
  );

  // Close the quote request
  await pool.query(
    `UPDATE quote_requests SET status = 'accepted', updated_at = NOW() WHERE id = $1`,
    [q.quote_request_id]
  );

  // Update audit finding status
  if (q.audit_finding_id) {
    await pool.query(
      `UPDATE audit_findings SET rectification_status = 'quote_accepted', updated_at = NOW() WHERE id = $1`,
      [q.audit_finding_id]
    );
  }

  // Create the job
  const token = uuidv4();
  const tokenExpiry = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

  const job = await pool.query(
    `INSERT INTO jobs
       (scheme_id, audit_finding_id, maintenance_request_id, trade_id, job_type, status, scheduled_date, confirmation_token, confirmation_token_expiry)
     VALUES ($1,$2,$3,$4,'rectification','assigned',$5,$6,$7) RETURNING *`,
    [q.scheme_id, q.audit_finding_id || null, q.maintenance_request_id || null,
     q.trade_id, scheduledDate || null, token, tokenExpiry]
  );

  // Notify trade — reveal full address
  await emailTradeQuoteAccepted({
    tradeEmail: q.trade_email,
    tradeName: q.trade_name,
    jobId: job.rows[0].id,
    schemeAddress: q.scheme_address,
    scheduledDate: scheduledDate ? new Date(String(scheduledDate)).toLocaleDateString('en-AU') : 'TBC',
    worksDescription: q.description_of_works,
  }).catch(() => null);

  res.json({ message: 'Quote accepted. Job created.', job: job.rows[0] });
}

// ---------------------------------------------------------------------------
// Trade: view their own quote requests
// ---------------------------------------------------------------------------
export async function listTradeQuotes(req: Request, res: Response): Promise<void> {
  const user = req.user!;

  const result = await pool.query(
    `SELECT q.*, qr.description_of_works, qr.status AS request_status,
            s.name AS scheme_name
     FROM quotes q
     JOIN quote_requests qr ON qr.id = q.quote_request_id
     JOIN schemes s ON s.id = qr.scheme_id
     WHERE q.trade_id = $1
     ORDER BY q.submitted_at DESC`,
    [user.userId]
  );
  res.json(result.rows);
}

// ---------------------------------------------------------------------------
// Helper
// ---------------------------------------------------------------------------
function extractSuburb(address: string): string {
  // "15 Marine Parade, Manly NSW 2095" → "Manly"
  const parts = address.split(',');
  if (parts.length >= 2) {
    const last = parts[parts.length - 1].trim();
    const secondLast = parts[parts.length - 2].trim();
    // Take everything before the state abbreviation
    const match = secondLast.match(/^(.+?)\s+(?:NSW|VIC|QLD|SA|WA|TAS|ACT|NT)/i);
    return match ? match[1].trim() : secondLast;
  }
  return address;
}
