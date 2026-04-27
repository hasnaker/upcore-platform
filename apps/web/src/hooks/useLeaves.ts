'use client';

import { useAuth } from '@clerk/nextjs';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiFetch } from '@/lib/api-client';

// ============================================================================
// Leave hooks — gateway /api/v1/leaves/*
// ============================================================================

export type LeaveStatus = 'pending' | 'approved' | 'rejected' | 'cancelled';

export const LEAVE_STATUS_LABEL: Record<LeaveStatus, string> = {
  pending: 'Onay Bekliyor',
  approved: 'Onaylandı',
  rejected: 'Reddedildi',
  cancelled: 'İptal Edildi',
};

export const LEAVE_STATUS_CLASS: Record<LeaveStatus, string> = {
  pending: 'bg-amber-soft text-amber',
  approved: 'bg-green-soft text-green',
  rejected: 'bg-red-soft text-red',
  cancelled: 'bg-bg-3 text-ink-40',
};

export interface LeaveType {
  id: string;
  code: string;
  name_tr: string;
  category: string;
  is_paid: boolean;
  requires_document: boolean;
}

export interface LeaveRequest {
  id: string;
  employee_id: string;
  leave_type_id: string;
  start_date: string;
  end_date: string;
  start_half_day: boolean;
  end_half_day: boolean;
  total_days: number;
  reason?: string | null;
  status: LeaveStatus;
  requested_at: string;
  approved_by?: string | null;
  approved_at?: string | null;
  rejected_reason?: string | null;
}

export interface LeaveBalance {
  id: string;
  employee_id: string;
  leave_type_id: string;
  year: number;
  accrued_days: number;
  used_days: number;
  pending_days: number;
  carried_over: number;
  remaining_days: number;
}

/** Aktif izin tiplerini listele (dropdown için). */
export function useLeaveTypes() {
  const { getToken } = useAuth();

  return useQuery<LeaveType[], Error>({
    queryKey: ['leaves', 'types'],
    staleTime: 30 * 60_000,
    queryFn: async () => {
      const token = await getToken({ template: 'upcore' });
      const raw = await apiFetch<
        { items: LeaveType[]; total: number } | LeaveType[]
      >('/api/v1/leaves/types', { method: 'GET', token });
      if (Array.isArray(raw)) return raw;
      return raw.items ?? [];
    },
  });
}

/** İzin talepleri listesi (HR view — tüm talepler). */
export function useLeaveRequests(params: { status?: LeaveStatus; limit?: number } = {}) {
  const { getToken } = useAuth();
  const q = new URLSearchParams();
  if (params.status) q.set('status', params.status);
  if (params.limit) q.set('limit', String(params.limit));

  return useQuery<{ items: LeaveRequest[]; total: number }, Error>({
    queryKey: ['leaves', 'requests', params],
    staleTime: 60_000,
    queryFn: async () => {
      const token = await getToken({ template: 'upcore' });
      return apiFetch<{ items: LeaveRequest[]; total: number }>(
        `/api/v1/leaves/requests?${q.toString()}`,
        { method: 'GET', token },
      );
    },
  });
}

/** Bir çalışanın izin bakiyesi. */
export function useLeaveBalance(employeeId: string | null | undefined) {
  const { getToken } = useAuth();

  return useQuery<{ balances: LeaveBalance[] }, Error>({
    queryKey: ['leaves', 'balance', employeeId],
    enabled: !!employeeId,
    staleTime: 5 * 60_000,
    queryFn: async () => {
      const token = await getToken({ template: 'upcore' });
      const raw = await apiFetch<
        { balances: LeaveBalance[] } | LeaveBalance[] | { items: LeaveBalance[] }
      >(`/api/v1/leaves/balances/${employeeId}`, { method: 'GET', token });
      if (Array.isArray(raw)) return { balances: raw };
      if ('balances' in raw) return raw;
      return { balances: raw.items ?? [] };
    },
  });
}

export interface CreateLeaveRequestInput {
  employee_id: string;
  leave_type_id: string;
  start_date: string;
  end_date: string;
  start_half_day?: boolean;
  end_half_day?: boolean;
  reason?: string;
}

export function useCreateLeaveRequest() {
  const { getToken } = useAuth();
  const qc = useQueryClient();

  return useMutation<LeaveRequest, Error, CreateLeaveRequestInput>({
    mutationFn: async (input) => {
      const token = await getToken({ template: 'upcore' });
      return apiFetch<LeaveRequest>('/api/v1/leaves/requests', {
        method: 'POST',
        body: input,
        token,
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['leaves'] });
    },
  });
}

export function useApproveLeave() {
  const { getToken } = useAuth();
  const qc = useQueryClient();

  return useMutation<LeaveRequest, Error, { id: string; notes?: string }>({
    mutationFn: async ({ id, notes }) => {
      const token = await getToken({ template: 'upcore' });
      return apiFetch<LeaveRequest>(`/api/v1/leaves/requests/${id}/approve`, {
        method: 'POST',
        body: { notes },
        token,
      });
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['leaves'] }),
  });
}

export function useRejectLeave() {
  const { getToken } = useAuth();
  const qc = useQueryClient();

  return useMutation<LeaveRequest, Error, { id: string; reason: string }>({
    mutationFn: async ({ id, reason }) => {
      const token = await getToken({ template: 'upcore' });
      return apiFetch<LeaveRequest>(`/api/v1/leaves/requests/${id}/reject`, {
        method: 'POST',
        body: { rejected_reason: reason },
        token,
      });
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['leaves'] }),
  });
}
