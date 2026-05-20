export type UserRole = 'admin' | 'strata_manager' | 'building_manager' | 'trade';

export interface JwtPayload {
  userId: number;
  role: UserRole;
  email: string;
  /** For strata_manager: their company id */
  strataCompanyId?: number;
  /** For building_manager: their assigned scheme id */
  schemeId?: number;
  /** Whether admin must change password before doing anything else */
  forcePasswordChange?: boolean;
}

export interface AuthRequest extends Express.Request {
  user?: JwtPayload;
}
