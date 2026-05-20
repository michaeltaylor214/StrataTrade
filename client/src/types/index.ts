export type UserRole = 'admin' | 'strata_manager' | 'building_manager' | 'trade';

export interface AuthUser {
  userId: number;
  role: UserRole;
  email: string;
  strataCompanyId?: number;
  schemeId?: number;
  forcePasswordChange?: boolean;
}

export type ComplianceStatus = 'green' | 'amber' | 'red';
export type JobStatus = 'pending_assignment' | 'assigned' | 'confirmed' | 'completed' | 'certificate_uploaded' | 'approved' | 'cancelled';
export type JobType = 'compliance' | 'maintenance' | 'rectification';
export type FindingSeverity = 'low' | 'medium' | 'high' | 'critical';
export type RequestPriority = 'low' | 'medium' | 'high' | 'urgent';
export type AuditStatus = 'pending' | 'in_progress' | 'completed';

export interface StrataCompany {
  id: number;
  name: string;
  address: string;
  contact_name: string;
  contact_email: string;
  contact_phone: string;
  company_code: string;
  is_active: boolean;
  created_at: string;
}

export interface Scheme {
  id: number;
  strata_company_id: number;
  company_name: string;
  name: string;
  address: string;
  building_class: string;
  number_of_lots: number;
  has_lift: boolean;
  has_pool: boolean;
  notes: string;
  audit_status: AuditStatus;
  onboarded_at: string;
  created_at: string;
  building_manager_name?: string;
  building_manager_email?: string;
}

export interface ComplianceObligation {
  id: number;
  scheme_id: number;
  trade_category: string;
  obligation_name: string;
  frequency_months: number;
  last_completed_date: string | null;
  next_due_date: string | null;
  is_active: boolean;
}

export interface Job {
  id: number;
  scheme_id: number;
  scheme_name: string;
  scheme_address: string;
  trade_id: number | null;
  trade_name: string | null;
  trade_company: string | null;
  trade_category: string | null;
  trade_email: string | null;
  job_type: JobType;
  status: JobStatus;
  scheduled_date: string | null;
  admin_notes: string | null;
  cancellation_reason: string | null;
  rejection_reason: string | null;
  obligation_name: string | null;
  created_at: string;
}

export interface JobDocument {
  id: number;
  job_id: number;
  document_type: string;
  file_path: string;
  original_filename: string;
  approved_by_admin: boolean;
  rejection_reason: string | null;
  uploaded_at: string;
}

export interface BuildingAudit {
  id: number;
  scheme_id: number;
  scheme_name: string;
  scheme_address: string;
  conducted_by_name: string;
  audit_date: string;
  overall_condition: 'good' | 'fair' | 'poor' | null;
  summary_notes: string | null;
  status: 'draft' | 'submitted' | 'reviewed';
  findings?: AuditFinding[];
}

export interface AuditFinding {
  id: number;
  audit_id: number;
  trade_category: string;
  location_in_building: string;
  description: string;
  severity: FindingSeverity;
  requires_rectification: boolean;
  rectification_status: string;
  photo_paths: string[];
  created_at: string;
}

export interface MaintenanceRequest {
  id: number;
  scheme_id: number;
  scheme_name: string;
  submitted_by_role: string;
  submitted_by_id: number;
  title: string;
  description: string;
  priority: RequestPriority;
  photo_paths: string[];
  status: string;
  admin_response: string | null;
  created_at: string;
}

export interface QuoteRequest {
  id: number;
  scheme_id: number;
  scheme_name: string;
  description_of_works: string;
  status: string;
  ready_for_review: boolean;
  quote_count: number;
  quotes?: Quote[];
  created_at: string;
}

export interface Quote {
  id: number;
  quote_request_id: number;
  trade_id: number;
  trade_category: string;
  amount: number;
  notes: string | null;
  valid_until: string | null;
  status: string;
  submitted_at: string;
}

export interface Trade {
  id: number;
  full_name: string;
  company_name: string;
  abn: string;
  trade_category: string;
  licence_number: string;
  insurance_expiry_date: string;
  email: string;
  is_active: boolean;
  rating: number | null;
  insurance_expiring_soon: boolean;
  created_at: string;
}

export interface Invoice {
  id: number;
  job_id: number;
  scheme_name: string;
  trade_name: string;
  job_type: JobType;
  trade_cost: number;
  margin_percent: number;
  client_charge: number;
  trade_payment_status: string;
  client_payment_status: string;
  created_at: string;
}

export interface AdminDashboard {
  activeSchemes: number;
  dueThisMonth: number;
  overdueJobs: number;
  awaitingApproval: number;
  openMaintenanceRequests: number;
  openQuoteRequests: number;
  needsAssignment: number;
  unconfirmed48hrs: number;
}
