'use client';

import React, { useState, useCallback, useEffect } from 'react';
import { ChevronDown, ChevronRight, Plus, X, User, Calendar, Target } from 'lucide-react';

/* ─── Types ─── */

interface KeyResult {
  id: string;
  title: string;
  progress: number;
  target: string;
}

interface OkrItem {
  id: string;
  objective: string;
  progress: number;
  owner: string;
  deadline: string;
  updatedAt?: string;
  level: 'company' | 'team' | 'individual';
  team?: string;
  keyResults: KeyResult[];
}

/* ─── Fallback Data (used if API unavailable) ─── */

const FALLBACK_OKRS: OkrItem[] = [
  {
    id: 'o1',
    objective: 'Musteri memnuniyetini artir',
    progress: 72,
    owner: 'Hasan Aker',
    deadline: '2026-06-30',
    level: 'company',
    keyResults: [
      { id: 'kr1-1', title: 'NPS skoru 45\'ten 60\'a cikar', progress: 65, target: '60' },
      { id: 'kr1-2', title: 'Destek ticket cozum suresi <4 saat', progress: 80, target: '<4 saat' },
      { id: 'kr1-3', title: 'Musteri kaybi orani <%3', progress: 70, target: '<%3' },
    ],
  },
  {
    id: 'o2',
    objective: 'Satis gelirini %30 artir',
    progress: 52,
    owner: 'Elif Demir',
    deadline: '2026-12-31',
    level: 'company',
    keyResults: [
      { id: 'kr2-1', title: 'Yeni musteri sayisi +25', progress: 55, target: '+25' },
      { id: 'kr2-2', title: 'Upsell orani %15', progress: 40, target: '%15' },
      { id: 'kr2-3', title: 'Pipeline degeri 5M TL', progress: 60, target: '5M TL' },
    ],
  },
  {
    id: 'o3',
    objective: 'Urun kalitesini iyilestir',
    progress: 68,
    owner: 'Murat Yilmaz',
    deadline: '2026-09-30',
    level: 'company',
    keyResults: [
      { id: 'kr3-1', title: 'Bug fix suresi ortalama <2 gun', progress: 75, target: '<2 gun' },
      { id: 'kr3-2', title: 'Test coverage %80\'e cikar', progress: 60, target: '%80' },
      { id: 'kr3-3', title: 'Kullanici sikayet orani <%1', progress: 70, target: '<%1' },
    ],
  },
  {
    id: 'o4',
    objective: 'Satis ekibinin donusum oranini artir',
    progress: 48,
    owner: 'Selin Ozturk',
    deadline: '2026-06-30',
    level: 'team',
    team: 'Satis',
    keyResults: [
      { id: 'kr4-1', title: 'Demo\'dan satisa donusum %25', progress: 50, target: '%25' },
      { id: 'kr4-2', title: 'Ortalama satis dongusu 30 gune dusur', progress: 45, target: '30 gun' },
      { id: 'kr4-3', title: 'Lead kalifikasyon skoru >70', progress: 48, target: '>70' },
    ],
  },
  {
    id: 'o5',
    objective: 'Muhendislik deploy hizini artir',
    progress: 78,
    owner: 'Ahmet Kaya',
    deadline: '2026-06-30',
    level: 'team',
    team: 'Muhendislik',
    keyResults: [
      { id: 'kr5-1', title: 'Haftalik deploy sayisi >10', progress: 85, target: '>10' },
      { id: 'kr5-2', title: 'Rollback orani <%5', progress: 70, target: '<%5' },
      { id: 'kr5-3', title: 'CI/CD pipeline suresi <10dk', progress: 80, target: '<10dk' },
    ],
  },
  {
    id: 'o6',
    objective: 'Kisisel liderlik becerilerini gelistir',
    progress: 55,
    owner: 'Zeynep Arslan',
    deadline: '2026-06-30',
    level: 'individual',
    keyResults: [
      { id: 'kr6-1', title: '2 liderlik egitimi tamamla', progress: 50, target: '2 egitim' },
      { id: 'kr6-2', title: '360 liderlik skoru >4.0', progress: 60, target: '>4.0' },
      { id: 'kr6-3', title: 'Mentorluk programina katil', progress: 55, target: 'Katilim' },
    ],
  },
  {
    id: 'o7',
    objective: 'Teknik yetkinlikleri derinlestir',
    progress: 62,
    owner: 'Can Demir',
    deadline: '2026-09-30',
    level: 'individual',
    keyResults: [
      { id: 'kr7-1', title: 'AWS sertifikasi al', progress: 70, target: 'Sertifika' },
      { id: 'kr7-2', title: '3 teknik blog yazisi yayinla', progress: 33, target: '3 yazi' },
      { id: 'kr7-3', title: 'Kod review katilim orani >%90', progress: 82, target: '>%90' },
    ],
  },
];

/* ─── Helpers ─── */

const progressColor = (p: number) => {
  if (p >= 70) return '#059669';
  if (p >= 40) return '#D97706';
  return '#DC2626';
};

const progressBg = (p: number) => {
  if (p >= 70) return '#ECFDF5';
  if (p >= 40) return '#FFFBEB';
  return '#FEF2F2';
};

/* ─── Progress Bar ─── */

const ProgressBar = ({ progress, height = 8 }: { progress: number; height?: number }) => (
  <div className="w-full rounded-full" style={{ background: progressBg(progress), height }}>
    <div
      className="rounded-full transition-all duration-500"
      style={{
        width: `${Math.min(progress, 100)}%`,
        height,
        background: progressColor(progress),
      }}
    />
  </div>
);

/* ─── OKR Card ─── */

const OkrCard = ({ okr, onProgressUpdate }: { okr: OkrItem; onProgressUpdate: (krId: string, progress: number) => void }) => {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="rounded-xl border border-[#f0f0f0] bg-white transition-shadow hover:shadow-sm">
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex w-full items-center gap-4 px-5 py-4 text-left"
      >
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg" style={{ background: progressBg(okr.progress) }}>
          {expanded ? (
            <ChevronDown className="h-4 w-4" style={{ color: progressColor(okr.progress) }} />
          ) : (
            <ChevronRight className="h-4 w-4" style={{ color: progressColor(okr.progress) }} />
          )}
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-3">
            <span className="text-[14px] font-semibold text-[#0A0A0A]">{okr.objective}</span>
            <span
              className="shrink-0 rounded-full px-2.5 py-0.5 text-[11px] font-semibold"
              style={{ background: progressBg(okr.progress), color: progressColor(okr.progress) }}
            >
              %{okr.progress}
            </span>
          </div>
          <div className="mt-2">
            <ProgressBar progress={okr.progress} />
          </div>
        </div>

        <div className="hidden shrink-0 items-center gap-4 text-[12px] text-[#737373] sm:flex">
          <span className="flex items-center gap-1">
            <User className="h-3.5 w-3.5" />
            {okr.owner}
          </span>
          <span className="flex items-center gap-1">
            <Calendar className="h-3.5 w-3.5" />
            {okr.deadline}
          </span>
        </div>
      </button>

      {expanded && (
        <div className="border-t border-[#f5f5f5] px-5 pb-5 pt-4">
          <div className="space-y-3">
            {okr.keyResults.map((kr, i) => (
              <div key={kr.id} className="flex items-center gap-4">
                <span className="shrink-0 text-[12px] font-medium text-[#A3A3A3]">KR{i + 1}</span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between">
                    <span className="text-[13px] text-[#525252]">{kr.title}</span>
                    <span
                      className="shrink-0 text-[12px] font-semibold"
                      style={{ color: progressColor(kr.progress) }}
                    >
                      %{kr.progress}
                    </span>
                  </div>
                  <div className="mt-1.5 flex items-center gap-2">
                    <input
                      type="range"
                      min={0}
                      max={100}
                      value={kr.progress}
                      onChange={(e) => onProgressUpdate(kr.id, Number(e.target.value))}
                      className="h-1.5 flex-1 cursor-pointer appearance-none rounded-full bg-[#f0f0f0] accent-[#5E5CE6]"
                      style={{ accentColor: progressColor(kr.progress) }}
                    />
                    <input
                      type="number"
                      min={0}
                      max={100}
                      value={kr.progress}
                      onChange={(e) => onProgressUpdate(kr.id, Math.min(100, Math.max(0, Number(e.target.value))))}
                      className="w-[52px] rounded-md border border-[#e5e5e5] px-2 py-1 text-center text-[11px] font-semibold text-[#525252] outline-none focus:border-[#5E5CE6]"
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Mobile meta */}
          <div className="mt-4 flex items-center gap-4 text-[12px] text-[#737373] sm:hidden">
            <span className="flex items-center gap-1">
              <User className="h-3.5 w-3.5" />
              {okr.owner}
            </span>
            <span className="flex items-center gap-1">
              <Calendar className="h-3.5 w-3.5" />
              {okr.deadline}
            </span>
          </div>

          {/* Last updated timestamp */}
          {okr.updatedAt && (
            <div className="mt-3 flex items-center gap-2 text-[11px] text-[#A3A3A3]">
              <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <circle cx="12" cy="12" r="10" />
                <path d="M12 6v6l4 2" />
              </svg>
              Son guncelleme: {new Date(okr.updatedAt).toLocaleDateString('tr-TR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

/* ─── New OKR Modal ─── */

interface NewOkrForm {
  objective: string;
  owner: string;
  deadline: string;
  level: 'company' | 'team' | 'individual';
  team: string;
  kr1: string;
  kr2: string;
  kr3: string;
}

const emptyForm: NewOkrForm = {
  objective: '',
  owner: '',
  deadline: '',
  level: 'company',
  team: '',
  kr1: '',
  kr2: '',
  kr3: '',
};

const NewOkrModal = ({
  open,
  onClose,
  onSubmit,
}: {
  open: boolean;
  onClose: () => void;
  onSubmit: (form: NewOkrForm) => void;
}) => {
  const [form, setForm] = useState<NewOkrForm>(emptyForm);

  const handleSubmit = useCallback(() => {
    if (!form.objective || !form.owner || !form.deadline || !form.kr1) return;
    onSubmit(form);
    setForm(emptyForm);
  }, [form, onSubmit]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="w-full max-w-[520px] rounded-2xl border border-[#f0f0f0] bg-white shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[#f0f0f0] px-6 py-4">
          <h3 className="text-[15px] font-semibold text-[#0A0A0A]">Yeni OKR Ekle</h3>
          <button onClick={onClose} className="rounded-lg p-1 text-[#A3A3A3] hover:bg-[#f5f5f5] hover:text-[#525252]">
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Body */}
        <div className="space-y-4 px-6 py-5">
          <div>
            <label className="mb-1.5 block text-[12px] font-medium text-[#525252]">Hedef (Objective)</label>
            <input
              value={form.objective}
              onChange={(e) => setForm({ ...form, objective: e.target.value })}
              placeholder="Ornegin: Musteri memnuniyetini artir"
              className="w-full rounded-lg border border-[#e5e5e5] px-3 py-2.5 text-[13px] text-[#0A0A0A] outline-none transition focus:border-[#5E5CE6] focus:ring-2 focus:ring-[#5E5CE6]/10"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1.5 block text-[12px] font-medium text-[#525252]">Seviye</label>
              <select
                value={form.level}
                onChange={(e) => setForm({ ...form, level: e.target.value as NewOkrForm['level'] })}
                className="w-full rounded-lg border border-[#e5e5e5] px-3 py-2.5 text-[13px] text-[#0A0A0A] outline-none transition focus:border-[#5E5CE6] focus:ring-2 focus:ring-[#5E5CE6]/10"
              >
                <option value="company">Sirket</option>
                <option value="team">Takim</option>
                <option value="individual">Bireysel</option>
              </select>
            </div>
            {form.level === 'team' && (
              <div>
                <label className="mb-1.5 block text-[12px] font-medium text-[#525252]">Takim</label>
                <input
                  value={form.team}
                  onChange={(e) => setForm({ ...form, team: e.target.value })}
                  placeholder="Satis, Muhendislik..."
                  className="w-full rounded-lg border border-[#e5e5e5] px-3 py-2.5 text-[13px] text-[#0A0A0A] outline-none transition focus:border-[#5E5CE6] focus:ring-2 focus:ring-[#5E5CE6]/10"
                />
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1.5 block text-[12px] font-medium text-[#525252]">Sorumlu</label>
              <input
                value={form.owner}
                onChange={(e) => setForm({ ...form, owner: e.target.value })}
                placeholder="Ad Soyad"
                className="w-full rounded-lg border border-[#e5e5e5] px-3 py-2.5 text-[13px] text-[#0A0A0A] outline-none transition focus:border-[#5E5CE6] focus:ring-2 focus:ring-[#5E5CE6]/10"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-[12px] font-medium text-[#525252]">Son Tarih</label>
              <input
                type="date"
                value={form.deadline}
                onChange={(e) => setForm({ ...form, deadline: e.target.value })}
                className="w-full rounded-lg border border-[#e5e5e5] px-3 py-2.5 text-[13px] text-[#0A0A0A] outline-none transition focus:border-[#5E5CE6] focus:ring-2 focus:ring-[#5E5CE6]/10"
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="mb-1.5 block text-[12px] font-medium text-[#525252]">Anahtar Sonuclar (Key Results)</label>
            {[1, 2, 3].map((n) => (
              <input
                key={n}
                value={form[`kr${n}` as keyof NewOkrForm]}
                onChange={(e) => setForm({ ...form, [`kr${n}`]: e.target.value })}
                placeholder={`KR${n}: Ornegin: NPS skoru 60'a cikar`}
                className="w-full rounded-lg border border-[#e5e5e5] px-3 py-2.5 text-[13px] text-[#0A0A0A] outline-none transition focus:border-[#5E5CE6] focus:ring-2 focus:ring-[#5E5CE6]/10"
              />
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 border-t border-[#f0f0f0] px-6 py-4">
          <button
            onClick={onClose}
            className="rounded-lg border border-[#e5e5e5] px-4 py-2 text-[13px] font-medium text-[#525252] hover:bg-[#f5f5f5]"
          >
            Iptal
          </button>
          <button
            onClick={handleSubmit}
            disabled={!form.objective || !form.owner || !form.deadline || !form.kr1}
            className="rounded-lg bg-[#5E5CE6] px-4 py-2 text-[13px] font-medium text-white transition hover:bg-[#4B49B6] disabled:opacity-40"
          >
            Kaydet
          </button>
        </div>
      </div>
    </div>
  );
};

/* ─── Main OKR Tab ─── */

export const OkrTab = () => {
  const [okrs, setOkrs] = useState<OkrItem[]>(FALLBACK_OKRS);
  const [showModal, setShowModal] = useState(false);

  useEffect(() => {
    fetch('/api/okr')
      .then((r) => r.json())
      .then((data) => {
        if (data.okrs && data.okrs.length > 0) {
          setOkrs(data.okrs);
        }
      })
      .catch(() => {});
  }, []);

  // Debounced progress update — persists to DB via PATCH /api/okr
  const progressTimers = React.useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());

  const handleProgressUpdate = useCallback((krId: string, newProgress: number) => {
    // Update local state immediately
    setOkrs((prev) =>
      prev.map((okr) => {
        const updatedKrs = okr.keyResults.map((kr) =>
          kr.id === krId ? { ...kr, progress: newProgress } : kr
        );
        const hasKr = updatedKrs.some((kr) => kr.id === krId);
        if (!hasKr) return okr;
        // Auto-calculate objective progress from KR average
        const avgProgress = Math.round(updatedKrs.reduce((sum, kr) => sum + kr.progress, 0) / updatedKrs.length);
        return { ...okr, keyResults: updatedKrs, progress: avgProgress };
      })
    );

    // Debounce the API call (500ms)
    const existing = progressTimers.current.get(krId);
    if (existing) clearTimeout(existing);
    progressTimers.current.set(krId, setTimeout(() => {
      fetch('/api/okr', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ keyResultId: krId, progress: newProgress }),
      }).catch(() => {});
      progressTimers.current.delete(krId);
    }, 500));
  }, []);

  const companyOkrs = okrs.filter((o) => o.level === 'company');
  const teamOkrs = okrs.filter((o) => o.level === 'team');
  const individualOkrs = okrs.filter((o) => o.level === 'individual');

  const handleAdd = useCallback((form: NewOkrForm) => {
    const krs: KeyResult[] = [];
    if (form.kr1) krs.push({ id: `new-kr-${Date.now()}-1`, title: form.kr1, progress: 0, target: '' });
    if (form.kr2) krs.push({ id: `new-kr-${Date.now()}-2`, title: form.kr2, progress: 0, target: '' });
    if (form.kr3) krs.push({ id: `new-kr-${Date.now()}-3`, title: form.kr3, progress: 0, target: '' });

    const newOkr: OkrItem = {
      id: `o-${Date.now()}`,
      objective: form.objective,
      progress: 0,
      owner: form.owner,
      deadline: form.deadline,
      level: form.level,
      team: form.team || undefined,
      keyResults: krs,
    };

    setOkrs((prev) => [...prev, newOkr]);
    setShowModal(false);
  }, []);

  const renderSection = (title: string, items: OkrItem[], icon: React.ReactNode) => (
    <div>
      <div className="mb-4 flex items-center gap-2">
        {icon}
        <h3 className="text-[13px] font-semibold uppercase tracking-widest text-[#A3A3A3]">{title}</h3>
        <span className="rounded-full bg-[#f5f5f5] px-2 py-0.5 text-[11px] font-medium text-[#737373]">
          {items.length}
        </span>
      </div>
      <div className="space-y-3">
        {items.map((okr) => (
          <OkrCard key={okr.id} okr={okr} onProgressUpdate={handleProgressUpdate} />
        ))}
      </div>
    </div>
  );

  return (
    <div className="space-y-8">
      {/* Header with Add button */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-[15px] font-semibold text-[#0A0A0A]">OKR Yonetimi</h2>
          <p className="mt-0.5 text-[12px] text-[#737373]">Sirket, takim ve bireysel hedefleri takip edin</p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="flex items-center gap-2 rounded-lg bg-[#5E5CE6] px-4 py-2.5 text-[13px] font-medium text-white transition hover:bg-[#4B49B6]"
        >
          <Plus className="h-4 w-4" />
          Yeni OKR Ekle
        </button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'Ortalama Ilerleme', value: `%${Math.round(okrs.reduce((s, o) => s + o.progress, 0) / okrs.length)}`, color: '#5E5CE6' },
          { label: 'Hedefe Yakin (>%70)', value: okrs.filter((o) => o.progress >= 70).length.toString(), color: '#059669' },
          { label: 'Riskli (<%40)', value: okrs.filter((o) => o.progress < 40).length.toString(), color: '#DC2626' },
        ].map((card) => (
          <div key={card.label} className="rounded-xl border border-[#f0f0f0] bg-white p-5">
            <div className="text-[12px] font-medium text-[#737373]">{card.label}</div>
            <div className="mt-1 text-[24px] font-bold" style={{ color: card.color }}>{card.value}</div>
          </div>
        ))}
      </div>

      {/* OKR Sections */}
      {renderSection(
        'Sirket Hedefleri',
        companyOkrs,
        <Target className="h-4 w-4 text-[#5E5CE6]" />
      )}
      {renderSection(
        'Takim Hedefleri',
        teamOkrs,
        <svg className="h-4 w-4 text-[#D97706]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
          <circle cx="9" cy="7" r="4" />
          <path strokeLinecap="round" strokeLinejoin="round" d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" />
        </svg>
      )}
      {renderSection(
        'Bireysel Hedefler',
        individualOkrs,
        <User className="h-4 w-4 text-[#059669]" />
      )}

      <NewOkrModal open={showModal} onClose={() => setShowModal(false)} onSubmit={handleAdd} />
    </div>
  );
};
