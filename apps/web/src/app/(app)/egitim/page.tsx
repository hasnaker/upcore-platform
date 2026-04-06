'use client';

import { useState, useEffect } from 'react';

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

const DELIVERY_LABELS: Record<string, { label: string; color: string; bg: string }> = {
  online: { label: 'Online', color: '#5E5CE6', bg: '#f0f0ff' },
  classroom: { label: 'Sinif', color: '#059669', bg: '#D1FAE5' },
  blended: { label: 'Karma', color: '#D97706', bg: '#FEF3C7' },
  self_paced: { label: 'Bireysel', color: '#0EA5E9', bg: '#E0F2FE' },
};

const LEVEL_LABELS = ['', 'Baslangic', 'Temel', 'Orta', 'Ileri', 'Uzman'];

export default function EgitimPage() {
  const [programs, setPrograms] = useState<TrainingProgram[]>([]);
  const [skills, setSkills] = useState<SkillEntry[]>([]);
  const [stats, setStats] = useState<TrainingStats | null>(null);
  const [tab, setTab] = useState<'programs' | 'skills' | 'certifications'>('programs');

  useEffect(() => {
    fetch('/api/training')
      .then((r) => r.json())
      .then((data) => {
        if (data.programs) setPrograms(data.programs);
        if (data.skills) setSkills(data.skills);
        if (data.stats) setStats(data.stats);
      })
      .catch(() => {});
  }, []);

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-[#0A0A0A]">Egitim & Gelisim</h1>
        <p className="mt-1 text-sm text-[#525252]">Egitim programlari, yetkinlik matrisi ve sertifika takibi.</p>
      </div>

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
              </div>
            );
          })}
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
              </tr>
            </thead>
            <tbody>
              {skills.map((s, i) => {
                const gapColor = s.gap === 0 ? '#059669' : s.gap === 1 ? '#D97706' : '#DC2626';
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
