import jwt from 'jsonwebtoken';
import { JwtPayload } from '../types/auth';

const secret = process.env.JWT_SECRET!;
const expiresIn = process.env.JWT_EXPIRES_IN || '7d';

/** Sign a JWT for the given payload. */
export function signToken(payload: JwtPayload): string {
  return jwt.sign(payload, secret, { expiresIn } as jwt.SignOptions);
}

/** Verify and decode a JWT. Throws if invalid or expired. */
export function verifyToken(token: string): JwtPayload {
  return jwt.verify(token, secret) as JwtPayload;
}
