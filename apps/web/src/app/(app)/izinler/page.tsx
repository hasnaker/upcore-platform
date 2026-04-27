'use client';

import { useMemo, useState } from 'react';
import {
  AlertCircle,
  CalendarDays,
  Check,
  CheckCircle2,
  Clock,
  Plus,
  TrendingDown,
  X,
} from 'lucide-react';
import { toast } from 'sonner';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  LEAVE_STATUS_CLASS,
  LEAVE_STATUS_LABEL,
  useApproveLeave,
  useCreateLeaveRequest,
  useLeaveRequests,
  useLeaveTypes,
  useRejectLeave,
  type LeaveStatus,
  type LeaveRequest,
} from '@/hooks/useLeaves';
import { useAuthMe } from '@/hooks/useAuthMe';
import { useEmployees } from '@/hooks/useEmployees';

const STATUS_FILTER: { value: LeaveStatus | 'all'; label: string }[] = [
  { value: 'all', label: 'Tümü' },
  { value: 'pending', label: 'Bekliyor' },
  { value: 'approved', label: 'Onaylandı' },
  { value: 'rejected', label: 'Reddedildi' },
  { value: 'cancelled', label: 'İptal' },
];

export default function IzinlerPage() {
  const [statusFilter, setStatusFilter] = useState<LeaveStatus | 'all'>('all');
  const [createOpen, setCreateOpen] = useState(false);

  const requests = useLeaveRequests(
    statusFilter === 'all' ? { limit: 100 } : { status: statusFilter, limit: 100 },
  );
  const types = useLeaveTypes();

  const stats = useMemo(() => {
    const items = requests.data?.items ?? [];
    return {
      total: items.length,
      pending: items.filter((r) => r.status === 'pending').length,
      approved: items.filter((r) => r.status === 'approved').length,
      rejected: items.filter((r) => r.status === 'rejected').length,
    };
  }, [requests.data]);

  const typeMap = useMemo(() => {
    const map = new Map<string, string>();
    (types.data ?? []).forEach((t) => map.set(t.id, t.name_tr));
    return map;
  }, [types.data]);

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-ink">İzinler</h1>
          <p className="mt-1 text-sm text-ink-60">
            İzin talepleri, onay akışı ve bakiye yönetimi — canlı API.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setCreateOpen(true)}
          className="inline-flex items-center gap-1.5 rounded-md bg-accent px-4 py-2 text-[13px] font-semibold text-white hover:bg-accent/90"
        >
          <Plus className="h-4 w-4" />
          Yeni İzin Talebi
        </button>
      </div>

      <div className="grid gap-3 sm:grid-cols-4">
        <StatCard icon={<CalendarDays className="h-4 w-4" />} label="Toplam" value={stats.total} />
        <StatCard icon={<Clock className="h-4 w-4" />} label="Bekliyor" value={stats.pending} tone="amber" />
        <StatCard icon={<CheckCircle2 className="h-4 w-4" />} label="Onaylandı" value={stats.approved} tone="green" />
        <StatCard icon={<TrendingDown className="h-4 w-4" />} label="Reddedildi" value={stats.rejected} tone="red" />
      </div>

      <div className="flex items-center gap-1 rounded-md border border-line bg-bg p-1 text-[12px]">
        {STATUS_FILTER.map((f) => (
          <button
            key={f.value}
            type="button"
            onClick={() => setStatusFilter(f.value)}
            className={`rounded px-3 py-1.5 font-medium transition-colors ${
              statusFilter === f.value ? 'bg-accent-soft text-accent' : 'text-ink-60 hover:text-ink'
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {requests.isLoading && <LoadingList />}

      {requests.isError && (
        <div className="rounded-lg border border-red/30 bg-red-soft p-4 text-sm text-red">
          <p className="font-medium">İzin talepleri yüklenemedi</p>
          <p className="mt-1 text-[12px]">{requests.error?.message}</p>
          <button
            type="button"
            onClick={() => requests.refetch()}
            className="mt-3 rounded bg-red px-3 py-1.5 text-[12px] font-medium text-white"
          >
            Yeniden dene
          </button>
        </div>
      )}

      {!requests.isLoading && !requests.isError && (requests.data?.items.length ?? 0) === 0 && (
        <EmptyState onCreate={() => setCreateOpen(true)} />
      )}

      {!requests.isLoading && (requests.data?.items.length ?? 0) > 0 && (
        <RequestTable requests={requests.data!.items} typeMap={typeMap} />
      )}

      {createOpen && <CreateLeaveModal onClose={() => setCreateOpen(false)} />}
    </div>
  );
}

const RequestTable = ({ requests, typeMap }: { requests: LeaveRequest[]; typeMap: Map<string, string> }) => {
  const approve = useApproveLeave();
  const reject = useRejectLeave();
  const [rejectTarget, setRejectTarget] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState('');

  const me = useAuthMe();
  const canApprove =
    me.roles.includes('hr_admin') ||
    me.roles.includes('hr_director') ||
    me.roles.includes('manager') ||
    me.roles.includes('owner');

  const onApprove = async (id: string) => {
    try {
      await approve.mutateAsync({ id });
      toast.success('İzin onaylandı', { icon: <Check className="h-4 w-4" /> });
    } catch (err: unknown) {
      toast.error('Onay başarısız', { description: err instanceof Error ? err.message : 'Bilinmeyen hata' });
    }
  };

  const onReject = async () => {
    if (!rejectTarget || !rejectReason.trim()) return;
    try {
      await reject.mutateAsync({ id: rejectTarget, reason: rejectReason });
      toast.info('İzin reddedildi');
      setRejectTarget(null);
      setRejectReason('');
    } catch (err: unknown) {
      toast.error('Reddetme başarısız', {
        description: err instanceof Error ? err.message : 'Bilinmeyen hata',
      });
    }
  };

  return (
    <>
      <div className="overflow-hidden rounded-xl border border-line bg-bg">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-bg-2 text-[11px] uppercase tracking-wider text-ink-40">
              <tr>
                <th className="px-4 py-3 text-left font-semibold">Çalışan</th>
                <th className="px-4 py-3 text-left font-semibold">Tip</th>
                <th className="px-4 py-3 text-left font-semibold">Başlangıç</th>
                <th className="px-4 py-3 text-left font-semibold">Bitiş</th>
                <th className="px-4 py-3 text-left font-semibold">Gün</th>
                <th className="px-4 py-3 text-left font-semibold">Durum</th>
                {canApprove && <th className="px-4 py-3 text-right font-semibold">Aksiyon</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {requests.map((req) => (
                <tr key={req.id} className="hover:bg-bg-2">
                  <td className="px-4 py-3 font-mono text-[11px] text-ink-60">
                    {req.employee_id.slice(0, 8)}…
                  </td>
                  <td className="px-4 py-3 text-ink-80">
                    {typeMap.get(req.leave_type_id) ?? 'Diğer'}
                  </td>
                  <td className="px-4 py-3 tabular-nums text-ink-60">
                    {new Date(req.start_date).toLocaleDateString('tr-TR', {
                      day: 'numeric', month: 'short', year: 'numeric',
                    })}
                  </td>
                  <td className="px-4 py-3 tabular-nums text-ink-60">
                    {new Date(req.end_date).toLocaleDateString('tr-TR', {
                      day: 'numeric', month: 'short', year: 'numeric',
                    })}
                  </td>
                  <td className="px-4 py-3 tabular-nums font-semibold text-ink">{req.total_days}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex h-6 items-center rounded-full px-2 text-[11px] font-medium ${LEAVE_STATUS_CLASS[req.status]}`}>
                      {LEAVE_STATUS_LABEL[req.status]}
                    </span>
                  </td>
                  {canApprove && (
                    <td className="px-4 py-3 text-right">
                      {req.status === 'pending' ? (
                        <div className="flex items-center justify-end gap-2">
                          <button
                            type="button"
                            onClick={() => onApprove(req.id)}
                            disabled={approve.isPending}
                            className="inline-flex items-center gap-1 rounded-md border border-green/30 bg-green-soft px-2.5 py-1 text-[11px] font-medium text-green hover:bg-green-soft/80 disabled:opacity-50"
                          >
                            <Check className="h-3 w-3" />
                            Onayla
                          </button>
                          <button
                            type="button"
                            onClick={() => setRejectTarget(req.id)}
                            className="inline-flex items-center gap-1 rounded-md border border-red/30 bg-red-soft px-2.5 py-1 text-[11px] font-medium text-red hover:bg-red-soft/80"
                          >
                            <X className="h-3 w-3" />
                            Reddet
                          </button>
                        </div>
                      ) : (
                        <span className="text-[11px] text-ink-40">
                          {req.approved_at ? new Date(req.approved_at).toLocaleDateString('tr-TR') : '—'}
                        </span>
                      )}
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {rejectTarget && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4 backdrop-blur-sm"
          onClick={() => setRejectTarget(null)}
          role="presentation"
        >
          <div
            className="w-full max-w-md rounded-xl border border-line bg-bg p-5 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-base font-semibold text-ink">İzin reddet</h3>
            <p className="mt-1 text-[12px] text-ink-60">
              Red nedeni zorunludur — çalışana bildirim gider.
            </p>
            <textarea
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              rows={3}
              placeholder="Örn: Aynı dönemde 3 ekip üyesi daha izinde."
              className="mt-3 w-full rounded-md border border-line bg-bg p-2 text-sm focus:border-accent focus:outline-none"
            />
            <div className="mt-3 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => {
                  setRejectTarget(null);
                  setRejectReason('');
                }}
                className="rounded-md border border-line bg-bg px-3 py-1.5 text-[12px] text-ink-60"
              >
                Vazgeç
              </button>
              <button
                type="button"
                onClick={onReject}
                disabled={!rejectReason.trim() || reject.isPending}
                className="rounded-md bg-red px-3 py-1.5 text-[12px] font-semibold text-white disabled:opacity-50"
              >
                {reject.isPending ? 'Gönderiliyor…' : 'Reddet'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

const StatCard = ({
  icon, label, value, tone = 'gray',
}: { icon: React.ReactNode; label: string; value: number; tone?: 'green' | 'amber' | 'red' | 'gray' }) => {
  const toneMap = { green: 'text-green', amber: 'text-amber', red: 'text-red', gray: 'text-ink' };
  return (
    <div className="rounded-lg border border-line bg-bg p-4">
      <div className="flex items-center gap-1.5 text-[11px] uppercase tracking-widest text-ink-40">
        {icon}
        {label}
      </div>
      <p className={`mt-2 text-2xl font-semibold tabular-nums ${toneMap[tone]}`}>{value}</p>
    </div>
  );
};

const LoadingList = () => (
  <div className="flex flex-col gap-2">
    {[0, 1, 2, 3].map((i) => <div key={i} className="h-16 animate-pulse rounded-lg border border-line bg-bg" />)}
  </div>
);

const EmptyState = ({ onCreate }: { onCreate: () => void }) => (
  <div className="flex flex-col items-center gap-3 rounded-xl border border-line bg-bg px-6 py-16 text-center">
    <div className="flex h-14 w-14 items-center justify-center rounded-full bg-accent-soft">
      <CalendarDays className="h-7 w-7 text-accent" />
    </div>
    <p className="text-sm font-medium text-ink">Bu kriterde izin talebi yok</p>
    <button
      type="button"
      onClick={onCreate}
      className="mt-2 inline-flex items-center gap-1.5 rounded-md bg-accent px-4 py-2 text-[13px] font-semibold text-white"
    >
      <Plus className="h-4 w-4" /> Yeni izin talebi
    </button>
  </div>
);

const createSchema = z
  .object({
    employee_id: z.string().min(1, 'Çalışan seçin'),
    leave_type_id: z.string().min(1, 'İzin tipi seçin'),
    start_date: z.string().min(1, 'Başlangıç tarihi'),
    end_date: z.string().min(1, 'Bitiş tarihi'),
    reason: z.string().optional(),
  })
  .refine((v) => new Date(v.end_date) >= new Date(v.start_date), {
    message: 'Bitiş tarihi başlangıçtan önce olamaz',
    path: ['end_date'],
  });

type CreateFormValues = z.infer<typeof createSchema>;

function CreateLeaveModal({ onClose }: { onClose: () => void }) {
  const types = useLeaveTypes();
  const employees = useEmployees({ limit: 200 });
  const create = useCreateLeaveRequest();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<CreateFormValues>({
    resolver: zodResolver(createSchema),
    defaultValues: {
      start_date: new Date().toISOString().slice(0, 10),
      end_date: new Date().toISOString().slice(0, 10),
    },
  });

  const onSubmit = async (values: CreateFormValues) => {
    try {
      await create.mutateAsync(values);
      toast.success('İzin talebi oluşturuldu', { icon: <CheckCircle2 className="h-4 w-4" /> });
      onClose();
    } catch (err: unknown) {
      toast.error('Oluşturma başarısız', {
        description: err instanceof Error ? err.message : 'Bilinmeyen hata',
      });
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4 backdrop-blur-sm"
      onClick={onClose}
      role="presentation"
    >
      <form
        onSubmit={handleSubmit(onSubmit)}
        onClick={(e) => e.stopPropagation()}
        className="flex w-full max-w-lg flex-col gap-5 rounded-xl border border-line bg-bg p-6 shadow-xl"
      >
        <div className="flex items-start justify-between">
          <h2 className="text-lg font-semibold text-ink">Yeni İzin Talebi</h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded p-1 text-ink-40 hover:bg-bg-2 hover:text-ink"
            aria-label="Kapat"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="grid gap-3">
          <label className="flex flex-col gap-1">
            <span className="text-[11px] font-medium text-ink-80">Çalışan *</span>
            <select
              {...register('employee_id')}
              className="h-10 rounded-md border border-line bg-bg px-3 text-sm"
            >
              <option value="">— Seçiniz —</option>
              {(employees.data?.items ?? []).map((e) => (
                <option key={e.id} value={e.id}>
                  {e.tamAd} {e.sicilNo ? `(${e.sicilNo})` : ''}
                </option>
              ))}
            </select>
            {errors.employee_id && (
              <span className="text-[11px] text-red">{errors.employee_id.message}</span>
            )}
          </label>

          <label className="flex flex-col gap-1">
            <span className="text-[11px] font-medium text-ink-80">İzin Tipi *</span>
            <select
              {...register('leave_type_id')}
              className="h-10 rounded-md border border-line bg-bg px-3 text-sm"
            >
              <option value="">— Seçiniz —</option>
              {(types.data ?? []).map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name_tr} {t.is_paid ? '(Ücretli)' : '(Ücretsiz)'}
                </option>
              ))}
            </select>
            {errors.leave_type_id && (
              <span className="text-[11px] text-red">{errors.leave_type_id.message}</span>
            )}
          </label>

          <div className="grid grid-cols-2 gap-3">
            <label className="flex flex-col gap-1">
              <span className="text-[11px] font-medium text-ink-80">Başlangıç *</span>
              <input
                type="date"
                {...register('start_date')}
                className="h-10 rounded-md border border-line bg-bg px-3 text-sm"
              />
              {errors.start_date && (
                <span className="text-[11px] text-red">{errors.start_date.message}</span>
              )}
            </label>
            <label className="flex flex-col gap-1">
              <span className="text-[11px] font-medium text-ink-80">Bitiş *</span>
              <input
                type="date"
                {...register('end_date')}
                className="h-10 rounded-md border border-line bg-bg px-3 text-sm"
              />
              {errors.end_date && (
                <span className="text-[11px] text-red">{errors.end_date.message}</span>
              )}
            </label>
          </div>

          <label className="flex flex-col gap-1">
            <span className="text-[11px] font-medium text-ink-80">Neden (opsiyonel)</span>
            <textarea
              {...register('reason')}
              rows={2}
              placeholder="Örn: Aile ziyareti"
              className="rounded-md border border-line bg-bg p-2 text-sm"
            />
          </label>
        </div>

        {create.isError && (
          <div className="flex items-start gap-2 rounded-md border border-red/30 bg-red-soft p-2 text-[12px] text-red">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
            <span>{create.error?.message}</span>
          </div>
        )}

        <div className="flex items-center justify-end gap-2 border-t border-line pt-4">
          <button
            type="button"
            onClick={onClose}
            className="rounded-md border border-line bg-bg px-3 py-1.5 text-[12px] text-ink-60"
          >
            Vazgeç
          </button>
          <button
            type="submit"
            disabled={create.isPending}
            className="rounded-md bg-accent px-4 py-1.5 text-[12px] font-semibold text-white hover:bg-accent/90 disabled:opacity-50"
          >
            {create.isPending ? 'Oluşturuluyor…' : 'Talep Oluştur'}
          </button>
        </div>
      </form>
    </div>
  );
}
