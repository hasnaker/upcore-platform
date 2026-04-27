'use client';

import React, { useState, useCallback, useMemo } from 'react';
import { ArrowLeft, GripVertical, Users, TrendingUp } from 'lucide-react';
import Link from 'next/link';
import {
  usePerformanceCycles,
  useNineBoxGrid,
  useUpsertNineBox,
  type NineBoxAssignment,
  type Band,
} from '@/hooks/usePerformance';
import { useEmployees } from '@/hooks/useEmployees';

/* ─────────────────────────────────────────────────────────────
 * 9-Box Matrix — /performans/9box
 * Canlı veri: performance svc nine-box/grid + employees svc
 * Drag & drop → POST /api/v1/performance/nine-box (optimistic + rollback)
 * ───────────────────────────────────────────────────────────── */

interface EmployeeCell {
  id: string;
  name: string;
  department: string;
  performance: Band;
  potential: Band;
  avatar: string;
  assignmentId?: string;
}

interface CellConfig {
  perfLevel: Band;
  potLevel: Band;
  label: string;
  description: string;
  bgColor: string;
  borderColor: string;
  textColor: string;
}

const GRID_CELLS: CellConfig[] = [
  // Row 1 (High Potential) — üst
  { perfLevel: 'low', potLevel: 'high', label: 'İyileştir', description: 'Yüksek potansiyel, düşük performans', bgColor: '#FFFBEB', borderColor: '#FDE68A', textColor: '#92400E' },
  { perfLevel: 'medium', potLevel: 'high', label: 'Yatırım Yap', description: 'Yüksek potansiyel, orta performans', bgColor: '#ECFDF5', borderColor: '#A7F3D0', textColor: '#065F46' },
  { perfLevel: 'high', potLevel: 'high', label: 'Yıldız', description: 'Yüksek potansiyel, yüksek performans', bgColor: '#DCFCE7', borderColor: '#86EFAC', textColor: '#14532D' },
  // Row 2 (Medium Potential) — orta
  { perfLevel: 'low', potLevel: 'medium', label: 'Riskli', description: 'Orta potansiyel, düşük performans', bgColor: '#FEF2F2', borderColor: '#FECACA', textColor: '#991B1B' },
  { perfLevel: 'medium', potLevel: 'medium', label: 'Çekirdek', description: 'Orta potansiyel, orta performans', bgColor: '#FFFBEB', borderColor: '#FDE68A', textColor: '#92400E' },
  { perfLevel: 'high', potLevel: 'medium', label: 'Güçlü', description: 'Orta potansiyel, yüksek performans', bgColor: '#ECFDF5', borderColor: '#A7F3D0', textColor: '#065F46' },
  // Row 3 (Low Potential) — alt
  { perfLevel: 'low', potLevel: 'low', label: 'Ayrılık?', description: 'Düşük potansiyel, düşük performans', bgColor: '#FEE2E2', borderColor: '#FCA5A5', textColor: '#7F1D1D' },
  { perfLevel: 'medium', potLevel: 'low', label: 'İzle', description: 'Düşük potansiyel, orta performans', bgColor: '#FEF2F2', borderColor: '#FECACA', textColor: '#991B1B' },
  { perfLevel: 'high', potLevel: 'low', label: 'Uzman', description: 'Düşük potansiyel, yüksek performans', bgColor: '#FFFBEB', borderColor: '#FDE68A', textColor: '#92400E' },
];

const makeInitials = (name: string): string =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((n) => n[0]?.toLocaleUpperCase('tr-TR') ?? '')
    .join('') || '??';

const BAND_LABELS: Record<Band, string> = {
  low: 'Düşük',
  medium: 'Orta',
  high: 'Yüksek',
};

/* ─── Employee Chip ─── */

const EmployeeChip = ({
  employee,
  onDragStart,
  compact,
  disabled,
}: {
  employee: EmployeeCell;
  onDragStart: (e: React.DragEvent, emp: EmployeeCell) => void;
  compact?: boolean;
  disabled?: boolean;
}) => {
  const baseClass = compact
    ? 'flex items-center gap-1.5 rounded-md bg-white/80 px-2 py-1 text-[11px] shadow-sm transition hover:shadow'
    : 'flex items-center gap-2 rounded-lg bg-white/80 px-2.5 py-1.5 shadow-sm transition hover:shadow-md';

  return (
    <div
      draggable={!disabled}
      onDragStart={(e) => !disabled && onDragStart(e, employee)}
      className={`${baseClass} ${disabled ? 'cursor-default opacity-60' : 'cursor-grab active:cursor-grabbing'}`}
    >
      <GripVertical className={compact ? 'h-3 w-3 text-[#D4D4D4]' : 'h-3.5 w-3.5 text-[#D4D4D4]'} />
      <div
        className={`flex items-center justify-center rounded-full bg-[#f0f0ff] font-bold text-[#5E5CE6] ${compact ? 'h-5 w-5 text-[8px]' : 'h-6 w-6 text-[9px]'}`}
      >
        {employee.avatar}
      </div>
      {compact ? (
        <span className="font-medium text-[#0A0A0A]">{employee.name.split(' ')[0]}</span>
      ) : (
        <div className="min-w-0 flex-1">
          <div className="truncate text-[11px] font-medium text-[#0A0A0A]">{employee.name}</div>
          <div className="truncate text-[10px] text-[#737373]">{employee.department}</div>
        </div>
      )}
    </div>
  );
};

/* ─── Grid Cell ─── */

const GridCell = ({
  config,
  employees,
  onDragStart,
  onDrop,
  selectedCell,
  onSelectCell,
  calibrationLocked,
}: {
  config: CellConfig;
  employees: EmployeeCell[];
  onDragStart: (e: React.DragEvent, emp: EmployeeCell) => void;
  onDrop: (e: React.DragEvent, perf: Band, pot: Band) => void;
  selectedCell: string | null;
  onSelectCell: (k: string | null) => void;
  calibrationLocked: boolean;
}) => {
  const cellKey = `${config.perfLevel}-${config.potLevel}`;
  const isSelected = selectedCell === cellKey;

  return (
    <div
      onDragOver={(e) => {
        e.preventDefault();
        e.currentTarget.style.outline = `2px solid ${config.borderColor}`;
      }}
      onDragLeave={(e) => {
        e.currentTarget.style.outline = 'none';
      }}
      onDrop={(e) => {
        e.currentTarget.style.outline = 'none';
        onDrop(e, config.perfLevel, config.potLevel);
      }}
      onClick={() => onSelectCell(isSelected ? null : cellKey)}
      className="flex min-h-[140px] cursor-pointer flex-col rounded-xl border-2 p-3 transition-all hover:shadow-md"
      style={{
        background: config.bgColor,
        borderColor: isSelected ? config.textColor : config.borderColor,
      }}
      data-testid={`ninebox-cell-${cellKey}`}
    >
      <div className="mb-2 flex items-center justify-between">
        <span className="text-[12px] font-bold" style={{ color: config.textColor }}>
          {config.label}
        </span>
        <span
          className="flex h-6 w-6 items-center justify-center rounded-full text-[11px] font-bold"
          style={{ background: `${config.textColor}15`, color: config.textColor }}
        >
          {employees.length}
        </span>
      </div>

      <div className="flex flex-1 flex-col gap-1.5 overflow-y-auto">
        {employees.length === 0 && (
          <span className="text-[10px] italic" style={{ color: `${config.textColor}80` }}>
            Çalışan yok
          </span>
        )}
        {employees.slice(0, isSelected ? undefined : 3).map((emp) => (
          <EmployeeChip
            key={emp.id}
            employee={emp}
            onDragStart={onDragStart}
            compact={!isSelected}
            disabled={calibrationLocked}
          />
        ))}
        {!isSelected && employees.length > 3 && (
          <span className="text-[10px] font-medium" style={{ color: config.textColor }}>
            +{employees.length - 3} daha…
          </span>
        )}
      </div>
    </div>
  );
};

/* ─── Bias Denetimi ─── */

const BiasAudit = ({ employees }: { employees: EmployeeCell[] }) => {
  const stars = employees.filter((e) => e.performance === 'high' && e.potential === 'high');
  const risky = employees.filter((e) => e.performance === 'low');

  const deptCount = (list: EmployeeCell[]) => {
    const map = new Map<string, number>();
    list.forEach((e) => map.set(e.department || 'Bilinmiyor', (map.get(e.department || 'Bilinmiyor') ?? 0) + 1));
    return Array.from(map.entries()).sort((a, b) => b[1] - a[1]);
  };

  const starDepts = deptCount(stars);
  const riskyDepts = deptCount(risky);
  const topStarDept = starDepts[0];
  const topRiskyDept = riskyDepts[0];

  const warning =
    (topStarDept && employees.length > 0 && topStarDept[1] / Math.max(1, stars.length) >= 0.6) ||
    (topRiskyDept && employees.length > 0 && topRiskyDept[1] / Math.max(1, risky.length) >= 0.6);

  return (
    <div
      className="rounded-xl border p-4"
      style={{
        background: warning ? '#FFFBEB' : '#F0FDF4',
        borderColor: warning ? '#FDE68A' : '#BBF7D0',
      }}
    >
      <div className="flex items-center gap-2">
        <span
          className="text-[11px] font-bold uppercase tracking-widest"
          style={{ color: warning ? '#92400E' : '#065F46' }}
        >
          Bias Denetimi
        </span>
        {warning && (
          <span className="rounded bg-white px-1.5 py-0.5 text-[10px] font-semibold text-[#92400E]">
            Dikkat
          </span>
        )}
      </div>
      <div className="mt-2 grid grid-cols-2 gap-3 text-[12px]">
        <div>
          <div className="text-[#525252]">Yıldızlar departman dağılımı</div>
          {starDepts.length === 0 ? (
            <div className="text-[#A3A3A3]">Yıldız yok</div>
          ) : (
            starDepts.slice(0, 3).map(([d, c]) => (
              <div key={d} className="flex justify-between">
                <span>{d}</span>
                <span className="font-semibold">{c}</span>
              </div>
            ))
          )}
        </div>
        <div>
          <div className="text-[#525252]">Riskli departman dağılımı</div>
          {riskyDepts.length === 0 ? (
            <div className="text-[#A3A3A3]">Riskli yok</div>
          ) : (
            riskyDepts.slice(0, 3).map(([d, c]) => (
              <div key={d} className="flex justify-between">
                <span>{d}</span>
                <span className="font-semibold">{c}</span>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

/* ─── Main 9-Box Page ─── */

export default function NineBoxPage() {
  // Active cycle fetch
  const cyclesQ = usePerformanceCycles();
  const activeCycle = useMemo(() => {
    const items = cyclesQ.data?.items ?? [];
    return (
      items.find((c) => ['goal_setting', 'active', 'in_review', 'calibration'].includes(c.status)) ??
      items[0] ??
      null
    );
  }, [cyclesQ.data]);

  const gridQ = useNineBoxGrid(activeCycle?.id);
  const employeesQ = useEmployees({ limit: 200 });
  const upsertMutation = useUpsertNineBox();

  // Optimistic overlay over server data
  const [optimistic, setOptimistic] = useState<Record<string, { performance: Band; potential: Band }>>({});
  const [selectedCell, setSelectedCell] = useState<string | null>(null);
  const [draggedEmployee, setDraggedEmployee] = useState<EmployeeCell | null>(null);
  const [calibrationLocked, setCalibrationLocked] = useState(false);
  const [pendingDrop, setPendingDrop] = useState<{ emp: EmployeeCell; perf: Band; pot: Band } | null>(null);
  const [toastMsg, setToastMsg] = useState<{ kind: 'success' | 'error'; text: string } | null>(null);

  const isLoading = cyclesQ.isLoading || (activeCycle && gridQ.isLoading) || employeesQ.isLoading;
  const loadError = cyclesQ.error ?? gridQ.error ?? employeesQ.error ?? null;

  // Merge server grid + employees into cells
  const employees: EmployeeCell[] = useMemo(() => {
    const empMap = new Map(employeesQ.data?.items.map((e) => [e.id, e] as const) ?? []);
    const assignments = gridQ.data?.items ?? [];

    return assignments
      .map((a: NineBoxAssignment) => {
        const emp = empMap.get(a.employee_id);
        if (!emp) return null;
        const perf = optimistic[a.employee_id]?.performance ?? a.performance_band;
        const pot = optimistic[a.employee_id]?.potential ?? a.potential_band;
        return {
          id: emp.id,
          name: emp.tamAd || `${emp.ad} ${emp.soyad}`.trim(),
          department: emp.departmanId ? emp.departmanId : '—',
          performance: perf,
          potential: pot,
          avatar: emp.initials || makeInitials(emp.tamAd || emp.ad),
          assignmentId: a.id,
        } as EmployeeCell;
      })
      .filter((e): e is EmployeeCell => e !== null);
  }, [gridQ.data, employeesQ.data, optimistic]);

  const handleDragStart = useCallback((_e: React.DragEvent, emp: EmployeeCell) => {
    setDraggedEmployee(emp);
  }, []);

  const handleDrop = useCallback(
    (_e: React.DragEvent, perf: Band, pot: Band) => {
      if (!draggedEmployee || calibrationLocked) return;
      // Ignore no-op
      if (draggedEmployee.performance === perf && draggedEmployee.potential === pot) {
        setDraggedEmployee(null);
        return;
      }
      setPendingDrop({ emp: draggedEmployee, perf, pot });
      setDraggedEmployee(null);
    },
    [draggedEmployee, calibrationLocked],
  );

  const confirmDrop = useCallback(async () => {
    if (!pendingDrop || !activeCycle) return;
    const { emp, perf, pot } = pendingDrop;
    const previous = { performance: emp.performance, potential: emp.potential };

    // Optimistic update
    setOptimistic((prev) => ({ ...prev, [emp.id]: { performance: perf, potential: pot } }));
    setPendingDrop(null);

    try {
      await upsertMutation.mutateAsync({
        cycle_id: activeCycle.id,
        employee_id: emp.id,
        performance_band: perf,
        potential_band: pot,
        calibration_notes: `drag-drop: ${previous.performance}/${previous.potential} → ${perf}/${pot}`,
      });
      setToastMsg({ kind: 'success', text: `${emp.name} kaydedildi.` });
    } catch (err) {
      // Rollback
      setOptimistic((prev) => {
        const copy = { ...prev };
        delete copy[emp.id];
        return copy;
      });
      setToastMsg({
        kind: 'error',
        text: `Kayıt başarısız: ${(err as Error)?.message ?? 'bilinmeyen hata'}`,
      });
    }
  }, [pendingDrop, activeCycle, upsertMutation]);

  const cancelDrop = useCallback(() => setPendingDrop(null), []);

  const getEmployeesForCell = (perf: Band, pot: Band) =>
    employees.filter((e) => e.performance === perf && e.potential === pot);

  const stars = employees.filter((e) => e.performance === 'high' && e.potential === 'high').length;
  const risky = employees.filter((e) => e.performance === 'low').length;

  /* ── Loading ── */
  if (isLoading) {
    return (
      <div className="flex flex-col gap-6">
        <div className="flex items-center gap-4">
          <Link
            href="/performans"
            className="flex h-9 w-9 items-center justify-center rounded-lg border border-[#e5e5e5] text-[#737373]"
          >
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-[#0A0A0A]">9-Box Matrisi</h1>
            <p className="mt-0.5 text-sm text-[#525252]">Yükleniyor…</p>
          </div>
        </div>
        <div className="grid grid-cols-3 gap-2">
          {Array.from({ length: 9 }).map((_, i) => (
            <div
              key={i}
              className="min-h-[140px] animate-pulse rounded-xl border border-[#f0f0f0] bg-[#fafafa]"
            />
          ))}
        </div>
      </div>
    );
  }

  /* ── Error ── */
  if (loadError) {
    return (
      <div className="flex flex-col gap-6">
        <div className="flex items-center gap-4">
          <Link
            href="/performans"
            className="flex h-9 w-9 items-center justify-center rounded-lg border border-[#e5e5e5] text-[#737373]"
          >
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <h1 className="text-2xl font-semibold tracking-tight text-[#0A0A0A]">9-Box Matrisi</h1>
        </div>
        <div
          role="alert"
          className="rounded-xl border border-[#FECACA] bg-[#FEF2F2] p-4 text-[#991B1B]"
        >
          <div className="font-semibold">9-Box verileri alınamadı</div>
          <div className="mt-1 text-[13px]">{loadError.message}</div>
          <button
            onClick={() => {
              cyclesQ.refetch();
              gridQ.refetch();
              employeesQ.refetch();
            }}
            className="mt-3 rounded-lg bg-[#DC2626] px-3 py-1.5 text-[12px] font-semibold text-white"
          >
            Tekrar dene
          </button>
        </div>
      </div>
    );
  }

  /* ── Empty (no active cycle) ── */
  if (!activeCycle) {
    return (
      <div className="flex flex-col gap-6">
        <div className="flex items-center gap-4">
          <Link
            href="/performans"
            className="flex h-9 w-9 items-center justify-center rounded-lg border border-[#e5e5e5] text-[#737373]"
          >
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <h1 className="text-2xl font-semibold tracking-tight text-[#0A0A0A]">9-Box Matrisi</h1>
        </div>
        <div className="rounded-xl border border-[#f0f0f0] bg-white p-8 text-center">
          <div className="text-[15px] font-semibold text-[#0A0A0A]">
            Aktif performans dönemi bulunamadı
          </div>
          <p className="mt-2 text-[13px] text-[#525252]">
            9-box kalibrasyonu için önce bir değerlendirme dönemi oluşturulmalıdır.
          </p>
          <Link
            href="/performans"
            className="mt-4 inline-block rounded-lg bg-[#5E5CE6] px-4 py-2 text-[13px] font-semibold text-white"
          >
            Performans yönetimine git
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-8">
      {/* Toast */}
      {toastMsg && (
        <div
          role="status"
          className={`fixed right-6 top-6 z-50 rounded-lg px-4 py-3 text-[13px] shadow-lg ${toastMsg.kind === 'success' ? 'bg-[#059669] text-white' : 'bg-[#DC2626] text-white'}`}
          onAnimationEnd={() => setToastMsg(null)}
        >
          {toastMsg.text}
          <button className="ml-3 underline" onClick={() => setToastMsg(null)}>
            Kapat
          </button>
        </div>
      )}

      {/* Header */}
      <div className="flex items-center gap-4">
        <Link
          href="/performans"
          className="flex h-9 w-9 items-center justify-center rounded-lg border border-[#e5e5e5] text-[#737373] transition hover:bg-[#f5f5f5] hover:text-[#0A0A0A]"
        >
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-[#0A0A0A]">9-Box Matrisi</h1>
          <p className="mt-0.5 text-sm text-[#525252]">
            Dönem: <span className="font-medium text-[#0A0A0A]">{activeCycle.name_tr}</span> · Sürükleyerek yeniden atayın.
          </p>
        </div>
      </div>

      {/* Toolbar */}
      <div className="flex items-center gap-3 rounded-xl border border-[#f0f0f0] bg-white p-4">
        <button
          onClick={() => setCalibrationLocked(!calibrationLocked)}
          className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-[12px] font-medium transition ${calibrationLocked ? 'bg-[#FEF2F2] text-[#DC2626]' : 'bg-[#ECFDF5] text-[#059669]'}`}
        >
          {calibrationLocked ? 'Kalibrasyon Kilitli' : 'Kalibrasyon Açık'}
        </button>
        {calibrationLocked && (
          <span className="text-[11px] text-[#DC2626]">Sürükle-bırak devre dışı</span>
        )}
        <div className="ml-auto text-[11px] text-[#A3A3A3]">
          {gridQ.isFetching || upsertMutation.isPending ? 'Senkronize ediliyor…' : 'Senkron'}
        </div>
      </div>

      {/* Bias Audit */}
      <BiasAudit employees={employees} />

      {/* Summary Cards */}
      <div className="grid grid-cols-3 gap-4">
        <SummaryCard label="Toplam Atama" value={employees.length} color="#0A0A0A" icon={<Users className="h-4 w-4" />} />
        <SummaryCard label="Yıldız Çalışanlar" value={stars} color="#059669" icon={<TrendingUp className="h-4 w-4" />} />
        <SummaryCard label="Riskli Çalışanlar" value={risky} color="#DC2626" icon={<TrendingUp className="h-4 w-4 rotate-180" />} />
      </div>

      {/* 9-Box Grid */}
      <div className="rounded-2xl border border-[#f0f0f0] bg-white p-6">
        <div className="flex gap-4">
          <div className="flex w-[32px] shrink-0 flex-col items-center justify-center">
            <span
              className="text-[11px] font-semibold tracking-widest text-[#A3A3A3]"
              style={{ writingMode: 'vertical-lr', transform: 'rotate(180deg)' }}
            >
              POTANSİYEL
            </span>
          </div>

          <div className="flex-1">
            <div className="grid grid-cols-[40px_1fr] gap-0">
              <div className="flex flex-col">
                {(['high', 'medium', 'low'] as Band[]).map((b) => (
                  <div key={b} className="flex min-h-[140px] items-center justify-center">
                    <span className="text-[10px] font-semibold text-[#A3A3A3]">{BAND_LABELS[b]}</span>
                  </div>
                ))}
              </div>
              <div className="grid grid-cols-3 grid-rows-3 gap-2">
                {GRID_CELLS.map((cell) => (
                  <GridCell
                    key={`${cell.perfLevel}-${cell.potLevel}`}
                    config={cell}
                    employees={getEmployeesForCell(cell.perfLevel, cell.potLevel)}
                    onDragStart={handleDragStart}
                    onDrop={handleDrop}
                    selectedCell={selectedCell}
                    onSelectCell={setSelectedCell}
                    calibrationLocked={calibrationLocked}
                  />
                ))}
              </div>
            </div>

            <div className="ml-[40px] mt-2 grid grid-cols-3 gap-2">
              {(['low', 'medium', 'high'] as Band[]).map((b) => (
                <div key={b} className="text-center text-[10px] font-semibold text-[#A3A3A3]">
                  {BAND_LABELS[b]}
                </div>
              ))}
            </div>
            <div className="ml-[40px] mt-1 text-center text-[11px] font-semibold tracking-widest text-[#A3A3A3]">
              PERFORMANS
            </div>
          </div>
        </div>
      </div>

      {/* Confirmation Dialog */}
      {pendingDrop && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="w-full max-w-[400px] rounded-2xl bg-white p-6 shadow-2xl">
            <h3 className="text-[15px] font-semibold text-[#0A0A0A]">9-Box Değişikliğini Onayla</h3>
            <p className="mt-2 text-[13px] text-[#525252]">
              <strong>{pendingDrop.emp.name}</strong> çalışanını{' '}
              <span className="font-semibold text-[#5E5CE6]">{BAND_LABELS[pendingDrop.perf]} Performans</span>{' '}
              /{' '}
              <span className="font-semibold text-[#D97706]">{BAND_LABELS[pendingDrop.pot]} Potansiyel</span>{' '}
              bölgesine taşımak istediğinize emin misiniz?
            </p>
            <p className="mt-2 text-[11px] text-[#888]">
              Bu değişiklik veritabanına kaydedilir ve audit log&apos;a yazılır.
            </p>
            <div className="mt-4 flex items-center justify-end gap-3">
              <button
                onClick={cancelDrop}
                className="rounded-lg border border-[#e5e5e5] px-4 py-2 text-[13px] font-medium text-[#525252] hover:bg-[#f5f5f5]"
              >
                Vazgeç
              </button>
              <button
                onClick={confirmDrop}
                disabled={upsertMutation.isPending}
                className="rounded-lg bg-[#5E5CE6] px-4 py-2 text-[13px] font-medium text-white transition hover:bg-[#4B49B6] disabled:opacity-60"
              >
                {upsertMutation.isPending ? 'Kaydediliyor…' : 'Onayla ve Kaydet'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Employee Detail List */}
      <div className="rounded-2xl border border-[#f0f0f0] bg-white">
        <div className="border-b border-[#f0f0f0] px-6 py-4">
          <h3 className="text-[13px] font-semibold uppercase tracking-widest text-[#A3A3A3]">
            Tüm Çalışanlar
          </h3>
        </div>
        <div className="overflow-hidden">
          {employees.length === 0 ? (
            <div className="p-8 text-center text-[13px] text-[#A3A3A3]">
              Bu dönem için henüz 9-box ataması yapılmamış.
            </div>
          ) : (
            <table className="w-full text-[12px]">
              <thead>
                <tr className="border-b border-[#f0f0f0] bg-[#fafafa]">
                  <th className="px-6 py-3 text-left font-semibold text-[#525252]">Çalışan</th>
                  <th className="px-6 py-3 text-left font-semibold text-[#525252]">Departman</th>
                  <th className="px-6 py-3 text-center font-semibold text-[#525252]">Performans</th>
                  <th className="px-6 py-3 text-center font-semibold text-[#525252]">Potansiyel</th>
                  <th className="px-6 py-3 text-center font-semibold text-[#525252]">Kategori</th>
                </tr>
              </thead>
              <tbody>
                {employees.map((emp) => {
                  const cellConfig = GRID_CELLS.find(
                    (c) => c.perfLevel === emp.performance && c.potLevel === emp.potential,
                  );
                  const perfColor =
                    emp.performance === 'high' ? '#059669' : emp.performance === 'medium' ? '#D97706' : '#DC2626';
                  const potColor =
                    emp.potential === 'high' ? '#059669' : emp.potential === 'medium' ? '#D97706' : '#DC2626';

                  return (
                    <tr key={emp.id} className="border-b border-[#f0f0f0] last:border-0 hover:bg-[#fafafa]">
                      <td className="px-6 py-3">
                        <div className="flex items-center gap-2">
                          <div className="flex h-7 w-7 items-center justify-center rounded-full bg-[#f0f0ff] text-[9px] font-bold text-[#5E5CE6]">
                            {emp.avatar}
                          </div>
                          <span className="font-medium text-[#0A0A0A]">{emp.name}</span>
                        </div>
                      </td>
                      <td className="px-6 py-3 text-[#737373]">{emp.department}</td>
                      <td className="px-6 py-3 text-center">
                        <span
                          className="inline-block rounded-full px-2 py-0.5 text-[11px] font-semibold"
                          style={{ background: `${perfColor}15`, color: perfColor }}
                        >
                          {BAND_LABELS[emp.performance]}
                        </span>
                      </td>
                      <td className="px-6 py-3 text-center">
                        <span
                          className="inline-block rounded-full px-2 py-0.5 text-[11px] font-semibold"
                          style={{ background: `${potColor}15`, color: potColor }}
                        >
                          {BAND_LABELS[emp.potential]}
                        </span>
                      </td>
                      <td className="px-6 py-3 text-center">
                        <span
                          className="inline-block rounded-md px-2 py-0.5 text-[11px] font-bold"
                          style={{ background: cellConfig?.bgColor, color: cellConfig?.textColor }}
                        >
                          {cellConfig?.label}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}

const SummaryCard = ({
  label,
  value,
  color,
  icon,
}: {
  label: string;
  value: number;
  color: string;
  icon: React.ReactNode;
}) => (
  <div className="rounded-xl border border-[#f0f0f0] bg-white p-5">
    <div className="flex items-center gap-2 text-[12px] font-medium text-[#737373]">
      <span style={{ color }}>{icon}</span>
      {label}
    </div>
    <div className="mt-1 text-[24px] font-bold" style={{ color }}>
      {value}
    </div>
  </div>
);
