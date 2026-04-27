'use client';

import { useAuth } from '@clerk/nextjs';
import { useQuery } from '@tanstack/react-query';
import { apiFetch } from '@/lib/api-client';

export interface Department {
  id: string;
  tenant_id: string;
  name_tr: string;
  name_en: string | null;
  parent_id: string | null;
  manager_id: string | null;
  level: number | null;
  path: string | null;
  employee_count?: number;
  created_at: string;
  updated_at: string;
}

export interface DepartmentTreeNode extends Department {
  children: DepartmentTreeNode[];
}

interface DepartmentListResponse {
  items: Department[];
  total: number;
}

/** Düz departman listesi (dropdown / filter için). */
export function useDepartments() {
  const { getToken } = useAuth();

  return useQuery<Department[], Error>({
    queryKey: ['departments', 'list'],
    staleTime: 5 * 60_000,
    queryFn: async () => {
      const token = await getToken({ template: 'upcore' });
      const raw = await apiFetch<DepartmentListResponse>('/api/v1/departments?limit=500', {
        method: 'GET',
        token,
      });
      return raw.items ?? [];
    },
  });
}

/** Ağaç yapısı (org chart için) — backend doğrudan nested döner. */
export function useDepartmentsTree() {
  const { getToken } = useAuth();

  return useQuery<DepartmentTreeNode[], Error>({
    queryKey: ['departments', 'tree'],
    staleTime: 5 * 60_000,
    queryFn: async () => {
      const token = await getToken({ template: 'upcore' });
      const raw = await apiFetch<
        { roots?: DepartmentTreeNode[]; tree?: DepartmentTreeNode[] } | DepartmentTreeNode[]
      >('/api/v1/departments/tree', { method: 'GET', token });
      if (Array.isArray(raw)) return raw;
      return raw.roots ?? raw.tree ?? [];
    },
  });
}

/** Pozisyon listesi — çalışan ekleme formunda pozisyon dropdown'u için. */
export interface Position {
  id: string;
  tenant_id: string;
  title_tr: string;
  title_en: string | null;
  department_id: string | null;
  level: string | null;
  created_at: string;
}

export function usePositions(departmentId?: string | null) {
  const { getToken } = useAuth();

  const query = new URLSearchParams();
  query.set('limit', '500');
  if (departmentId) query.set('department_id', departmentId);

  return useQuery<Position[], Error>({
    queryKey: ['positions', 'list', departmentId ?? 'all'],
    staleTime: 5 * 60_000,
    queryFn: async () => {
      const token = await getToken({ template: 'upcore' });
      const raw = await apiFetch<{ items: Position[]; total: number }>(
        `/api/v1/positions?${query.toString()}`,
        { method: 'GET', token },
      );
      return raw.items ?? [];
    },
  });
}
