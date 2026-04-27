'use client';

import { useAuth } from '@clerk/nextjs';
import { useQuery } from '@tanstack/react-query';
import { apiFetch } from '@/lib/api-client';

// ============================================================================
// Burnout Dashboard Hooks — burnout-prediction servisinin dashboard endpoints'i
// Gateway: /api/v1/burnout/* → burnout-prediction:8022
// ============================================================================

export type BurnoutBand = 'green' | 'amber' | 'red' | 'na';

export interface HeatmapCell {
  department_id: string | null;
  department_name: string;
  week_start: string; // ISO date
  avg_score: number | null;
  respondent_count: number;
  band: BurnoutBand;
}

export interface HeatmapStats {
  avg_total: number | null;
  red_count: number;
  amber_count: number;
  green_count: number;
  total_employees: number;
}

export interface HeatmapResponse {
  weeks: number;
  generated_at: string;
  cells: HeatmapCell[];
  stats: HeatmapStats;
}

/** Departman × hafta heatmap — BAT-TR ortalamaları, renk kodlu. */
export function useBurnoutHeatmap(weeks: number = 4) {
  const { getToken } = useAuth();

  return useQuery<HeatmapResponse, Error>({
    queryKey: ['burnout', 'heatmap', weeks],
    staleTime: 2 * 60_000,
    queryFn: async () => {
      const token = await getToken({ template: 'upcore' });
      return apiFetch<HeatmapResponse>(`/api/v1/burnout/heatmap?weeks=${weeks}`, {
        method: 'GET',
        token,
      });
    },
  });
}

export interface CriticalEmployee {
  employee_id: string;
  employee_no: string | null;
  ad: string;
  soyad: string;
  department_id: string | null;
  department_name: string | null;
  score: number;
  band: 'amber' | 'red';
  last_measured_at: string;
}

export interface CriticalListResponse {
  total: number;
  items: CriticalEmployee[];
}

// ──────────────────────────────────────────────────────────────────────────
// Bireysel çalışan detayı
// ──────────────────────────────────────────────────────────────────────────

export interface SubscaleScore {
  key: string;
  label_tr: string;
  score: number | null;
  band: BurnoutBand;
}

export interface JDRDimension {
  key: string;
  label_tr: string;
  score: number | null; // 0-100 normalize
}

export interface JDRBalance {
  demands: JDRDimension[];
  resources: JDRDimension[];
  demand_avg: number | null;
  resource_avg: number | null;
  balance_gap: number | null; // pozitif = talep kaynağı aşıyor
}

export interface TrendPoint {
  week_start: string;
  score: number | null;
}

export interface EmployeeBurnoutResponse {
  employee_id: string;
  has_data: boolean;
  bat_total: number | null;
  bat_band: BurnoutBand;
  norm_percentile: number | null;
  last_measured_at: string | null;
  subscales: SubscaleScore[];
  jdr: JDRBalance | null;
  trend: TrendPoint[];
}

/** Bir çalışanın BAT-12-TR + JD-R breakdown'u. */
export function useEmployeeBurnout(employeeId: string | null | undefined) {
  const { getToken } = useAuth();

  return useQuery<EmployeeBurnoutResponse, Error>({
    queryKey: ['burnout', 'employee', employeeId],
    enabled: !!employeeId,
    staleTime: 5 * 60_000,
    queryFn: async () => {
      const token = await getToken({ template: 'upcore' });
      return apiFetch<EmployeeBurnoutResponse>(
        `/api/v1/burnout/employee/${employeeId}`,
        { method: 'GET', token },
      );
    },
  });
}

/** En yüksek riskli N çalışan — amber+red bandında. */
export function useCriticalEmployees(limit: number = 10) {
  const { getToken } = useAuth();

  return useQuery<CriticalListResponse, Error>({
    queryKey: ['burnout', 'critical', limit],
    staleTime: 2 * 60_000,
    queryFn: async () => {
      const token = await getToken({ template: 'upcore' });
      return apiFetch<CriticalListResponse>(`/api/v1/burnout/critical?limit=${limit}`, {
        method: 'GET',
        token,
      });
    },
  });
}
