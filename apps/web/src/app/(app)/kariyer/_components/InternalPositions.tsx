'use client';

/**
 * Kariyer / İç Pozisyonlar — 9-kutu yetenek haritası.
 *
 * Canlı bağlantı:
 *   - GET /api/v1/performance/cycles?status=active   → aktif dönem
 *   - GET /api/v1/performance/nine-box/grid?cycle_id → performans × potansiyel
 *   - GET /api/v1/mobility/succession-plans/critical → kritik pozisyonlar
 *
 * Yüksek potansiyelli (high_potential, star) çalışanlar için "succession
 * havuzuna ekle" CTA'sı ile ilgili pozisyonlara deep-link verilir.
 * 0 hardcoded veri — boş state tüm branch'larda tam kapsamlı.
 */

import Link from 'next/link';
import { useMemo, useState } from 'react';
import {
  useNineBoxGrid,
  usePerformanceCycles,
  type NineBoxAssignment,
  type Band,
  type TalentSegment,
} from '@/hooks/usePerformance';
import { useCriticalPositions, type CriticalPosition } from '@/hooks/useSuccession';

/* ─── 9-Box grid (performance × potential) ───────────────────────────────
   Y axis (top→bottom) = potential:  high → medium → low
   X axis (left→right) = performance: low  → medium → high
   Segment lookup (perf, pot):
*/
const SEGMENTS: Array<{
  perf: Band;
  pot: Band;
  segment: TalentSegment;
  label: string;
  desc: string;
  bg: string;
  text: string;
  succession: boolean; // surfaces "succession suggestion" CTA
}> = [
  // Top row (high potential)
  {
    perf: 'low',
    pot: 'high',
    segment: 'dilemma',
    label: 'Dilemma',
    desc: 'Yüksek potansiyel, düşük performans',
    bg: '#FEF3C7',
    text: '#D97706',
    succession: false,
  },
  {
    perf: 'medium',
    pot: 'high',
    segment: 'high_potential',
    label: 'Yüksek Potansiyel',
    desc: 'Gelişim yatırımı + succession havuzu',
    bg: '#D1FAE5',
    text: '#059669',
    succession: true,
  },
  {
    perf: 'high',
    pot: 'high',
    segment: 'star',
    label: 'Yıldız',
    desc: 'Kritik pozisyon adayı',
    bg: '#BBF7D0',
    text: '#047857',
    succession: true,
  },
  // Middle row
  {
    perf: 'low',
    pot: 'medium',
    segment: 'inconsistent_player',
    label: 'Tutarsız',
    desc: 'Coaching + net hedef',
    bg: '#FECACA',
    text: '#B91C1C',
    succession: false,
  },
  {
    perf: 'medium',
    pot: 'medium',
    segment: 'core_player',
    label: 'Kilit Oyuncu',
    desc: 'Motivasyon + tutulum',
    bg: '#E0E7FF',
    text: '#4338CA',
    succession: false,
  },
  {
    perf: 'high',
    pot: 'medium',
    segment: 'high_performer',
    label: 'Yüksek Performans',
    desc: 'Tutulum + succession aday',
    bg: '#C7F9E1',
    text: '#065F46',
    succession: true,
  },
  // Bottom row (low potential)
  {
    perf: 'low',
    pot: 'low',
    segment: 'underperformer',
    label: 'Düşük Performans',
    desc: 'PIP / rol uyumu',
    bg: '#FEE2E2',
    text: '#991B1B',
    succession: false,
  },
  {
    perf: 'medium',
    pot: 'low',
    segment: 'reliable_contributor',
    label: 'Güvenilir Katkı',
    desc: 'Konum koruma',
    bg: '#FEF3C7',
    text: '#92400E',
    succession: false,
  },
  {
    perf: 'high',
    pot: 'low',
    segment: 'solid_performer',
    label: 'Sağlam Performans',
    desc: 'Uzmanlık yolu',
    bg: '#DBEAFE',
    text: '#1D4ED8',
    succession: false,
  },
];

// Visual band → cell ordering indexes.
const POT_ROWS: Band[] = ['high', 'medium', 'low']; // top→bottom
const PERF_COLS: Band[] = ['low', 'medium', 'high']; // left→right

export const InternalPositions = () => {
  // 1) Aktif performans dönemi (cycle) → nine-box grid zorunlu cycle_id ister.
  const cycles = usePerformanceCycles('active');
  const activeCycle = useMemo(
    () => cycles.data?.items?.[0] ?? null,
    [cycles.data?.items],
  );

  // 2) Nine-box grid — cycle varsa çağrılır.
  const grid = useNineBoxGrid(activeCycle?.id ?? null);

  // 3) Kritik pozisyonlar (succession önerisi için).
  const critical = useCriticalPositions();

  const [selectedSegment, setSelectedSegment] = useState<TalentSegment | null>(null);

  const bySegment = useMemo(() => {
    const map = new Map<TalentSegment, NineBoxAssignment[]>();
    for (const a of grid.data?.items ?? []) {
      const seg = (a.talent_segment ?? 'core_player') as TalentSegment;
      const arr = map.get(seg) ?? [];
      arr.push(a);
      map.set(seg, arr);
    }
    return map;
  }, [grid.data?.items]);

  const totalAssigned = grid.data?.items?.length ?? 0;
  const suggestedHiPo = useMemo(
    () =>
      (bySegment.get('high_potential') ?? []).concat(
        bySegment.get('star') ?? [],
        bySegment.get('high_performer') ?? [],
      ),
    [bySegment],
  );

  /* ─── Render branches ─── */

  if (cycles.isLoading) {
    return <FullSkeleton />;
  }

  if (cycles.isError) {
    return (
      <ErrorState
        title="Performans dönemleri yüklenemedi"
        detail={
          cycles.error instanceof Error
            ? cycles.error.message
            : 'Gateway ile bağlantı kurulamadı.'
        }
        onRetry={() => cycles.refetch()}
      />
    );
  }

  if (!activeCycle) {
    return <NoCycleEmpty />;
  }

  if (grid.isLoading) {
    return <FullSkeleton />;
  }

  if (grid.isError) {
    return (
      <ErrorState
        title="9-kutu verisi yüklenemedi"
        detail={
          grid.error instanceof Error ? grid.error.message : 'Gateway yanıt vermedi.'
        }
        onRetry={() => grid.refetch()}
      />
    );
  }

  if (totalAssigned === 0) {
    return <NoAssignmentsEmpty cycleLabel={activeCycle.name_tr} />;
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <div className="text-xs uppercase tracking-wide text-[#888]">
            {activeCycle.name_tr} · aktif dönem
          </div>
          <h2 className="mt-1 text-xl font-bold text-[#111]">
            9-Kutu Yetenek Haritası
          </h2>
          <p className="mt-1 text-sm text-[#888]">
            {totalAssigned} çalışan atandı · {suggestedHiPo.length} yüksek potansiyel succession adayı
          </p>
        </div>
        <Link
          href="/admin/succession/pozisyonlar"
          className="rounded-md bg-[#5E5CE6] px-3 py-2 text-sm font-semibold text-white hover:bg-[#4F4DD1]"
        >
          Kritik Pozisyonlar →
        </Link>
      </div>

      {/* 9-box */}
      <div data-testid="nine-box-grid" className="rounded-xl border border-[#EDEDED] bg-white p-4">
        {/* Axis labels */}
        <div className="relative grid grid-cols-[56px_1fr] gap-2">
          <div className="flex flex-col items-center justify-center text-xs font-semibold tracking-wide text-[#888]">
            <div className="-rotate-90 whitespace-nowrap">POTANSİYEL →</div>
          </div>

          {/* Box grid */}
          <div>
            <div className="grid grid-cols-3 gap-2">
              {POT_ROWS.map((pot) =>
                PERF_COLS.map((perf) => {
                  const cfg = SEGMENTS.find((c) => c.perf === perf && c.pot === pot);
                  if (!cfg) return null;
                  const cellEmployees = bySegment.get(cfg.segment) ?? [];
                  const isSelected = selectedSegment === cfg.segment;
                  return (
                    <button
                      key={cfg.segment}
                      onClick={() =>
                        setSelectedSegment(isSelected ? null : cfg.segment)
                      }
                      data-testid={`box-cell-${cfg.segment}`}
                      className="flex h-[140px] flex-col items-start rounded-lg border p-3 text-left transition-all hover:shadow-sm"
                      style={{
                        background: cfg.bg,
                        borderColor: isSelected ? cfg.text : 'transparent',
                        borderWidth: 2,
                      }}
                    >
                      <div className="flex w-full items-start justify-between">
                        <span
                          className="text-xs font-bold uppercase tracking-wide"
                          style={{ color: cfg.text }}
                        >
                          {cfg.label}
                        </span>
                        <span
                          className="rounded-full bg-white/70 px-1.5 py-0.5 text-[11px] font-bold"
                          style={{ color: cfg.text }}
                        >
                          {cellEmployees.length}
                        </span>
                      </div>
                      <div className="mt-1 text-[11px]" style={{ color: cfg.text }}>
                        {cfg.desc}
                      </div>
                      {cfg.succession && cellEmployees.length > 0 && (
                        <div className="mt-auto">
                          <span
                            className="inline-flex items-center gap-1 rounded bg-white/80 px-2 py-0.5 text-[10px] font-semibold"
                            style={{ color: cfg.text }}
                            data-testid="succession-suggestion-badge"
                          >
                            ★ Succession önerisi
                          </span>
                        </div>
                      )}
                    </button>
                  );
                }),
              )}
            </div>
            <div className="mt-2 text-center text-xs font-semibold uppercase tracking-wide text-[#888]">
              PERFORMANS →
            </div>
          </div>
        </div>
      </div>

      {/* Segment detail drawer */}
      {selectedSegment && (
        <SegmentDrawer
          segment={selectedSegment}
          employees={bySegment.get(selectedSegment) ?? []}
          criticalPositions={critical.data?.items ?? []}
          onClose={() => setSelectedSegment(null)}
        />
      )}
    </div>
  );
};

/* ─── Sub-components ─── */

interface SegmentDrawerProps {
  segment: TalentSegment;
  employees: NineBoxAssignment[];
  criticalPositions: CriticalPosition[];
  onClose: () => void;
}

const SegmentDrawer = ({
  segment,
  employees,
  criticalPositions,
  onClose,
}: SegmentDrawerProps) => {
  const cfg = SEGMENTS.find((s) => s.segment === segment);
  if (!cfg) return null;

  return (
    <div
      data-testid="segment-drawer"
      data-segment={segment}
      className="rounded-xl border border-[#EDEDED] bg-white p-4"
    >
      <div className="flex items-start justify-between">
        <div>
          <div
            className="inline-block rounded px-2 py-0.5 text-xs font-bold"
            style={{ background: cfg.bg, color: cfg.text }}
          >
            {cfg.label}
          </div>
          <h3 className="mt-2 text-lg font-bold text-[#111]">
            {employees.length} çalışan
          </h3>
          <p className="text-sm text-[#888]">{cfg.desc}</p>
        </div>
        <button
          onClick={onClose}
          className="rounded p-1 text-[#888] hover:bg-[#FAFAFA]"
          aria-label="Kapat"
        >
          ✕
        </button>
      </div>

      {/* Employee list */}
      <div className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-2">
        {employees.map((e) => (
          <div
            key={e.id}
            className="flex items-center gap-3 rounded-lg border border-[#EDEDED] bg-[#FAFAFA] p-3"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={`https://ui-avatars.com/api/?name=${encodeURIComponent(`#${e.employee_id.slice(0, 4)}`)}&background=EEF0FD&color=5E5CE6&bold=true`}
              alt=""
              className="h-8 w-8 rounded-full"
            />
            <div className="min-w-0 flex-1">
              <div className="truncate text-sm font-semibold text-[#111]">
                #{e.employee_id.slice(0, 8)}
              </div>
              <div className="text-[11px] text-[#888]">
                Perf: {e.performance_band} · Pot: {e.potential_band}
              </div>
            </div>
            {e.recommended_action && (
              <span className="truncate text-[11px] italic text-[#5E5CE6]">
                {e.recommended_action}
              </span>
            )}
          </div>
        ))}
      </div>

      {/* Succession suggestion — only if segment is high-potential-ish */}
      {cfg.succession && criticalPositions.length > 0 && (
        <div className="mt-5 rounded-lg border border-dashed border-[#5E5CE6] bg-[#FAFAFF] p-3">
          <div className="text-xs font-semibold uppercase tracking-wide text-[#5E5CE6]">
            ★ Succession önerisi
          </div>
          <p className="mt-1 text-sm text-[#555]">
            Bu segmentteki çalışanlar aşağıdaki kritik pozisyonlara aday olarak
            değerlendirilebilir:
          </p>
          <div className="mt-2 flex flex-col gap-1">
            {criticalPositions.slice(0, 4).map((p) => (
              <Link
                key={p.plan_id}
                href={`/admin/succession/havuz/${p.plan_id}`}
                data-testid="succession-suggestion-link"
                className="flex items-center justify-between rounded bg-white px-3 py-2 text-sm hover:bg-[#FAFAFF]"
              >
                <span className="font-medium text-[#111]">
                  {p.position_title_tr || 'Pozisyon'}
                </span>
                <span className="text-xs text-[#888]">
                  {p.candidate_count} aday · havuzu aç →
                </span>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

/* ─── States ─── */

const FullSkeleton = () => (
  <div className="flex flex-col gap-6">
    <div className="h-7 w-56 animate-pulse rounded bg-[#F5F5F5]" />
    <div className="rounded-xl border border-[#EDEDED] bg-white p-4">
      <div className="grid grid-cols-3 gap-2">
        {Array.from({ length: 9 }).map((_, i) => (
          <div
            key={i}
            className="h-[140px] animate-pulse rounded-lg bg-[#F5F5F5]"
          />
        ))}
      </div>
    </div>
  </div>
);

interface ErrorStateProps {
  title: string;
  detail: string;
  onRetry: () => void;
}

const ErrorState = ({ title, detail, onRetry }: ErrorStateProps) => (
  <div className="flex items-center justify-between rounded-xl border border-[#FECACA] bg-[#FEF2F2] px-4 py-3">
    <div>
      <div className="font-semibold text-[#991B1B]">{title}</div>
      <div className="mt-1 text-xs text-[#B91C1C]/80">{detail}</div>
    </div>
    <button
      onClick={onRetry}
      className="rounded border border-[#FECACA] bg-white px-3 py-1.5 text-xs font-semibold hover:bg-[#FEF2F2]"
    >
      Tekrar dene
    </button>
  </div>
);

const NoCycleEmpty = () => (
  <div
    data-testid="no-cycle-empty"
    className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-[#D4D4D4] bg-[#FAFAFA] px-6 py-14 text-center"
  >
    <div className="text-lg font-semibold text-[#111]">Aktif performans dönemi yok</div>
    <p className="max-w-md text-sm text-[#888]">
      9-kutu yetenek haritası için önce bir performans dönemi açılmalı.
    </p>
    <Link
      href="/performans/canli"
      className="rounded-md bg-[#5E5CE6] px-4 py-2 text-sm font-semibold text-white hover:bg-[#4F4DD1]"
    >
      Performans modülüne git
    </Link>
  </div>
);

const NoAssignmentsEmpty = ({ cycleLabel }: { cycleLabel: string }) => (
  <div
    data-testid="no-assignments-empty"
    className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-[#D4D4D4] bg-[#FAFAFA] px-6 py-14 text-center"
  >
    <div className="text-lg font-semibold text-[#111]">
      &quot;{cycleLabel}&quot; için henüz atama yok
    </div>
    <p className="max-w-md text-sm text-[#888]">
      Kalibrasyon toplantısı düzenleyerek çalışanları 9-kutu segmentlerine yerleştirin.
    </p>
    <Link
      href="/performans/canli"
      className="rounded-md bg-[#5E5CE6] px-4 py-2 text-sm font-semibold text-white hover:bg-[#4F4DD1]"
    >
      Kalibrasyon toplantısı aç
    </Link>
  </div>
);
