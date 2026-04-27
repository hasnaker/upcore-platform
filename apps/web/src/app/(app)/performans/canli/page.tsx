'use client';

import { useMemo, useState } from 'react';
import { AlertCircle, Loader2, Plus, Sparkles } from 'lucide-react';
import {
  usePerformanceCycles,
  useCreateCycle,
  useAdvanceCycle,
  useNineBoxGrid,
  usePerformanceGoals,
  type PerformanceCycle,
  type Band,
  type TalentSegment,
} from '@/hooks/usePerformance';

/**
 * Canlı performans kontrol paneli — gateway üzerinden services/performance'a
 * gerçek çağrılar yapar. Seçili cycle için 9-box dağılımı + hedef durumunu
 * gösterir.
 */
export default function CanliPerformansPage() {
  const [selectedCycleId, setSelectedCycleId] = useState<string | null>(null);

  const cyclesQuery = usePerformanceCycles();
  const cycles = cyclesQuery.data?.items ?? [];

  const activeCycleId = selectedCycleId ?? cycles[0]?.id ?? null;
  const activeCycle = cycles.find((c) => c.id === activeCycleId) ?? null;

  return (
    <div className="flex flex-col gap-6">
      <header className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-[#0A0A0A]">
            Canlı Performans Paneli
          </h1>
          <p className="mt-1 text-sm text-[#737373]">
            Performance servisinden gerçek zamanlı veri — dönem, hedefler ve 9-box dağılımı.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <CreateCycleButton />
        </div>
      </header>

      <CycleSelector
        cycles={cycles}
        loading={cyclesQuery.isLoading}
        error={cyclesQuery.error}
        selectedId={activeCycleId}
        onSelect={setSelectedCycleId}
      />

      {activeCycle ? (
        <>
          <CycleHeader cycle={activeCycle} />
          <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
            <NineBoxPanel cycleId={activeCycle.id} />
            <GoalsPanel cycleId={activeCycle.id} />
          </div>
        </>
      ) : !cyclesQuery.isLoading ? (
        <EmptyState />
      ) : null}
    </div>
  );
}

/* ─── Cycle Selector ─── */

function CycleSelector({
  cycles,
  loading,
  error,
  selectedId,
  onSelect,
}: {
  cycles: PerformanceCycle[];
  loading: boolean;
  error: Error | null;
  selectedId: string | null;
  onSelect: (id: string) => void;
}) {
  if (loading) {
    return (
      <div className="inline-flex items-center gap-2 text-sm text-[#737373]">
        <Loader2 className="h-4 w-4 animate-spin" />
        Dönemler yükleniyor…
      </div>
    );
  }
  if (error) {
    return <ErrorBanner message={`Dönemler yüklenemedi: ${error.message}`} />;
  }
  if (cycles.length === 0) {
    return null;
  }
  return (
    <div className="flex items-center gap-2">
      <label htmlFor="cycle" className="text-xs font-medium uppercase tracking-wider text-[#737373]">
        Dönem
      </label>
      <select
        id="cycle"
        value={selectedId ?? ''}
        onChange={(e) => onSelect(e.target.value)}
        className="rounded-md border border-[#EDEDED] bg-white px-3 py-2 text-sm text-[#0A0A0A] focus:border-[#5E5CE6] focus:outline-none"
      >
        {cycles.map((c) => (
          <option key={c.id} value={c.id}>
            {c.name_tr} — {c.status}
          </option>
        ))}
      </select>
    </div>
  );
}

/* ─── Cycle Header ─── */

function CycleHeader({ cycle }: { cycle: PerformanceCycle }) {
  const advance = useAdvanceCycle(cycle.id);
  const canAdvance = cycle.status !== 'archived';
  return (
    <div className="rounded-xl border border-[#EDEDED] bg-white p-5">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs font-medium uppercase tracking-wider text-[#737373]">
            Aktif Dönem
          </p>
          <h2 className="mt-1 text-xl font-semibold text-[#0A0A0A]">{cycle.name_tr}</h2>
          <p className="mt-1 text-sm text-[#525252]">
            {formatDate(cycle.period_start)} → {formatDate(cycle.period_end)} ·{' '}
            <StatusBadge status={cycle.status} />
          </p>
        </div>
        <button
          type="button"
          onClick={() => advance.mutate({})}
          disabled={!canAdvance || advance.isPending}
          className="inline-flex items-center gap-2 rounded-md border border-[#EDEDED] px-3 py-2 text-sm text-[#0A0A0A] hover:bg-[#FAFAFA] disabled:opacity-50"
        >
          {advance.isPending ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Sparkles className="h-4 w-4" />
          )}
          Sonraki aşamaya geç
        </button>
      </div>
      {advance.error ? (
        <p className="mt-2 text-xs text-[#DC2626]">Geçiş başarısız: {advance.error.message}</p>
      ) : null}
    </div>
  );
}

/* ─── 9-Box Panel ─── */

const BAND_ORDER: Band[] = ['high', 'medium', 'low']; // row order: high potential at top

function NineBoxPanel({ cycleId }: { cycleId: string }) {
  const grid = useNineBoxGrid(cycleId);

  const byCell = useMemo(() => {
    const map = new Map<string, number>();
    for (const a of grid.data?.items ?? []) {
      const key = `${a.performance_band}:${a.potential_band}`;
      map.set(key, (map.get(key) ?? 0) + 1);
    }
    return map;
  }, [grid.data]);

  return (
    <section className="rounded-xl border border-[#EDEDED] bg-white p-5">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold text-[#0A0A0A]">9-Box Dağılımı</h3>
          <p className="text-xs text-[#737373]">Yetenek segmentleri × performans bandı</p>
        </div>
        <span className="text-xs text-[#737373]">
          Toplam: {grid.data?.items.length ?? 0}
        </span>
      </div>

      {grid.isLoading ? (
        <div className="mt-6 flex h-64 items-center justify-center text-sm text-[#737373]">
          <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Yükleniyor…
        </div>
      ) : grid.error ? (
        <div className="mt-6">
          <ErrorBanner message={grid.error.message} />
        </div>
      ) : (
        <div className="mt-4 grid grid-cols-[auto_1fr_1fr_1fr] gap-1">
          <div />
          <HeaderCell>Düşük Performans</HeaderCell>
          <HeaderCell>Orta Performans</HeaderCell>
          <HeaderCell>Yüksek Performans</HeaderCell>
          {BAND_ORDER.map((potBand) => (
            <RowGroup key={potBand}>
              <AxisLabel>
                {potBand === 'high' ? 'Yüksek Potansiyel' :
                  potBand === 'medium' ? 'Orta Potansiyel' : 'Düşük Potansiyel'}
              </AxisLabel>
              {(['low', 'medium', 'high'] as Band[]).map((perfBand) => (
                <BoxCell
                  key={`${perfBand}:${potBand}`}
                  perfBand={perfBand}
                  potBand={potBand}
                  count={byCell.get(`${perfBand}:${potBand}`) ?? 0}
                />
              ))}
            </RowGroup>
          ))}
        </div>
      )}
    </section>
  );
}

function HeaderCell({ children }: { children: React.ReactNode }) {
  return (
    <div className="text-center text-[11px] font-medium uppercase tracking-wider text-[#737373]">
      {children}
    </div>
  );
}

function AxisLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-center px-2 text-[11px] font-medium text-[#737373]">
      {children}
    </div>
  );
}

function RowGroup({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}

function BoxCell({ perfBand, potBand, count }: { perfBand: Band; potBand: Band; count: number }) {
  const segment: TalentSegment =
    potBand === 'high' && perfBand === 'high' ? 'star' :
    potBand === 'high' && perfBand === 'medium' ? 'high_potential' :
    potBand === 'high' && perfBand === 'low' ? 'dilemma' :
    potBand === 'medium' && perfBand === 'high' ? 'high_performer' :
    potBand === 'medium' && perfBand === 'medium' ? 'core_player' :
    potBand === 'medium' && perfBand === 'low' ? 'inconsistent_player' :
    potBand === 'low' && perfBand === 'high' ? 'solid_performer' :
    potBand === 'low' && perfBand === 'medium' ? 'reliable_contributor' :
    'underperformer';

  const tone = CELL_TONES[segment];
  return (
    <div
      className={`flex flex-col items-center justify-center rounded-md border p-3 ${tone.bg} ${tone.border}`}
      title={SEGMENT_LABEL[segment]}
    >
      <span className={`text-xs font-medium ${tone.text}`}>{SEGMENT_LABEL[segment]}</span>
      <span className={`mt-1 text-lg font-semibold ${tone.text}`}>{count}</span>
    </div>
  );
}

const SEGMENT_LABEL: Record<TalentSegment, string> = {
  star: 'Yıldız',
  high_performer: 'Yüksek Perf.',
  solid_performer: 'Sağlam Perf.',
  high_potential: 'Y. Potansiyel',
  core_player: 'Kilit Oyuncu',
  reliable_contributor: 'Güvenilir',
  dilemma: 'Dilemma',
  inconsistent_player: 'Tutarsız',
  underperformer: 'Düşük Perf.',
};

const CELL_TONES: Record<TalentSegment, { bg: string; border: string; text: string }> = {
  star: { bg: 'bg-[#DCFCE7]', border: 'border-[#86EFAC]', text: 'text-[#14532D]' },
  high_performer: { bg: 'bg-[#ECFDF5]', border: 'border-[#A7F3D0]', text: 'text-[#065F46]' },
  solid_performer: { bg: 'bg-[#FFFBEB]', border: 'border-[#FDE68A]', text: 'text-[#92400E]' },
  high_potential: { bg: 'bg-[#ECFDF5]', border: 'border-[#A7F3D0]', text: 'text-[#065F46]' },
  core_player: { bg: 'bg-[#FFFBEB]', border: 'border-[#FDE68A]', text: 'text-[#92400E]' },
  reliable_contributor: { bg: 'bg-[#FEF2F2]', border: 'border-[#FECACA]', text: 'text-[#991B1B]' },
  dilemma: { bg: 'bg-[#FFFBEB]', border: 'border-[#FDE68A]', text: 'text-[#92400E]' },
  inconsistent_player: { bg: 'bg-[#FEF2F2]', border: 'border-[#FECACA]', text: 'text-[#991B1B]' },
  underperformer: { bg: 'bg-[#FEE2E2]', border: 'border-[#FCA5A5]', text: 'text-[#7F1D1D]' },
};

/* ─── Goals Panel ─── */

function GoalsPanel({ cycleId }: { cycleId: string }) {
  const goals = usePerformanceGoals({ cycle_id: cycleId });
  const buckets = useMemo(() => {
    const items = goals.data?.items ?? [];
    const map: Record<string, number> = {};
    for (const g of items) {
      map[g.status] = (map[g.status] ?? 0) + 1;
    }
    return map;
  }, [goals.data]);

  const total = goals.data?.items.length ?? 0;

  return (
    <aside className="rounded-xl border border-[#EDEDED] bg-white p-5">
      <h3 className="text-sm font-semibold text-[#0A0A0A]">Hedef Durumu</h3>
      <p className="text-xs text-[#737373]">Bu döneme ait SMART hedeflerin özeti</p>

      {goals.isLoading ? (
        <div className="mt-4 flex items-center gap-2 text-sm text-[#737373]">
          <Loader2 className="h-4 w-4 animate-spin" />
          Yükleniyor…
        </div>
      ) : goals.error ? (
        <div className="mt-4">
          <ErrorBanner message={goals.error.message} />
        </div>
      ) : total === 0 ? (
        <p className="mt-4 text-sm text-[#737373]">Henüz hedef yok.</p>
      ) : (
        <ul className="mt-4 space-y-2">
          {(
            [
              ['on_track', 'Yolunda', '#16A34A'],
              ['active', 'Aktif', '#5E5CE6'],
              ['at_risk', 'Risk altında', '#D97706'],
              ['completed', 'Tamamlandı', '#059669'],
              ['missed', 'Kaçırıldı', '#DC2626'],
              ['draft', 'Taslak', '#737373'],
              ['deferred', 'Ertelendi', '#737373'],
              ['cancelled', 'İptal', '#737373'],
            ] as const
          ).map(([key, label, color]) => {
            const count = buckets[key] ?? 0;
            if (count === 0) return null;
            const pct = total > 0 ? Math.round((count / total) * 100) : 0;
            return (
              <li key={key} className="flex items-center gap-3 text-sm">
                <span className="w-28 text-[#525252]">{label}</span>
                <div className="flex-1 overflow-hidden rounded-full bg-[#F5F5F5]">
                  <div
                    className="h-2 rounded-full"
                    style={{ width: `${pct}%`, background: color }}
                  />
                </div>
                <span className="w-10 text-right font-medium tabular-nums text-[#0A0A0A]">
                  {count}
                </span>
              </li>
            );
          })}
        </ul>
      )}
      <p className="mt-4 text-xs text-[#737373]">Toplam hedef: {total}</p>
    </aside>
  );
}

/* ─── Create Cycle Button ─── */

function CreateCycleButton() {
  const mutate = useCreateCycle();
  const [open, setOpen] = useState(false);
  const today = new Date();
  const defaultName = `${today.getFullYear()} Q${Math.floor(today.getMonth() / 3) + 1}`;
  const [name, setName] = useState(defaultName);
  const [start, setStart] = useState(
    new Date(today.getFullYear(), Math.floor(today.getMonth() / 3) * 3, 1)
      .toISOString()
      .slice(0, 10),
  );
  const [end, setEnd] = useState(
    new Date(today.getFullYear(), Math.floor(today.getMonth() / 3) * 3 + 3, 0)
      .toISOString()
      .slice(0, 10),
  );

  const submit = () => {
    mutate.mutate(
      {
        name_tr: name.trim(),
        cycle_type: 'quarterly',
        period_start: start,
        period_end: end,
      },
      { onSuccess: () => setOpen(false) },
    );
  };

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="inline-flex items-center gap-2 rounded-md bg-[#5E5CE6] px-3 py-2 text-sm font-medium text-white hover:bg-[#4B49B6]"
      >
        <Plus className="h-4 w-4" />
        Yeni Dönem
      </button>
      {open ? (
        <div className="absolute right-0 top-full z-50 mt-2 w-80 rounded-xl border border-[#EDEDED] bg-white p-4 shadow-lg">
          <p className="text-sm font-semibold text-[#0A0A0A]">Yeni Performans Dönemi</p>
          <div className="mt-3 space-y-3">
            <Field label="Ad">
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full rounded-md border border-[#EDEDED] px-2 py-1.5 text-sm"
              />
            </Field>
            <div className="grid grid-cols-2 gap-2">
              <Field label="Başlangıç">
                <input
                  type="date"
                  value={start}
                  onChange={(e) => setStart(e.target.value)}
                  className="w-full rounded-md border border-[#EDEDED] px-2 py-1.5 text-sm"
                />
              </Field>
              <Field label="Bitiş">
                <input
                  type="date"
                  value={end}
                  onChange={(e) => setEnd(e.target.value)}
                  className="w-full rounded-md border border-[#EDEDED] px-2 py-1.5 text-sm"
                />
              </Field>
            </div>
          </div>
          {mutate.error ? (
            <p className="mt-2 text-xs text-[#DC2626]">Hata: {mutate.error.message}</p>
          ) : null}
          <div className="mt-4 flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="rounded-md border border-[#EDEDED] px-3 py-1.5 text-sm text-[#525252] hover:bg-[#FAFAFA]"
            >
              İptal
            </button>
            <button
              type="button"
              onClick={submit}
              disabled={mutate.isPending || !name.trim()}
              className="rounded-md bg-[#5E5CE6] px-3 py-1.5 text-sm font-medium text-white hover:bg-[#4B49B6] disabled:opacity-50"
            >
              {mutate.isPending ? 'Oluşturuluyor…' : 'Oluştur'}
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-[11px] font-medium uppercase tracking-wider text-[#737373]">
        {label}
      </span>
      {children}
    </label>
  );
}

/* ─── Empty + Error states ─── */

function EmptyState() {
  return (
    <div className="rounded-xl border border-dashed border-[#EDEDED] bg-[#FAFAFA] px-6 py-10 text-center">
      <p className="text-sm font-medium text-[#0A0A0A]">Henüz performans dönemi yok</p>
      <p className="mt-1 text-xs text-[#737373]">
        Bir dönem oluşturarak hedef atama ve 9-box kalibrasyonuna başlayın.
      </p>
    </div>
  );
}

function ErrorBanner({ message }: { message: string }) {
  return (
    <div className="flex items-start gap-2 rounded-md border border-[#FECACA] bg-[#FEF2F2] p-3 text-[12px] text-[#991B1B]">
      <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
      <span>{message}</span>
    </div>
  );
}

function StatusBadge({ status }: { status: PerformanceCycle['status'] }) {
  return (
    <span className="inline-flex items-center rounded-full bg-[#EEF2FF] px-2 py-0.5 text-[11px] font-medium text-[#5E5CE6]">
      {status}
    </span>
  );
}

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString('tr-TR');
  } catch {
    return iso;
  }
}
