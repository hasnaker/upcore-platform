'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { toast } from 'sonner';
import {
  CheckCircle2,
  Clock,
  Compass,
  Loader2,
  Plus,
  Repeat,
  ShieldAlert,
  XCircle,
} from 'lucide-react';

import { useAuthMe } from '@/hooks/useAuthMe';
import { useEmployee } from '@/hooks/useEmployees';
import { useDepartments, usePositions } from '@/hooks/useDepartments';
import {
  useCreateRotation,
  useMyRotations,
  type RotationRow,
} from '@/hooks/useMobility';

const STATUS_LABEL: Record<RotationRow['status'], string> = {
  proposed: 'Onay bekliyor',
  approved: 'Onaylandı',
  rejected: 'Reddedildi',
  active: 'Aktif',
  completed: 'Tamamlandı',
  cancelled: 'İptal',
};

const STATUS_CLASS: Record<RotationRow['status'], string> = {
  proposed: 'bg-accent-soft text-accent',
  approved: 'bg-green-soft text-green',
  active: 'bg-green-soft text-green',
  completed: 'bg-ink-10 text-ink-60',
  rejected: 'bg-red-soft text-red',
  cancelled: 'bg-ink-10 text-ink-60',
};

const KANBAN_COLUMNS: { key: RotationRow['status']; label: string }[] = [
  { key: 'proposed', label: 'Başvuruldu' },
  { key: 'approved', label: 'Onaylandı' },
  { key: 'active', label: 'Aktif' },
  { key: 'completed', label: 'Tamamlandı' },
];

const MIN_REASON = 50;

export default function RotasyonPage() {
  const me = useAuthMe();
  const employeeId = me.data?.id ?? null;
  const employeeQ = useEmployee(employeeId);
  const rotationsQ = useMyRotations(employeeId);
  const [showForm, setShowForm] = useState(false);

  if (me.isLoading || employeeQ.isLoading) {
    return <div className="h-48 animate-pulse rounded-xl border border-line bg-bg" />;
  }

  if (!employeeId) {
    return (
      <div className="rounded-xl border border-red/30 bg-red-soft p-6 text-sm text-red">
        Oturumunuz çözümlenemedi — lütfen tekrar giriş yapın.
      </div>
    );
  }

  const rotations = rotationsQ.data?.rotations ?? [];
  const hasOpen = rotations.some(
    (r) => r.status === 'proposed' || r.status === 'approved' || r.status === 'active',
  );

  return (
    <div className="flex flex-col gap-6" data-testid="rotasyon-page">
      <div className="flex items-start justify-between gap-4">
        <div>
          <Link href="/kariyer" className="text-[12px] text-ink-40 hover:underline">
            ← Kariyer paneli
          </Link>
          <h1 className="mt-2 flex items-center gap-2 text-2xl font-semibold text-ink">
            <Compass className="h-5 w-5 text-accent" />
            Rotasyon İş Akışı
          </h1>
          <p className="mt-1 max-w-2xl text-sm text-ink-60">
            Farklı bir departman veya pozisyonda deneyim kazanmak için rotasyon talebi
            açın. Onay zinciri: mevcut yöneticiniz → hedef yönetici → İK. Rotasyonun
            aktifleşmesinden sonra 90 gün içinde değerlendirme yapılır.
          </p>
        </div>
        <button
          type="button"
          data-testid="new-rotation-cta"
          disabled={hasOpen}
          onClick={() => setShowForm((v) => !v)}
          className="inline-flex items-center gap-2 rounded-md bg-[#0A0A0A] px-3 py-1.5 text-[12px] font-medium text-white transition-colors hover:bg-[#333] disabled:cursor-not-allowed disabled:opacity-50"
        >
          <Plus className="h-4 w-4" />
          {showForm ? 'Formu kapat' : 'Yeni rotasyon talebi'}
        </button>
      </div>

      {hasOpen && (
        <div
          className="flex items-start gap-2 rounded-md border border-amber/30 bg-amber-soft p-3 text-[12px] text-amber"
          data-testid="has-open-warning"
        >
          <ShieldAlert className="mt-0.5 h-4 w-4" />
          <div>
            <div className="font-semibold">Açık bir rotasyon talebiniz var</div>
            <p className="mt-0.5 text-ink-80">
              Devam etmekte olan bir rotasyon veya onay sürecindeki talep kapanmadan yeni bir talep
              oluşturamazsınız.
            </p>
          </div>
        </div>
      )}

      {showForm && !hasOpen && (
        <RotationForm
          employeeId={employeeId}
          currentPositionId={employeeQ.data?.pozisyonId ?? null}
          currentDepartmentId={employeeQ.data?.departmanId ?? null}
          onDone={() => setShowForm(false)}
        />
      )}

      <section className="flex flex-col gap-3">
        <h2 className="text-sm font-semibold text-ink">Talepleriniz</h2>
        {rotationsQ.isLoading ? (
          <div className="h-28 animate-pulse rounded-xl border border-line bg-bg" />
        ) : rotationsQ.error ? (
          <div className="rounded-xl border border-red/30 bg-red-soft p-4 text-sm text-red">
            Talepleriniz yüklenemedi. {rotationsQ.error.message}
          </div>
        ) : rotations.length === 0 ? (
          <div className="rounded-xl border border-line bg-bg p-10 text-center text-sm text-ink-60">
            Henüz rotasyon talebiniz yok. Üstteki butonla ilk talebinizi oluşturabilirsiniz.
          </div>
        ) : (
          <>
            <KanbanView rotations={rotations} />
            <RotationTable rotations={rotations} />
          </>
        )}
      </section>
    </div>
  );
}

/* ─── Form ─── */

interface RotationFormProps {
  employeeId: string;
  currentPositionId: string | null;
  currentDepartmentId: string | null;
  onDone: () => void;
}

function RotationForm({
  employeeId,
  currentPositionId,
  currentDepartmentId,
  onDone,
}: RotationFormProps) {
  const departmentsQ = useDepartments();
  const positionsQ = usePositions();
  const createMut = useCreateRotation();

  const [toDept, setToDept] = useState('');
  const [toPosition, setToPosition] = useState('');
  const [reason, setReason] = useState('');
  const [startDate, setStartDate] = useState('');

  const positionsForDept = useMemo(
    () => (positionsQ.data ?? []).filter((p) => !toDept || p.department_id === toDept),
    [positionsQ.data, toDept],
  );

  const reasonLen = reason.trim().length;
  const reasonValid = reasonLen >= MIN_REASON;
  const canSubmit =
    !!currentPositionId &&
    !!currentDepartmentId &&
    !!toDept &&
    !!toPosition &&
    reasonValid &&
    !createMut.isPending;

  const handleSubmit = (ev: React.FormEvent) => {
    ev.preventDefault();
    if (!canSubmit || !currentPositionId || !currentDepartmentId) return;

    createMut.mutate(
      {
        employee_id: employeeId,
        from_position_id: currentPositionId,
        to_position_id: toPosition,
        from_department_id: currentDepartmentId,
        to_department_id: toDept,
        reason_tr: reason.trim(),
        ...(startDate ? { start_date: startDate } : {}),
      },
      {
        onSuccess: () => {
          toast.success('Rotasyon talebiniz oluşturuldu');
          setToDept('');
          setToPosition('');
          setReason('');
          setStartDate('');
          onDone();
        },
        onError: (err) => toast.error(friendlyError(err.message)),
      },
    );
  };

  const missingPosition = !currentPositionId || !currentDepartmentId;

  return (
    <form
      onSubmit={handleSubmit}
      data-testid="rotation-form"
      className="flex flex-col gap-4 rounded-xl border border-line bg-bg p-4"
    >
      {missingPosition && (
        <div className="rounded-md border border-amber/30 bg-amber-soft p-3 text-[12px] text-amber">
          Mevcut pozisyon veya departmanınız eksik. İK'ya başvurarak kayıtlarınızı tamamlatın.
        </div>
      )}

      <div className="grid gap-4 md:grid-cols-2">
        <label className="flex flex-col gap-1">
          <span className="text-[12px] font-medium text-ink-80">Hedef departman</span>
          <select
            data-testid="rotation-to-dept"
            value={toDept}
            onChange={(e) => {
              setToDept(e.target.value);
              setToPosition('');
            }}
            className="rounded-md border border-line bg-bg px-2 py-2 text-[13px]"
            required
          >
            <option value="">Seçiniz…</option>
            {(departmentsQ.data ?? []).map((d) => (
              <option key={d.id} value={d.id} disabled={d.id === currentDepartmentId}>
                {d.name_tr}
                {d.id === currentDepartmentId ? ' (mevcut departman)' : ''}
              </option>
            ))}
          </select>
        </label>

        <label className="flex flex-col gap-1">
          <span className="text-[12px] font-medium text-ink-80">Hedef pozisyon</span>
          <select
            data-testid="rotation-to-position"
            value={toPosition}
            onChange={(e) => setToPosition(e.target.value)}
            className="rounded-md border border-line bg-bg px-2 py-2 text-[13px]"
            required
            disabled={!toDept}
          >
            <option value="">Seçiniz…</option>
            {positionsForDept.map((p) => (
              <option key={p.id} value={p.id} disabled={p.id === currentPositionId}>
                {p.title_tr}
                {p.id === currentPositionId ? ' (mevcut pozisyon)' : ''}
              </option>
            ))}
          </select>
        </label>

        <label className="flex flex-col gap-1 md:col-span-2">
          <span className="text-[12px] font-medium text-ink-80">
            Gerekçe <span className="text-ink-40">(en az {MIN_REASON} karakter — {reasonLen}/{MIN_REASON})</span>
          </span>
          <textarea
            data-testid="rotation-reason"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            rows={5}
            minLength={MIN_REASON}
            className="rounded-md border border-line bg-bg px-3 py-2 text-[13px]"
            placeholder="Bu rotasyonun kariyer hedeflerinize katkısını, hangi becerileri geliştirmek istediğinizi ve ekibe nasıl değer katacağınızı anlatın."
            required
          />
          {!reasonValid && reasonLen > 0 && (
            <span className="text-[11px] text-amber">
              Daha somut bir gerekçe onay şansınızı arttırır.
            </span>
          )}
        </label>

        <label className="flex flex-col gap-1">
          <span className="text-[12px] font-medium text-ink-80">Başlangıç tarihi (opsiyonel)</span>
          <input
            data-testid="rotation-start-date"
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            min={new Date(Date.now() + 14 * 86400000).toISOString().slice(0, 10)}
            className="rounded-md border border-line bg-bg px-2 py-2 text-[13px]"
          />
          <span className="text-[11px] text-ink-40">
            Onay sürecinin ortalaması 2 haftadır; mümkünse 14 gün sonrasını seçin.
          </span>
        </label>
      </div>

      <div className="flex items-center justify-end gap-2">
        <button
          type="button"
          onClick={onDone}
          className="rounded-md border border-line bg-bg px-3 py-1.5 text-[12px] font-medium text-ink-60"
        >
          İptal
        </button>
        <button
          type="submit"
          data-testid="rotation-submit"
          disabled={!canSubmit}
          className="inline-flex items-center gap-2 rounded-md bg-accent px-3 py-1.5 text-[12px] font-medium text-white hover:bg-accent/90 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {createMut.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Repeat className="h-4 w-4" />}
          Talep gönder
        </button>
      </div>
    </form>
  );
}

/* ─── Kanban + Tablo ─── */

function KanbanView({ rotations }: { rotations: RotationRow[] }) {
  return (
    <div className="grid gap-3 md:grid-cols-4" data-testid="rotation-kanban">
      {KANBAN_COLUMNS.map((col) => {
        const items = rotations.filter((r) => r.status === col.key);
        return (
          <div
            key={col.key}
            data-testid={`kanban-col-${col.key}`}
            className="flex flex-col gap-2 rounded-xl border border-line bg-bg p-3"
          >
            <div className="flex items-center justify-between">
              <span className="text-[12px] font-semibold text-ink">{col.label}</span>
              <span className="rounded-full bg-bg-2 px-2 py-0.5 text-[10px] font-medium text-ink-60">
                {items.length}
              </span>
            </div>
            {items.length === 0 ? (
              <div className="rounded-md border border-dashed border-line bg-bg-2 py-4 text-center text-[11px] text-ink-40">
                Yok
              </div>
            ) : (
              items.map((r) => (
                <div
                  key={r.id}
                  className="rounded-md border border-line bg-bg-2 p-2 text-[11px]"
                >
                  <div className="font-medium text-ink">
                    {r.to_position_title ?? r.to_position_id.slice(0, 8)}
                  </div>
                  <div className="mt-0.5 text-ink-40">
                    {new Date(r.created_at).toLocaleDateString('tr-TR')}
                  </div>
                </div>
              ))
            )}
          </div>
        );
      })}
    </div>
  );
}

function RotationTable({ rotations }: { rotations: RotationRow[] }) {
  return (
    <div className="overflow-hidden rounded-xl border border-line bg-bg">
      <table className="w-full border-collapse text-sm">
        <thead className="bg-bg-2 text-[11px] uppercase tracking-wider text-ink-40">
          <tr>
            <th className="px-3 py-2 text-left">Talep tarihi</th>
            <th className="px-3 py-2 text-left">Mevcut → Hedef</th>
            <th className="px-3 py-2 text-left">Başlangıç</th>
            <th className="px-3 py-2 text-left">Durum</th>
          </tr>
        </thead>
        <tbody>
          {rotations.map((r) => (
            <tr
              key={r.id}
              className="border-t border-line"
              data-testid={`rotation-row-${r.id}`}
              data-status={r.status}
            >
              <td className="px-3 py-2 text-ink-60">
                {new Date(r.created_at).toLocaleDateString('tr-TR')}
              </td>
              <td className="px-3 py-2 text-ink">
                <span className="text-ink-60">
                  {r.from_position_title ?? r.from_position_id.slice(0, 8)}
                </span>
                <span className="mx-1 text-ink-40">→</span>
                <span className="font-medium">
                  {r.to_position_title ?? r.to_position_id.slice(0, 8)}
                </span>
              </td>
              <td className="px-3 py-2 text-ink-60">
                {r.start_date ? new Date(r.start_date).toLocaleDateString('tr-TR') : '—'}
              </td>
              <td className="px-3 py-2">
                <span
                  className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium ${STATUS_CLASS[r.status]}`}
                  data-testid={`rotation-status-${r.id}`}
                >
                  {r.status === 'approved' || r.status === 'active' ? (
                    <CheckCircle2 className="h-3 w-3" />
                  ) : r.status === 'rejected' ? (
                    <XCircle className="h-3 w-3" />
                  ) : (
                    <Clock className="h-3 w-3" />
                  )}
                  {STATUS_LABEL[r.status]}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function friendlyError(msg: string): string {
  const lower = msg.toLowerCase();
  if (lower.includes('cooldown')) {
    return 'Son rotasyonunuzun üzerinden 365 gün geçmeden yeni talep açamazsınız.';
  }
  if (lower.includes('duplicate_open') || lower.includes('already')) {
    return 'Zaten açık bir rotasyon talebiniz var. Sonuçlanmasını bekleyin.';
  }
  if (lower.includes('validation') && lower.includes('gerekçe')) {
    return `Gerekçe en az ${MIN_REASON} karakter olmalı.`;
  }
  if (lower.includes('kaynak ve hedef pozisyon aynı')) {
    return 'Hedef pozisyon mevcut pozisyonunuzdan farklı olmalı.';
  }
  if (lower.includes('tenure') || lower.includes('ineligible')) {
    return 'Rotasyon için mevcut pozisyonda en az 180 gün görev yapmış olmanız gerekir.';
  }
  return `Talep oluşturulamadı: ${msg}`;
}
