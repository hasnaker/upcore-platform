'use client';

/**
 * /admin/pip — İK + yönetici PIP konsolu.
 *
 * Aktif + kapalı PIP listesi, durum filtresi, yeni PIP başlatma Dialog.
 * İş Kanunu 25/2 prosedürüne uyumlu iş akışı.
 */

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { toast } from 'sonner';
import {
  usePipCases,
  useInitiatePipCase,
  PIP_STATUS_LABEL_TR,
  PIP_REASON_LABEL_TR,
  type PipStatus,
  type PipReasonCategory,
  type PipCase,
} from '@/hooks/usePip';
import { useEmployees } from '@/hooks/useEmployees';

const STATUS_COLORS: Record<PipStatus, { bg: string; fg: string }> = {
  draft: { bg: '#F5F5F5', fg: '#525252' },
  pending_legal: { bg: '#FEF3C7', fg: '#B45309' },
  active: { bg: '#DBEAFE', fg: '#1D4ED8' },
  extended: { bg: '#E0E7FF', fg: '#4338CA' },
  passed: { bg: '#D1FAE5', fg: '#047857' },
  terminated: { bg: '#FEE2E2', fg: '#B91C1C' },
};

const STATUS_FILTER: Array<{ value: PipStatus | 'all'; label: string }> = [
  { value: 'all', label: 'Tümü' },
  { value: 'draft', label: 'Taslak' },
  { value: 'pending_legal', label: 'Legal Bekliyor' },
  { value: 'active', label: 'Aktif' },
  { value: 'extended', label: 'Uzatıldı' },
  { value: 'passed', label: 'Başarılı' },
  { value: 'terminated', label: 'Fesih' },
];

export default function AdminPipPage() {
  const [statusFilter, setStatusFilter] = useState<PipStatus | 'all'>('all');
  const [reasonFilter, setReasonFilter] = useState<PipReasonCategory | 'all'>('all');
  const [dialogOpen, setDialogOpen] = useState(false);

  const { data, isLoading, isError, error, refetch } = usePipCases({
    status: statusFilter === 'all' ? undefined : statusFilter,
    reason: reasonFilter === 'all' ? undefined : reasonFilter,
  });

  const items = useMemo(() => data?.items ?? [], [data?.items]);

  const stats = useMemo(() => {
    const active = items.filter((c) => c.status === 'active' || c.status === 'extended').length;
    const pending = items.filter((c) => c.status === 'pending_legal').length;
    const terminated = items.filter((c) => c.status === 'terminated').length;
    const passed = items.filter((c) => c.status === 'passed').length;
    return { total: items.length, active, pending, terminated, passed };
  }, [items]);

  return (
    <div className="flex flex-col gap-6">
      {/* Page header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[#111]">
            Performans İyileştirme Planları (PIP)
          </h1>
          <p className="mt-1 text-sm text-[#888]">
            İş Kanunu 25/2 ile uyumlu performans iyileştirme iş akışı. Her PIP kaydı 10 yıl saklanır.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setDialogOpen(true)}
          className="rounded-lg bg-[#5E5CE6] px-4 py-2 text-sm font-semibold text-white hover:bg-[#4F4DD1]"
          data-testid="new-pip-btn"
        >
          + Yeni PIP Başlat
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-5 gap-3">
        <StatCard label="Toplam Dosya" value={stats.total} color="#111" />
        <StatCard label="Aktif" value={stats.active} color="#1D4ED8" />
        <StatCard label="Legal Bekliyor" value={stats.pending} color="#B45309" />
        <StatCard label="Başarılı" value={stats.passed} color="#047857" />
        <StatCard label="Fesih" value={stats.terminated} color="#B91C1C" />
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <label className="text-xs font-medium text-[#525252]">Durum:</label>
        <div className="flex flex-wrap gap-1 rounded-lg border border-[#EDEDED] bg-white p-1">
          {STATUS_FILTER.map((f) => (
            <button
              key={f.value}
              onClick={() => setStatusFilter(f.value)}
              className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                statusFilter === f.value
                  ? 'bg-[#5E5CE6] text-white'
                  : 'text-[#525252] hover:bg-[#F5F5F5]'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
        <label className="ml-2 text-xs font-medium text-[#525252]">Neden:</label>
        <select
          value={reasonFilter}
          onChange={(e) => setReasonFilter(e.target.value as PipReasonCategory | 'all')}
          className="rounded-md border border-[#EDEDED] bg-white px-3 py-1.5 text-xs"
        >
          <option value="all">Tümü</option>
          {(Object.keys(PIP_REASON_LABEL_TR) as PipReasonCategory[]).map((k) => (
            <option key={k} value={k}>
              {PIP_REASON_LABEL_TR[k]}
            </option>
          ))}
        </select>
      </div>

      {/* Loading */}
      {isLoading && (
        <div className="grid grid-cols-1 gap-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div
              key={i}
              className="h-[88px] animate-pulse rounded-xl border border-[#EDEDED] bg-[#FAFAFA]"
            />
          ))}
        </div>
      )}

      {/* Error */}
      {isError && (
        <div className="flex items-center justify-between rounded-xl border border-[#FECACA] bg-[#FEF2F2] px-4 py-3 text-sm text-[#991B1B]">
          <div>
            <div className="font-semibold">PIP listesi yüklenemedi</div>
            <div className="text-xs text-[#B91C1C]/80">
              {error instanceof Error ? error.message : 'Sunucu yanıt vermedi.'}
            </div>
          </div>
          <button
            onClick={() => refetch()}
            className="rounded-md border border-[#FECACA] bg-white px-3 py-1.5 text-xs font-semibold hover:bg-[#FEF2F2]"
          >
            Tekrar dene
          </button>
        </div>
      )}

      {/* Empty */}
      {!isLoading && !isError && items.length === 0 && (
        <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-[#D4D4D4] bg-[#FAFAFA] px-6 py-14 text-center">
          <div className="text-lg font-semibold text-[#111]">Kayıtlı PIP bulunmuyor</div>
          <p className="text-sm text-[#888]">
            Bir çalışan için performans iyileştirme süreci başlatmak üzere "+ Yeni PIP Başlat" düğmesine basın.
          </p>
        </div>
      )}

      {/* List */}
      {!isLoading && !isError && items.length > 0 && (
        <div
          data-testid="pip-list"
          className="overflow-hidden rounded-xl border border-[#EDEDED] bg-white"
        >
          <div className="grid grid-cols-[1.6fr_1fr_1fr_0.8fr_0.8fr_120px] gap-4 border-b border-[#EDEDED] bg-[#FAFAFA] px-5 py-3 text-[11px] font-semibold uppercase tracking-wide text-[#888]">
            <div>Dosya / Çalışan</div>
            <div>Neden</div>
            <div>Durum</div>
            <div>Başlama</div>
            <div>Süre</div>
            <div className="text-right"></div>
          </div>
          {items.map((c) => (
            <PipRow key={c.id} pipCase={c} />
          ))}
        </div>
      )}

      {/* Dialog */}
      {dialogOpen && (
        <InitiateDialog
          onClose={() => setDialogOpen(false)}
          onCreated={() => {
            setDialogOpen(false);
            refetch();
          }}
        />
      )}
    </div>
  );
}

/* ─── Sub-components ─── */

const StatCard = ({ label, value, color }: { label: string; value: number; color: string }) => (
  <div className="rounded-xl border border-[#EDEDED] bg-white p-4 text-center">
    <div className="text-[26px] font-bold" style={{ color }}>
      {value}
    </div>
    <div className="mt-0.5 text-[11px] text-[#888]">{label}</div>
  </div>
);

const PipRow = ({ pipCase }: { pipCase: PipCase }) => {
  const colors = STATUS_COLORS[pipCase.status];
  const start = new Date(pipCase.start_date).toLocaleDateString('tr-TR');
  return (
    <div
      data-testid="pip-row"
      data-case-id={pipCase.id}
      data-status={pipCase.status}
      className="grid grid-cols-[1.6fr_1fr_1fr_0.8fr_0.8fr_120px] items-center gap-4 border-b border-[#F0F0F0] px-5 py-4 last:border-b-0"
    >
      <div>
        <div className="text-sm font-semibold text-[#111]">
          {pipCase.id.slice(0, 8)}… · Çalışan {pipCase.employee_id.slice(0, 6)}
        </div>
        <div className="mt-0.5 text-xs text-[#888]">
          {pipCase.reason_summary.length > 80
            ? `${pipCase.reason_summary.slice(0, 80)}…`
            : pipCase.reason_summary}
        </div>
      </div>
      <div className="text-sm text-[#111]">{PIP_REASON_LABEL_TR[pipCase.reason_category]}</div>
      <div>
        <span
          className="inline-block rounded-full px-2 py-0.5 text-[11px] font-semibold"
          style={{ background: colors.bg, color: colors.fg }}
        >
          {PIP_STATUS_LABEL_TR[pipCase.status]}
        </span>
      </div>
      <div className="text-xs text-[#525252]">{start}</div>
      <div className="text-xs text-[#525252]">{pipCase.duration_days} gün</div>
      <div className="flex justify-end">
        <Link
          href={`/admin/pip/${pipCase.id}`}
          className="rounded-md border border-[#E5E5E5] bg-white px-3 py-1.5 text-xs font-semibold text-[#5E5CE6] hover:border-[#5E5CE6] hover:bg-[#FAFAFF]"
          data-testid="pip-detail-link"
        >
          Detay →
        </Link>
      </div>
    </div>
  );
};

/* ─── Initiate Dialog ─── */

interface InitiateDialogProps {
  onClose: () => void;
  onCreated: () => void;
}

interface GoalDraft {
  description: string;
  measurable_target: string;
  deadline: string;
  priority: 'low' | 'medium' | 'high';
}

function InitiateDialog({ onClose, onCreated }: InitiateDialogProps) {
  const { data: empData } = useEmployees({ limit: 500 });
  const employees = empData?.items ?? [];

  const [employeeId, setEmployeeId] = useState('');
  const [reasonCategory, setReasonCategory] = useState<PipReasonCategory>('performance');
  const [reasonSummary, setReasonSummary] = useState('');
  const [startDate, setStartDate] = useState<string>(
    new Date().toISOString().split('T')[0] ?? '',
  );
  const [durationDays, setDurationDays] = useState<30 | 60 | 90>(30);
  const [goals, setGoals] = useState<GoalDraft[]>([
    { description: '', measurable_target: '', deadline: '', priority: 'medium' },
  ]);

  const initiate = useInitiatePipCase();

  const canSubmit =
    employeeId &&
    reasonSummary.trim().length >= 20 &&
    goals.every(
      (g) => g.description.trim() && g.measurable_target.trim() && g.deadline,
    );

  const submit = async () => {
    if (!canSubmit) {
      toast.error('Zorunlu alanları doldurun (özet ≥ 20 karakter, her hedef: açıklama/ölçüt/son tarih).');
      return;
    }
    try {
      await initiate.mutateAsync({
        employee_id: employeeId,
        reason_category: reasonCategory,
        reason_summary: reasonSummary.trim(),
        start_date: startDate,
        duration_days: durationDays,
        goals: goals.map((g) => ({
          description: g.description.trim(),
          measurable_target: g.measurable_target.trim(),
          deadline: g.deadline,
          priority: g.priority,
        })),
      });
      toast.success('PIP dosyası taslak olarak oluşturuldu. Legal onayına gönderilmeye hazır.');
      onCreated();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'PIP oluşturulamadı.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div
        data-testid="initiate-pip-dialog"
        className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white p-6 shadow-xl"
      >
        <div className="mb-4 flex items-start justify-between">
          <div>
            <h2 className="text-xl font-bold text-[#111]">Yeni PIP Başlat</h2>
            <p className="mt-1 text-xs text-[#888]">
              Bu belge oluşturulduktan sonra legal onayına gönderilmeden aktif hale gelemez.
            </p>
          </div>
          <button
            onClick={onClose}
            className="rounded-md p-1 text-[#888] hover:bg-[#F5F5F5] hover:text-[#111]"
          >
            ✕
          </button>
        </div>

        <div className="flex flex-col gap-4">
          <Field label="Çalışan *">
            <select
              value={employeeId}
              onChange={(e) => setEmployeeId(e.target.value)}
              className="w-full rounded-md border border-[#E5E5E5] px-3 py-2 text-sm"
              data-testid="pip-employee-select"
            >
              <option value="">— Çalışan seçin —</option>
              {employees.map((emp) => (
                <option key={emp.id} value={emp.id}>
                  {emp.tamAd || `${emp.ad} ${emp.soyad}`}
                </option>
              ))}
            </select>
          </Field>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Neden *">
              <select
                value={reasonCategory}
                onChange={(e) => setReasonCategory(e.target.value as PipReasonCategory)}
                className="w-full rounded-md border border-[#E5E5E5] px-3 py-2 text-sm"
              >
                {(Object.keys(PIP_REASON_LABEL_TR) as PipReasonCategory[]).map((k) => (
                  <option key={k} value={k}>
                    {PIP_REASON_LABEL_TR[k]}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Süre *">
              <div className="flex gap-1">
                {[30, 60, 90].map((d) => (
                  <button
                    key={d}
                    type="button"
                    onClick={() => setDurationDays(d as 30 | 60 | 90)}
                    className={`flex-1 rounded-md px-3 py-2 text-sm ${
                      durationDays === d
                        ? 'bg-[#5E5CE6] text-white'
                        : 'bg-[#F5F5F5] text-[#525252]'
                    }`}
                  >
                    {d} gün
                  </button>
                ))}
              </div>
            </Field>
          </div>

          <Field label="Başlangıç Tarihi *">
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full rounded-md border border-[#E5E5E5] px-3 py-2 text-sm"
            />
          </Field>

          <Field label="Olgusal Özet (en az 20 karakter) *">
            <textarea
              value={reasonSummary}
              onChange={(e) => setReasonSummary(e.target.value)}
              rows={4}
              placeholder="Spesifik olaylar, tarihler ve ölçülebilir göstergeler ile..."
              className="w-full rounded-md border border-[#E5E5E5] px-3 py-2 text-sm"
              data-testid="pip-reason-summary"
            />
          </Field>

          <div>
            <div className="mb-2 flex items-center justify-between">
              <div className="text-xs font-semibold text-[#525252]">
                İyileştirme Hedefleri ({goals.length})
              </div>
              <button
                type="button"
                onClick={() =>
                  setGoals((prev) => [
                    ...prev,
                    { description: '', measurable_target: '', deadline: '', priority: 'medium' },
                  ])
                }
                className="text-xs font-semibold text-[#5E5CE6] hover:underline"
              >
                + Hedef ekle
              </button>
            </div>
            <div className="flex flex-col gap-2">
              {goals.map((g, i) => (
                <div
                  key={i}
                  className="rounded-md border border-[#EDEDED] bg-[#FAFAFA] p-3"
                  data-testid="pip-goal-row"
                >
                  <div className="flex items-start justify-between gap-2">
                    <input
                      value={g.description}
                      onChange={(e) =>
                        setGoals((prev) => prev.map((x, j) => (j === i ? { ...x, description: e.target.value } : x)))
                      }
                      placeholder="Hedef açıklaması"
                      className="w-full rounded-md border border-[#E5E5E5] bg-white px-2 py-1 text-xs"
                    />
                    {goals.length > 1 && (
                      <button
                        type="button"
                        onClick={() => setGoals((prev) => prev.filter((_, j) => j !== i))}
                        className="text-xs text-[#B91C1C] hover:underline"
                      >
                        Sil
                      </button>
                    )}
                  </div>
                  <input
                    value={g.measurable_target}
                    onChange={(e) =>
                      setGoals((prev) =>
                        prev.map((x, j) => (j === i ? { ...x, measurable_target: e.target.value } : x)),
                      )
                    }
                    placeholder="Ölçülebilir hedef (örn: haftada 5 PR review)"
                    className="mt-2 w-full rounded-md border border-[#E5E5E5] bg-white px-2 py-1 text-xs"
                  />
                  <div className="mt-2 flex gap-2">
                    <input
                      type="date"
                      value={g.deadline}
                      onChange={(e) =>
                        setGoals((prev) =>
                          prev.map((x, j) => (j === i ? { ...x, deadline: e.target.value } : x)),
                        )
                      }
                      className="flex-1 rounded-md border border-[#E5E5E5] bg-white px-2 py-1 text-xs"
                    />
                    <select
                      value={g.priority}
                      onChange={(e) =>
                        setGoals((prev) =>
                          prev.map((x, j) =>
                            j === i ? { ...x, priority: e.target.value as 'low' | 'medium' | 'high' } : x,
                          ),
                        )
                      }
                      className="rounded-md border border-[#E5E5E5] bg-white px-2 py-1 text-xs"
                    >
                      <option value="low">Düşük</option>
                      <option value="medium">Orta</option>
                      <option value="high">Yüksek</option>
                    </select>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="mt-6 flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="rounded-md border border-[#E5E5E5] bg-white px-4 py-2 text-sm font-medium text-[#525252] hover:bg-[#F5F5F5]"
          >
            İptal
          </button>
          <button
            type="button"
            onClick={submit}
            disabled={!canSubmit || initiate.isPending}
            className="rounded-md bg-[#5E5CE6] px-4 py-2 text-sm font-semibold text-white hover:bg-[#4F4DD1] disabled:opacity-50"
            data-testid="pip-submit-btn"
          >
            {initiate.isPending ? 'Oluşturuluyor…' : 'Taslak Oluştur'}
          </button>
        </div>
      </div>
    </div>
  );
}

const Field = ({ label, children }: { label: string; children: React.ReactNode }) => (
  <div>
    <label className="mb-1 block text-xs font-semibold text-[#525252]">{label}</label>
    {children}
  </div>
);
