'use client';

import { useAuth } from '@clerk/nextjs';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiFetch } from '@/lib/api-client';

// ============================================================================
// Document hooks — gateway /api/v1/documents/*
// ============================================================================

export type DocCategory =
  | 'contract'
  | 'id_card'
  | 'diploma'
  | 'certificate'
  | 'performance_review'
  | 'payslip'
  | 'disciplinary'
  | 'medical'
  | 'other';

export const DOC_CATEGORY_LABEL: Record<DocCategory, string> = {
  contract: 'Sözleşme',
  id_card: 'Kimlik',
  diploma: 'Diploma',
  certificate: 'Sertifika',
  performance_review: 'Performans Değerlendirme',
  payslip: 'Bordro',
  disciplinary: 'Disiplin',
  medical: 'Sağlık',
  other: 'Diğer',
};

export interface UpcoreDocument {
  id: string;
  tenant_id: string;
  owner_employee_id?: string | null;
  owner_user_id?: string | null;
  category: DocCategory;
  title: string;
  description?: string | null;
  current_version: number;
  tags: string[];
  is_confidential: boolean;
  retention_until?: string | null;
  signed_at?: string | null;
  signed_by?: string | null;
  created_at: string;
  updated_at: string;
}

export function useDocuments(
  params: { category?: DocCategory; owner_employee_id?: string; limit?: number } = {},
) {
  const { getToken } = useAuth();
  const q = new URLSearchParams();
  if (params.category) q.set('category', params.category);
  if (params.owner_employee_id) q.set('owner_employee_id', params.owner_employee_id);
  if (params.limit) q.set('limit', String(params.limit));

  return useQuery<{ items: UpcoreDocument[]; total: number }, Error>({
    queryKey: ['documents', 'list', params],
    staleTime: 60_000,
    queryFn: async () => {
      const token = await getToken({ template: 'upcore' });
      return apiFetch<{ items: UpcoreDocument[]; total: number }>(
        `/api/v1/documents?${q.toString()}`,
        { method: 'GET', token },
      );
    },
  });
}

export interface UploadDocVars {
  file: File;
  title: string;
  category: DocCategory;
  owner_employee_id?: string;
  description?: string;
  is_confidential?: boolean;
}

export function useUploadDocument() {
  const { getToken } = useAuth();
  const qc = useQueryClient();

  return useMutation<UpcoreDocument, Error, UploadDocVars>({
    mutationFn: async (vars) => {
      const token = await getToken({ template: 'upcore' });
      const fd = new FormData();
      fd.append('file', vars.file);
      fd.append('title', vars.title);
      fd.append('category', vars.category);
      if (vars.owner_employee_id) fd.append('owner_employee_id', vars.owner_employee_id);
      if (vars.description) fd.append('description', vars.description);
      if (vars.is_confidential) fd.append('is_confidential', 'true');

      const apiUrl = process.env['NEXT_PUBLIC_API_URL'] ?? 'http://localhost:8080';
      const res = await fetch(`${apiUrl}/api/v1/documents`, {
        method: 'POST',
        headers: { Authorization: token ? `Bearer ${token}` : '' },
        body: fd,
      });
      if (!res.ok) {
        const payload = await res.json().catch(() => ({}));
        throw new Error(payload?.message ?? `Yükleme başarısız (${res.status})`);
      }
      return res.json() as Promise<UpcoreDocument>;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['documents'] }),
  });
}

/** Download URL alır (backend signed URL üretir). */
export async function getDownloadURL(
  documentId: string,
  getToken: () => Promise<string | null>,
): Promise<string> {
  const token = await getToken();
  const res = await apiFetch<{ url: string; expires_at: string } | { download_url: string }>(
    `/api/v1/documents/${documentId}/download`,
    { method: 'GET', token },
  );
  if ('url' in res) return res.url;
  return res.download_url;
}

export function useDeleteDocument() {
  const { getToken } = useAuth();
  const qc = useQueryClient();

  return useMutation<void, Error, string>({
    mutationFn: async (id) => {
      const token = await getToken({ template: 'upcore' });
      await apiFetch<unknown>(`/api/v1/documents/${id}`, { method: 'DELETE', token });
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['documents'] }),
  });
}
