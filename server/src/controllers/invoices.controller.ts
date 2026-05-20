import { Request, Response } from 'express';
import pool from '../db';

export async function listInvoices(req: Request, res: Response): Promise<void> {
  const { tradePaymentStatus, clientPaymentStatus, schemeId } = req.query as Record<string, string>;

  const conditions: string[] = [];
  const params: unknown[] = [];
  let p = 1;

  if (tradePaymentStatus) { conditions.push(`i.trade_payment_status = $${p++}`); params.push(tradePaymentStatus); }
  if (clientPaymentStatus){ conditions.push(`i.client_payment_status = $${p++}`); params.push(clientPaymentStatus); }
  if (schemeId)           { conditions.push(`j.scheme_id = $${p++}`); params.push(schemeId); }

  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

  const result = await pool.query(
    `SELECT i.*, j.job_type, j.status AS job_status, j.scheduled_date,
            s.name AS scheme_name, s.id AS scheme_id,
            t.full_name AS trade_name, t.company_name AS trade_company
     FROM invoices i
     JOIN jobs j ON j.id = i.job_id
     JOIN schemes s ON s.id = j.scheme_id
     LEFT JOIN trades t ON t.id = j.trade_id
     ${where}
     ORDER BY i.created_at DESC`,
    params
  );
  res.json(result.rows);
}

export async function getInvoice(req: Request, res: Response): Promise<void> {
  const { id } = req.params;
  const result = await pool.query(
    `SELECT i.*, j.job_type, j.status AS job_status, j.scheduled_date,
            s.name AS scheme_name,
            t.full_name AS trade_name, t.company_name AS trade_company, t.email AS trade_email
     FROM invoices i
     JOIN jobs j ON j.id = i.job_id
     JOIN schemes s ON s.id = j.scheme_id
     LEFT JOIN trades t ON t.id = j.trade_id
     WHERE i.id = $1`,
    [id]
  );
  if (result.rows.length === 0) { res.status(404).json({ error: 'Invoice not found' }); return; }
  res.json(result.rows[0]);
}

export async function createOrUpdateInvoice(req: Request, res: Response): Promise<void> {
  const { jobId, tradeCost, marginPercent, tradePaymentStatus, clientPaymentStatus, notes } = req.body as Record<string, unknown>;

  if (!jobId || tradeCost === undefined) {
    res.status(400).json({ error: 'jobId and tradeCost are required' }); return;
  }

  const margin = Number(marginPercent ?? 0);
  const cost = Number(tradeCost);
  const clientCharge = cost * (1 + margin / 100);

  const result = await pool.query(
    `INSERT INTO invoices (job_id, trade_cost, margin_percent, client_charge, trade_payment_status, client_payment_status, notes)
     VALUES ($1,$2,$3,$4,$5,$6,$7)
     ON CONFLICT (job_id) DO UPDATE SET
       trade_cost = EXCLUDED.trade_cost,
       margin_percent = EXCLUDED.margin_percent,
       client_charge = EXCLUDED.client_charge,
       trade_payment_status = COALESCE($5::payment_status, invoices.trade_payment_status),
       client_payment_status = COALESCE($6::client_payment_status, invoices.client_payment_status),
       notes = COALESCE($7, invoices.notes),
       updated_at = NOW()
     RETURNING *`,
    [jobId, cost, margin, clientCharge,
     tradePaymentStatus || 'unpaid', clientPaymentStatus || 'unpaid', notes || null]
  );
  res.status(201).json(result.rows[0]);
}

export async function updateInvoice(req: Request, res: Response): Promise<void> {
  const { id } = req.params;
  const { tradeCost, marginPercent, tradePaymentStatus, clientPaymentStatus, notes } = req.body as Record<string, unknown>;

  let clientCharge: number | undefined;
  if (tradeCost !== undefined) {
    const margin = Number(marginPercent ?? 0);
    clientCharge = Number(tradeCost) * (1 + margin / 100);
  }

  const result = await pool.query(
    `UPDATE invoices SET
       trade_cost = COALESCE($1, trade_cost),
       margin_percent = COALESCE($2, margin_percent),
       client_charge = COALESCE($3, client_charge),
       trade_payment_status = COALESCE($4::payment_status, trade_payment_status),
       client_payment_status = COALESCE($5::client_payment_status, client_payment_status),
       notes = COALESCE($6, notes),
       updated_at = NOW()
     WHERE id = $7 RETURNING *`,
    [tradeCost, marginPercent, clientCharge,
     tradePaymentStatus, clientPaymentStatus, notes, id]
  );
  if (result.rows.length === 0) { res.status(404).json({ error: 'Invoice not found' }); return; }
  res.json(result.rows[0]);
}

/** Export invoices as CSV (admin only). */
export async function exportInvoicesCsv(req: Request, res: Response): Promise<void> {
  const result = await pool.query(
    `SELECT i.id, s.name AS scheme, j.job_type, j.scheduled_date,
            t.company_name AS trade, i.trade_cost, i.margin_percent, i.client_charge,
            i.trade_payment_status, i.client_payment_status, i.created_at
     FROM invoices i
     JOIN jobs j ON j.id = i.job_id
     JOIN schemes s ON s.id = j.scheme_id
     LEFT JOIN trades t ON t.id = j.trade_id
     ORDER BY i.created_at DESC`
  );

  const headers = [
    'Invoice ID','Scheme','Job Type','Scheduled Date','Trade',
    'Trade Cost','Margin %','Client Charge',
    'Trade Payment','Client Payment','Created At',
  ];

  const rows = result.rows.map(r => [
    r.id, r.scheme, r.job_type, r.scheduled_date, r.trade,
    r.trade_cost, r.margin_percent, r.client_charge,
    r.trade_payment_status, r.client_payment_status, r.created_at,
  ].map(v => `"${String(v ?? '').replace(/"/g, '""')}"`).join(','));

  const csv = [headers.join(','), ...rows].join('\n');

  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', 'attachment; filename="invoices.csv"');
  res.send(csv);
}
