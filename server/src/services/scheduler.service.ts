/**
 * Scheduler service — runs daily compliance checks and overdue alerts.
 * Uses node-cron to fire at 6am AEST (UTC+10 = UTC 20:00 previous day).
 */

import cron from 'node-cron';
import { v4 as uuidv4 } from 'uuid';
import pool from '../db';
import {
  emailAdminDailyDigest,
  emailAdminTradeUnconfirmed,
  emailAdminJobOverdue,
} from './email.service';

/**
 * Run the daily compliance check:
 * - Find obligations due within 30 days with no active job
 * - Auto-create pending_assignment jobs
 * - Email admin digest
 */
export async function runDailyComplianceCheck(): Promise<{
  jobsCreated: number;
  overdueAlerted: number;
  unconfirmedAlerted: number;
}> {
  const client = await pool.connect();
  const newJobs: Array<{ id: number; schemeName: string; obligationName: string; dueDate: string }> = [];

  try {
    // 1. Find obligations due within 30 days with no active job
    const obligations = await client.query(
      `SELECT co.id, co.scheme_id, co.obligation_name, co.next_due_date
       FROM compliance_obligations co
       WHERE co.is_active = true
         AND co.next_due_date IS NOT NULL
         AND co.next_due_date <= NOW() + INTERVAL '30 days'
         AND NOT EXISTS (
           SELECT 1 FROM jobs j
           WHERE j.compliance_obligation_id = co.id
             AND j.status NOT IN ('cancelled','approved')
         )`
    );

    for (const ob of obligations.rows) {
      const token = uuidv4();
      const tokenExpiry = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

      const job = await client.query(
        `INSERT INTO jobs (scheme_id, compliance_obligation_id, job_type, status, scheduled_date, confirmation_token, confirmation_token_expiry)
         VALUES ($1,$2,'compliance','pending_assignment',$3,$4,$5) RETURNING id`,
        [ob.scheme_id, ob.id, ob.next_due_date, token, tokenExpiry]
      );

      const scheme = await client.query('SELECT name FROM schemes WHERE id = $1', [ob.scheme_id]);
      newJobs.push({
        id: job.rows[0].id,
        schemeName: scheme.rows[0]?.name || 'Unknown',
        obligationName: ob.obligation_name,
        dueDate: new Date(ob.next_due_date).toLocaleDateString('en-AU'),
      });
    }

    // 2. Alert admin about jobs unconfirmed for 48+ hours
    const unconfirmed = await client.query(
      `SELECT j.id, j.scheduled_date, s.name AS scheme_name, t.email AS trade_email
       FROM jobs j
       JOIN schemes s ON s.id = j.scheme_id
       JOIN trades t ON t.id = j.trade_id
       WHERE j.status = 'assigned' AND j.updated_at < NOW() - INTERVAL '48 hours'`
    );

    for (const job of unconfirmed.rows) {
      await emailAdminTradeUnconfirmed({
        jobId: job.id,
        schemeName: job.scheme_name,
        tradeEmail: job.trade_email,
        scheduledDate: new Date(job.scheduled_date).toLocaleDateString('en-AU'),
      }).catch(() => null);
    }

    // 3. Alert admin about overdue jobs
    const overdue = await client.query(
      `SELECT j.id, j.scheduled_date, s.name AS scheme_name
       FROM jobs j
       JOIN schemes s ON s.id = j.scheme_id
       WHERE j.scheduled_date < CURRENT_DATE
         AND j.status NOT IN ('completed','certificate_uploaded','approved','cancelled')`
    );

    for (const job of overdue.rows) {
      await emailAdminJobOverdue({
        jobId: job.id,
        schemeName: job.scheme_name,
        scheduledDate: new Date(job.scheduled_date).toLocaleDateString('en-AU'),
      }).catch(() => null);
    }

    // Send daily digest to admin
    await emailAdminDailyDigest(newJobs).catch(() => null);

    console.log(`[scheduler] Compliance check complete. Jobs created: ${newJobs.length}, unconfirmed alerts: ${unconfirmed.rows.length}, overdue alerts: ${overdue.rows.length}`);

    return {
      jobsCreated: newJobs.length,
      overdueAlerted: overdue.rows.length,
      unconfirmedAlerted: unconfirmed.rows.length,
    };
  } finally {
    client.release();
  }
}

/** Start the cron schedule. Call once on server startup. */
export function startScheduler(): void {
  // 6am AEST = 20:00 UTC previous day → cron: '0 20 * * *'
  cron.schedule('0 20 * * *', async () => {
    console.log('[scheduler] Running daily compliance check...');
    await runDailyComplianceCheck().catch(err => console.error('[scheduler] Error:', err));
  });

  console.log('[scheduler] Daily compliance check scheduled for 6am AEST');
}
