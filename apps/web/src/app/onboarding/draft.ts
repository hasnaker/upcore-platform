/**
 * Client/server-shared types for the onboarding wizard draft. Kept in sync
 * with services/tenant/internal/domain/onboarding.go.
 */

export type OnboardingStatus = 'in_progress' | 'committed' | 'abandoned';

export interface CompanyData {
  name: string;
  slug: string;
  vkn?: string;
  sector?: string;
  employee_count_band?: '1-10' | '11-50' | '51-200' | '201-1000' | '1000+';
  country?: string;
  locale?: string;
}

export interface AdminData {
  email: string;
  first_name: string;
  last_name: string;
  phone?: string;
  two_fa_ack: boolean;
}

export interface PlanData {
  plan_id: string;
  modules: string[];
}

export interface EmployeeRow {
  employee_no?: string;
  first_name: string;
  last_name: string;
  email?: string;
  tckn?: string;
  position?: string;
  department?: string;
  hire_date?: string;
  salary?: number;
}

export interface EmployeesData {
  mode: 'csv' | 'manual';
  rows: EmployeeRow[];
  csv_name?: string;
}

export interface Department {
  id: string;
  name: string;
  parent_id?: string;
  manager?: string;
}

export interface OrgChartData {
  template: 'flat' | 'hierarchical' | 'matrix';
  departments: Department[];
}

export interface SSOData {
  provider: 'google' | 'entra' | 'okta' | '';
  enabled: boolean;
  client_id?: string;
  client_secret?: string;
  tenant_id?: string;
  domain?: string;
}

export interface KVKKData {
  employee_notice_version?: string;
  candidate_notice_version?: string;
  visitor_notice_version?: string;
  dpo_name?: string;
  dpo_email?: string;
  dpo_phone?: string;
  verbis_ack: boolean;
}

export interface PayrollData {
  sgk_workplace_code?: string;
  iban?: string;
  payment_day?: number;
  bank_name?: string;
}

export interface IntegrationsData {
  slack_enabled: boolean;
  slack_webhook?: string;
  teams_enabled: boolean;
  teams_webhook?: string;
  kariyer_net_url?: string;
}

export type TemplateCode = 'belediye' | 'holding' | 'tech' | 'kobi' | '';

export interface OnboardingData {
  company?: CompanyData;
  admin?: AdminData;
  plan?: PlanData;
  employees?: EmployeesData;
  org_chart?: OrgChartData;
  sso?: SSOData;
  kvkk?: KVKKData;
  payroll?: PayrollData;
  integrations?: IntegrationsData;
  completed_steps?: number[];
  template?: TemplateCode;
}

export interface OnboardingDraft {
  id: string;
  clerk_user_id: string;
  admin_email: string;
  current_step: number;
  status: OnboardingStatus;
  committed_tenant_id?: string;
  data: OnboardingData;
  created_at: string;
  updated_at: string;
}

export interface OnboardingCommitResult {
  tenant_id: string;
  subscription_id: string;
  slug: string;
  draft_id: string;
  trial_ends_at?: string;
}

export interface OnboardingSaveResult {
  ok: boolean;
  error?: string;
  fieldErrors?: Record<string, string>;
  draft?: OnboardingDraft;
}
