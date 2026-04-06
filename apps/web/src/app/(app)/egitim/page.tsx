'use client';

import { useState, useEffect, useCallback } from 'react';

interface TrainingProgram {
  id: string;
  code: string;
  name: string;
  category: string;
  deliveryMode: string;
  durationHours: number;
  provider: string;
  costPerPerson: number;
  skillTags: string[];
  enrollmentCount: number;
  completionCount: number;
}

interface SkillEntry {
  employeeName: string;
  skillName: string;
  category: string;
  currentLevel: number;
  targetLevel: number;
  gap: number;
}

interface TrainingStats {
  totalPrograms: number;
  completionRate: number;
  avgFeedback: number;
  skillGapCount: number;
}

interface NewProgramForm {
  code: string;
  name_tr: string;
  category: string;
  deliveryMode: string;
  durationHours: string;
  provider: string;
  costPerPerson: string;
  skillTags: string;
}

const DELIVERY_LABELS: Record<string, { label: string; color: string; bg: string }> = {
  online: { label: 'Online', color: '#5E5CE6', bg: '#f0f0ff' },
  classroom: { label: 'Sinif', color: '#059669', bg: '#D1FAE5' },
  blended: { label: 'Karma', color: '#D97706', bg: '#FEF3C7' },
  self_paced: { label: 'Bireysel', color: '#0EA5E9', bg: '#E0F2FE' },
};

const CATEGORY_OPTIONS = [
  { value: 'technical', label: 'Teknik' },
  { value: 'soft_skills', label: 'Kisisel Gelisim' },
  { value: 'leadership', label: 'Liderlik' },
  { value: 'compliance', label: 'Uyum' },
  { value: 'onboarding', label: 'Oryantasyon' },
];

const LEVEL_LABELS = ['', 'Baslangic', 'Temel', 'Orta', 'Ileri', 'Uzman'];

const EMPTY_PROGRAM_FORM: NewProgramForm = {
  code: '', name_tr: '', category: 'technical', deliveryMode: 'online',
  durationHours: '', provider: '', costPerPerson: '', skillTags: '',
};

export default function EgitimPage() {
  const [programs, setPrograms] = useState<TrainingProgram[]>([]);
  const [skills, setSkills] = useState<SkillEntry[]>([]);
  const [stats, setStats] = useState<TrainingStats | null>(null);
  const [tab, setTab] = useState<'programs' | 'skills' | 'certifications'>('programs');

  // Modal & form states
  const [showNewProgram, setShowNewProgram] = useState(false);
  const [newProgram, setNewProgram] = useState<NewProgramForm>(EMPTY_PROGRAM_FORM);
  const [enrollProgramId, setEnrollProgramId] = useState<string | null>(null);
  const [enrollEmployeeName, setEnrollEmployeeName] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const [recommendSkillIdx, setRecommendSkillIdx] = useState<number | null>(null);

  const showToast = useCallback((message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  }, []);

  const loadData = useCallback(() => {
    fetch('/api/training')
      .then((r) => r.json())
      .then((data) => {
        if (data.programs) setPrograms(data.programs);
        if (data.skills) setSkills(data.skills);
        if (data.stats) setStats(data.stats);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleEnroll = async () => {
    if (!enrollEmployeeName.trim() || !enrollProgramId) return;
    setSubmitting(true);
    try {
      const res = await fetch('/api/training', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'enroll', employeeId: enrollEmployeeName.trim(), programId: enrollProgramId }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        showToast('Kayit basarili!');
        setEnrollProgramId(null);
        setEnrollEmployeeName('');
        loadData();
      } else {
        showToast(data.error || 'Kayit yapilamadi', 'error');
      }
    } catch {
      showToast('Baglanti hatasi', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleCreateProgram = async () => {
    if (!newProgram.code.trim() || !newProgram.name_tr.trim()) {
      showToast('Kod ve isim zorunludur', 'error');
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch('/api/training', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'create_program',
          code: newProgram.code.trim(),
          name_tr: newProgram.name_tr.trim(),
          category: newProgram.category,
          deliveryMode: newProgram.deliveryMode,
          durationHours: Number(newProgram.durationHours) || 0,
          provider: newProgram.provider.trim(),
          costPerPerson: Number(newProgram.costPerPerson) || 0,
          skillTags: newProgram.skillTags.split(',').map((t) => t.trim()).filter(Boolean),
        }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        showToast('Program olusturuldu!');
        setShowNewProgram(false);
        setNewProgram(EMPTY_PROGRAM_FORM);
        loadData();
      } else {
        showToast(data.error || 'Program olusturulamadi', 'error');
      }
    } catch {
      showToast('Baglanti hatasi', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const getMatchingPrograms = (skillName: string) => {
    const skillLower = skillName.toLowerCase();
    return programs.filter((p) =>
      p.skillTags.some((tag) => tag.toLowerCase().includes(skillLower) || skillLower.includes(tag.toLowerCase()))
    );
  };

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-[#0A0A0A]">Egitim & Gelisim</h1>
        <p className="mt-1 text-sm text-[#525252]">Egitim programlari, yetkinlik matrisi ve sertifika takibi.</p>
      </div>

      {/* Toast Notification */}
      {toast && (
        <div className={`fixed right-4 top-4 z-50 rounded-xl px-5 py-3 text-[13px] font-medium shadow-lg transition-all ${
          toast.type === 'success' ? 'bg-[#059669] text-white' : 'bg-[#DC2626] text-white'
        }`}>
          {toast.message}
        </div>
      )}

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <div className="rounded-xl border border-[#f0f0f0] bg-white p-4">
            <div className="text-[11px] font-medium text-[#888]">Toplam Program</div>
            <div className="mt-1 text-[22px] font-bold text-[#0A0A0A]">{stats.totalPrograms}</div>
          </div>
          <div className="rounded-xl border border-[#f0f0f0] bg-white p-4">
            <div className="text-[11px] font-medium text-[#888]">Tamamlanma Orani</div>
            <div className="mt-1 text-[22px] font-bold text-[#059669]">%{stats.completionRate}</div>
          </div>
          <div className="rounded-xl border border-[#f0f0f0] bg-white p-4">
            <div className="text-[11px] font-medium text-[#888]">Ort. Degerlendirme</div>
            <div className="mt-1 text-[22px] font-bold text-[#5E5CE6]">{stats.avgFeedback.toFixed(1)}/5</div>
          </div>
          <div className="rounded-xl border border-[#f0f0f0] bg-white p-4">
            <div className="text-[11px] font-medium text-[#888]">Yetkinlik Acigi</div>
            <div className="mt-1 text-[22px] font-bold text-[#D97706]">{stats.skillGapCount}</div>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-1 rounded-xl border border-[#f0f0f0] bg-[#fafafa] p-1">
        {[
          { key: 'programs' as const, label: 'Egitim Katalogu' },
          { key: 'skills' as const, label: 'Yetkinlik Matrisi' },
          { key: 'certifications' as const, label: 'Sertifikalar' },
        ].map((t) => (
          <button key={t.key} onClick={() => setTab(t.key)}
            className={`flex-1 rounded-lg px-4 py-2.5 text-[13px] font-medium transition-all ${tab === t.key ? 'bg-white text-[#0A0A0A] shadow-sm' : 'text-[#737373]'}`}>
            {t.label}
          </button>
        ))}
      </div>

      {/* Programs */}
      {tab === 'programs' && (
        <div className="flex flex-col gap-4">
          {/* New Program Button */}
          <div className="flex justify-end">
            <button onClick={() => setShowNewProgram(true)}
              className="rounded-lg bg-[#5E5CE6] px-4 py-2.5 text-[13px] font-semibold text-white shadow-sm transition-all hover:bg-[#4B49C9]">
              + Yeni Program Ekle
            </button>
          </div>

          {/* New Program Modal */}
          {showNewProgram && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={() => setShowNewProgram(false)}>
              <div className="mx-4 w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl" onClick={(e) => e.stopPropagation()}>
                <h3 className="text-[16px] font-semibold text-[#0A0A0A]">Yeni Egitim Programi</h3>
                <div className="mt-4 grid gap-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-[11px] font-semibold text-[#888]">Kod *</label>
                      <input value={newProgram.code} onChange={(e) => setNewProgram({ ...newProgram, code: e.target.value })}
                        placeholder="EGT-001" className="mt-1 w-full rounded-lg border border-[#e5e5e5] px-3 py-2 text-[13px] outline-none focus:border-[#5E5CE6]" />
                    </div>
                    <div>
                      <label className="text-[11px] font-semibold text-[#888]">Isim *</label>
                      <input value={newProgram.name_tr} onChange={(e) => setNewProgram({ ...newProgram, name_tr: e.target.value })}
                        placeholder="Program adi" className="mt-1 w-full rounded-lg border border-[#e5e5e5] px-3 py-2 text-[13px] outline-none focus:border-[#5E5CE6]" />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-[11px] font-semibold text-[#888]">Kategori</label>
                      <select value={newProgram.category} onChange={(e) => setNewProgram({ ...newProgram, category: e.target.value })}
                        className="mt-1 w-full rounded-lg border border-[#e5e5e5] px-3 py-2 text-[13px] outline-none focus:border-[#5E5CE6]">
                        {CATEGORY_OPTIONS.map((opt) => (
                          <option key={opt.value} value={opt.value}>{opt.label}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="text-[11px] font-semibold text-[#888]">Egitim Modu</label>
                      <select value={newProgram.deliveryMode} onChange={(e) => setNewProgram({ ...newProgram, deliveryMode: e.target.value })}
                        className="mt-1 w-full rounded-lg border border-[#e5e5e5] px-3 py-2 text-[13px] outline-none focus:border-[#5E5CE6]">
                        {Object.entries(DELIVERY_LABELS).map(([key, val]) => (
                          <option key={key} value={key}>{val.label}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-3">
                    <div>
                      <label className="text-[11px] font-semibold text-[#888]">Sure (saat)</label>
                      <input type="number" value={newProgram.durationHours} onChange={(e) => setNewProgram({ ...newProgram, durationHours: e.target.value })}
                        placeholder="0" className="mt-1 w-full rounded-lg border border-[#e5e5e5] px-3 py-2 text-[13px] outline-none focus:border-[#5E5CE6]" />
                    </div>
                    <div>
                      <label className="text-[11px] font-semibold text-[#888]">Saglayici</label>
                      <input value={newProgram.provider} onChange={(e) => setNewProgram({ ...newProgram, provider: e.target.value })}
                        placeholder="Sirket adi" className="mt-1 w-full rounded-lg border border-[#e5e5e5] px-3 py-2 text-[13px] outline-none focus:border-[#5E5CE6]" />
                    </div>
                    <div>
                      <label className="text-[11px] font-semibold text-[#888]">Maliyet (TL)</label>
                      <input type="number" value={newProgram.costPerPerson} onChange={(e) => setNewProgram({ ...newProgram, costPerPerson: e.target.value })}
                        placeholder="0" className="mt-1 w-full rounded-lg border border-[#e5e5e5] px-3 py-2 text-[13px] outline-none focus:border-[#5E5CE6]" />
                    </div>
                  </div>
                  <div>
                    <label className="text-[11px] font-semibold text-[#888]">Yetkinlik Etiketleri (virgul ile ayirin)</label>
                    <input value={newProgram.skillTags} onChange={(e) => setNewProgram({ ...newProgram, skillTags: e.target.value })}
                      placeholder="React, TypeScript, Liderlik" className="mt-1 w-full rounded-lg border border-[#e5e5e5] px-3 py-2 text-[13px] outline-none focus:border-[#5E5CE6]" />
                  </div>
                </div>
                <div className="mt-5 flex justify-end gap-2">
                  <button onClick={() => { setShowNewProgram(false); setNewProgram(EMPTY_PROGRAM_FORM); }}
                    className="rounded-lg border border-[#e5e5e5] px-4 py-2 text-[13px] font-medium text-[#525252] hover:bg-[#fafafa]">
                    Iptal
                  </button>
                  <button onClick={handleCreateProgram} disabled={submitting}
                    className="rounded-lg bg-[#5E5CE6] px-4 py-2 text-[13px] font-semibold text-white hover:bg-[#4B49C9] disabled:opacity-50">
                    {submitting ? 'Kaydediliyor...' : 'Kaydet'}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Enroll Modal */}
          {enrollProgramId && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={() => { setEnrollProgramId(null); setEnrollEmployeeName(''); }}>
              <div className="mx-4 w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl" onClick={(e) => e.stopPropagation()}>
                <h3 className="text-[16px] font-semibold text-[#0A0A0A]">Programa Kayit Ol</h3>
                <p className="mt-1 text-[12px] text-[#888]">
                  {programs.find((p) => p.id === enrollProgramId)?.name}
                </p>
                <div className="mt-4">
                  <label className="text-[11px] font-semibold text-[#888]">Calisan Adi / ID</label>
                  <input value={enrollEmployeeName} onChange={(e) => setEnrollEmployeeName(e.target.value)}
                    placeholder="Calisan adini girin" autoFocus
                    className="mt-1 w-full rounded-lg border border-[#e5e5e5] px-3 py-2 text-[13px] outline-none focus:border-[#5E5CE6]" />
                </div>
                <div className="mt-5 flex justify-end gap-2">
                  <button onClick={() => { setEnrollProgramId(null); setEnrollEmployeeName(''); }}
                    className="rounded-lg border border-[#e5e5e5] px-4 py-2 text-[13px] font-medium text-[#525252] hover:bg-[#fafafa]">
                    Iptal
                  </button>
                  <button onClick={handleEnroll} disabled={submitting || !enrollEmployeeName.trim()}
                    className="rounded-lg bg-[#059669] px-4 py-2 text-[13px] font-semibold text-white hover:bg-[#047857] disabled:opacity-50">
                    {submitting ? 'Kaydediliyor...' : 'Kayit Ol'}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Program Cards */}
          <div className="grid gap-3 sm:grid-cols-2">
            {programs.map((p) => {
              const delivery = DELIVERY_LABELS[p.deliveryMode] || DELIVERY_LABELS['online']!;
              const completionPct = p.enrollmentCount > 0 ? Math.round((p.completionCount / p.enrollmentCount) * 100) : 0;
              return (
                <div key={p.id} className="rounded-xl border border-[#f0f0f0] bg-white p-5">
                  <div className="flex items-start justify-between">
                    <div>
                      <span className="text-[10px] font-bold text-[#888]">{p.code}</span>
                      <h3 className="mt-1 text-[14px] font-semibold text-[#0A0A0A]">{p.name}</h3>
                    </div>
                    <span className="rounded-full px-2 py-0.5 text-[10px] font-semibold" style={{ color: delivery.color, background: delivery.bg }}>
                      {delivery.label}
                    </span>
                  </div>
                  <div className="mt-3 flex flex-wrap gap-1">
                    {p.skillTags.map((tag) => (
                      <span key={tag} className="rounded-full bg-[#f5f5f5] px-2 py-0.5 text-[10px] font-medium text-[#555]">{tag}</span>
                    ))}
                  </div>
                  <div className="mt-3 flex items-center justify-between text-[11px] text-[#888]">
                    <span>{p.durationHours} saat</span>
                    <span>{p.provider}</span>
                    <span>{p.costPerPerson > 0 ? `₺${p.costPerPerson}` : 'Ucretsiz'}</span>
                  </div>
                  <div className="mt-3">
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="text-[#888]">{p.enrollmentCount} kayit</span>
                      <span className="font-semibold" style={{ color: completionPct >= 70 ? '#059669' : completionPct >= 40 ? '#D97706' : '#DC2626' }}>%{completionPct}</span>
                    </div>
                    <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-[#f0f0f0]">
                      <div className="h-full rounded-full" style={{ width: `${completionPct}%`, background: completionPct >= 70 ? '#059669' : completionPct >= 40 ? '#D97706' : '#DC2626' }} />
                    </div>
                  </div>
                  {/* Enroll Button */}
                  <button onClick={() => setEnrollProgramId(p.id)}
                    className="mt-3 w-full rounded-lg border border-[#5E5CE6] py-2 text-[12px] font-semibold text-[#5E5CE6] transition-all hover:bg-[#5E5CE6] hover:text-white">
                    Kayit Ol
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Skill Matrix */}
      {tab === 'skills' && (
        <div className="overflow-hidden rounded-xl border border-[#f0f0f0] bg-white">
          <table className="w-full text-[12px]">
            <thead>
              <tr className="border-b border-[#f0f0f0] bg-[#fafafa]">
                <th className="px-4 py-3 text-left font-semibold text-[#525252]">Calisan</th>
                <th className="px-4 py-3 text-left font-semibold text-[#525252]">Yetkinlik</th>
                <th className="px-4 py-3 text-center font-semibold text-[#525252]">Mevcut</th>
                <th className="px-4 py-3 text-center font-semibold text-[#525252]">Hedef</th>
                <th className="px-4 py-3 text-center font-semibold text-[#525252]">Acik</th>
                <th className="px-4 py-3 text-left font-semibold text-[#525252]">Gorsel</th>
                <th className="px-4 py-3 text-center font-semibold text-[#525252]">Oneri</th>
              </tr>
            </thead>
            <tbody>
              {skills.map((s, i) => {
                const gapColor = s.gap === 0 ? '#059669' : s.gap === 1 ? '#D97706' : '#DC2626';
                const hasGap = s.gap > 0;
                const matchingPrograms = hasGap ? getMatchingPrograms(s.skillName) : [];
                return (
                  <tr key={i} className="border-b border-[#f0f0f0] last:border-0 hover:bg-[#fafafa]">
                    <td className="px-4 py-3 font-medium text-[#0A0A0A]">{s.employeeName}</td>
                    <td className="px-4 py-3 text-[#525252]">{s.skillName}</td>
                    <td className="px-4 py-3 text-center">
                      <span className="font-semibold text-[#0A0A0A]">{s.currentLevel}</span>
                      <span className="ml-1 text-[10px] text-[#888]">{LEVEL_LABELS[s.currentLevel]}</span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className="font-semibold text-[#5E5CE6]">{s.targetLevel}</span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className="font-bold" style={{ color: gapColor }}>{s.gap > 0 ? `+${s.gap}` : '—'}</span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex gap-0.5">
                        {[1, 2, 3, 4, 5].map((level) => (
                          <div key={level} className="h-3 w-6 rounded-sm" style={{
                            background: level <= s.currentLevel ? '#5E5CE6' : level <= s.targetLevel ? '#5E5CE640' : '#f0f0f0',
                          }} />
                        ))}
                      </div>
                    </td>
                    <td className="relative px-4 py-3 text-center">
                      {hasGap && (
                        <div className="relative">
                          <button onClick={() => setRecommendSkillIdx(recommendSkillIdx === i ? null : i)}
                            className="rounded-md bg-[#FEF3C7] px-2 py-1 text-[10px] font-semibold text-[#D97706] transition-all hover:bg-[#FDE68A]">
                            Egitim Oner
                          </button>
                          {recommendSkillIdx === i && (
                            <div className="absolute right-0 top-full z-40 mt-1 w-64 rounded-xl border border-[#f0f0f0] bg-white p-3 shadow-lg">
                              <div className="text-[11px] font-semibold text-[#888]">Eslesen Programlar</div>
                              {matchingPrograms.length === 0 ? (
                                <p className="mt-2 text-[11px] text-[#aaa]">Eslesen program bulunamadi.</p>
                              ) : (
                                <div className="mt-2 flex flex-col gap-2">
                                  {matchingPrograms.map((mp) => (
                                    <div key={mp.id} className="rounded-lg bg-[#fafafa] p-2">
                                      <div className="text-[11px] font-semibold text-[#0A0A0A]">{mp.name}</div>
                                      <div className="mt-0.5 text-[10px] text-[#888]">{mp.code} - {mp.durationHours} saat - {mp.provider || 'Dahili'}</div>
                                      <button onClick={() => { setEnrollProgramId(mp.id); setRecommendSkillIdx(null); }}
                                        className="mt-1 rounded-md bg-[#5E5CE6] px-2 py-0.5 text-[10px] font-semibold text-white hover:bg-[#4B49C9]">
                                        Kayit Ol
                                      </button>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Certifications placeholder */}
      {tab === 'certifications' && (
        <div className="rounded-xl border border-[#f0f0f0] bg-white p-8 text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-[#f0f0ff]">
            <svg className="h-6 w-6 text-[#5E5CE6]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
            </svg>
          </div>
          <h3 className="text-[16px] font-semibold text-[#111]">Sertifika Takibi</h3>
          <p className="mt-2 text-[13px] text-[#888]">Calisan sertifikalari burada listelenecek. Egitim tamamlamalariyla otomatik sertifika olusturulur.</p>
        </div>
      )}
    </div>
  );
}
