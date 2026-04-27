'use client';

import { useMemo, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { saveStep } from '@/app/onboarding/actions';
import type { Department, OnboardingDraft, OrgChartData } from '@/app/onboarding/draft';

interface Step5OrgChartProps {
  draft: OnboardingDraft | null;
  nextSlug: string | null;
}

type TemplateKind = 'flat' | 'hierarchical' | 'matrix';

const TEMPLATE_PRESETS: Record<TemplateKind, Department[]> = {
  flat: [
    { id: 'exec', name: 'Yönetim' },
    { id: 'hr', name: 'İnsan Kaynakları' },
    { id: 'ops', name: 'Operasyon' },
    { id: 'sales', name: 'Satış ve Pazarlama' },
    { id: 'fin', name: 'Finans ve Muhasebe' },
  ],
  hierarchical: [
    { id: 'ceo', name: 'Genel Müdürlük' },
    { id: 'ops', name: 'Operasyon', parent_id: 'ceo' },
    { id: 'ops_prod', name: 'Üretim', parent_id: 'ops' },
    { id: 'ops_qa', name: 'Kalite', parent_id: 'ops' },
    { id: 'sales', name: 'Satış ve Pazarlama', parent_id: 'ceo' },
    { id: 'hr', name: 'İK', parent_id: 'ceo' },
    { id: 'fin', name: 'Finans', parent_id: 'ceo' },
  ],
  matrix: [
    { id: 'exec', name: 'Yönetim Kurulu' },
    { id: 'bu_a', name: 'İş Birimi A', parent_id: 'exec' },
    { id: 'bu_b', name: 'İş Birimi B', parent_id: 'exec' },
    { id: 'shared_hr', name: 'Ortak: İK', parent_id: 'exec' },
    { id: 'shared_it', name: 'Ortak: BT', parent_id: 'exec' },
    { id: 'shared_fin', name: 'Ortak: Finans', parent_id: 'exec' },
  ],
};

function uid(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID().slice(0, 8);
  }
  return Math.random().toString(36).slice(2, 10);
}

export function Step5OrgChart({ draft, nextSlug }: Step5OrgChartProps) {
  const router = useRouter();
  const existing = draft?.data.org_chart;
  const [template, setTemplate] = useState<TemplateKind>(existing?.template ?? 'hierarchical');
  const [deps, setDeps] = useState<Department[]>(
    existing?.departments && existing.departments.length > 0
      ? existing.departments
      : TEMPLATE_PRESETS[existing?.template ?? 'hierarchical'],
  );
  const [error, setError] = useState<string | null>(null);
  const [isPending, start] = useTransition();

  const depOptions = useMemo(
    () => [{ id: '', name: '— Üst yok —' }, ...deps.map((d) => ({ id: d.id, name: d.name }))],
    [deps],
  );

  const applyTemplate = (kind: TemplateKind) => {
    setTemplate(kind);
    setDeps(TEMPLATE_PRESETS[kind].map((d) => ({ ...d })));
  };

  const update = (idx: number, key: keyof Department, val: string) => {
    setDeps((prev) => {
      const next = [...prev];
      const current: Department = { ...(next[idx] ?? { id: '', name: '' }) };
      if (key === 'parent_id') {
        if (val) current.parent_id = val;
        else delete current.parent_id;
      } else if (key === 'manager') {
        if (val) current.manager = val;
        else delete current.manager;
      } else {
        current[key] = val;
      }
      next[idx] = current;
      return next;
    });
  };

  const addDep = () => {
    setDeps((prev) => [...prev, { id: uid(), name: 'Yeni Departman' }]);
  };

  const removeDep = (idx: number) => {
    setDeps((prev) => {
      if (prev.length <= 1) return prev;
      const target = prev[idx];
      if (!target) return prev;
      return prev.filter((_, i) => i !== idx).map((d) => {
        if (d.parent_id === target.id) {
          const copy = { ...d };
          delete copy.parent_id;
          return copy;
        }
        return d;
      });
    });
  };

  const validate = (): string | null => {
    const ids = new Set<string>();
    for (const d of deps) {
      if (!d.id.trim() || !d.name.trim()) return 'Tüm departmanların kodu ve adı dolu olmalıdır.';
      if (ids.has(d.id)) return `Departman kodu tekrar etmiş: ${d.id}`;
      ids.add(d.id);
    }
    for (const d of deps) {
      if (d.parent_id && !ids.has(d.parent_id)) return `Üst departman bulunamadı: ${d.parent_id}`;
      if (d.parent_id === d.id) return `Departman kendisinin üstü olamaz: ${d.id}`;
    }
    return null;
  };

  const onSave = () => {
    const ve = validate();
    if (ve) {
      setError(ve);
      return;
    }
    setError(null);
    const payload: OrgChartData = { template, departments: deps };
    start(async () => {
      const res = await saveStep(5, { org_chart: payload });
      if (!res.ok) {
        setError(res.error ?? 'Kaydedilemedi.');
        return;
      }
      if (nextSlug) router.push(`/onboarding/${nextSlug}`);
    });
  };

  return (
    <div className="space-y-6">
      <div>
        <label className="mb-2 block text-sm font-medium text-ink">Şablon seçin</label>
        <div className="grid gap-3 md:grid-cols-3">
          {(['flat', 'hierarchical', 'matrix'] as const).map((k) => (
            <button
              key={k}
              type="button"
              onClick={() => applyTemplate(k)}
              className={`rounded-lg border p-4 text-left text-sm ${
                template === k ? 'border-accent ring-1 ring-accent bg-accent-soft/30' : 'border-line hover:border-ink-20'
              }`}
            >
              <div className="font-medium text-ink">
                {k === 'flat' ? 'Yatay (Flat)' : k === 'hierarchical' ? 'Hiyerarşik' : 'Matris'}
              </div>
              <div className="mt-1 text-xs text-ink-60">
                {k === 'flat'
                  ? 'KOBİ için düz 4-6 departman'
                  : k === 'hierarchical'
                    ? 'Klasik CEO → departman → alt birim'
                    : 'İş birimi + ortak fonksiyonlar'}
              </div>
            </button>
          ))}
        </div>
      </div>

      <div className="overflow-hidden rounded-lg border border-line">
        <table className="w-full text-sm">
          <thead className="bg-bg-2 text-xs uppercase text-ink-60">
            <tr>
              <th className="px-3 py-2 text-left">Kod</th>
              <th className="px-3 py-2 text-left">Departman Adı</th>
              <th className="px-3 py-2 text-left">Üst Departman</th>
              <th className="px-3 py-2 text-left">Yönetici (e-posta)</th>
              <th className="px-3 py-2" />
            </tr>
          </thead>
          <tbody>
            {deps.map((d, idx) => (
              <tr key={idx} className="border-t border-line">
                <td className="px-3 py-2">
                  <input
                    value={d.id}
                    onChange={(e) => update(idx, 'id', e.target.value.toLowerCase().replace(/\s+/g, '_'))}
                    className="w-full rounded border border-line bg-bg px-2 py-1 text-xs"
                  />
                </td>
                <td className="px-3 py-2">
                  <input
                    value={d.name}
                    onChange={(e) => update(idx, 'name', e.target.value)}
                    className="w-full rounded border border-line bg-bg px-2 py-1 text-sm"
                  />
                </td>
                <td className="px-3 py-2">
                  <select
                    value={d.parent_id ?? ''}
                    onChange={(e) => update(idx, 'parent_id', e.target.value)}
                    className="w-full rounded border border-line bg-bg px-2 py-1 text-xs"
                  >
                    {depOptions
                      .filter((o) => o.id !== d.id)
                      .map((o) => (
                        <option key={o.id} value={o.id}>
                          {o.name}
                        </option>
                      ))}
                  </select>
                </td>
                <td className="px-3 py-2">
                  <input
                    value={d.manager ?? ''}
                    onChange={(e) => update(idx, 'manager', e.target.value)}
                    placeholder="yonetici@sirket.com"
                    className="w-full rounded border border-line bg-bg px-2 py-1 text-xs"
                  />
                </td>
                <td className="px-3 py-2">
                  <button
                    type="button"
                    onClick={() => removeDep(idx)}
                    disabled={deps.length <= 1}
                    className="text-xs text-ink-60 underline disabled:opacity-40"
                  >
                    Sil
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <button type="button" onClick={addDep} className="text-sm text-accent">
        + Departman ekle
      </button>

      {error && (
        <div className="rounded-md border border-red-soft bg-red-soft/40 p-3 text-sm text-red">{error}</div>
      )}

      <button
        type="button"
        onClick={onSave}
        disabled={isPending}
        className="inline-flex h-10 w-full items-center justify-center rounded-md bg-accent px-4 text-sm font-medium text-bg hover:bg-accent/90 disabled:opacity-60"
      >
        {isPending ? 'Kaydediliyor…' : 'Kaydet ve devam et'}
      </button>
    </div>
  );
}
