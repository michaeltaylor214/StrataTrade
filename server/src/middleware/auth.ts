import { Request, Response, NextFunction } from 'express';
import { verifyToken } from '../utils/jwt';
import { JwtPayload, UserRole } from '../types/auth';

// Extend Express Request to carry the decoded user
declare global {
  namespace Express {
    interface Request {
      user?: JwtPayload;
    }
  }
}

/** Authenticate request — attaches req.user or returns 401. */
export function authenticate(req: Request, res: Response, next: NextFunction): void {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Missing or invalid Authorization header' });
    return;
  }

  const token = header.slice(7);
  try {
    req.user = verifyToken(token);
    next();
  } catch {
    res.status(401).json({ error: 'Token invalid or expired' });
  }
}

/**
 * Restrict route to specific roles.
 * Must be called after authenticate().
 */
export function requireRole(...roles: UserRole[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user || !roles.includes(req.user.role)) {
      res.status(403).json({ error: 'Forbidden' });
      return;
    }
    next();
  };
}

/** Convenience: admin-only */
export const adminOnly = requireRole('admin');

/** Convenience: strata manager only */
export const strataOnly = requireRole('strata_manager');

/** Convenience: building manager only */
export const buildingOnly = requireRole('building_manager');

/** Convenience: trade only */
export const tradeOnly = requireRole('trade');

/** Admin or strata manager */
export const adminOrStrata = requireRole('admin', 'strata_manager');
