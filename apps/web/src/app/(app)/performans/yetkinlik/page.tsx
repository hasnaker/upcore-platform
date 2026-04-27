'use client';

import { useMemo, useState } from 'react';
import { Target, TrendingUp, AlertCircle, CheckCircle2 } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

/* ────────────────────────────────────────────────────────────────────────────
 * /performans/yetkinlik — Yetkinlik Matrix UI
 * 16 core competency (migration 027 seed) üzerinde:
 *   - self + manager dual assessment (1-5)
 *   - gap analizi: manager > self → aşırı mütevazi; self > manager → körlük;
 *     her ikisi de < rol hedefi → gelişim planı önerisi
 * ──────────────────────────────────────────────────────────────────────────*/

interface Competency {
  id: string;
  code: string;
  name_tr: string;
  name_en: string;
  description_tr: string;
  category: 'leadership' | 'execution' | 'teamwork' | 'technical' | 'behavioral' | 'business';
  applies_to: string[];
  anchors: Record<string, string>;
}

interface Assessment {
  competency_id: string;
  self_rating?: number; // 1-5
  manager_rating?: number; // 1-5
  target_rating?: number; // rol hedefi
  development_note?: string;
}

interface MatrixData {
  employee_id: string;
  role: 'ic' | 'manager' | 'executive';
  competencies: Competency[];
  assessments: Assessment[];
  period: string; // 2026Q2
}

const categoryColor: Record<Competency['category'], string> = {
  leadership: '#5E5CE6',
  execution: '#059669',
  teamwork: '#F59E0B',
  technical: '#0EA5E9',
  behavioral: '#8B5CF6',
  business: '#EC4899',
};

const categoryLabelTR: Record<Competency['category'], string> = {
  leadership: 'Liderlik',
  execution: 'İcra',
  teamwork: 'Takım',
  technical: 'Teknik',
  behavioral: 'Davranış',
  business: 'İş',
};

export default function YetkinlikMatrixPage() {
  const [employeeId, setEmployeeId] = useState<string>(''); // default: self via JWT
  const [viewMode, setViewMode] = useState<'self' | 'manager'>('self');

  const { data, isLoading } = useQuery<MatrixData>({
    queryKey: ['competency-matrix', employeeId],
    queryFn: async () => {
      const qs = employeeId ? `?employee_id=${employeeId}` : '';
      const res = await fetch(`/api/v1/performance/competency/matrix${qs}`);
      if (!res.ok) throw new Error('Matrix alınamadı');
      return res.json();
    },
  });

  const gaps = useMemo(() => {
    if (!data) return [];
    return data.assessments
      .map((a) => {
        const c = data.competencies.find((x) => x.id === a.competency_id);
        if (!c || a.target_rating == null) return null;
        const actual = Math.max(a.self_rating ?? 0, a.manager_rating ?? 0);
        const gap = a.target_rating - actual;
        if (gap <= 0) return null;
        return { competency: c, gap, actual, target: a.target_rating };
      })
      .filter(Boolean)
      .sort((a, b) => (b?.gap ?? 0) - (a?.gap ?? 0))
      .slice(0, 5);
  }, [data]);

  return (
    <div className="flex flex-col gap-8">
      <header>
        <div className="mb-1 flex items-center gap-2">
          <Target className="h-4 w-4 text-[#5E5CE6]" />
          <span className="text-[11px] font-semibold uppercase tracking-widest text-[#5E5CE6]">
            Performans · Yetkinlik
          </span>
        </div>
        <h1 className="text-2xl font-semibold text-[#0A0A0A]">Yetkinlik Matrisi</h1>
        <p className="mt-1 max-w-xl text-sm text-[#525252]">
          16 kompetans × 5 puanlı skor. Self + yönetici değerlendirmesi karşılaştırılır; kör
          noktalar ve gelişim alanları otomatik işaretlenir.
        </p>
      </header>

      <div className="flex flex-wrap items-center gap-3">
        <div className="flex rounded-md border border-[#EDEDED] bg-white p-1">
          {(['self', 'manager'] as const).map((m) => (
            <button
              key={m}
              onClick={() => setViewMode(m)}
              className={`rounded-sm px-3 py-1 text-[12px] font-medium transition-colors ${
                viewMode === m ? 'bg-[#0A0A0A] text-white' : 'text-[#525252] hover:bg-[#F5F5F5]'
              }`}
            >
              {m === 'self' ? 'Kendi Değerlendirmem' : 'Yönetici Değerlendirmesi'}
            </button>
          ))}
        </div>
      </div>

      {isLoading && (
        <div className="h-96 animate-pulse rounded-lg border border-[#EDEDED] bg-white" />
      )}

      {data && (
        <>
          {/* Gap analizi */}
          {gaps.length > 0 && (
            <section className="rounded-lg border border-[#FECACA] bg-[#FEF2F2] p-5">
              <div className="mb-3 flex items-center gap-2">
                <AlertCircle className="h-4 w-4 text-[#B91C1C]" />
                <h2 className="text-sm font-semibold text-[#B91C1C]">
                  Öncelikli gelişim alanları ({gaps.length})
                </h2>
              </div>
              <div className="flex flex-col gap-2">
                {gaps.map((g) => (
                  <div
                    key={g!.competency.id}
                    className="flex items-center justify-between rounded-md bg-white px-4 py-3 text-[13px]"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="font-medium text-[#0A0A0A]">{g!.competency.name_tr}</p>
                      <p className="text-[11px] text-[#A3A3A3]">
                        Hedef {g!.target}/5 · Mevcut {g!.actual}/5 · Fark {g!.gap.toFixed(1)}
                      </p>
                    </div>
                    <button className="rounded-md border border-[#EDEDED] px-3 py-1 text-[11px] font-medium text-[#0A0A0A] hover:border-[#5E5CE6]">
                      Gelişim planı oluştur
                    </button>
                  </div>
                ))}
              </div>
            </section>
          )}

          <CompetencyMatrix data={data} viewMode={viewMode} />
        </>
      )}
    </div>
  );
}

const CompetencyMatrix = ({
  data,
  viewMode,
}: {
  data: MatrixData;
  viewMode: 'self' | 'manager';
}) => {
  const qc = useQueryClient();

  const save = useMutation({
    mutationFn: async (payload: {
      competency_id: string;
      rating: number;
      assessor: 'self' | 'manager';
    }) => {
      const res = await fetch('/api/v1/performance/competency/assessment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          employee_id: data.employee_id,
          competency_id: payload.competency_id,
          rating: payload.rating,
          assessor: payload.assessor,
          period: data.period,
        }),
      });
      if (!res.ok) throw new Error('Kaydedilemedi');
      return res.json();
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['competency-matrix', data.employee_id] }),
  });

  const byCategory = useMemo(() => {
    const groups: Record<string, Competency[]> = {};
    data.competencies.forEach((c) => {
      (groups[c.category] ??= []).push(c);
    });
    return groups;
  }, [data]);

  const getAssessment = (id: string) =>
    data.assessments.find((a) => a.competency_id === id);

  return (
    <div className="flex flex-col gap-6">
      {Object.entries(byCategory).map(([cat, comps]) => (
        <section key={cat}>
          <div className="mb-3 flex items-center gap-2">
            <span
              className="h-2 w-2 rounded-full"
              style={{ backgroundColor: categoryColor[cat as Competency['category']] }}
            />
            <h2 className="text-[11px] font-semibold uppercase tracking-widest text-[#525252]">
              {categoryLabelTR[cat as Competency['category']]}
            </h2>
          </div>
          <div className="overflow-hidden rounded-lg border border-[#EDEDED] bg-white">
            <table className="w-full text-[13px]">
              <thead className="border-b border-[#EDEDED] text-[11px] uppercase tracking-wider text-[#A3A3A3]">
                <tr>
                  <th className="px-4 py-3 text-left font-semibold">Yetkinlik</th>
                  <th className="px-4 py-3 text-center font-semibold">Hedef</th>
                  <th className="px-4 py-3 text-center font-semibold">Self</th>
                  <th className="px-4 py-3 text-center font-semibold">Yönetici</th>
                  <th className="px-4 py-3 text-center font-semibold">Durum</th>
                </tr>
              </thead>
              <tbody>
                {comps.map((c) => {
                  const a = getAssessment(c.id);
                  const actual = Math.max(a?.self_rating ?? 0, a?.manager_rating ?? 0);
                  const target = a?.target_rating ?? 3;
                  const onTrack = actual >= target;
                  const hasBlindSpot =
                    (a?.self_rating ?? 0) - (a?.manager_rating ?? 0) >= 2;
                  return (
                    <tr key={c.id} className="border-t border-[#F5F5F5]">
                      <td className="px-4 py-3">
                        <p className="font-medium text-[#0A0A0A]">{c.name_tr}</p>
                        <p className="text-[11px] text-[#A3A3A3]">{c.description_tr}</p>
                      </td>
                      <td className="px-4 py-3 text-center text-[#525252]">{target}/5</td>
                      <td className="px-4 py-3 text-center">
                        <RatingButtons
                          value={a?.self_rating}
                          disabled={viewMode !== 'self'}
                          onChange={(r) =>
                            save.mutate({ competency_id: c.id, rating: r, assessor: 'self' })
                          }
                        />
                      </td>
                      <td className="px-4 py-3 text-center">
                        <RatingButtons
                          value={a?.manager_rating}
                          disabled={viewMode !== 'manager'}
                          onChange={(r) =>
                            save.mutate({ competency_id: c.id, rating: r, assessor: 'manager' })
                          }
                        />
                      </td>
                      <td className="px-4 py-3 text-center">
                        {hasBlindSpot ? (
                          <span className="inline-flex items-center gap-1 rounded-full bg-[#FEF3C7] px-2 py-0.5 text-[11px] font-medium text-[#B45309]">
                            <AlertCircle className="h-3 w-3" />
                            Kör nokta
                          </span>
                        ) : onTrack ? (
                          <span className="inline-flex items-center gap-1 rounded-full bg-[#D1FAE5] px-2 py-0.5 text-[11px] font-medium text-[#047857]">
                            <CheckCircle2 className="h-3 w-3" />
                            Hedefte
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 rounded-full bg-[#FEE2E2] px-2 py-0.5 text-[11px] font-medium text-[#B91C1C]">
                            <TrendingUp className="h-3 w-3" />
                            Geliştir
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>
      ))}
    </div>
  );
};

const RatingButtons = ({
  value,
  disabled,
  onChange,
}: {
  value?: number;
  disabled?: boolean;
  onChange: (r: number) => void;
}) => (
  <div className="inline-flex gap-1">
    {[1, 2, 3, 4, 5].map((r) => (
      <button
        key={r}
        disabled={disabled}
        onClick={() => onChange(r)}
        className={`h-7 w-7 rounded-md text-[11px] font-medium transition-colors ${
          value === r
            ? 'bg-[#0A0A0A] text-white'
            : 'border border-[#EDEDED] text-[#525252] hover:border-[#0A0A0A] disabled:cursor-not-allowed disabled:opacity-40'
        }`}
      >
        {r}
      </button>
    ))}
  </div>
);
