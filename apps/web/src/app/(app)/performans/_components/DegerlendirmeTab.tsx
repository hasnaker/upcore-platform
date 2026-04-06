'use client';

import { useState, useCallback, useEffect } from 'react';
import { Plus, X, ChevronDown, ChevronRight } from 'lucide-react';
import Link from 'next/link';

/* ─── Types ─── */

interface EmployeeScore {
  id: string;
  name: string;
  department: string;
  okrScore: number;
  competencyScore: number;
  overallScore: number;
  potential: 'high' | 'medium' | 'low';
  managerNotes: string;
}

interface ReviewPeriod {
  id: string;
  name: string;
  type: 'Q1' | 'Q2' | 'H1' | 'Annual';
  year: number;
  status: 'active' | 'completed' | 'draft';
  employees: EmployeeScore[];
}

/* ─── Static Data ─── */

const INITIAL_PERIODS: ReviewPeriod[] = [
  {
    id: 'rp1',
    name: '2026 Q1 Degerlendirme',
    type: 'Q1',
    year: 2026,
    status: 'active',
    employees: [
      { id: 'e1', name: 'Elif Demir', department: 'Satis', okrScore: 85, competencyScore: 78, overallScore: 82, potential: 'high', managerNotes: 'Hedeflerin cogunu asti, liderlik potansiyeli yuksek.' },
      { id: 'e2', name: 'Murat Yilmaz', department: 'Muhendislik', okrScore: 92, competencyScore: 88, overallScore: 90, potential: 'high', managerNotes: 'Teknik olarak cok guclu, takim liderligine hazir.' },
      { id: 'e3', name: 'Selin Ozturk', department: 'Satis', okrScore: 68, competencyScore: 72, overallScore: 70, potential: 'medium', managerNotes: 'Istikrarli performans, gelisim alanlari mevcut.' },
      { id: 'e4', name: 'Ahmet Kaya', department: 'Muhendislik', okrScore: 75, competencyScore: 82, overallScore: 78, potential: 'medium', managerNotes: 'Teknik becerileri iyi, iletisim gelistirilmeli.' },
      { id: 'e5', name: 'Zeynep Arslan', department: 'IK', okrScore: 60, competencyScore: 65, overallScore: 62, potential: 'medium', managerNotes: 'Motivasyon konusunda destek gerekiyor.' },
      { id: 'e6', name: 'Can Demir', department: 'Muhendislik', okrScore: 45, competencyScore: 55, overallScore: 50, potential: 'low', managerNotes: 'Performans iyilestirme plani olusturulmali.' },
      { id: 'e7', name: 'Ayse Yildiz', department: 'Pazarlama', okrScore: 88, competencyScore: 85, overallScore: 86, potential: 'high', managerNotes: 'Yaratici ve proaktif, yildiz calisan.' },
      { id: 'e8', name: 'Burak Celik', department: 'Finans', okrScore: 72, competencyScore: 70, overallScore: 71, potential: 'medium', managerNotes: 'Tutarli performans, detay odakli.' },
    ],
  },
  {
    id: 'rp2',
    name: '2025 Yillik Degerlendirme',
    type: 'Annual',
    year: 2025,
    status: 'completed',
    employees: [
      { id: 'e1b', name: 'Elif Demir', department: 'Satis', okrScore: 80, competencyScore: 75, overallScore: 78, potential: 'high', managerNotes: 'Yil boyunca istikrarli yukselis gosterdi.' },
      { id: 'e2b', name: 'Murat Yilmaz', department: 'Muhendislik', okrScore: 88, competencyScore: 85, overallScore: 87, potential: 'high', managerNotes: 'Ekibin en degerli uyesi.' },
      { id: 'e3b', name: 'Selin Ozturk', department: 'Satis', okrScore: 65, competencyScore: 68, overallScore: 66, potential: 'medium', managerNotes: 'Gelisim plani basarili uygulanmaya baslandi.' },
    ],
  },
];

/* ─── Helpers ─── */

const scoreColor = (s: number) => {
  if (s >= 80) return '#059669';
  if (s >= 60) return '#D97706';
  return '#DC2626';
};

const scoreBg = (s: number) => {
  if (s >= 80) return '#ECFDF5';
  if (s >= 60) return '#FFFBEB';
  return '#FEF2F2';
};

const potentialLabel = (p: string) => {
  if (p === 'high') return { text: 'Yuksek', color: '#059669', bg: '#ECFDF5' };
  if (p === 'medium') return { text: 'Orta', color: '#D97706', bg: '#FFFBEB' };
  return { text: 'Dusuk', color: '#DC2626', bg: '#FEF2F2' };
};

const statusLabel = (s: string) => {
  if (s === 'active') return { text: 'Aktif', color: '#5E5CE6', bg: '#f0f0ff' };
  if (s === 'completed') return { text: 'Tamamlandi', color: '#059669', bg: '#ECFDF5' };
  return { text: 'Taslak', color: '#737373', bg: '#f5f5f5' };
};

/* ─── Sparkline ─── */

function Sparkline({ data, color = '#5E5CE6', width = 60, height = 20 }: { data: (number | null)[]; color?: string; width?: number; height?: number }) {
  const values = data.filter((v): v is number => v !== null);
  if (values.length < 2) return <span style={{ fontSize: 10, color: '#ccc' }}>—</span>;
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;
  const points = values.map((v, i) => {
    const x = (i / (values.length - 1)) * width;
    const y = height - ((v - min) / range) * height;
    return `${x},${y}`;
  }).join(' ');
  const trend = (values[values.length - 1] ?? 0) - (values[0] ?? 0);
  const trendColor = trend >= 0 ? '#059669' : '#DC2626';
  return (
    <div className="flex items-center gap-1">
      <svg width={width} height={height}><polyline points={points} fill="none" stroke={trendColor} strokeWidth={1.5} /></svg>
      <span style={{ fontSize: 9, fontWeight: 600, color: trendColor }}>{trend >= 0 ? '\u2191' : '\u2193'}</span>
    </div>
  );
}

/* ─── 9-Box Mini Preview ─── */

const NineBoxPreview = ({ employees }: { employees: EmployeeScore[] }) => {
  const getCell = (perf: 'low' | 'med' | 'high', pot: 'low' | 'medium' | 'high') => {
    return employees.filter((e) => {
      const perfMatch =
        perf === 'low' ? e.overallScore < 60 :
        perf === 'med' ? e.overallScore >= 60 && e.overallScore < 80 :
        e.overallScore >= 80;
      return perfMatch && e.potential === pot;
    });
  };

  const cells: { label: string; perf: 'low' | 'med' | 'high'; pot: 'low' | 'medium' | 'high'; color: string }[] = [
    { label: 'Iyilestir', perf: 'low', pot: 'high', color: '#FFFBEB' },
    { label: 'Yatirim Yap', perf: 'med', pot: 'high', color: '#ECFDF5' },
    { label: 'Yildiz', perf: 'high', pot: 'high', color: '#DCFCE7' },
    { label: 'Riskli', perf: 'low', pot: 'medium', color: '#FEF2F2' },
    { label: 'Cekirdek', perf: 'med', pot: 'medium', color: '#FFFBEB' },
    { label: 'Guclu', perf: 'high', pot: 'medium', color: '#ECFDF5' },
    { label: 'Ayrilik?', perf: 'low', pot: 'low', color: '#FEE2E2' },
    { label: 'Izle', perf: 'med', pot: 'low', color: '#FEF2F2' },
    { label: 'Uzman', perf: 'high', pot: 'low', color: '#FFFBEB' },
  ];

  return (
    <div className="rounded-xl border border-[#f0f0f0] bg-white p-4">
      <div className="mb-3 flex items-center justify-between">
        <h4 className="text-[12px] font-semibold uppercase tracking-widest text-[#A3A3A3]">9-Box Onizleme</h4>
        <Link
          href="/performans/9box"
          className="text-[12px] font-medium text-[#5E5CE6] hover:underline"
        >
          Detayli Goruntule →
        </Link>
      </div>
      <div className="grid grid-cols-3 gap-1">
        {cells.map((cell) => {
          const emps = getCell(cell.perf, cell.pot);
          return (
            <div
              key={cell.label}
              className="flex flex-col items-center justify-center rounded-lg p-2 text-center"
              style={{ background: cell.color, minHeight: 56 }}
            >
              <span className="text-[10px] font-semibold text-[#525252]">{cell.label}</span>
              <span className="mt-0.5 text-[16px] font-bold text-[#0A0A0A]">{emps.length}</span>
            </div>
          );
        })}
      </div>
      {/* Axis labels */}
      <div className="mt-2 flex items-center justify-between text-[10px] text-[#A3A3A3]">
        <span>← Dusuk Performans</span>
        <span>Yuksek Performans →</span>
      </div>
    </div>
  );
};

/* ─── Review Form Modal ─── */

interface ReviewFormData {
  employeeName: string;
  department: string;
  okrScore: string;
  competencyScore: string;
  potential: 'high' | 'medium' | 'low';
  managerNotes: string;
}

const emptyReviewForm: ReviewFormData = {
  employeeName: '',
  department: '',
  okrScore: '',
  competencyScore: '',
  potential: 'medium',
  managerNotes: '',
};

const ReviewFormModal = ({
  open,
  onClose,
  onSubmit,
}: {
  open: boolean;
  onClose: () => void;
  onSubmit: (form: ReviewFormData) => void;
}) => {
  const [form, setForm] = useState<ReviewFormData>(emptyReviewForm);

  const handleSubmit = useCallback(() => {
    if (!form.employeeName || !form.okrScore || !form.competencyScore) return;
    onSubmit(form);
    setForm(emptyReviewForm);
  }, [form, onSubmit]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="w-full max-w-[520px] rounded-2xl border border-[#f0f0f0] bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-[#f0f0f0] px-6 py-4">
          <h3 className="text-[15px] font-semibold text-[#0A0A0A]">Degerlendirme Formu</h3>
          <button onClick={onClose} className="rounded-lg p-1 text-[#A3A3A3] hover:bg-[#f5f5f5] hover:text-[#525252]">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="space-y-4 px-6 py-5">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1.5 block text-[12px] font-medium text-[#525252]">Calisan Adi</label>
              <input
                value={form.employeeName}
                onChange={(e) => setForm({ ...form, employeeName: e.target.value })}
                placeholder="Ad Soyad"
                className="w-full rounded-lg border border-[#e5e5e5] px-3 py-2.5 text-[13px] text-[#0A0A0A] outline-none transition focus:border-[#5E5CE6] focus:ring-2 focus:ring-[#5E5CE6]/10"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-[12px] font-medium text-[#525252]">Departman</label>
              <input
                value={form.department}
                onChange={(e) => setForm({ ...form, department: e.target.value })}
                placeholder="Muhendislik, Satis..."
                className="w-full rounded-lg border border-[#e5e5e5] px-3 py-2.5 text-[13px] text-[#0A0A0A] outline-none transition focus:border-[#5E5CE6] focus:ring-2 focus:ring-[#5E5CE6]/10"
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="mb-1.5 block text-[12px] font-medium text-[#525252]">OKR Puani (0-100)</label>
              <input
                type="number"
                min={0}
                max={100}
                value={form.okrScore}
                onChange={(e) => setForm({ ...form, okrScore: e.target.value })}
                placeholder="85"
                className="w-full rounded-lg border border-[#e5e5e5] px-3 py-2.5 text-[13px] text-[#0A0A0A] outline-none transition focus:border-[#5E5CE6] focus:ring-2 focus:ring-[#5E5CE6]/10"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-[12px] font-medium text-[#525252]">Yetkinlik Puani (0-100)</label>
              <input
                type="number"
                min={0}
                max={100}
                value={form.competencyScore}
                onChange={(e) => setForm({ ...form, competencyScore: e.target.value })}
                placeholder="78"
                className="w-full rounded-lg border border-[#e5e5e5] px-3 py-2.5 text-[13px] text-[#0A0A0A] outline-none transition focus:border-[#5E5CE6] focus:ring-2 focus:ring-[#5E5CE6]/10"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-[12px] font-medium text-[#525252]">Potansiyel</label>
              <select
                value={form.potential}
                onChange={(e) => setForm({ ...form, potential: e.target.value as ReviewFormData['potential'] })}
                className="w-full rounded-lg border border-[#e5e5e5] px-3 py-2.5 text-[13px] text-[#0A0A0A] outline-none transition focus:border-[#5E5CE6] focus:ring-2 focus:ring-[#5E5CE6]/10"
              >
                <option value="high">Yuksek</option>
                <option value="medium">Orta</option>
                <option value="low">Dusuk</option>
              </select>
            </div>
          </div>

          <div>
            <label className="mb-1.5 block text-[12px] font-medium text-[#525252]">Yonetici Notlari</label>
            <textarea
              value={form.managerNotes}
              onChange={(e) => setForm({ ...form, managerNotes: e.target.value })}
              rows={3}
              placeholder="Degerlendirme notlarinizi yazin..."
              className="w-full rounded-lg border border-[#e5e5e5] px-3 py-2.5 text-[13px] text-[#0A0A0A] outline-none transition focus:border-[#5E5CE6] focus:ring-2 focus:ring-[#5E5CE6]/10"
            />
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 border-t border-[#f0f0f0] px-6 py-4">
          <button onClick={onClose} className="rounded-lg border border-[#e5e5e5] px-4 py-2 text-[13px] font-medium text-[#525252] hover:bg-[#f5f5f5]">
            Iptal
          </button>
          <button
            onClick={handleSubmit}
            disabled={!form.employeeName || !form.okrScore || !form.competencyScore}
            className="rounded-lg bg-[#5E5CE6] px-4 py-2 text-[13px] font-medium text-white transition hover:bg-[#4B49B6] disabled:opacity-40"
          >
            Kaydet
          </button>
        </div>
      </div>
    </div>
  );
};

/* ─── Period Card ─── */

const PeriodCard = ({ period, onAddReview, trends }: { period: ReviewPeriod; onAddReview: () => void; trends: Record<string, Array<{date: string; okr: number|null; performance: number|null}>> }) => {
  const [expanded, setExpanded] = useState(false);
  const status = statusLabel(period.status);

  return (
    <div className="rounded-xl border border-[#f0f0f0] bg-white transition-shadow hover:shadow-sm">
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex w-full items-center gap-4 px-5 py-4 text-left"
      >
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg" style={{ background: status.bg }}>
          {expanded ? (
            <ChevronDown className="h-4 w-4" style={{ color: status.color }} />
          ) : (
            <ChevronRight className="h-4 w-4" style={{ color: status.color }} />
          )}
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-3">
            <span className="text-[14px] font-semibold text-[#0A0A0A]">{period.name}</span>
            <span
              className="rounded-full px-2.5 py-0.5 text-[11px] font-semibold"
              style={{ background: status.bg, color: status.color }}
            >
              {status.text}
            </span>
          </div>
        </div>

        <div className="hidden shrink-0 items-center gap-5 text-[12px] text-[#737373] sm:flex">
          <span>{period.employees.length} calisan</span>
          <span className="font-medium text-[#0A0A0A]">{period.type} {period.year}</span>
        </div>
      </button>

      {expanded && (
        <div className="border-t border-[#f5f5f5] px-5 pb-5 pt-4">
          <div className="grid gap-6 lg:grid-cols-[1fr_280px]">
            {/* Employee Table */}
            <div>
              <div className="mb-3 flex items-center justify-between">
                <h4 className="text-[12px] font-semibold uppercase tracking-widest text-[#A3A3A3]">Calisan Puanlari</h4>
                {period.status === 'active' && (
                  <button
                    onClick={(e) => { e.stopPropagation(); onAddReview(); }}
                    className="flex items-center gap-1 text-[12px] font-medium text-[#5E5CE6] hover:underline"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    Degerlendirme Ekle
                  </button>
                )}
              </div>
              <div className="overflow-hidden rounded-lg border border-[#f0f0f0]">
                <table className="w-full text-[12px]">
                  <thead>
                    <tr className="border-b border-[#f0f0f0] bg-[#fafafa]">
                      <th className="px-3 py-2.5 text-left font-semibold text-[#525252]">Calisan</th>
                      <th className="px-3 py-2.5 text-left font-semibold text-[#525252]">Departman</th>
                      <th className="px-3 py-2.5 text-center font-semibold text-[#525252]">OKR</th>
                      <th className="px-3 py-2.5 text-center font-semibold text-[#525252]">Yetkinlik</th>
                      <th className="px-3 py-2.5 text-center font-semibold text-[#525252]">Genel</th>
                      <th className="px-3 py-2.5 text-center font-semibold text-[#525252]">Potansiyel</th>
                      <th className="px-3 py-2.5 text-center font-semibold text-[#525252]">Trend</th>
                    </tr>
                  </thead>
                  <tbody>
                    {period.employees.map((emp) => {
                      const pot = potentialLabel(emp.potential);
                      return (
                        <tr key={emp.id} className="border-b border-[#f0f0f0] last:border-0 hover:bg-[#fafafa]">
                          <td className="px-3 py-2.5 font-medium text-[#0A0A0A]">{emp.name}</td>
                          <td className="px-3 py-2.5 text-[#737373]">{emp.department}</td>
                          <td className="px-3 py-2.5 text-center">
                            <span className="inline-block rounded px-1.5 py-0.5 font-semibold" style={{ background: scoreBg(emp.okrScore), color: scoreColor(emp.okrScore) }}>
                              {emp.okrScore}
                            </span>
                          </td>
                          <td className="px-3 py-2.5 text-center">
                            <span className="inline-block rounded px-1.5 py-0.5 font-semibold" style={{ background: scoreBg(emp.competencyScore), color: scoreColor(emp.competencyScore) }}>
                              {emp.competencyScore}
                            </span>
                          </td>
                          <td className="px-3 py-2.5 text-center">
                            <span className="inline-block rounded px-1.5 py-0.5 font-bold" style={{ background: scoreBg(emp.overallScore), color: scoreColor(emp.overallScore) }}>
                              {emp.overallScore}
                            </span>
                          </td>
                          <td className="px-3 py-2.5 text-center">
                            <span className="inline-block rounded-full px-2 py-0.5 text-[11px] font-semibold" style={{ background: pot.bg, color: pot.color }}>
                              {pot.text}
                            </span>
                          </td>
                          <td className="px-3 py-2.5 text-center">
                            {trends[emp.name] ? (
                              <Sparkline data={trends[emp.name]!.map((t) => t.performance)} />
                            ) : (
                              <span style={{ fontSize: 10, color: '#ccc' }}>—</span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            {/* 9-Box Preview */}
            <NineBoxPreview employees={period.employees} />
          </div>
        </div>
      )}
    </div>
  );
};

/* ─── Main Degerlendirme Tab ─── */

export const DegerlendirmeTab = () => {
  const [periods, setPeriods] = useState<ReviewPeriod[]>(INITIAL_PERIODS);
  const [trends, setTrends] = useState<Record<string, Array<{date: string; okr: number|null; performance: number|null}>>>({});
  const [showReviewForm, setShowReviewForm] = useState(false);
  const [showNewPeriod, setShowNewPeriod] = useState(false);

  useEffect(() => {
    fetch('/api/performance')
      .then((r) => r.json())
      .then((data) => {
        if (data.reviews && data.reviews.length > 0) {
          const reviewPeriod: ReviewPeriod = {
            id: 'db-period',
            name: '2026 H1 Değerlendirme',
            type: 'H1',
            year: 2026,
            status: 'active',
            employees: data.reviews.map((r: { id: string; employee: string; department: string; okrScore: number | null; competencyScore: number | null; overallScore: number | null; potentialRating: string | null }) => ({
              id: r.id,
              name: r.employee,
              department: r.department || '',
              okrScore: r.okrScore ?? 0,
              competencyScore: r.competencyScore ?? 0,
              overallScore: r.overallScore ?? 0,
              potential: (r.potentialRating || 'medium') as 'high' | 'medium' | 'low',
              managerNotes: '',
            })),
          };
          setPeriods([reviewPeriod]);
        }
        if (data.trends) setTrends(data.trends);
      })
      .catch(() => {});
  }, []);

  const handleAddReview = useCallback((form: ReviewFormData) => {
    const okr = parseInt(form.okrScore, 10) || 0;
    const comp = parseInt(form.competencyScore, 10) || 0;
    const overall = Math.round((okr + comp) / 2);

    const newEmployee: EmployeeScore = {
      id: `e-${Date.now()}`,
      name: form.employeeName,
      department: form.department,
      okrScore: okr,
      competencyScore: comp,
      overallScore: overall,
      potential: form.potential,
      managerNotes: form.managerNotes,
    };

    setPeriods((prev) =>
      prev.map((p, i) => (i === 0 ? { ...p, employees: [...p.employees, newEmployee] } : p))
    );
    setShowReviewForm(false);
  }, []);

  const handleNewPeriod = useCallback((form: { name: string; type: string; year: string }) => {
    const newPeriod: ReviewPeriod = {
      id: `rp-${Date.now()}`,
      name: form.name,
      type: form.type as ReviewPeriod['type'],
      year: parseInt(form.year, 10) || 2026,
      status: 'draft',
      employees: [],
    };
    setPeriods((prev) => [newPeriod, ...prev]);
    setShowNewPeriod(false);
  }, []);

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-[15px] font-semibold text-[#0A0A0A]">Performans Degerlendirme</h2>
          <p className="mt-0.5 text-[12px] text-[#737373]">Donemsel degerlendirmeler ve 9-box matrisi</p>
        </div>
        <button
          onClick={() => setShowNewPeriod(true)}
          className="flex items-center gap-2 rounded-lg bg-[#5E5CE6] px-4 py-2.5 text-[13px] font-medium text-white transition hover:bg-[#4B49B6]"
        >
          <Plus className="h-4 w-4" />
          Degerlendirme Baslat
        </button>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-4 gap-4">
        {[
          { label: 'Toplam Calisan', value: periods[0]?.employees.length.toString() ?? '0', color: '#0A0A0A' },
          { label: 'Ort. Performans', value: periods[0] ? Math.round(periods[0].employees.reduce((s, e) => s + e.overallScore, 0) / (periods[0].employees.length || 1)).toString() : '0', color: '#5E5CE6' },
          { label: 'Yildizlar (>80)', value: (periods[0]?.employees.filter((e) => e.overallScore >= 80).length ?? 0).toString(), color: '#059669' },
          { label: 'Riskli (<60)', value: (periods[0]?.employees.filter((e) => e.overallScore < 60).length ?? 0).toString(), color: '#DC2626' },
        ].map((card) => (
          <div key={card.label} className="rounded-xl border border-[#f0f0f0] bg-white p-5">
            <div className="text-[12px] font-medium text-[#737373]">{card.label}</div>
            <div className="mt-1 text-[24px] font-bold" style={{ color: card.color }}>{card.value}</div>
          </div>
        ))}
      </div>

      {/* Period Cards */}
      <div className="space-y-3">
        {periods.map((period) => (
          <PeriodCard key={period.id} period={period} onAddReview={() => setShowReviewForm(true)} trends={trends} />
        ))}
      </div>

      {/* Review Form */}
      <ReviewFormModal
        open={showReviewForm}
        onClose={() => setShowReviewForm(false)}
        onSubmit={handleAddReview}
      />

      {/* New Period Modal */}
      {showNewPeriod && (
        <NewPeriodModal onClose={() => setShowNewPeriod(false)} onSubmit={handleNewPeriod} />
      )}
    </div>
  );
};

/* ─── New Period Modal ─── */

const NewPeriodModal = ({
  onClose,
  onSubmit,
}: {
  onClose: () => void;
  onSubmit: (form: { name: string; type: string; year: string }) => void;
}) => {
  const [form, setForm] = useState({ name: '', type: 'Q1', year: '2026' });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="w-full max-w-[440px] rounded-2xl border border-[#f0f0f0] bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-[#f0f0f0] px-6 py-4">
          <h3 className="text-[15px] font-semibold text-[#0A0A0A]">Yeni Degerlendirme Donemi</h3>
          <button onClick={onClose} className="rounded-lg p-1 text-[#A3A3A3] hover:bg-[#f5f5f5] hover:text-[#525252]">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="space-y-4 px-6 py-5">
          <div>
            <label className="mb-1.5 block text-[12px] font-medium text-[#525252]">Donem Adi</label>
            <input
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="2026 Q2 Degerlendirme"
              className="w-full rounded-lg border border-[#e5e5e5] px-3 py-2.5 text-[13px] text-[#0A0A0A] outline-none transition focus:border-[#5E5CE6] focus:ring-2 focus:ring-[#5E5CE6]/10"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1.5 block text-[12px] font-medium text-[#525252]">Tip</label>
              <select
                value={form.type}
                onChange={(e) => setForm({ ...form, type: e.target.value })}
                className="w-full rounded-lg border border-[#e5e5e5] px-3 py-2.5 text-[13px] text-[#0A0A0A] outline-none transition focus:border-[#5E5CE6] focus:ring-2 focus:ring-[#5E5CE6]/10"
              >
                <option value="Q1">Q1</option>
                <option value="Q2">Q2</option>
                <option value="H1">H1</option>
                <option value="Annual">Yillik</option>
              </select>
            </div>
            <div>
              <label className="mb-1.5 block text-[12px] font-medium text-[#525252]">Yil</label>
              <input
                type="number"
                value={form.year}
                onChange={(e) => setForm({ ...form, year: e.target.value })}
                className="w-full rounded-lg border border-[#e5e5e5] px-3 py-2.5 text-[13px] text-[#0A0A0A] outline-none transition focus:border-[#5E5CE6] focus:ring-2 focus:ring-[#5E5CE6]/10"
              />
            </div>
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 border-t border-[#f0f0f0] px-6 py-4">
          <button onClick={onClose} className="rounded-lg border border-[#e5e5e5] px-4 py-2 text-[13px] font-medium text-[#525252] hover:bg-[#f5f5f5]">
            Iptal
          </button>
          <button
            onClick={() => { if (form.name) onSubmit(form); }}
            disabled={!form.name}
            className="rounded-lg bg-[#5E5CE6] px-4 py-2 text-[13px] font-medium text-white transition hover:bg-[#4B49B6] disabled:opacity-40"
          >
            Olustur
          </button>
        </div>
      </div>
    </div>
  );
};
