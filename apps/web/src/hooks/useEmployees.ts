'use client';

import { useAuth } from '@clerk/nextjs';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiFetch } from '@/lib/api-client';
import type {
  ApiEmployee,
  EmployeeListResponse,
  CreateEmployeeRequest,
  EmployeeView,
} from '@/lib/employee-mapper';
import { mapApiToView, mapManyToView } from '@/lib/employee-mapper';

// ============================================================================
// Employee API Hooks — gateway üzerinden Clerk JWT'li canlı bağlantı.
// DEV_HEADERS hack'i yerine gerçek auth akışı.
// ============================================================================

export interface EmployeeQueryParams {
  page?: number;
  limit?: number;
  search?: string;
  department_id?: string;
  employment_status?: string;
  sort?: string; // örn: "ad:asc" veya "hire_date:desc"
}

export interface EmployeePageData {
  items: EmployeeView[];
  total: number;
  page: number;
  limit: number;
}

/**
 * Çalışan listesi — server-side pagination + sort + filter + search.
 * React Query `keepPreviousData` ile sayfa değiştirirken flicker yok.
 */
export function useEmployees(params: EmployeeQueryParams = {}) {
  const { getToken } = useAuth();

  const query = new URLSearchParams();
  if (params.page) query.set('page', String(params.page));
  if (params.limit) query.set('limit', String(params.limit));
  if (params.search) query.set('search', params.search);
  if (params.department_id) query.set('department_id', params.department_id);
  if (params.employment_status) query.set('employment_status', params.employment_status);
  if (params.sort) query.set('sort', params.sort);

  return useQuery<EmployeePageData, Error>({
    queryKey: ['employees', 'list', params],
    placeholderData: (previous) => previous,
    staleTime: 60_000,
    queryFn: async () => {
      const token = await getToken({ template: 'upcore' });
      const raw = await apiFetch<EmployeeListResponse>(
        `/api/v1/employees?${query.toString()}`,
        { method: 'GET', token },
      );
      return {
        items: mapManyToView(raw.items ?? []),
        total: raw.total ?? raw.items?.length ?? 0,
        page: raw.page ?? params.page ?? 1,
        limit: raw.limit ?? params.limit ?? 20,
      };
    },
  });
}

/** Tek çalışan detayı. */
export function useEmployee(id: string | null | undefined) {
  const { getToken } = useAuth();

  return useQuery<EmployeeView, Error>({
    queryKey: ['employees', 'detail', id],
    enabled: !!id,
    staleTime: 60_000,
    queryFn: async () => {
      const token = await getToken({ template: 'upcore' });
      const raw = await apiFetch<ApiEmployee>(`/api/v1/employees/${id}`, {
        method: 'GET',
        token,
      });
      return mapApiToView(raw);
    },
  });
}

/** Yeni çalışan oluşturma mutation'ı. */
export function useCreateEmployee() {
  const { getToken } = useAuth();
  const qc = useQueryClient();

  return useMutation<ApiEmployee, Error, CreateEmployeeRequest>({
    mutationFn: async (vars) => {
      const token = await getToken({ template: 'upcore' });
      return apiFetch<ApiEmployee>('/api/v1/employees', {
        method: 'POST',
        body: vars,
        token,
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['employees', 'list'] });
    },
  });
}

/** Çalışan güncelleme mutation'ı. */
export function useUpdateEmployee(id: string) {
  const { getToken } = useAuth();
  const qc = useQueryClient();

  return useMutation<ApiEmployee, Error, Partial<CreateEmployeeRequest>>({
    mutationFn: async (patch) => {
      const token = await getToken({ template: 'upcore' });
      return apiFetch<ApiEmployee>(`/api/v1/employees/${id}`, {
        method: 'PATCH',
        body: patch,
        token,
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['employees', 'detail', id] });
      qc.invalidateQueries({ queryKey: ['employees', 'list'] });
    },
  });
}

/** Çalışan soft-delete. */
export function useDeleteEmployee() {
  const { getToken } = useAuth();
  const qc = useQueryClient();

  return useMutation<void, Error, string>({
    mutationFn: async (id) => {
      const token = await getToken({ template: 'upcore' });
      await apiFetch<unknown>(`/api/v1/employees/${id}`, {
        method: 'DELETE',
        token,
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['employees', 'list'] });
    },
  });
}

// ---------------------------------------------------------------------------
// Bulk CSV Import — multipart/form-data POST
// ---------------------------------------------------------------------------

export interface ImportRowError {
  row: number;
  column?: string;
  message: string;
  value?: string;
}

export interface ImportResult {
  total: number;
  imported: number;
  skipped: number;
  errors: ImportRowError[];
  duration_ms: number;
  started_at: string;
}

/** CSV dosyası yükleyip backend'e gönder. Paraşüt uyumlu kolon sırası. */
export function useImportEmployees() {
  const { getToken } = useAuth();
  const qc = useQueryClient();

  return useMutation<ImportResult, Error, File>({
    mutationFn: async (file) => {
      const token = await getToken({ template: 'upcore' });
      const formData = new FormData();
      formData.append('file', file);

      const apiUrl = process.env['NEXT_PUBLIC_API_URL'] ?? 'http://localhost:8080';
      const res = await fetch(`${apiUrl}/api/v1/employees/import`, {
        method: 'POST',
        headers: {
          Authorization: token ? `Bearer ${token}` : '',
        },
        body: formData,
      });

      const contentType = res.headers.get('content-type') ?? '';
      const isJson = contentType.includes('application/json');
      const payload: unknown = isJson ? await res.json() : await res.text();

      if (!res.ok) {
        const message =
          isJson && typeof payload === 'object' && payload !== null && 'message' in payload
            ? String((payload as { message: unknown }).message)
            : `Import başarısız (${res.status})`;
        throw new Error(message);
      }
      return payload as ImportResult;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['employees', 'list'] });
    },
  });
}

/** Çalışan autocomplete — isim/email/sicil üzerinden arama. */
export interface EmployeeSearchResult {
  id: string;
  ad: string;
  soyad: string;
  employee_no?: string;
  email_is?: string | null;
  department_name?: string;
  position_name?: string;
}

export function useEmployeeSearch(query: string, limit = 10) {
  const { getToken } = useAuth();
  const trimmed = query.trim();

  return useQuery<EmployeeSearchResult[], Error>({
    queryKey: ['employees', 'search', trimmed, limit],
    enabled: trimmed.length >= 2,
    staleTime: 10_000,
    queryFn: async () => {
      const token = await getToken({ template: 'upcore' });
      const res = await apiFetch<{ items: EmployeeSearchResult[] }>(
        `/api/v1/employees/search?q=${encodeURIComponent(trimmed)}&limit=${limit}`,
        { method: 'GET', token },
      );
      return res.items ?? [];
    },
  });
}

/** Emaile göre çalışan var mı kontrolü (form blur'da kullanılır). */
export async function checkEmailExists(
  email: string,
  getToken: () => Promise<string | null>,
): Promise<boolean> {
  if (!email) return false;
  const token = await getToken();
  try {
    const res = await apiFetch<{ exists?: boolean; total?: number }>(
      `/api/v1/employees/search?email=${encodeURIComponent(email)}&limit=1`,
      { method: 'GET', token },
    );
    if (typeof res.total === 'number') return res.total > 0;
    return Boolean(res.exists);
  } catch {
    return false;
  }
}
