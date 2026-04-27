// Shared types for the Tenants admin page.
// Kept colocated in _components so the page shell can remain a thin composition.

export type TenantStatus = 'trial' | 'active' | 'suspended' | 'deleted';

export interface AdminTenantRow {
  id: string;
  name: string;
  slug: string;
  country: string;
  locale: string;
  status: TenantStatus;
  trial_ends_at: string | null;
  created_at: string;
  updated_at: string;
  plan_id: string | null;
  subscription_status: string | null;
  seats: number | null;
  employee_count: number;
}

export interface AdminTenantListResponse {
  items: AdminTenantRow[];
  total: number;
  page: number;
  page_size: number;
  has_more: boolean;
}

export type StatusFilter = 'all' | TenantStatus;

export const PAGE_SIZE = 20;

export const STATUS_LABEL: Record<TenantStatus, string> = {
  trial: 'Deneme',
  active: 'Aktif',
  suspended: 'Askıya alındı',
  deleted: 'Silindi',
};

export const STATUS_TONE: Record<
  TenantStatus,
  'success' | 'warning' | 'accent' | 'danger'
> = {
  active: 'success',
  trial: 'accent',
  suspended: 'warning',
  deleted: 'danger',
};

export function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString('tr-TR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  } catch {
    return iso;
  }
}
