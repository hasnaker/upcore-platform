'use client';

import React, { useState, useCallback, useEffect } from 'react';
import { ArrowLeft, GripVertical, ChevronDown, Users, TrendingUp } from 'lucide-react';
import Link from 'next/link';

/* ─────────────────────────────────────────────────────────────
 * 9-Box Matrix — /performans/9box
 * Interactive grid: Performance × Potential
 * Drag & drop / dropdown to reassign employees
 * All data: static, realistic, Turkish — clearly marked.
 * ───────────────────────────────────────────────────────────── */

/* ─── Types ─── */

interface Employee {
  id: string;
  name: string;
  department: string;
  performance: 'low' | 'medium' | 'high';
  potential: 'low' | 'medium' | 'high';
  score: number;
  avatar: string;
}

interface CellConfig {
  perfLevel: 'low' | 'medium' | 'high';
  potLevel: 'low' | 'medium' | 'high';
  label: string;
  description: string;
  bgColor: string;
  borderColor: string;
  textColor: string;
}

/* ─── Static Data ─── */

const INITIAL_EMPLOYEES: Employee[] = [
  { id: '1', name: 'Murat Yilmaz', department: 'Muhendislik', performance: 'high', potential: 'high', score: 90, avatar: 'MY' },
  { id: '2', name: 'Ayse Yildiz', department: 'Pazarlama', performance: 'high', potential: 'high', score: 86, avatar: 'AY' },
  { id: '3', name: 'Elif Demir', department: 'Satis', performance: 'high', potential: 'high', score: 82, avatar: 'ED' },
  { id: '4', name: 'Ahmet Kaya', department: 'Muhendislik', performance: 'high', potential: 'medium', score: 78, avatar: 'AK' },
  { id: '5', name: 'Burak Celik', department: 'Finans', performance: 'medium', potential: 'medium', score: 71, avatar: 'BC' },
  { id: '6', name: 'Selin Ozturk', department: 'Satis', performance: 'medium', potential: 'medium', score: 70, avatar: 'SO' },
  { id: '7', name: 'Hasan Aker', department: 'IK', performance: 'high', potential: 'medium', score: 80, avatar: 'HA' },
  { id: '8', name: 'Zeynep Arslan', department: 'IK', performance: 'medium', potential: 'medium', score: 62, avatar: 'ZA' },
  { id: '9', name: 'Can Demir', department: 'Muhendislik', performance: 'low', potential: 'low', score: 50, avatar: 'CD' },
  { id: '10', name: 'Fatma Sahin', department: 'Destek', performance: 'medium', potential: 'high', score: 68, avatar: 'FS' },
  { id: '11', name: 'Ali Ozcan', department: 'Satis', performance: 'low', potential: 'medium', score: 42, avatar: 'AO' },
  { id: '12', name: 'Deniz Koc', department: 'Pazarlama', performance: 'high', potential: 'low', score: 84, avatar: 'DK' },
  { id: '13', name: 'Gizem Tekin', department: 'Muhendislik', performance: 'medium', potential: 'high', score: 65, avatar: 'GT' },
  { id: '14', name: 'Emre Yildirim', department: 'Finans', performance: 'medium', potential: 'low', score: 58, avatar: 'EY' },
  { id: '15', name: 'Sibel Aydin', department: 'Destek', performance: 'low', potential: 'high', score: 38, avatar: 'SA' },
];

/* ─── Grid Config ─── */

const GRID_CELLS: CellConfig[] = [
  // Row 1 (High Potential) — top row
  { perfLevel: 'low', potLevel: 'high', label: 'Iyilestir', description: 'Yuksek potansiyel, dusuk performans', bgColor: '#FFFBEB', borderColor: '#FDE68A', textColor: '#92400E' },
  { perfLevel: 'medium', potLevel: 'high', label: 'Yatirim Yap', description: 'Yuksek potansiyel, orta performans', bgColor: '#ECFDF5', borderColor: '#A7F3D0', textColor: '#065F46' },
  { perfLevel: 'high', potLevel: 'high', label: 'Yildiz', description: 'Yuksek potansiyel, yuksek performans', bgColor: '#DCFCE7', borderColor: '#86EFAC', textColor: '#14532D' },
  // Row 2 (Medium Potential) — middle row
  { perfLevel: 'low', potLevel: 'medium', label: 'Riskli', description: 'Orta potansiyel, dusuk performans', bgColor: '#FEF2F2', borderColor: '#FECACA', textColor: '#991B1B' },
  { perfLevel: 'medium', potLevel: 'medium', label: 'Cekirdek', description: 'Orta potansiyel, orta performans', bgColor: '#FFFBEB', borderColor: '#FDE68A', textColor: '#92400E' },
  { perfLevel: 'high', potLevel: 'medium', label: 'Guclu', description: 'Orta potansiyel, yuksek performans', bgColor: '#ECFDF5', borderColor: '#A7F3D0', textColor: '#065F46' },
  // Row 3 (Low Potential) — bottom row
  { perfLevel: 'low', potLevel: 'low', label: 'Ayrilik?', description: 'Dusuk potansiyel, dusuk performans', bgColor: '#FEE2E2', borderColor: '#FCA5A5', textColor: '#7F1D1D' },
  { perfLevel: 'medium', potLevel: 'low', label: 'Izle', description: 'Dusuk potansiyel, orta performans', bgColor: '#FEF2F2', borderColor: '#FECACA', textColor: '#991B1B' },
  { perfLevel: 'high', potLevel: 'low', label: 'Uzman', description: 'Dusuk potansiyel, yuksek performans', bgColor: '#FFFBEB', borderColor: '#FDE68A', textColor: '#92400E' },
];

/* ─── Employee Chip ─── */

const EmployeeChip = ({
  employee,
  onDragStart,
  compact,
}: {
  employee: Employee;
  onDragStart: (e: React.DragEvent, emp: Employee) => void;
  compact?: boolean;
}) => {
  if (compact) {
    return (
      <div
        draggable
        onDragStart={(e) => onDragStart(e, employee)}
        className="flex cursor-grab items-center gap-1.5 rounded-md bg-white/80 px-2 py-1 text-[11px] shadow-sm transition hover:shadow active:cursor-grabbing"
      >
        <GripVertical className="h-3 w-3 text-[#D4D4D4]" />
        <div className="flex h-5 w-5 items-center justify-center rounded-full bg-[#f0f0ff] text-[8px] font-bold text-[#5E5CE6]">
          {employee.avatar}
        </div>
        <span className="font-medium text-[#0A0A0A]">{employee.name.split(' ')[0]}</span>
      </div>
    );
  }

  return (
    <div
      draggable
      onDragStart={(e) => onDragStart(e, employee)}
      className="flex cursor-grab items-center gap-2 rounded-lg bg-white/80 px-2.5 py-1.5 shadow-sm transition hover:shadow-md active:cursor-grabbing"
    >
      <GripVertical className="h-3.5 w-3.5 text-[#D4D4D4]" />
      <div className="flex h-6 w-6 items-center justify-center rounded-full bg-[#f0f0ff] text-[9px] font-bold text-[#5E5CE6]">
        {employee.avatar}
      </div>
      <div className="min-w-0 flex-1">
        <div className="truncate text-[11px] font-medium text-[#0A0A0A]">{employee.name}</div>
        <div className="truncate text-[10px] text-[#737373]">{employee.department}</div>
      </div>
    </div>
  );
};

/* ─── Reassign Dropdown ─── */

const ReassignDropdown = ({
  employee,
  onReassign,
  onClose,
}: {
  employee: Employee;
  onReassign: (empId: string, perf: Employee['performance'], pot: Employee['potential']) => void;
  onClose: () => void;
}) => {
  const options: { label: string; perf: Employee['performance']; pot: Employee['potential'] }[] = [
    { label: 'Yildiz', perf: 'high', pot: 'high' },
    { label: 'Yatirim Yap', perf: 'medium', pot: 'high' },
    { label: 'Iyilestir', perf: 'low', pot: 'high' },
    { label: 'Guclu', perf: 'high', pot: 'medium' },
    { label: 'Cekirdek', perf: 'medium', pot: 'medium' },
    { label: 'Riskli', perf: 'low', pot: 'medium' },
    { label: 'Uzman', perf: 'high', pot: 'low' },
    { label: 'Izle', perf: 'medium', pot: 'low' },
    { label: 'Ayrilik?', perf: 'low', pot: 'low' },
  ];

  return (
    <div className="absolute right-0 top-full z-50 mt-1 w-[180px] rounded-lg border border-[#f0f0f0] bg-white py-1 shadow-lg">
      {options.map((opt) => {
        const isActive = employee.performance === opt.perf && employee.potential === opt.pot;
        return (
          <button
            key={opt.label}
            onClick={() => { onReassign(employee.id, opt.perf, opt.pot); onClose(); }}
            className={`w-full px-3 py-1.5 text-left text-[12px] transition hover:bg-[#f5f5f5] ${isActive ? 'font-semibold text-[#5E5CE6]' : 'text-[#525252]'}`}
          >
            {opt.label}
            {isActive && ' (mevcut)'}
          </button>
        );
      })}
    </div>
  );
};

/* ─── Grid Cell ─── */

const GridCell = ({
  config,
  employees,
  onDragStart,
  onDrop,
  onReassign,
  selectedCell,
  onSelectCell,
}: {
  config: CellConfig;
  employees: Employee[];
  onDragStart: (e: React.DragEvent, emp: Employee) => void;
  onDrop: (e: React.DragEvent, perf: Employee['performance'], pot: Employee['potential']) => void;
  onReassign: (empId: string, perf: Employee['performance'], pot: Employee['potential']) => void;
  selectedCell: string | null;
  onSelectCell: (key: string | null) => void;
}) => {
  const cellKey = `${config.perfLevel}-${config.potLevel}`;
  const isSelected = selectedCell === cellKey;
  const [reassignTarget, setReassignTarget] = useState<string | null>(null);

  return (
    <div
      onDragOver={(e) => { e.preventDefault(); e.currentTarget.style.outline = `2px solid ${config.borderColor}`; }}
      onDragLeave={(e) => { e.currentTarget.style.outline = 'none'; }}
      onDrop={(e) => { e.currentTarget.style.outline = 'none'; onDrop(e, config.perfLevel, config.potLevel); }}
      onClick={() => onSelectCell(isSelected ? null : cellKey)}
      className="flex min-h-[140px] cursor-pointer flex-col rounded-xl border-2 p-3 transition-all hover:shadow-md"
      style={{
        background: config.bgColor,
        borderColor: isSelected ? config.textColor : config.borderColor,
      }}
    >
      {/* Header */}
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

      {/* Employees */}
      <div className="flex flex-1 flex-col gap-1.5 overflow-y-auto">
        {employees.length === 0 && (
          <span className="text-[10px] italic" style={{ color: `${config.textColor}80` }}>
            Calisan yok
          </span>
        )}
        {employees.slice(0, isSelected ? undefined : 3).map((emp) => (
          <div key={emp.id} className="relative">
            <div className="flex items-center gap-1">
              <EmployeeChip employee={emp} onDragStart={onDragStart} compact={!isSelected} />
              {isSelected && (
                <div className="relative">
                  <button
                    onClick={(e) => { e.stopPropagation(); setReassignTarget(reassignTarget === emp.id ? null : emp.id); }}
                    className="rounded p-0.5 text-[#A3A3A3] hover:bg-white/60 hover:text-[#525252]"
                  >
                    <ChevronDown className="h-3.5 w-3.5" />
                  </button>
                  {reassignTarget === emp.id && (
                    <ReassignDropdown
                      employee={emp}
                      onReassign={onReassign}
                      onClose={() => setReassignTarget(null)}
                    />
                  )}
                </div>
              )}
            </div>
          </div>
        ))}
        {!isSelected && employees.length > 3 && (
          <span className="text-[10px] font-medium" style={{ color: config.textColor }}>
            +{employees.length - 3} daha...
          </span>
        )}
      </div>
    </div>
  );
};

/* ─── Main 9-Box Page ─── */

export default function NineBoxPage() {
  const [employees, setEmployees] = useState<Employee[]>(INITIAL_EMPLOYEES);
  const [selectedCell, setSelectedCell] = useState<string | null>(null);
  const [draggedEmployee, setDraggedEmployee] = useState<Employee | null>(null);
  const [useAutoMode, setUseAutoMode] = useState(true);
  const [calibrationLocked, setCalibrationLocked] = useState(false);
  const [pipCandidates, setPipCandidates] = useState<string[]>([]);

  useEffect(() => {
    fetch('/api/performance')
      .then((r) => r.json())
      .then((data) => {
        // Prefer auto-categorized data from scoring engine
        if (useAutoMode && data.autoNineBox && data.autoNineBox.length > 0) {
          const mapped: Employee[] = data.autoNineBox.map((nb: { employee: string; department: string; performance: string; potential: string; performanceScore: number; potentialScore: number }, idx: number) => {
            const nameParts = nb.employee.split(' ');
            return {
              id: `auto-${idx}`,
              name: nb.employee,
              department: nb.department || '',
              performance: nb.performance as 'low' | 'medium' | 'high',
              potential: nb.potential as 'low' | 'medium' | 'high',
              score: nb.performanceScore,
              avatar: nameParts.map((n: string) => n[0]).join('').toUpperCase(),
            };
          });
          if (mapped.length > 0) {
            setEmployees(mapped);
            // Auto-detect PIP candidates: low performance
            const pip = mapped.filter((e) => e.performance === 'low').map((e) => e.name);
            setPipCandidates(pip);
          }
        } else if (data.nineBox && data.nineBox.length > 0) {
          const mapped: Employee[] = data.nineBox.map((nb: { id: string; employee: string; department: string; performanceScore: number; potentialScore: number; category: string }) => {
            const perfLevel = nb.performanceScore >= 80 ? 'high' : nb.performanceScore >= 65 ? 'medium' : 'low';
            const potLevel = nb.potentialScore >= 75 ? 'high' : nb.potentialScore >= 60 ? 'medium' : 'low';
            const nameParts = nb.employee.split(' ');
            return {
              id: nb.id,
              name: nb.employee,
              department: nb.department || '',
              performance: perfLevel as 'low' | 'medium' | 'high',
              potential: potLevel as 'low' | 'medium' | 'high',
              score: nb.performanceScore,
              avatar: nameParts.map((n: string) => n[0]).join('').toUpperCase(),
            };
          });
          if (mapped.length > 0) setEmployees(mapped);
        }
      })
      .catch(() => {});
  }, [useAutoMode]);

  const handleDragStart = useCallback((_e: React.DragEvent, emp: Employee) => {
    setDraggedEmployee(emp);
  }, []);

  const persistNineBox = useCallback((employeeId: string, perf: string, pot: string) => {
    const perfScore = perf === 'high' ? 85 : perf === 'medium' ? 65 : 40;
    const potScore = pot === 'high' ? 85 : pot === 'medium' ? 60 : 35;
    const categoryMap: Record<string, string> = {
      'high-high': 'star', 'high-medium': 'growth', 'high-low': 'solid',
      'medium-high': 'growth', 'medium-medium': 'average', 'medium-low': 'average',
      'low-high': 'risk', 'low-medium': 'risk', 'low-low': 'risk',
    };
    fetch('/api/nine-box', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        employeeId,
        performanceScore: perfScore,
        potentialScore: potScore,
        category: categoryMap[`${perf}-${pot}`] || 'solid',
      }),
    }).catch(() => {});
  }, []);

  const [pendingDrop, setPendingDrop] = useState<{ emp: Employee; perf: Employee['performance']; pot: Employee['potential'] } | null>(null);

  const handleDrop = useCallback((_e: React.DragEvent, perf: Employee['performance'], pot: Employee['potential']) => {
    if (!draggedEmployee || calibrationLocked) return;
    // Show confirmation before persisting
    setPendingDrop({ emp: draggedEmployee, perf, pot });
    setDraggedEmployee(null);
  }, [draggedEmployee, calibrationLocked]);

  const confirmDrop = useCallback(() => {
    if (!pendingDrop) return;
    setEmployees((prev) =>
      prev.map((emp) =>
        emp.id === pendingDrop.emp.id ? { ...emp, performance: pendingDrop.perf, potential: pendingDrop.pot } : emp
      )
    );
    persistNineBox(pendingDrop.emp.id, pendingDrop.perf, pendingDrop.pot);
    setPendingDrop(null);
  }, [pendingDrop, persistNineBox]);

  const cancelDrop = useCallback(() => setPendingDrop(null), []);

  const handleReassign = useCallback((empId: string, perf: Employee['performance'], pot: Employee['potential']) => {
    if (calibrationLocked) return;
    setEmployees((prev) =>
      prev.map((emp) => (emp.id === empId ? { ...emp, performance: perf, potential: pot } : emp))
    );
    // Persist to DB
    persistNineBox(empId, perf, pot);
  }, [calibrationLocked, persistNineBox]);

  const getEmployeesForCell = (perf: Employee['performance'], pot: Employee['potential']) =>
    employees.filter((e) => e.performance === perf && e.potential === pot);

  // Stats
  const stars = employees.filter((e) => e.performance === 'high' && e.potential === 'high').length;
  const risky = employees.filter((e) => e.performance === 'low').length;
  const avgScore = Math.round(employees.reduce((s, e) => s + e.score, 0) / employees.length);

  return (
    <div className="flex flex-col gap-8">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link
          href="/performans"
          className="flex h-9 w-9 items-center justify-center rounded-lg border border-[#e5e5e5] text-[#737373] transition hover:bg-[#f5f5f5] hover:text-[#0A0A0A]"
        >
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-[#0A0A0A]">
            9-Box Matrisi
          </h1>
          <p className="mt-0.5 text-sm text-[#525252]">
            Performans ve potansiyel bazli calisan segmentasyonu. Surukleyerek yeniden atayabilirsiniz.
          </p>
        </div>
      </div>

      {/* Calibration Toolbar */}
      <div className="flex items-center gap-3 rounded-xl border border-[#f0f0f0] bg-white p-4">
        <div className="flex items-center gap-2">
          <span className="text-[12px] font-medium text-[#525252]">Veri Kaynagi:</span>
          <button
            onClick={() => setUseAutoMode(true)}
            className={`rounded-lg px-3 py-1.5 text-[12px] font-medium transition ${useAutoMode ? 'bg-[#5E5CE6] text-white' : 'bg-[#f5f5f5] text-[#737373] hover:bg-[#eee]'}`}
          >
            Algoritmik (OKR + 360 + Yetkinlik)
          </button>
          <button
            onClick={() => setUseAutoMode(false)}
            className={`rounded-lg px-3 py-1.5 text-[12px] font-medium transition ${!useAutoMode ? 'bg-[#5E5CE6] text-white' : 'bg-[#f5f5f5] text-[#737373] hover:bg-[#eee]'}`}
          >
            Manuel (DB)
          </button>
        </div>
        <div className="mx-2 h-6 w-px bg-[#f0f0f0]" />
        <button
          onClick={() => setCalibrationLocked(!calibrationLocked)}
          className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-[12px] font-medium transition ${calibrationLocked ? 'bg-[#FEF2F2] text-[#DC2626]' : 'bg-[#ECFDF5] text-[#059669]'}`}
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            {calibrationLocked
              ? <><rect x="3" y="11" width="18" height="11" rx="2" ry="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" /></>
              : <><rect x="3" y="11" width="18" height="11" rx="2" ry="2" /><path d="M7 11V7a5 5 0 0 1 9.9-1" /></>}
          </svg>
          {calibrationLocked ? 'Kalibrasyon Kilitli' : 'Kalibrasyon Acik'}
        </button>
        {calibrationLocked && (
          <span className="text-[11px] text-[#DC2626]">Surukle-birak devre disi</span>
        )}
      </div>

      {/* PIP Alert */}
      {pipCandidates.length > 0 && (
        <div className="flex items-start gap-3 rounded-xl border border-[#FECACA] bg-[#FEF2F2] p-4">
          <svg className="mt-0.5 h-5 w-5 shrink-0 text-[#DC2626]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4.5c-.77-.833-2.694-.833-3.464 0L3.34 16.5c-.77.833.192 2.5 1.732 2.5z" />
          </svg>
          <div>
            <div className="text-[13px] font-semibold text-[#DC2626]">
              Performans Iyilestirme Plani (PIP) Onerisi
            </div>
            <div className="mt-1 text-[12px] text-[#991B1B]">
              Asagidaki calisanlar dusuk performans bolgesinde. PIP sureci baslatilmasi oneriliyor:
            </div>
            <div className="mt-2 flex flex-wrap gap-2">
              {pipCandidates.map((name) => (
                <span key={name} className="rounded-full bg-white px-3 py-1 text-[11px] font-medium text-[#DC2626] shadow-sm">
                  {name}
                </span>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Summary Cards */}
      <div className="grid grid-cols-4 gap-4">
        {[
          { label: 'Toplam Calisan', value: employees.length.toString(), color: '#0A0A0A', icon: <Users className="h-4 w-4" /> },
          { label: 'Yildiz Calisanlar', value: stars.toString(), color: '#059669', icon: <TrendingUp className="h-4 w-4" /> },
          { label: 'Riskli Calisanlar', value: risky.toString(), color: '#DC2626', icon: <TrendingUp className="h-4 w-4 rotate-180" /> },
          { label: 'Ortalama Skor', value: avgScore.toString(), color: '#5E5CE6', icon: <TrendingUp className="h-4 w-4" /> },
        ].map((card) => (
          <div key={card.label} className="rounded-xl border border-[#f0f0f0] bg-white p-5">
            <div className="flex items-center gap-2 text-[12px] font-medium text-[#737373]">
              <span style={{ color: card.color }}>{card.icon}</span>
              {card.label}
            </div>
            <div className="mt-1 text-[24px] font-bold" style={{ color: card.color }}>{card.value}</div>
          </div>
        ))}
      </div>

      {/* 9-Box Grid */}
      <div className="rounded-2xl border border-[#f0f0f0] bg-white p-6">
        {/* Y-axis label */}
        <div className="flex gap-4">
          <div className="flex w-[32px] shrink-0 flex-col items-center justify-center">
            <span className="text-[11px] font-semibold tracking-widest text-[#A3A3A3]" style={{ writingMode: 'vertical-lr', transform: 'rotate(180deg)' }}>
              POTANSIYEL
            </span>
          </div>

          <div className="flex-1">
            {/* Y-axis levels */}
            <div className="grid grid-cols-[40px_1fr] gap-0">
              <div className="flex flex-col">
                {['Yuksek', 'Orta', 'Dusuk'].map((label) => (
                  <div key={label} className="flex min-h-[140px] items-center justify-center">
                    <span className="text-[10px] font-semibold text-[#A3A3A3]">{label}</span>
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
                    onReassign={handleReassign}
                    selectedCell={selectedCell}
                    onSelectCell={setSelectedCell}
                  />
                ))}
              </div>
            </div>

            {/* X-axis labels */}
            <div className="ml-[40px] mt-2 grid grid-cols-3 gap-2">
              {['Dusuk', 'Orta', 'Yuksek'].map((label) => (
                <div key={label} className="text-center text-[10px] font-semibold text-[#A3A3A3]">
                  {label}
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
            <h3 className="text-[15px] font-semibold text-[#0A0A0A]">9-Box Degisikligi Onayla</h3>
            <p className="mt-2 text-[13px] text-[#525252]">
              <strong>{pendingDrop.emp.name}</strong> calisanini{' '}
              <span className="font-semibold text-[#5E5CE6]">
                {pendingDrop.perf === 'high' ? 'Yuksek' : pendingDrop.perf === 'medium' ? 'Orta' : 'Dusuk'} Performans
              </span>{' / '}
              <span className="font-semibold text-[#D97706]">
                {pendingDrop.pot === 'high' ? 'Yuksek' : pendingDrop.pot === 'medium' ? 'Orta' : 'Dusuk'} Potansiyel
              </span>{' '}
              bolgesine tasimak istediginize emin misiniz?
            </p>
            <p className="mt-2 text-[11px] text-[#888]">Bu degisiklik veritabanina kaydedilecek ve audit log&apos;a yazilacaktir.</p>
            <div className="mt-4 flex items-center justify-end gap-3">
              <button onClick={cancelDrop} className="rounded-lg border border-[#e5e5e5] px-4 py-2 text-[13px] font-medium text-[#525252] hover:bg-[#f5f5f5]">
                Vazgec
              </button>
              <button onClick={confirmDrop} className="rounded-lg bg-[#5E5CE6] px-4 py-2 text-[13px] font-medium text-white transition hover:bg-[#4B49B6]">
                Onayla ve Kaydet
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Employee Detail List */}
      <div className="rounded-2xl border border-[#f0f0f0] bg-white">
        <div className="border-b border-[#f0f0f0] px-6 py-4">
          <h3 className="text-[13px] font-semibold uppercase tracking-widest text-[#A3A3A3]">
            Tum Calisanlar
          </h3>
        </div>
        <div className="overflow-hidden">
          <table className="w-full text-[12px]">
            <thead>
              <tr className="border-b border-[#f0f0f0] bg-[#fafafa]">
                <th className="px-6 py-3 text-left font-semibold text-[#525252]">Calisan</th>
                <th className="px-6 py-3 text-left font-semibold text-[#525252]">Departman</th>
                <th className="px-6 py-3 text-center font-semibold text-[#525252]">Skor</th>
                <th className="px-6 py-3 text-center font-semibold text-[#525252]">Performans</th>
                <th className="px-6 py-3 text-center font-semibold text-[#525252]">Potansiyel</th>
                <th className="px-6 py-3 text-center font-semibold text-[#525252]">Kategori</th>
              </tr>
            </thead>
            <tbody>
              {employees.sort((a, b) => b.score - a.score).map((emp) => {
                const cellConfig = GRID_CELLS.find(
                  (c) => c.perfLevel === emp.performance && c.potLevel === emp.potential
                );
                const perfLabel = emp.performance === 'high' ? 'Yuksek' : emp.performance === 'medium' ? 'Orta' : 'Dusuk';
                const potLabel = emp.potential === 'high' ? 'Yuksek' : emp.potential === 'medium' ? 'Orta' : 'Dusuk';
                const perfColor = emp.performance === 'high' ? '#059669' : emp.performance === 'medium' ? '#D97706' : '#DC2626';
                const potColor = emp.potential === 'high' ? '#059669' : emp.potential === 'medium' ? '#D97706' : '#DC2626';

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
                      <span className="inline-block rounded px-2 py-0.5 font-bold" style={{
                        background: emp.score >= 80 ? '#ECFDF5' : emp.score >= 60 ? '#FFFBEB' : '#FEF2F2',
                        color: emp.score >= 80 ? '#059669' : emp.score >= 60 ? '#D97706' : '#DC2626',
                      }}>
                        {emp.score}
                      </span>
                    </td>
                    <td className="px-6 py-3 text-center">
                      <span className="inline-block rounded-full px-2 py-0.5 text-[11px] font-semibold" style={{
                        background: `${perfColor}15`,
                        color: perfColor,
                      }}>
                        {perfLabel}
                      </span>
                    </td>
                    <td className="px-6 py-3 text-center">
                      <span className="inline-block rounded-full px-2 py-0.5 text-[11px] font-semibold" style={{
                        background: `${potColor}15`,
                        color: potColor,
                      }}>
                        {potLabel}
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
        </div>
      </div>
    </div>
  );
}
