import { Request, Response } from 'express';
import bcrypt from 'bcrypt';
import { v4 as uuidv4 } from 'uuid';
import pool from '../db';
import { signToken } from '../utils/jwt';
import { sendEmail } from '../services/email.service';
import { verifyTradeLicence } from '../services/nsw-trades.service';
import { UserRole } from '../types/auth';

const BCRYPT_ROUNDS = 12;

// ---------------------------------------------------------------------------
// Login (shared endpoint — detects role from the accounts tables)
// ---------------------------------------------------------------------------
export async function login(req: Request, res: Response): Promise<void> {
  const { email, password } = req.body as { email?: string; password?: string };

  if (!email || !password) {
    res.status(400).json({ error: 'Email and password are required' });
    return;
  }

  const tables: Array<{ table: string; role: UserRole }> = [
    { table: 'admin_users',       role: 'admin' },
    { table: 'strata_managers',   role: 'strata_manager' },
    { table: 'building_managers', role: 'building_manager' },
    { table: 'trades',            role: 'trade' },
  ];

  for (const { table, role } of tables) {
    const result = await pool.query(
      `SELECT * FROM ${table} WHERE email = $1 LIMIT 1`,
      [email.toLowerCase().trim()]
    );

    if (result.rows.length === 0) continue;

    const user = result.rows[0];

    // Inactive accounts cannot log in
    if ('is_active' in user && !user.is_active) {
      res.status(403).json({ error: 'Account is inactive. Contact the platform administrator.' });
      return;
    }

    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) {
      res.status(401).json({ error: 'Invalid email or password' });
      return;
    }

    const payload = buildPayload(user, role);
    const token = signToken(payload);

    res.json({
      token,
      user: sanitiseUser(user, role),
      forcePasswordChange: user.force_password_change ?? false,
    });
    return;
  }

  res.status(401).json({ error: 'Invalid email or password' });
}

// ---------------------------------------------------------------------------
// Trade self-registration
// ---------------------------------------------------------------------------
export async function registerTrade(req: Request, res: Response): Promise<void> {
  const {
    fullName, companyName, abn, tradeCategory,
    licenceNumber, insuranceExpiryDate, email, password,
  } = req.body as Record<string, string>;

  if (!fullName || !companyName || !abn || !tradeCategory || !licenceNumber || !email || !password) {
    res.status(400).json({ error: 'Required fields: fullName, companyName, abn, tradeCategory, licenceNumber, email, password' });
    return;
  }

  if (password.length < 8) {
    res.status(400).json({ error: 'Password must be at least 8 characters' });
    return;
  }

  const validCategories = ['Electrical', 'Fire Safety', 'Plumbing', 'Lift', 'Pool', 'Building/General'];
  if (!validCategories.includes(tradeCategory)) {
    res.status(400).json({ error: `trade_category must be one of: ${validCategories.join(', ')}` });
    return;
  }

  const existing = await pool.query('SELECT id FROM trades WHERE email = $1', [email.toLowerCase().trim()]);
  if (existing.rows.length > 0) {
    res.status(409).json({ error: 'An account with this email already exists' });
    return;
  }

  // Verify licence with NSW Trades Register API
  // API_NOT_CONFIGURED → null (admin decides manually)
  // VERIFIED           → true
  // anything else      → false (admin reviews)
  const licenceCheck = await verifyTradeLicence(licenceNumber, fullName, companyName);
  const nswVerified  = licenceCheck.status === 'API_NOT_CONFIGURED'
    ? null
    : licenceCheck.verified;

  const hash = await bcrypt.hash(password, BCRYPT_ROUNDS);

  const result = await pool.query(
    `INSERT INTO trades
       (full_name, company_name, abn, trade_category, licence_number, insurance_expiry_date,
        email, password_hash, is_active, nsw_licence_verified, nsw_licence_status)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,false,$9,$10)
     RETURNING id, full_name, company_name, email, trade_category, is_active, created_at`,
    [
      fullName.trim(),
      companyName.trim(),
      abn.trim(),
      tradeCategory,
      licenceNumber.trim(),
      insuranceExpiryDate || null,
      email.toLowerCase().trim(),
      hash,
      nswVerified,
      licenceCheck.message,
    ]
  );

  // Admin notification — flag urgency based on verification result
  const verificationLine = licenceCheck.status === 'API_NOT_CONFIGURED'
    ? 'NSW Licence Check: Not configured — verify manually'
    : licenceCheck.verified
      ? `NSW Licence Check: ✓ VERIFIED (${licenceCheck.holderName ?? ''}${licenceCheck.licenceType ? ' — ' + licenceCheck.licenceType : ''})`
      : `NSW Licence Check: ⚠ FAILED — ${licenceCheck.message} — MANUAL REVIEW REQUIRED`;

  const subject = licenceCheck.verified
    ? 'New trade registered — licence verified'
    : licenceCheck.status === 'API_NOT_CONFIGURED'
      ? 'New trade registered — awaiting activation'
      : 'New trade registered — LICENCE CHECK FAILED — manual review required';

  await sendEmail({
    to: process.env.ADMIN_ALERT_EMAIL || 'admin@platform.com',
    subject,
    text: `A new trade has registered and is awaiting activation.\n\nName: ${fullName}\nCompany: ${companyName}\nCategory: ${tradeCategory}\nABN: ${abn}\nLicence Number: ${licenceNumber}\nEmail: ${email}\n\n${verificationLine}\n\nLog in to the admin portal to review and activate:\n${process.env.APP_URL}/admin`,
  }).catch(() => null);

  res.status(201).json({
    message: licenceCheck.verified
      ? 'Registration successful. Your NSW contractor licence has been verified. Your account is now under review for activation.'
      : 'Registration received. Your account is under review — please ensure your contractor licence number and name match your NSW Fair Trading records.',
    licenceVerified: licenceCheck.verified,
    licenceStatus:   licenceCheck.status,
  });
}

// ---------------------------------------------------------------------------
// Strata Manager self-registration (requires company_code)
// ---------------------------------------------------------------------------
export async function registerStrataManager(req: Request, res: Response): Promise<void> {
  const { name, email, password, companyCode } = req.body as Record<string, string>;

  if (!name || !email || !password || !companyCode) {
    res.status(400).json({ error: 'Required fields: name, email, password, companyCode' });
    return;
  }

  if (password.length < 8) {
    res.status(400).json({ error: 'Password must be at least 8 characters' });
    return;
  }

  const company = await pool.query(
    'SELECT id FROM strata_companies WHERE company_code = $1 AND is_active = true',
    [companyCode.trim().toUpperCase()]
  );

  if (company.rows.length === 0) {
    res.status(400).json({ error: 'Invalid company code. Contact the platform administrator.' });
    return;
  }

  const existing = await pool.query('SELECT id FROM strata_managers WHERE email = $1', [email.toLowerCase().trim()]);
  if (existing.rows.length > 0) {
    res.status(409).json({ error: 'An account with this email already exists' });
    return;
  }

  const hash = await bcrypt.hash(password, BCRYPT_ROUNDS);

  const result = await pool.query(
    `INSERT INTO strata_managers (strata_company_id, name, email, password_hash)
     VALUES ($1,$2,$3,$4)
     RETURNING id, name, email, strata_company_id, created_at`,
    [company.rows[0].id, name.trim(), email.toLowerCase().trim(), hash]
  );

  const payload = {
    userId: result.rows[0].id,
    role: 'strata_manager' as const,
    email: result.rows[0].email,
    strataCompanyId: company.rows[0].id,
  };
  const token = signToken(payload);

  res.status(201).json({ token, user: result.rows[0] });
}

// ---------------------------------------------------------------------------
// Password reset — request
// ---------------------------------------------------------------------------
export async function requestPasswordReset(req: Request, res: Response): Promise<void> {
  const { email } = req.body as { email?: string };
  if (!email) {
    res.status(400).json({ error: 'Email is required' });
    return;
  }

  const tables: Array<{ table: string; role: string }> = [
    { table: 'admin_users',       role: 'admin' },
    { table: 'strata_managers',   role: 'strata_manager' },
    { table: 'building_managers', role: 'building_manager' },
    { table: 'trades',            role: 'trade' },
  ];

  let found = false;
  for (const { table, role } of tables) {
    const result = await pool.query(`SELECT id FROM ${table} WHERE email = $1`, [email.toLowerCase().trim()]);
    if (result.rows.length === 0) continue;

    found = true;
    const userId = result.rows[0].id;
    const token = uuidv4();
    const expiry = new Date(Date.now() + 2 * 60 * 60 * 1000); // 2 hours

    await pool.query(
      `INSERT INTO password_reset_tokens (user_role, user_id, token, expires_at) VALUES ($1,$2,$3,$4)`,
      [role, userId, token, expiry]
    );

    const resetUrl = `${process.env.APP_URL}/reset-password?token=${token}`;
    await sendEmail({
      to: email,
      subject: 'StrataTrade — Password Reset',
      text: `You requested a password reset.\n\nClick the link below to reset your password (valid for 2 hours):\n\n${resetUrl}\n\nIf you did not request this, ignore this email.`,
    }).catch(() => null);
    break;
  }

  // Always return 200 to avoid email enumeration
  res.json({ message: 'If that email exists, a reset link has been sent.' });
}

// ---------------------------------------------------------------------------
// Password reset — complete
// ---------------------------------------------------------------------------
export async function resetPassword(req: Request, res: Response): Promise<void> {
  const { token, password } = req.body as { token?: string; password?: string };

  if (!token || !password) {
    res.status(400).json({ error: 'Token and password are required' });
    return;
  }

  if (password.length < 8) {
    res.status(400).json({ error: 'Password must be at least 8 characters' });
    return;
  }

  const result = await pool.query(
    `SELECT * FROM password_reset_tokens
     WHERE token = $1 AND used_at IS NULL AND expires_at > NOW()`,
    [token]
  );

  if (result.rows.length === 0) {
    res.status(400).json({ error: 'Invalid or expired reset token' });
    return;
  }

  const { user_role, user_id } = result.rows[0];
  const tableMap: Record<string, string> = {
    admin: 'admin_users',
    strata_manager: 'strata_managers',
    building_manager: 'building_managers',
    trade: 'trades',
  };

  const table = tableMap[user_role];
  const hash = await bcrypt.hash(password, BCRYPT_ROUNDS);

  const extraFields = user_role === 'admin' ? ', force_password_change = false' : '';
  await pool.query(
    `UPDATE ${table} SET password_hash = $1${extraFields}, updated_at = NOW() WHERE id = $2`,
    [hash, user_id]
  );

  await pool.query(
    `UPDATE password_reset_tokens SET used_at = NOW() WHERE token = $1`,
    [token]
  );

  res.json({ message: 'Password reset successful. You can now log in.' });
}

// ---------------------------------------------------------------------------
// Change password (authenticated)
// ---------------------------------------------------------------------------
export async function changePassword(req: Request, res: Response): Promise<void> {
  const { currentPassword, newPassword } = req.body as Record<string, string>;
  const user = req.user!;

  if (!currentPassword || !newPassword) {
    res.status(400).json({ error: 'currentPassword and newPassword are required' });
    return;
  }

  if (newPassword.length < 8) {
    res.status(400).json({ error: 'New password must be at least 8 characters' });
    return;
  }

  const tableMap: Record<string, string> = {
    admin: 'admin_users',
    strata_manager: 'strata_managers',
    building_manager: 'building_managers',
    trade: 'trades',
  };

  const table = tableMap[user.role];
  const result = await pool.query(`SELECT password_hash FROM ${table} WHERE id = $1`, [user.userId]);

  if (result.rows.length === 0) {
    res.status(404).json({ error: 'User not found' });
    return;
  }

  const valid = await bcrypt.compare(currentPassword, result.rows[0].password_hash);
  if (!valid) {
    res.status(401).json({ error: 'Current password is incorrect' });
    return;
  }

  const hash = await bcrypt.hash(newPassword, BCRYPT_ROUNDS);
  const extraFields = user.role === 'admin' ? ', force_password_change = false' : '';
  await pool.query(
    `UPDATE ${table} SET password_hash = $1${extraFields}, updated_at = NOW() WHERE id = $2`,
    [hash, user.userId]
  );

  res.json({ message: 'Password changed successfully' });
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function buildPayload(user: Record<string, unknown>, role: UserRole) {
  const base = { userId: user.id as number, role, email: user.email as string };
  if (role === 'strata_manager') return { ...base, strataCompanyId: user.strata_company_id as number };
  if (role === 'building_manager') return { ...base, schemeId: user.scheme_id as number };
  if (role === 'admin') return { ...base, forcePasswordChange: user.force_password_change as boolean };
  return base;
}

function sanitiseUser(user: Record<string, unknown>, role: UserRole) {
  const { password_hash, ...safe } = user;
  return { ...safe, role };
}
