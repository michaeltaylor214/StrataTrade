/**
 * StorageService — abstract file storage.
 * Set STORAGE_DRIVER=local for development, STORAGE_DRIVER=s3 for production.
 * Both drivers expose the same interface: upload() and getUrl().
 */

import * as fs from 'fs';
import * as path from 'path';
import { S3Client, PutObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

export interface UploadResult {
  /** Relative path stored in the database. Never absolute. */
  relativePath: string;
}

const UPLOAD_ROOT = path.resolve(process.cwd(), '..', 'uploads');
const ALLOWED_MIME_TYPES = new Set(['application/pdf', 'image/jpeg', 'image/png']);
const MAX_FILE_BYTES = 10 * 1024 * 1024; // 10 MB

/** Validate file before storage. Throws on violation. */
export function validateFile(file: Express.Multer.File): void {
  if (file.size > MAX_FILE_BYTES) {
    throw new Error(`File too large. Maximum size is 10 MB.`);
  }
  if (!ALLOWED_MIME_TYPES.has(file.mimetype)) {
    throw new Error(`File type not allowed. Accepted types: PDF, JPG, PNG.`);
  }
}

// ---------------------------------------------------------------------------
// Local driver
// ---------------------------------------------------------------------------

/** Store file on local disk under /uploads. Returns relative path. */
async function localUpload(file: Express.Multer.File, subdir: string): Promise<UploadResult> {
  const dir = path.join(UPLOAD_ROOT, subdir);
  fs.mkdirSync(dir, { recursive: true });

  const filename = `${Date.now()}-${file.originalname.replace(/[^a-zA-Z0-9._-]/g, '_')}`;
  const dest = path.join(dir, filename);
  fs.writeFileSync(dest, file.buffer);

  return { relativePath: `${subdir}/${filename}` };
}

/** Resolve a relative path to an absolute URL for local dev (served by Express). */
function localGetUrl(relativePath: string): string {
  return `${process.env.APP_URL ?? 'http://localhost:3001'}/uploads/${relativePath}`;
}

// ---------------------------------------------------------------------------
// S3 driver
// ---------------------------------------------------------------------------

function getS3Client(): S3Client {
  return new S3Client({
    region: process.env.S3_REGION || 'auto',
    endpoint: process.env.S3_ENDPOINT,
    credentials: {
      accessKeyId: process.env.S3_ACCESS_KEY!,
      secretAccessKey: process.env.S3_SECRET_KEY!,
    },
  });
}

async function s3Upload(file: Express.Multer.File, subdir: string): Promise<UploadResult> {
  const client = getS3Client();
  const filename = `${Date.now()}-${file.originalname.replace(/[^a-zA-Z0-9._-]/g, '_')}`;
  const key = `${subdir}/${filename}`;

  await client.send(new PutObjectCommand({
    Bucket: process.env.S3_BUCKET!,
    Key: key,
    Body: file.buffer,
    ContentType: file.mimetype,
  }));

  return { relativePath: key };
}

async function s3GetUrl(relativePath: string): Promise<string> {
  const client = getS3Client();
  const command = new GetObjectCommand({
    Bucket: process.env.S3_BUCKET!,
    Key: relativePath,
  });
  // Signed URL valid for 1 hour
  return getSignedUrl(client, command, { expiresIn: 3600 });
}

// ---------------------------------------------------------------------------
// Public API — delegates to the correct driver
// ---------------------------------------------------------------------------

const driver = process.env.STORAGE_DRIVER === 's3' ? 's3' : 'local';

/**
 * Upload a file to storage.
 * @param file  Multer file object (buffer must be in memory — use memoryStorage)
 * @param subdir  Sub-directory within the storage root (e.g. 'certificates', 'photos')
 */
export async function uploadFile(
  file: Express.Multer.File,
  subdir: string
): Promise<UploadResult> {
  validateFile(file);
  if (driver === 's3') return s3Upload(file, subdir);
  return localUpload(file, subdir);
}

/**
 * Get a URL for accessing a stored file.
 * For local driver returns a direct URL; for S3 returns a pre-signed URL.
 */
export async function getFileUrl(relativePath: string): Promise<string> {
  if (driver === 's3') return s3GetUrl(relativePath);
  return localGetUrl(relativePath);
}
