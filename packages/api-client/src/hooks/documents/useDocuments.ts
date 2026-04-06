/**
 * Document query and mutation hooks.
 */
'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useApiClient } from '../../provider/ApiProvider';
import { queryKeys } from '../../keys/query-keys';
import { buildSearchParams } from '../../client/fetcher';
import type { UpcoreApiError } from '../../client/error';
import type { PaginatedResponse } from '../../client/types';

interface Document {
  id: string;
  tenantId: string;
  employeeId: string | null;
  type: string;
  title: string;
  description: string;
  currentVersionId: string | null;
  tags: string[];
  isConfidential: boolean;
  expiresAt: string | null;
  metadata: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

interface DocumentListQuery {
  page?: number;
  pageSize?: number;
  employeeId?: string;
  type?: string;
  search?: string;
  tags?: string;
}

interface UploadDocumentRequest {
  file: File;
  title: string;
  type: string;
  employeeId?: string;
  description?: string;
  tags?: string[];
  isConfidential?: boolean;
}

interface DownloadUrlResponse {
  url: string;
  expiresAt: string;
}

/**
 * Fetches documents with filters.
 */
export const useDocuments = (filters: DocumentListQuery = {}) => {
  const api = useApiClient();

  return useQuery<PaginatedResponse<Document>, UpcoreApiError>({
    queryKey: queryKeys.documents.list(filters),
    queryFn: async () => {
      const params = buildSearchParams(filters as Record<string, string | number | boolean | undefined>);
      return api.get(`documents${params}`).json<PaginatedResponse<Document>>();
    },
  });
};

/**
 * Uploads a document.
 */
export const useUploadDocument = () => {
  const api = useApiClient();
  const queryClient = useQueryClient();

  return useMutation<Document, UpcoreApiError, UploadDocumentRequest>({
    mutationFn: async ({ file, title, type, employeeId, description, tags, isConfidential }) => {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('title', title);
      formData.append('type', type);
      if (employeeId) formData.append('employeeId', employeeId);
      if (description) formData.append('description', description);
      if (tags) formData.append('tags', JSON.stringify(tags));
      if (isConfidential !== undefined) formData.append('isConfidential', String(isConfidential));

      return api.post('documents', { body: formData }).json<Document>();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.documents.all() });
    },
  });
};

/**
 * Gets a signed download URL for a document.
 */
export const useDocumentDownloadUrl = (id: string) => {
  const api = useApiClient();

  return useQuery<DownloadUrlResponse, UpcoreApiError>({
    queryKey: queryKeys.documents.downloadUrl(id),
    queryFn: async () => {
      return api.get(`documents/${id}/download-url`).json<DownloadUrlResponse>();
    },
    enabled: !!id,
    staleTime: 4 * 60 * 1000, // URLs expire, refetch before that
  });
};
