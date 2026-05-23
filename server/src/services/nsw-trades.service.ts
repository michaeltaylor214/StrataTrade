/**
 * NSW Trades Register API — licence verification service
 *
 * Uses the official Service NSW / NSW Fair Trading Trades Register API
 * (api.onegov.nsw.gov.au) to verify that a contractor's licence number
 * is valid, currently active, and the name on the licence matches the
 * name entered during registration.
 *
 * Required env vars (set in Railway):
 *   NSW_LICENCE_API_KEY    — Consumer Key from api.nsw.gov.au
 *   NSW_LICENCE_API_SECRET — Consumer Secret from api.nsw.gov.au
 *
 * Free tier: 2,500 API calls/month. Register at:
 *   https://api.nsw.gov.au/Product/Index/25
 *
 * If either env var is absent the function returns API_NOT_CONFIGURED
 * and registration proceeds to manual admin review.
 */

const API_BASE  = 'https://api.onegov.nsw.gov.au';
const TOKEN_URL = `${API_BASE}/oauth/client_credential/accesstoken`;

// ---------------------------------------------------------------------------
// OAuth token cache (tokens last ~12 hours; we refresh 5 min early)
// ---------------------------------------------------------------------------
interface TokenCache {
  token:     string;
  expiresAt: number;
}
let tokenCache: TokenCache | null = null;

async function getAccessToken(): Promise<string | null> {
  const apiKey    = process.env.NSW_LICENCE_API_KEY;
  const apiSecret = process.env.NSW_LICENCE_API_SECRET;
  if (!apiKey || !apiSecret) return null;

  if (tokenCache && Date.now() < tokenCache.expiresAt - 5 * 60 * 1000) {
    return tokenCache.token;
  }

  const credentials = Buffer.from(`${apiKey}:${apiSecret}`).toString('base64');
  const res = await fetch(TOKEN_URL, {
    method: 'POST',
    headers: {
      Authorization:  `Basic ${credentials}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: 'grant_type=client_credentials',
  });

  if (!res.ok) {
    console.error('[nsw-licence] OAuth token request failed:', res.status);
    return null;
  }

  const data = await res.json() as { access_token: string; expires_in: number };
  tokenCache = {
    token:     data.access_token,
    expiresAt: Date.now() + data.expires_in * 1000,
  };
  return data.access_token;
}

// ---------------------------------------------------------------------------
// Name matching — case-insensitive, handles word order differences
// ---------------------------------------------------------------------------
function namesMatch(entered: string, licenceHolder: string): boolean {
  const norm = (s: string) =>
    s.toLowerCase().replace(/[^a-z0-9\s]/g, '').replace(/\s+/g, ' ').trim();

  const a = norm(entered);
  const b = norm(licenceHolder);

  if (!a || !b) return false;

  // Direct substring match catches most cases
  if (b.includes(a) || a.includes(b)) return true;

  // Word overlap: require all significant words in the shorter string to
  // appear in the longer one (handles "John Smith" vs "SMITH JOHN MICHAEL")
  const wordsA = a.split(' ').filter(w => w.length > 2);
  const wordsB = b.split(' ').filter(w => w.length > 2);
  if (wordsA.length === 0 || wordsB.length === 0) return false;

  const [shorter, longer] = wordsA.length <= wordsB.length
    ? [wordsA, wordsB]
    : [wordsB, wordsA];

  const matchCount = shorter.filter(w => longer.includes(w)).length;
  // At least half the words in the shorter name must match
  return matchCount >= Math.ceil(shorter.length / 2);
}

// ---------------------------------------------------------------------------
// Public interface
// ---------------------------------------------------------------------------
export type LicenceVerificationStatus =
  | 'VERIFIED'
  | 'NOT_FOUND'
  | 'INACTIVE'
  | 'EXPIRED'
  | 'NAME_MISMATCH'
  | 'API_ERROR'
  | 'API_NOT_CONFIGURED';

export interface LicenceVerificationResult {
  verified:     boolean;
  status:       LicenceVerificationStatus;
  message:      string;
  holderName?:  string;
  licenceType?: string;
  expiryDate?:  string;
}

export async function verifyTradeLicence(
  licenceNumber: string,
  fullName:      string,
  companyName:   string,
): Promise<LicenceVerificationResult> {

  if (!process.env.NSW_LICENCE_API_KEY) {
    return {
      verified: false,
      status:   'API_NOT_CONFIGURED',
      message:  'NSW licence verification is not configured — manual review required',
    };
  }

  try {
    const token = await getAccessToken();
    if (!token) {
      return { verified: false, status: 'API_ERROR', message: 'Could not obtain NSW API access token' };
    }

    const apiKey = process.env.NSW_LICENCE_API_KEY!;
    const url    = `${API_BASE}/tradesregister/v1/verify?licenceNumber=${encodeURIComponent(licenceNumber.trim())}`;

    const res = await fetch(url, {
      headers: {
        Authorization: `Bearer ${token}`,
        apikey:        apiKey,
        Accept:        'application/json',
      },
    });

    if (res.status === 404 || res.status === 204) {
      return { verified: false, status: 'NOT_FOUND', message: 'Licence number not found in the NSW register' };
    }

    if (!res.ok) {
      console.error('[nsw-licence] Verify endpoint error:', res.status);
      return { verified: false, status: 'API_ERROR', message: `Verification service returned status ${res.status}` };
    }

    // The API returns an array of matching licence records
    const body = await res.json() as Array<Record<string, unknown>> | Record<string, unknown>;
    const records = Array.isArray(body) ? body : [body];

    if (records.length === 0) {
      return { verified: false, status: 'NOT_FOUND', message: 'Licence number not found in the NSW register' };
    }

    const licence = records[0];

    // Extract fields — handle different naming conventions the API may use
    const holderName  = String(licence.licenceeFullName  ?? licence.holderName  ?? licence.name    ?? '');
    const statusRaw   = String(licence.licenceStatus     ?? licence.status      ?? licence.licenceStatusDescription ?? '').toLowerCase();
    const licenceType = String(licence.licenceType       ?? licence.licenceClass ?? licence.type    ?? '');
    const expiryDate  = String(licence.expiryDate        ?? licence.expiry       ?? '');

    // Check expiry
    if (statusRaw.includes('expir')) {
      return {
        verified:    false,
        status:      'EXPIRED',
        message:     `Licence has expired${expiryDate ? ` (${expiryDate})` : ''}`,
        holderName,
        expiryDate,
      };
    }

    // Check active status
    const isActive = statusRaw.includes('active') || statusRaw === 'current' || statusRaw === 'valid';
    if (!isActive && statusRaw !== '') {
      return {
        verified:   false,
        status:     'INACTIVE',
        message:    `Licence status: ${statusRaw}`,
        holderName,
      };
    }

    // Check name match against either the individual name or the company name
    if (holderName && !namesMatch(fullName, holderName) && !namesMatch(companyName, holderName)) {
      return {
        verified:    false,
        status:      'NAME_MISMATCH',
        message:     `Name does not match NSW licence holder (${holderName})`,
        holderName,
        licenceType,
        expiryDate,
      };
    }

    return {
      verified:     true,
      status:       'VERIFIED',
      message:      'Licence verified with NSW Trades Register',
      holderName,
      licenceType:  licenceType || undefined,
      expiryDate:   expiryDate  || undefined,
    };

  } catch (err) {
    console.error('[nsw-licence] Unexpected error:', err);
    return {
      verified: false,
      status:   'API_ERROR',
      message:  'Licence verification service temporarily unavailable',
    };
  }
}
