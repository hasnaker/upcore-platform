/**
 * Employee mutation hooks — create, update, terminate, bulk import.
 *
 * Features:
 *   - Optimistic updates for useUpdateEmployee (snapshot + rollback)
 *   - Automatic list invalidation on all mutations
 */
'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useApiClient } from '../../provider/ApiProvider';
import { queryKeys } from '../../keys/query-keys';
import type { UpcoreApiError } from '../../client/error';

interface Employee {
  id: string;
  [key: string]: unknown;
}

interface CreateEmployeeRequest {
  tenantId: string;
  sicilNo: string;
  firstName: string;
  lastName: string;
  email: string;
  employmentStatus: string;
  contractType: string;
  hireDate: string;
  [key: string]: unknown;
}

interface UpdateEmployeeRequest {
  [key: string]: unknown;
}

interface BulkImportResult {
  totalRows: number;
  successCount: number;
  errorCount: number;
  errors: Array<{ row: number; field: string | null; message: string }>;
}

/**
 * Creates a new employee.
 */
export const useCreateEmployee = () => {
  const api = useApiClient();
  const queryClient = useQueryClient();

  return useMutation<Employee, UpcoreApiError, CreateEmployeeRequest>({
    mutationFn: async (data) => {
      return api.post('employees', { json: data }).json<Employee>();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.employees.all() });
    },
  });
};

/**
 * Updates an existing employee with optimistic updates.
 *
 * On mutation start, the detail cache is optimistically updated.
 * On error, the previous state is restored (rollback).
 */
export const useUpdateEmployee = () => {
  const api = useApiClient();
  const queryClient = useQueryClient();

  return useMutation<
    Employee,
    UpcoreApiError,
    { id: string; data: UpdateEmployeeRequest },
    { previousEmployee: Employee | undefined }
  >({
    mutationFn: async ({ id, data }) => {
      return api.patch(`employees/${id}`, { json: data }).json<Employee>();
    },
    onMutate: async ({ id, data }) => {
      // Cancel any in-flight queries for this employee
      await queryClient.cancelQueries({
        queryKey: queryKeys.employees.detail(id),
      });

      // Snapshot previous value
      const previousEmployee = queryClient.getQueryData<Employee>(
        queryKeys.employees.detail(id),
      );

      // Optimistically update
      if (previousEmployee) {
        queryClient.setQueryData(queryKeys.employees.detail(id), {
          ...previousEmployee,
          ...data,
        });
      }

      return { previousEmployee };
    },
    onError: (_err, { id }, context) => {
      // Rollback to previous state
      if (context?.previousEmployee) {
        queryClient.setQueryData(
          queryKeys.employees.detail(id),
          context.previousEmployee,
        );
      }
    },
    onSettled: (_data, _err, { id }) => {
      // Always refetch to ensure consistency
      queryClient.invalidateQueries({
        queryKey: queryKeys.employees.detail(id),
      });
      queryClient.invalidateQueries({
        queryKey: queryKeys.employees.all(),
      });
    },
  });
};

/**
 * Terminates an employee.
 */
export const useTerminateEmployee = () => {
  const api = useApiClient();
  const queryClient = useQueryClient();

  return useMutation<
    void,
    UpcoreApiError,
    { id: string; date: string; reason: string }
  >({
    mutationFn: async ({ id, date, reason }) => {
      await api.post(`employees/${id}/terminate`, {
        json: { date, reason },
      });
    },
    onSuccess: (_data, { id }) => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.employees.detail(id),
      });
      queryClient.invalidateQueries({
        queryKey: queryKeys.employees.all(),
      });
    },
  });
};

/**
 * Bulk imports employees from a CSV file.
 */
export const useBulkImportEmployees = () => {
  const api = useApiClient();
  const queryClient = useQueryClient();

  return useMutation<BulkImportResult, UpcoreApiError, File>({
    mutationFn: async (file) => {
      const formData = new FormData();
      formData.append('file', file);

      return api
        .post('employees/bulk-import', { body: formData })
        .json<BulkImportResult>();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.employees.all() });
    },
  });
};

/**
 * Deletes an employee (soft delete).
 */
export const useDeleteEmployee = () => {
  const api = useApiClient();
  const queryClient = useQueryClient();

  return useMutation<void, UpcoreApiError, string>({
    mutationFn: async (id) => {
      await api.delete(`employees/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.employees.all() });
    },
  });
};
