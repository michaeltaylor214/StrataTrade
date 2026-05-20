import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);
const FROM = process.env.EMAIL_FROM || 'noreply@stratatrade.net';

interface EmailOptions {
  to: string | string[];
  subject: string;
  text: string;
}

/**
 * Send a plain-text email via Resend.
 * All emails are plain text for MVP — no HTML templates.
 */
export async function sendEmail(opts: EmailOptions): Promise<void> {
  if (process.env.NODE_ENV === 'test') return; // suppress in test env

  const { error } = await resend.emails.send({
    from: FROM,
    to: Array.isArray(opts.to) ? opts.to : [opts.to],
    subject: opts.subject,
    text: opts.text,
  });

  if (error) {
    console.error('[email] send failed:', error);
    // Non-fatal — log and continue rather than crashing the request
  }
}

// ---------------------------------------------------------------------------
// Named notification helpers keep controllers clean
// ---------------------------------------------------------------------------

/** Notify a trade that a job has been assigned to them. */
export async function emailTradeJobAssigned(opts: {
  tradeEmail: string;
  tradeName: string;
  jobId: number;
  schemeAddress: string;
  scheduledDate: string;
  worksDescription: string;
  confirmUrl: string;
  rescheduleUrl: string;
}): Promise<void> {
  await sendEmail({
    to: opts.tradeEmail,
    subject: `StrataTrade — New job assigned: ${opts.schemeAddress}`,
    text: `Hi ${opts.tradeName},

A new job has been assigned to you.

Property: ${opts.schemeAddress}
Scheduled Date: ${opts.scheduledDate}
Works Required: ${opts.worksDescription}

Please confirm your attendance using the link below:
${opts.confirmUrl}

If you need to reschedule, use this link:
${opts.rescheduleUrl}

These links expire in 7 days.

StrataTrade`,
  });
}

/** Notify a trade that their certificate upload was rejected. */
export async function emailTradeRejection(opts: {
  tradeEmail: string;
  tradeName: string;
  jobId: number;
  reason: string;
  reuploadUrl: string;
}): Promise<void> {
  await sendEmail({
    to: opts.tradeEmail,
    subject: `StrataTrade — Certificate upload rejected (Job #${opts.jobId})`,
    text: `Hi ${opts.tradeName},

The certificate you uploaded for Job #${opts.jobId} has been reviewed and not accepted.

Reason: ${opts.reason}

Please re-upload via the portal:
${opts.reuploadUrl}

StrataTrade`,
  });
}

/** Notify a trade of a new quote request. */
export async function emailTradeQuoteRequest(opts: {
  tradeEmail: string;
  tradeName: string;
  quoteRequestId: number;
  suburb: string;
  worksDescription: string;
  submitUrl: string;
}): Promise<void> {
  await sendEmail({
    to: opts.tradeEmail,
    subject: `StrataTrade — Quote request: ${opts.suburb}`,
    text: `Hi ${opts.tradeName},

You have been invited to submit a quote for the following works.

Location: ${opts.suburb}
Description: ${opts.worksDescription}

Submit your quote using the link below (no login required):
${opts.submitUrl}

This link expires in 7 days.

StrataTrade`,
  });
}

/** Notify a trade that their quote was accepted and reveal the full address. */
export async function emailTradeQuoteAccepted(opts: {
  tradeEmail: string;
  tradeName: string;
  jobId: number;
  schemeAddress: string;
  scheduledDate: string;
  worksDescription: string;
}): Promise<void> {
  await sendEmail({
    to: opts.tradeEmail,
    subject: `StrataTrade — Quote accepted — Job #${opts.jobId}`,
    text: `Hi ${opts.tradeName},

Your quote has been accepted. A job has been created for you.

Job #${opts.jobId}
Property: ${opts.schemeAddress}
Scheduled Date: ${opts.scheduledDate}
Works: ${opts.worksDescription}

Log in to the trade portal to manage this job:
${process.env.APP_URL}/trade

StrataTrade`,
  });
}

/** Notify a strata manager that a certificate is approved and available. */
export async function emailStrataCertApproved(opts: {
  managerEmail: string;
  managerName: string;
  schemeName: string;
  jobId: number;
}): Promise<void> {
  await sendEmail({
    to: opts.managerEmail,
    subject: `StrataTrade — Certificate approved: ${opts.schemeName}`,
    text: `Hi ${opts.managerName},

A compliance certificate for ${opts.schemeName} has been approved and is now available to download.

Log in to view it:
${process.env.APP_URL}/strata

StrataTrade`,
  });
}

/** Notify a strata manager that an audit report is ready. */
export async function emailStrataAuditReady(opts: {
  managerEmail: string;
  managerName: string;
  schemeName: string;
  schemeId: number;
}): Promise<void> {
  await sendEmail({
    to: opts.managerEmail,
    subject: `StrataTrade — Building audit report ready: ${opts.schemeName}`,
    text: `Hi ${opts.managerName},

A building audit report for ${opts.schemeName} is now available to view.

${process.env.APP_URL}/strata/schemes/${opts.schemeId}/audit-report

StrataTrade`,
  });
}

/** Notify a strata manager that a quote request is ready for their review. */
export async function emailStrataQuoteReady(opts: {
  managerEmail: string;
  managerName: string;
  schemeName: string;
  quoteRequestId: number;
}): Promise<void> {
  await sendEmail({
    to: opts.managerEmail,
    subject: `StrataTrade — Quotes ready for review: ${opts.schemeName}`,
    text: `Hi ${opts.managerName},

Quotes are ready for your review for works at ${opts.schemeName}.

Log in to the portal to view and accept a quote:
${process.env.APP_URL}/strata

StrataTrade`,
  });
}

/** Notify a strata manager of a new maintenance request from their building manager. */
export async function emailStrataMaintenanceRequest(opts: {
  managerEmail: string;
  managerName: string;
  schemeName: string;
  requestTitle: string;
  priority: string;
}): Promise<void> {
  await sendEmail({
    to: opts.managerEmail,
    subject: `StrataTrade — New maintenance request: ${opts.schemeName}`,
    text: `Hi ${opts.managerName},

A new maintenance request has been submitted for ${opts.schemeName}.

Title: ${opts.requestTitle}
Priority: ${opts.priority}

Log in to review it:
${process.env.APP_URL}/strata

StrataTrade`,
  });
}

/** Notify a building manager when their maintenance request is under review. */
export async function emailBuildingRequestReceived(opts: {
  managerEmail: string;
  managerName: string;
  requestTitle: string;
}): Promise<void> {
  await sendEmail({
    to: opts.managerEmail,
    subject: `StrataTrade — Maintenance request received`,
    text: `Hi ${opts.managerName},

Your maintenance request "${opts.requestTitle}" has been received and is under review.

You will be notified when works are scheduled.

StrataTrade`,
  });
}

/** Notify a building manager when a job has been created for their request. */
export async function emailBuildingJobCreated(opts: {
  managerEmail: string;
  managerName: string;
  requestTitle: string;
}): Promise<void> {
  await sendEmail({
    to: opts.managerEmail,
    subject: `StrataTrade — Works being organised`,
    text: `Hi ${opts.managerName},

Works have been organised for your maintenance request "${opts.requestTitle}".

A contractor will attend the property. You will be notified when the work is completed.

StrataTrade`,
  });
}

/** Notify a building manager when a job is completed. */
export async function emailBuildingJobCompleted(opts: {
  managerEmail: string;
  managerName: string;
  requestTitle: string;
  portalUrl: string;
}): Promise<void> {
  await sendEmail({
    to: opts.managerEmail,
    subject: `StrataTrade — Works completed`,
    text: `Hi ${opts.managerName},

The works for your maintenance request "${opts.requestTitle}" have been completed. Compliance documentation is available to download.

${opts.portalUrl}

StrataTrade`,
  });
}

/** Notify admin that a certificate has been uploaded and needs approval. */
export async function emailAdminCertUploaded(opts: {
  jobId: number;
  schemeName: string;
  tradeName: string;
}): Promise<void> {
  await sendEmail({
    to: process.env.ADMIN_ALERT_EMAIL || 'admin@platform.com',
    subject: `StrataTrade — Certificate uploaded: Job #${opts.jobId}`,
    text: `A compliance certificate has been uploaded for Job #${opts.jobId}.

Scheme: ${opts.schemeName}
Trade: ${opts.tradeName}

Log in to review and approve:
${process.env.APP_URL}/admin/jobs/${opts.jobId}`,
  });
}

/** Notify admin that a trade has not confirmed a job within 48 hours. */
export async function emailAdminTradeUnconfirmed(opts: {
  jobId: number;
  schemeName: string;
  tradeEmail: string;
  scheduledDate: string;
}): Promise<void> {
  await sendEmail({
    to: process.env.ADMIN_ALERT_EMAIL || 'admin@platform.com',
    subject: `StrataTrade — Trade unconfirmed 48hrs: Job #${opts.jobId}`,
    text: `Job #${opts.jobId} has not been confirmed by the assigned trade within 48 hours.

Scheme: ${opts.schemeName}
Trade email: ${opts.tradeEmail}
Scheduled: ${opts.scheduledDate}

Log in to reassign or follow up:
${process.env.APP_URL}/admin/jobs/${opts.jobId}`,
  });
}

/** Notify admin that a job is overdue. */
export async function emailAdminJobOverdue(opts: {
  jobId: number;
  schemeName: string;
  scheduledDate: string;
}): Promise<void> {
  await sendEmail({
    to: process.env.ADMIN_ALERT_EMAIL || 'admin@platform.com',
    subject: `StrataTrade — Overdue job: #${opts.jobId}`,
    text: `Job #${opts.jobId} is past its scheduled date and has not been completed.

Scheme: ${opts.schemeName}
Scheduled: ${opts.scheduledDate}

${process.env.APP_URL}/admin/jobs/${opts.jobId}`,
  });
}

/** Notify admin of a new maintenance request. */
export async function emailAdminMaintenanceRequest(opts: {
  requestId: number;
  schemeName: string;
  title: string;
  priority: string;
  submittedByRole: string;
}): Promise<void> {
  await sendEmail({
    to: process.env.ADMIN_ALERT_EMAIL || 'admin@platform.com',
    subject: `StrataTrade — New maintenance request: ${opts.schemeName}`,
    text: `A new maintenance request has been submitted.

Scheme: ${opts.schemeName}
Title: ${opts.title}
Priority: ${opts.priority}
Submitted by: ${opts.submittedByRole}

${process.env.APP_URL}/admin/maintenance/${opts.requestId}`,
  });
}

/** Notify admin that a new quote has been submitted. */
export async function emailAdminQuoteSubmitted(opts: {
  quoteRequestId: number;
  schemeName: string;
  tradeName: string;
  amount: number;
}): Promise<void> {
  await sendEmail({
    to: process.env.ADMIN_ALERT_EMAIL || 'admin@platform.com',
    subject: `StrataTrade — New quote submitted`,
    text: `A new quote has been submitted for Quote Request #${opts.quoteRequestId}.

Scheme: ${opts.schemeName}
Trade: ${opts.tradeName}
Amount: $${opts.amount.toFixed(2)}

${process.env.APP_URL}/admin/quotes/${opts.quoteRequestId}`,
  });
}

/** Daily digest to admin of newly created compliance jobs needing assignment. */
export async function emailAdminDailyDigest(jobs: Array<{
  id: number;
  schemeName: string;
  obligationName: string;
  dueDate: string;
}>): Promise<void> {
  if (jobs.length === 0) return;

  const lines = jobs.map(j =>
    `  Job #${j.id} — ${j.schemeName} — ${j.obligationName} (due ${j.dueDate})`
  ).join('\n');

  await sendEmail({
    to: process.env.ADMIN_ALERT_EMAIL || 'admin@platform.com',
    subject: `StrataTrade — ${jobs.length} compliance job(s) need trade assignment`,
    text: `The daily compliance check has created the following jobs. Each requires a trade to be assigned.\n\n${lines}\n\n${process.env.APP_URL}/admin/jobs`,
  });
}
