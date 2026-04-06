'use client';

import { useState, useCallback } from 'react';
import { ChevronDown, ChevronRight, Plus, X, Users, Clock, CheckCircle2 } from 'lucide-react';

/* ─── Types ─── */

interface FeedbackScore {
  dimension: string;
  manager: number;
  peer: number;
  self: number;
  average: number;
}

interface Evaluation {
  evaluator: string;
  evaluatee: string;
  completed: boolean;
}

interface FeedbackCycle {
  id: string;
  name: string;
  participants: number;
  deadline: string;
  completionRate: number;
  evaluations: Evaluation[];
  scores: FeedbackScore[];
}

/* ─── Static Data ─── */

const DIMENSIONS = ['Iletisim', 'Liderlik', 'Teknik Yetkinlik', 'Isbirligi', 'Inovasyon'];

const INITIAL_CYCLES: FeedbackCycle[] = [
  {
    id: 'c1',
    name: '2026 Q1 360 Degerlendirme',
    participants: 24,
    deadline: '2026-03-31',
    completionRate: 87,
    evaluations: [
      { evaluator: 'Hasan Aker', evaluatee: 'Elif Demir', completed: true },
      { evaluator: 'Elif Demir', evaluatee: 'Hasan Aker', completed: true },
      { evaluator: 'Murat Yilmaz', evaluatee: 'Selin Ozturk', completed: true },
      { evaluator: 'Selin Ozturk', evaluatee: 'Murat Yilmaz', completed: false },
      { evaluator: 'Ahmet Kaya', evaluatee: 'Zeynep Arslan', completed: true },
      { evaluator: 'Zeynep Arslan', evaluatee: 'Ahmet Kaya', completed: true },
      { evaluator: 'Can Demir', evaluatee: 'Hasan Aker', completed: false },
      { evaluator: 'Ayse Yildiz', evaluatee: 'Elif Demir', completed: true },
    ],
    scores: [
      { dimension: 'Iletisim', manager: 4.2, peer: 3.9, self: 4.5, average: 4.2 },
      { dimension: 'Liderlik', manager: 3.8, peer: 3.5, self: 4.0, average: 3.8 },
      { dimension: 'Teknik Yetkinlik', manager: 4.5, peer: 4.3, self: 4.2, average: 4.3 },
      { dimension: 'Isbirligi', manager: 4.0, peer: 4.2, self: 3.8, average: 4.0 },
      { dimension: 'Inovasyon', manager: 3.6, peer: 3.4, self: 4.1, average: 3.7 },
    ],
  },
  {
    id: 'c2',
    name: '2025 Yillik 360 Degerlendirme',
    participants: 32,
    deadline: '2025-12-31',
    completionRate: 100,
    evaluations: [
      { evaluator: 'Hasan Aker', evaluatee: 'Elif Demir', completed: true },
      { evaluator: 'Elif Demir', evaluatee: 'Hasan Aker', completed: true },
      { evaluator: 'Murat Yilmaz', evaluatee: 'Selin Ozturk', completed: true },
      { evaluator: 'Selin Ozturk', evaluatee: 'Murat Yilmaz', completed: true },
    ],
    scores: [
      { dimension: 'Iletisim', manager: 4.0, peer: 3.7, self: 4.3, average: 4.0 },
      { dimension: 'Liderlik', manager: 3.5, peer: 3.3, self: 3.8, average: 3.5 },
      { dimension: 'Teknik Yetkinlik', manager: 4.3, peer: 4.1, self: 4.0, average: 4.1 },
      { dimension: 'Isbirligi', manager: 3.8, peer: 4.0, self: 3.6, average: 3.8 },
      { dimension: 'Inovasyon', manager: 3.4, peer: 3.2, self: 3.9, average: 3.5 },
    ],
  },
];

/* ─── Radar Chart (Pure SVG) ─── */

const RadarChart = ({ scores }: { scores: FeedbackScore[] }) => {
  const size = 280;
  const cx = size / 2;
  const cy = size / 2;
  const maxR = 110;
  const levels = 5;

  const angleStep = (2 * Math.PI) / scores.length;
  const startAngle = -Math.PI / 2;

  const getPoint = (index: number, value: number) => {
    const angle = startAngle + index * angleStep;
    const r = (value / 5) * maxR;
    return { x: cx + r * Math.cos(angle), y: cy + r * Math.sin(angle) };
  };

  const makePolygon = (getValue: (s: FeedbackScore) => number) =>
    scores.map((s, i) => {
      const p = getPoint(i, getValue(s));
      return `${p.x},${p.y}`;
    }).join(' ');

  return (
    <svg width="100%" viewBox={`0 0 ${size} ${size}`} className="mx-auto max-w-[280px]">
      {/* Grid circles */}
      {Array.from({ length: levels }, (_, i) => {
        const r = ((i + 1) / levels) * maxR;
        const points = scores.map((_, j) => {
          const angle = startAngle + j * angleStep;
          return `${cx + r * Math.cos(angle)},${cy + r * Math.sin(angle)}`;
        }).join(' ');
        return <polygon key={i} points={points} fill="none" stroke="#f0f0f0" strokeWidth={1} />;
      })}

      {/* Axis lines */}
      {scores.map((_, i) => {
        const p = getPoint(i, 5);
        return <line key={i} x1={cx} y1={cy} x2={p.x} y2={p.y} stroke="#f0f0f0" strokeWidth={1} />;
      })}

      {/* Data polygons */}
      <polygon points={makePolygon((s) => s.manager)} fill="#5E5CE620" stroke="#5E5CE6" strokeWidth={2} />
      <polygon points={makePolygon((s) => s.peer)} fill="#D9770620" stroke="#D97706" strokeWidth={2} />
      <polygon points={makePolygon((s) => s.self)} fill="#05966920" stroke="#059669" strokeWidth={2} />

      {/* Labels */}
      {scores.map((s, i) => {
        const p = getPoint(i, 5.6);
        return (
          <text
            key={i}
            x={p.x}
            y={p.y}
            textAnchor="middle"
            dominantBaseline="middle"
            className="fill-[#525252] text-[10px] font-medium"
          >
            {s.dimension}
          </text>
        );
      })}
    </svg>
  );
};

/* ─── Cycle Card ─── */

const CycleCard = ({ cycle }: { cycle: FeedbackCycle }) => {
  const [expanded, setExpanded] = useState(false);
  const isComplete = cycle.completionRate === 100;

  return (
    <div className="rounded-xl border border-[#f0f0f0] bg-white transition-shadow hover:shadow-sm">
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex w-full items-center gap-4 px-5 py-4 text-left"
      >
        <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${isComplete ? 'bg-[#ECFDF5]' : 'bg-[#f0f0ff]'}`}>
          {expanded ? (
            <ChevronDown className={`h-4 w-4 ${isComplete ? 'text-[#059669]' : 'text-[#5E5CE6]'}`} />
          ) : (
            <ChevronRight className={`h-4 w-4 ${isComplete ? 'text-[#059669]' : 'text-[#5E5CE6]'}`} />
          )}
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-3">
            <span className="text-[14px] font-semibold text-[#0A0A0A]">{cycle.name}</span>
            {isComplete && (
              <span className="flex items-center gap-1 rounded-full bg-[#ECFDF5] px-2 py-0.5 text-[11px] font-semibold text-[#059669]">
                <CheckCircle2 className="h-3 w-3" />
                Tamamlandi
              </span>
            )}
          </div>
        </div>

        <div className="hidden shrink-0 items-center gap-5 text-[12px] text-[#737373] sm:flex">
          <span className="flex items-center gap-1">
            <Users className="h-3.5 w-3.5" />
            {cycle.participants} kisi
          </span>
          <span className="flex items-center gap-1">
            <Clock className="h-3.5 w-3.5" />
            {cycle.deadline}
          </span>
          <span className="font-semibold" style={{ color: cycle.completionRate >= 80 ? '#059669' : '#D97706' }}>
            %{cycle.completionRate}
          </span>
        </div>
      </button>

      {expanded && (
        <div className="border-t border-[#f5f5f5] px-5 pb-5 pt-4">
          <div className="grid gap-6 lg:grid-cols-2">
            {/* Left: Radar Chart */}
            <div>
              <h4 className="mb-3 text-[12px] font-semibold uppercase tracking-widest text-[#A3A3A3]">
                Boyut Ortalamalari
              </h4>
              <RadarChart scores={cycle.scores} />
              <div className="mt-3 flex items-center justify-center gap-4 text-[11px]">
                <span className="flex items-center gap-1.5">
                  <span className="h-2.5 w-2.5 rounded-full bg-[#5E5CE6]" />
                  Yonetici
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="h-2.5 w-2.5 rounded-full bg-[#D97706]" />
                  Akran
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="h-2.5 w-2.5 rounded-full bg-[#059669]" />
                  Oz-Degerlendirme
                </span>
              </div>
            </div>

            {/* Right: Scores table + evaluations */}
            <div className="space-y-5">
              {/* Score breakdown */}
              <div>
                <h4 className="mb-3 text-[12px] font-semibold uppercase tracking-widest text-[#A3A3A3]">
                  Puan Dagilimi
                </h4>
                <div className="space-y-2">
                  {cycle.scores.map((s) => (
                    <div key={s.dimension} className="flex items-center gap-3">
                      <span className="w-[120px] shrink-0 text-[12px] text-[#525252]">{s.dimension}</span>
                      <div className="flex flex-1 items-center gap-2">
                        {[
                          { label: 'Y', value: s.manager, color: '#5E5CE6' },
                          { label: 'A', value: s.peer, color: '#D97706' },
                          { label: 'O', value: s.self, color: '#059669' },
                        ].map((item) => (
                          <div key={item.label} className="flex items-center gap-1">
                            <span className="text-[10px] font-medium" style={{ color: item.color }}>{item.label}</span>
                            <div className="h-[6px] w-[40px] rounded-full bg-[#f5f5f5]">
                              <div className="h-full rounded-full" style={{ width: `${(item.value / 5) * 100}%`, background: item.color }} />
                            </div>
                            <span className="text-[10px] text-[#737373]">{item.value.toFixed(1)}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Evaluations */}
              <div>
                <h4 className="mb-3 text-[12px] font-semibold uppercase tracking-widest text-[#A3A3A3]">
                  Degerlendirmeler
                </h4>
                <div className="space-y-1.5">
                  {cycle.evaluations.map((ev, i) => (
                    <div key={i} className="flex items-center gap-2 text-[12px]">
                      <span className={`h-2 w-2 shrink-0 rounded-full ${ev.completed ? 'bg-[#059669]' : 'bg-[#D97706]'}`} />
                      <span className="text-[#525252]">
                        {ev.evaluator} → {ev.evaluatee}
                      </span>
                      <span className={`ml-auto text-[11px] font-medium ${ev.completed ? 'text-[#059669]' : 'text-[#D97706]'}`}>
                        {ev.completed ? 'Tamamlandi' : 'Bekliyor'}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

/* ─── New Cycle Modal ─── */

interface NewCycleForm {
  name: string;
  deadline: string;
  participants: string;
}

const emptyCycleForm: NewCycleForm = { name: '', deadline: '', participants: '' };

const NewCycleModal = ({
  open,
  onClose,
  onSubmit,
}: {
  open: boolean;
  onClose: () => void;
  onSubmit: (form: NewCycleForm) => void;
}) => {
  const [form, setForm] = useState<NewCycleForm>(emptyCycleForm);

  const handleSubmit = useCallback(() => {
    if (!form.name || !form.deadline) return;
    onSubmit(form);
    setForm(emptyCycleForm);
  }, [form, onSubmit]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="w-full max-w-[480px] rounded-2xl border border-[#f0f0f0] bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-[#f0f0f0] px-6 py-4">
          <h3 className="text-[15px] font-semibold text-[#0A0A0A]">Yeni 360 Dongusu Baslat</h3>
          <button onClick={onClose} className="rounded-lg p-1 text-[#A3A3A3] hover:bg-[#f5f5f5] hover:text-[#525252]">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="space-y-4 px-6 py-5">
          <div>
            <label className="mb-1.5 block text-[12px] font-medium text-[#525252]">Dongu Adi</label>
            <input
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="Ornegin: 2026 Q2 360 Degerlendirme"
              className="w-full rounded-lg border border-[#e5e5e5] px-3 py-2.5 text-[13px] text-[#0A0A0A] outline-none transition focus:border-[#5E5CE6] focus:ring-2 focus:ring-[#5E5CE6]/10"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1.5 block text-[12px] font-medium text-[#525252]">Son Tarih</label>
              <input
                type="date"
                value={form.deadline}
                onChange={(e) => setForm({ ...form, deadline: e.target.value })}
                className="w-full rounded-lg border border-[#e5e5e5] px-3 py-2.5 text-[13px] text-[#0A0A0A] outline-none transition focus:border-[#5E5CE6] focus:ring-2 focus:ring-[#5E5CE6]/10"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-[12px] font-medium text-[#525252]">Katilimci Sayisi</label>
              <input
                type="number"
                value={form.participants}
                onChange={(e) => setForm({ ...form, participants: e.target.value })}
                placeholder="24"
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
            onClick={handleSubmit}
            disabled={!form.name || !form.deadline}
            className="rounded-lg bg-[#5E5CE6] px-4 py-2 text-[13px] font-medium text-white transition hover:bg-[#4B49B6] disabled:opacity-40"
          >
            Baslat
          </button>
        </div>
      </div>
    </div>
  );
};

/* ─── Main 360 Tab ─── */

export const Feedback360Tab = () => {
  const [cycles, setCycles] = useState<FeedbackCycle[]>(INITIAL_CYCLES);
  const [showModal, setShowModal] = useState(false);

  const handleAdd = useCallback((form: NewCycleForm) => {
    const newCycle: FeedbackCycle = {
      id: `c-${Date.now()}`,
      name: form.name,
      participants: parseInt(form.participants, 10) || 0,
      deadline: form.deadline,
      completionRate: 0,
      evaluations: [],
      scores: DIMENSIONS.map((d) => ({ dimension: d, manager: 0, peer: 0, self: 0, average: 0 })),
    };
    setCycles((prev) => [newCycle, ...prev]);
    setShowModal(false);
  }, []);

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-[15px] font-semibold text-[#0A0A0A]">360 Geri Bildirim</h2>
          <p className="mt-0.5 text-[12px] text-[#737373]">Cok yonlu degerlendirme donguleri ve sonuclari</p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="flex items-center gap-2 rounded-lg bg-[#5E5CE6] px-4 py-2.5 text-[13px] font-medium text-white transition hover:bg-[#4B49B6]"
        >
          <Plus className="h-4 w-4" />
          Yeni Dongu Baslat
        </button>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'Aktif Dongu', value: cycles.filter((c) => c.completionRate < 100).length.toString(), color: '#5E5CE6' },
          { label: 'Toplam Katilimci', value: cycles.reduce((s, c) => s + c.participants, 0).toString(), color: '#0A0A0A' },
          { label: 'Ortalama Tamamlanma', value: `%${Math.round(cycles.reduce((s, c) => s + c.completionRate, 0) / cycles.length)}`, color: '#059669' },
        ].map((card) => (
          <div key={card.label} className="rounded-xl border border-[#f0f0f0] bg-white p-5">
            <div className="text-[12px] font-medium text-[#737373]">{card.label}</div>
            <div className="mt-1 text-[24px] font-bold" style={{ color: card.color }}>{card.value}</div>
          </div>
        ))}
      </div>

      {/* Cycles List */}
      <div className="space-y-3">
        {cycles.map((cycle) => (
          <CycleCard key={cycle.id} cycle={cycle} />
        ))}
      </div>

      <NewCycleModal open={showModal} onClose={() => setShowModal(false)} onSubmit={handleAdd} />
    </div>
  );
};
