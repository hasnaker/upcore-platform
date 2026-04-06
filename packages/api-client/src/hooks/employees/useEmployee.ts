/**
 * Single employee detail hook.
 */
'use client';

import { useQuery } from '@tanstack/react-query';
import { useApiClient } from '../../provider/ApiProvider';
import { queryKeys } from '../../keys/query-keys';
import type { UpcoreApiError } from '../../client/error';

interface Employee {
  id: string;
  tenantId: string;
  userId: string | null;
  sicilNo: string;
  tckn: string | null;
  firstName: string;
  lastName: string;
  preferredName: string | null;
  email: string;
  phone: string | null;
  birthDate: string | null;
  gender: string | null;
  nationality: string;
  maritalStatus: string | null;
  departmentId: string | null;
  positionId: string | null;
  managerId: string | null;
  employmentStatus: string;
  contractType: string;
  hireDate: string;
  terminationDate: string | null;
  probationEndDate: string | null;
  avatarUrl: string | null;
  kvkkConsentAt: string | null;
  iban: string | null;
  address: {
    line1: string;
    line2: string | null;
    city: string;
    district: string;
    postcode: string;
    country: string;
  } | null;
  metadata: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
}

/**
 * Fetches a single employee by ID.
 *
 * @param id - Employee ID (UUID)
 */
export const useEmployee = (id: string) => {
  const api = useApiClient();

  return useQuery<Employee, UpcoreApiError>({
    queryKey: queryKeys.employees.detail(id),
    queryFn: async () => {
      return api.get(`employees/${id}`).json<Employee>();
    },
    enabled: !!id,
  });
};
