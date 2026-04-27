'use client';

// Platform-admin "Tenants" page — thin composition shell.
//
// The page used to be a 772-line god-component. It is now split into
// focused components under ./_components:
//
//   - TenantsList.tsx        (table + pagination)
//   - TenantFilters.tsx      (search + status tabs)
//   - TenantRow.tsx          (single row)
//   - TenantActionsMenu.tsx  (per-row dropdown)
//   - ImpersonateDialog.tsx  (confirmation for impersonation)
//   - StatusChangeDialog.tsx (suspend + activate dialogs)
//   - StatCard.tsx           (top-of-page metrics)
//   - types.ts / api.ts      (shared types + fetch helpers)
//
// Keep this file focused on state wiring only.

import { useMemo, useState } from 'react';
import {
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';
import { toast } from 'sonner';
import { Building2, ShieldCheck, TrendingUp, UserCheck } from 'lucide-react';
import { AdminShell } from '@/components/AdminShell';

import { ImpersonateDialog } from './_components/ImpersonateDialog';
import { StatCard } from './_components/StatCard';
import {
  ActivateDialog,
  SuspendDialog,
} from './_components/StatusChangeDialog';
import { TenantFilters } from './_components/TenantFilters';
import { TenantsList } from './_components/TenantsList';
import {
  changeTenantStatus,
  fetchTenants,
  startImpersonation,
} from './_components/api';
import {
  PAGE_SIZE,
  type AdminTenantListResponse,
  type AdminTenantRow,
  type StatusFilter,
} from './_components/types';

export default function TenantsPage() {
  const queryClient = useQueryClient();

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [page, setPage] = useState(1);

  const [suspendDialog, setSuspendDialog] = useState<AdminTenantRow | null>(
    null,
  );
  const [activateDialog, setActivateDialog] = useState<AdminTenantRow | null>(
    null,
  );
  const [impersonateDialog, setImpersonateDialog] =
    useState<AdminTenantRow | null>(null);

  const listQuery = useQuery<AdminTenantListResponse, Error>({
    queryKey: ['admin-tenants', { page, statusFilter, search }] as const,
    queryFn: () =>
      fetchTenants({
        page,
        pageSize: PAGE_SIZE,
        status: statusFilter,
        search,
      }),
    placeholderData: keepPreviousData,
    staleTime: 10_000,
  });

  const invalidateList = () =>
    queryClient.invalidateQueries({ queryKey: ['admin-tenants'] });

  const suspendMutation = useMutation<
    void,
    Error,
    { id: string; reason: string }
  >({
    mutationFn: (v) =>
      changeTenantStatus({ id: v.id, status: 'suspended', reason: v.reason }),
    onSuccess: () => {
      toast.success('Tenant askıya alındı');
      setSuspendDialog(null);
      invalidateList();
    },
    onError: (e) => toast.error(`Askıya alma başarısız: ${e.message}`),
  });

  const activateMutation = useMutation<
    void,
    Error,
    { id: string; reason: string }
  >({
    mutationFn: (v) =>
      changeTenantStatus({ id: v.id, status: 'active', reason: v.reason }),
    onSuccess: () => {
      toast.success('Tenant tekrar aktif');
      setActivateDialog(null);
      invalidateList();
    },
    onError: (e) => toast.error(`Aktifleştirme başarısız: ${e.message}`),
  });

  const impersonateMutation = useMutation<
    { session_id: string },
    Error,
    { tenantId: string; reason: string }
  >({
    mutationFn: startImpersonation,
    onSuccess: (res) => {
      toast.success(
        `Impersonation başladı (oturum ${res.session_id.slice(0, 8)}). Audit log'a kaydedildi.`,
      );
      setImpersonateDialog(null);
    },
    onError: (e) => toast.error(`Impersonation başlatılamadı: ${e.message}`),
  });

  const items = useMemo(
    () => listQuery.data?.items ?? [],
    [listQuery.data?.items],
  );
  const total = listQuery.data?.total ?? 0;
  const hasMore = listQuery.data?.has_more ?? false;

  const aggregates = useMemo(() => {
    const totalEmployees = items.reduce(
      (s, t) => s + (t.employee_count ?? 0),
      0,
    );
    const activeTenants = items.filter((t) => t.status === 'active').length;
    return { totalEmployees, activeTenants };
  }, [items]);

  return (
    <AdminShell>
      <div className="flex flex-col gap-6">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-ink">
              Tenantlar
            </h1>
            <p className="mt-1 text-sm text-ink-60">
              Tüm müşteri organizasyonları. Plan, durum, çalışan sayısı ve
              aksiyonlar.
            </p>
          </div>
          <div className="flex items-center gap-2 rounded-md border border-accent/20 bg-accent-soft px-3 py-1.5 text-[11px] font-medium text-accent">
            <ShieldCheck className="h-3.5 w-3.5" />
            Platform Admin
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-3">
          <StatCard
            icon={<Building2 className="h-3.5 w-3.5" />}
            label="Sonuç"
            value={total.toLocaleString('tr-TR')}
          />
          <StatCard
            icon={<UserCheck className="h-3.5 w-3.5" />}
            label="Aktif tenant"
            value={aggregates.activeTenants.toLocaleString('tr-TR')}
          />
          <StatCard
            icon={<TrendingUp className="h-3.5 w-3.5" />}
            label="Toplam çalışan (görünen)"
            value={aggregates.totalEmployees.toLocaleString('tr-TR')}
            accent="green"
          />
        </div>

        <TenantFilters
          search={search}
          status={statusFilter}
          onSearchChange={(v) => {
            setSearch(v);
            setPage(1);
          }}
          onStatusChange={(s) => {
            setStatusFilter(s);
            setPage(1);
          }}
        />

        <TenantsList
          items={items}
          total={total}
          page={page}
          hasMore={hasMore}
          isPending={listQuery.isPending}
          isError={listQuery.isError}
          isFetching={listQuery.isFetching}
          error={listQuery.error}
          onPageChange={setPage}
          onRetry={() => listQuery.refetch()}
          onSuspend={setSuspendDialog}
          onActivate={setActivateDialog}
          onImpersonate={setImpersonateDialog}
        />
      </div>

      <SuspendDialog
        tenant={suspendDialog}
        pending={suspendMutation.isPending}
        onClose={() => setSuspendDialog(null)}
        onConfirm={(reason) => {
          if (!suspendDialog) return;
          suspendMutation.mutate({ id: suspendDialog.id, reason });
        }}
      />

      <ActivateDialog
        tenant={activateDialog}
        pending={activateMutation.isPending}
        onClose={() => setActivateDialog(null)}
        onConfirm={(reason) => {
          if (!activateDialog) return;
          activateMutation.mutate({ id: activateDialog.id, reason });
        }}
      />

      <ImpersonateDialog
        tenant={impersonateDialog}
        pending={impersonateMutation.isPending}
        onClose={() => setImpersonateDialog(null)}
        onConfirm={(reason) => {
          if (!impersonateDialog) return;
          impersonateMutation.mutate({
            tenantId: impersonateDialog.id,
            reason,
          });
        }}
      />
    </AdminShell>
  );
}
