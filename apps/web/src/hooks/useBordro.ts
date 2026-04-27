'use client';

import { useAuth } from '@clerk/nextjs';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiUrl } from '@/lib/api-url';
import { useTenant } from './useTenant';
import { useApiQuery, useApiMutation } from './useApi';

/* ─── Types — mirror services/bordro/internal/domain ─── */

export type PeriodStatus = 'open' | 'locked' | 'finalised' | 'closed';

export interface PayrollPeriod {
  id: string;
  tenant_id: string;
  period_year: number;
  period_month: number;
  start_date: string;
  end_date: string;
  pay_date: string;
  status: PeriodStatus;
  created_by?: string | null;
  created_at: string;
  updated_at: string;
}

export type RunType = 'regular' | 'bonus' | 'ikramiye' | 'off_cycle' | 'correction';
export type RunStatus = 'preview' | 'calculated' | 'approved' | 'finalised' | 'voided';

export interface PayrollRun {
  id: string;
  tenant_id: string;
  period_id: string;
  run_type: RunType;
  status: RunStatus;
  total_gross: number;
  total_net: number;
  total_income_tax: number;
  total_sgk_emp: number;
  total_sgk_empr: number;
  total_stamp: number;
  employee_count: number;
  approved_by?: string | null;
  approved_at?: string | null;
  finalised_at?: string | null;
  notes?: string | null;
  created_at: string;
  updated_at: string;
}

export type SlipItemType = 'earning' | 'deduction' | 'employer_contribution' | 'info';

export interface SlipItem {
  id: string;
  slip_id: string;
  item_type: SlipItemType;
  code: string;
  description: string;
  quantity: number;
  amount: number;
  is_taxable: boolean;
  is_sgkable: boolean;
  order_index: number;
}

export interface PayrollSlip {
  id: string;
  tenant_id: string;
  run_id: string;
  employee_id: string;
  period_year: number;
  period_month: number;
  worked_days: number;
  base_salary_gross: number;
  overtime_gross: number;
  bonus_gross: number;
  allowance_gross: number;
  total_gross: number;
  sgk_employee: number;
  sgk_unemployment_emp: number;
  income_tax_base: number;
  income_tax: number;
  cumulative_tax_base: number;
  stamp_tax: number;
  sgk_employer: number;
  unemployment_employer: number;
  total_net: number;
  items?: SlipItem[];
  created_at: string;
  updated_at: string;
}

export interface SlipInput {
  employee_id: string;
  base_salary_gross: number;
  overtime_gross?: number;
  bonus_gross?: number;
  allowance_taxable?: number;
  allowance_exempt?: number;
  worked_days?: number;
  cumulative_tax_base?: number;
}

interface Listed<T> {
  items: T[];
  total?: number;
  page?: number;
  limit?: number;
}

/* ─── Periods ─── */

export function usePayrollPeriods(year?: number) {
  const qs = year ? `?year=${year}` : '';
  return useApiQuery<Listed<PayrollPeriod>>(
    ['bordro', 'periods', year ?? 'all'],
    `/api/v1/bordro/periods${qs}`,
  );
}

export function usePayrollPeriod(id: string | null | undefined) {
  return useApiQuery<PayrollPeriod>(
    ['bordro', 'period', id ?? ''],
    `/api/v1/bordro/periods/${id}`,
    { enabled: Boolean(id) },
  );
}

export function useCreatePeriod() {
  const qc = useQueryClient();
  return useApiMutation<
    PayrollPeriod,
    { period_year: number; period_month: number; pay_date?: string }
  >('/api/v1/bordro/periods', {
    method: 'POST',
    onSuccess: () => qc.invalidateQueries({ queryKey: ['bordro', 'periods'] }),
  });
}

export function useLockPeriod(id: string) {
  const qc = useQueryClient();
  return useApiMutation<PayrollPeriod, Record<string, never>>(
    `/api/v1/bordro/periods/${id}/lock`,
    {
      method: 'POST',
      onSuccess: () => qc.invalidateQueries({ queryKey: ['bordro', 'periods'] }),
    },
  );
}

/* ─── Runs ─── */

export function usePeriodRuns(periodId: string | null | undefined) {
  return useApiQuery<Listed<PayrollRun>>(
    ['bordro', 'runs', periodId ?? ''],
    `/api/v1/bordro/periods/${periodId}/runs`,
    { enabled: Boolean(periodId) },
  );
}

export function usePayrollRun(id: string | null | undefined) {
  return useApiQuery<PayrollRun>(
    ['bordro', 'run', id ?? ''],
    `/api/v1/bordro/runs/${id}`,
    { enabled: Boolean(id) },
  );
}

export function useCreateRun() {
  const qc = useQueryClient();
  return useApiMutation<PayrollRun, { period_id: string; run_type?: RunType; notes?: string }>(
    '/api/v1/bordro/runs',
    {
      method: 'POST',
      onSuccess: () => qc.invalidateQueries({ queryKey: ['bordro', 'runs'] }),
    },
  );
}

export function useCalculateRun(id: string) {
  const qc = useQueryClient();
  return useApiMutation<
    { run: PayrollRun; slips: PayrollSlip[] },
    { inputs: SlipInput[] }
  >(`/api/v1/bordro/runs/${id}/calculate`, {
    method: 'POST',
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['bordro', 'run', id] });
      qc.invalidateQueries({ queryKey: ['bordro', 'slips'] });
    },
  });
}

/**
 * Auto-calculate a run over every active employee whose compensation_records
 * carry a base_salary record effective on or before the period end.
 * No employee IDs or salaries need to be supplied by the caller.
 */
export function useCalculateAllActive(id: string) {
  const qc = useQueryClient();
  return useApiMutation<
    { run: PayrollRun; slips: PayrollSlip[]; employee_count: number },
    Record<string, never>
  >(`/api/v1/bordro/runs/${id}/calculate-all-active`, {
    method: 'POST',
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['bordro', 'run', id] });
      qc.invalidateQueries({ queryKey: ['bordro', 'slips'] });
    },
  });
}

export function useCalculateKamu(id: string) {
  const qc = useQueryClient();
  return useApiMutation<
    { run: PayrollRun; slips: PayrollSlip[]; employee_count: number; flavor: string },
    Record<string, never>
  >(`/api/v1/bordro/runs/${id}/calculate-kamu`, {
    method: 'POST',
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['bordro', 'run', id] });
      qc.invalidateQueries({ queryKey: ['bordro', 'slips'] });
    },
  });
}

export type OvertimeKind = 'weekday_normal' | 'weekend_holiday' | 'night' | 'fazla_sureli';
export type OvertimeEntry = { kind: OvertimeKind; hours: number };
export type ApplyOvertimePayload = {
  entries: OvertimeEntry[];
  cumulative_weekday_ytd?: number;
};

export function useApplyOvertime(runId: string, employeeId: string) {
  const qc = useQueryClient();
  return useApiMutation<{ slip: PayrollSlip }, ApplyOvertimePayload>(
    `/api/v1/bordro/runs/${runId}/employees/${employeeId}/overtime`,
    {
      method: 'POST',
      onSuccess: () => {
        qc.invalidateQueries({ queryKey: ['bordro', 'run', runId] });
        qc.invalidateQueries({ queryKey: ['bordro', 'slips'] });
      },
    },
  );
}

export function useApproveRun(id: string) {
  const qc = useQueryClient();
  return useApiMutation<PayrollRun, Record<string, never>>(
    `/api/v1/bordro/runs/${id}/approve`,
    {
      method: 'POST',
      onSuccess: () => {
        qc.invalidateQueries({ queryKey: ['bordro', 'run', id] });
        qc.invalidateQueries({ queryKey: ['bordro', 'runs'] });
      },
    },
  );
}

export function useFinaliseRun(id: string) {
  const qc = useQueryClient();
  return useApiMutation<PayrollRun, Record<string, never>>(
    `/api/v1/bordro/runs/${id}/finalise`,
    {
      method: 'POST',
      onSuccess: () => {
        qc.invalidateQueries({ queryKey: ['bordro', 'run', id] });
        qc.invalidateQueries({ queryKey: ['bordro', 'runs'] });
      },
    },
  );
}

export function useVoidRun(id: string) {
  const qc = useQueryClient();
  return useApiMutation<PayrollRun, Record<string, never>>(
    `/api/v1/bordro/runs/${id}/void`,
    {
      method: 'POST',
      onSuccess: () => {
        qc.invalidateQueries({ queryKey: ['bordro', 'run', id] });
        qc.invalidateQueries({ queryKey: ['bordro', 'runs'] });
      },
    },
  );
}

/* ─── Slips ─── */

export function useRunSlips(runId: string | null | undefined) {
  return useApiQuery<Listed<PayrollSlip>>(
    ['bordro', 'slips', 'run', runId ?? ''],
    `/api/v1/bordro/runs/${runId}/slips`,
    { enabled: Boolean(runId) },
  );
}

export function usePayrollSlip(id: string | null | undefined) {
  return useApiQuery<PayrollSlip>(
    ['bordro', 'slip', id ?? ''],
    `/api/v1/bordro/slips/${id}`,
    { enabled: Boolean(id) },
  );
}

export function useEmployeePayrollSlips(employeeId: string | null | undefined, year?: number) {
  const qs = year ? `?year=${year}` : '';
  return useApiQuery<Listed<PayrollSlip>>(
    ['bordro', 'slips', 'employee', employeeId ?? '', year ?? 'all'],
    `/api/v1/bordro/employees/${employeeId}/slips${qs}`,
    { enabled: Boolean(employeeId) },
  );
}

/* ─── Workplace (SGK İşyeri) ─── */

export interface SGKWorkplace {
  id: string;
  tenant_id: string;
  sicil_no: string;
  unvan: string;
  vergi_dairesi?: string | null;
  vergi_no: string;
  il?: string | null;
  ilce?: string | null;
  adres?: string | null;
  kanun_turu: string;
  is_active: boolean;
  ebildirge_kullanici_adi?: string | null;
  created_at: string;
  updated_at: string;
}

export interface WorkplaceInput {
  sicil_no: string;
  unvan: string;
  vergi_dairesi?: string;
  vergi_no: string;
  il?: string;
  ilce?: string;
  adres?: string;
  kanun_turu?: string;
  ebildirge_kullanici_adi?: string;
}

export function useSGKWorkplace() {
  return useApiQuery<SGKWorkplace>(
    ['bordro', 'workplace'],
    '/api/v1/bordro/workplace',
    { retry: false },
  );
}

export function useUpsertWorkplace() {
  const qc = useQueryClient();
  return useApiMutation<SGKWorkplace, WorkplaceInput>('/api/v1/bordro/workplace', {
    method: 'PUT',
    onSuccess: () => qc.invalidateQueries({ queryKey: ['bordro', 'workplace'] }),
  });
}

/* ─── Tenant bordro ayarları ─── */

export interface BordroSettings {
  id: string;
  tenant_id: string;
  hours_per_month: number;
  meal_daily_gross: number;
  meal_exempt_daily: number;
  transport_daily_gross: number;
  transport_exempt_daily: number;
  kidem_yearly_cap?: number | null;
  apply_min_wage_exemption: boolean;
  overtime_ytd_reset_month: number;
  created_at: string;
  updated_at: string;
}

export interface BordroSettingsInput {
  hours_per_month?: number;
  meal_daily_gross?: number;
  meal_exempt_daily?: number;
  transport_daily_gross?: number;
  transport_exempt_daily?: number;
  kidem_yearly_cap?: number;
  apply_min_wage_exemption?: boolean;
  overtime_ytd_reset_month?: number;
}

export function useBordroSettings() {
  return useApiQuery<BordroSettings>(
    ['bordro', 'settings'],
    '/api/v1/bordro/settings',
  );
}

export function useUpsertBordroSettings() {
  const qc = useQueryClient();
  return useApiMutation<BordroSettings, BordroSettingsInput>('/api/v1/bordro/settings', {
    method: 'PUT',
    onSuccess: () => qc.invalidateQueries({ queryKey: ['bordro', 'settings'] }),
  });
}

/* ─── SGK XML download (auto-build from run) ─── */

/**
 * Shared blob-download helper. POSTs to an auth+tenant-scoped endpoint and
 * triggers a browser file download from the response body.
 */
async function downloadBlob(
  path: string,
  token: string | null,
  tenantSlug: string | null,
  fallbackFilename: string,
): Promise<void> {
  const response = await fetch(apiUrl(path), {
    method: 'POST',
    headers: {
      Authorization: token ? `Bearer ${token}` : '',
      'X-Tenant-Slug': tenantSlug ?? '',
    },
  });
  if (!response.ok) {
    let detail = '';
    try {
      const body = await response.json();
      detail = body?.message ?? JSON.stringify(body);
    } catch {
      detail = await response.text();
    }
    throw new Error(`XML üretilemedi (${response.status}): ${detail}`);
  }
  const blob = await response.blob();
  const disposition = response.headers.get('content-disposition') ?? '';
  const match = disposition.match(/filename="?([^"]+)"?/i);
  const filename = match?.[1] ?? fallbackFilename;
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

/**
 * Triggers the browser to download an SGK APB XML produced from a given run.
 */
export function useDownloadAPBForRun() {
  const { getToken } = useAuth();
  const { tenant } = useTenant();
  return useMutation<void, Error, { runId: string }>({
    mutationFn: async ({ runId }) => {
      const token = await getToken({ template: 'upcore' });
      await downloadBlob(
        `/api/v1/bordro/runs/${runId}/sgk/apb`,
        token,
        tenant?.slug ?? null,
        `APB_${runId}.xml`,
      );
    },
  });
}

export type BankFormat =
  | 'ing'
  | 'garanti'
  | 'isbank'
  | 'teb'
  | 'yapikredi'
  | 'generic';

/**
 * Downloads the batch bank transfer file for a payroll run. Returns the file
 * name produced by the backend so UI can toast it (e.g. "ing_maas_2026-04.csv").
 */
export function useDownloadBankTransfer() {
  const { getToken } = useAuth();
  const { tenant } = useTenant();
  return useMutation<
    void,
    Error,
    { runId: string; format: BankFormat; senderIban: string; valueDate?: string }
  >({
    mutationFn: async ({ runId, format, senderIban, valueDate }) => {
      const token = await getToken({ template: 'upcore' });
      const qs = new URLSearchParams({ format, sender_iban: senderIban });
      if (valueDate) qs.set('value_date', valueDate);
      const ext = format === 'garanti' ? 'txt' : 'csv';
      await downloadBlob(
        `/api/v1/bordro/runs/${runId}/bank-transfer?${qs.toString()}`,
        token,
        tenant?.slug ?? null,
        `banka_maas_${format}_${runId}.${ext}`,
      );
    },
  });
}

/**
 * Downloads the İşe Giriş Bildirgesi (İGB) XML for a specific employee.
 * Requires the employee to have a non-null `sgk_ise_giris_tarihi` + TCKN.
 */
export function useDownloadIGBForEmployee() {
  const { getToken } = useAuth();
  const { tenant } = useTenant();
  return useMutation<void, Error, { employeeId: string }>({
    mutationFn: async ({ employeeId }) => {
      const token = await getToken({ template: 'upcore' });
      await downloadBlob(
        `/api/v1/bordro/employees/${employeeId}/sgk/igb`,
        token,
        tenant?.slug ?? null,
        `IGB_${employeeId}.xml`,
      );
    },
  });
}
