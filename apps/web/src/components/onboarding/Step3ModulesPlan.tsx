'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { saveStep } from '@/app/onboarding/actions';
import type { OnboardingDraft, PlanData } from '@/app/onboarding/draft';

interface Step3ModulesPlanProps {
  draft: OnboardingDraft | null;
  nextSlug: string | null;
}

// The 4 plans the wizard exposes. "starter" maps to free internally for demo
// scaffolds but remains a distinct selection in UI.
const PLANS: Array<{ id: string; name: string; price: string; seats: string; description: string }> = [
  { id: 'starter', name: 'Başlangıç', price: '₺0', seats: '25 çalışana kadar', description: 'Hızlı deneme için ideal' },
  { id: 'growth', name: 'Büyüme', price: '₺3.000/ay', seats: '100 çalışana kadar', description: 'Orta ölçekli ekipler' },
  { id: 'platform', name: 'Platform', price: '₺5.000/ay', seats: '500 çalışana kadar', description: 'Bilim temelli tam paket' },
  { id: 'enterprise', name: 'Kurumsal', price: 'Özel', seats: 'Sınırsız', description: 'Holding ve kamu' },
];

// 8 module rows shown in the plan × module matrix. Values mark which modules
// each plan enables by default — the user can flip individual modules inside
// their selected plan's allowance.
interface ModuleRow {
  code: string;
  name: string;
  description: string;
  availability: Record<string, boolean>;
}

const MODULES: ModuleRow[] = [
  {
    code: 'core_hris',
    name: 'Core HRIS (özlük, izin, belge)',
    description: 'Tüm planlarda zorunlu',
    availability: { starter: true, growth: true, platform: true, enterprise: true },
  },
  {
    code: 'assessment',
    name: 'Psikometrik Ölçümler (BAT-12-TR, UWES-9)',
    description: 'Tükenmişlik + bağlılık anketi',
    availability: { starter: false, growth: true, platform: true, enterprise: true },
  },
  {
    code: 'burnout',
    name: 'Tükenmişlik Koruma (Thompson sampling)',
    description: 'Müdahale önerileri + etki ölçümü',
    availability: { starter: false, growth: true, platform: true, enterprise: true },
  },
  {
    code: 'strengths',
    name: 'VIA Güçlü Yönler (UpCap-TR)',
    description: 'Psikolojik sermaye portföyü',
    availability: { starter: false, growth: false, platform: true, enterprise: true },
  },
  {
    code: 'mobility',
    name: 'İç Mobilite (Marketplace + Succession)',
    description: 'Yedek havuzu, rotasyon, kariyer yolu',
    availability: { starter: false, growth: false, platform: true, enterprise: true },
  },
  {
    code: 'performance',
    name: 'Performans (OKR + 360° + 9-kutu)',
    description: 'Quarterly hedef ve değerlendirme',
    availability: { starter: false, growth: true, platform: true, enterprise: true },
  },
  {
    code: 'payroll',
    name: 'Bordro & SGK (APB/İGB/İAB)',
    description: 'Türkiye mevzuatına uygun',
    availability: { starter: false, growth: false, platform: true, enterprise: true },
  },
  {
    code: 'kvkk',
    name: 'KVKK Portalı (Madde 11 + VERBIS)',
    description: 'Çalışan veri sahibi self-servis',
    availability: { starter: true, growth: true, platform: true, enterprise: true },
  },
];

export function Step3ModulesPlan({ draft, nextSlug }: Step3ModulesPlanProps) {
  const router = useRouter();
  const existing = draft?.data.plan;
  const [planId, setPlanId] = useState(existing?.plan_id ?? 'growth');
  const [modules, setModules] = useState<Set<string>>(() => {
    if (existing?.modules?.length) return new Set(existing.modules);
    return new Set(MODULES.filter((m) => m.availability['growth']).map((m) => m.code));
  });
  const [error, setError] = useState<string | null>(null);
  const [isPending, start] = useTransition();

  const handlePlanChange = (id: string) => {
    setPlanId(id);
    // Reset modules to the plan's defaults.
    setModules(new Set(MODULES.filter((m) => m.availability[id]).map((m) => m.code)));
  };

  const toggleModule = (code: string) => {
    const row = MODULES.find((m) => m.code === code);
    if (!row) return;
    // Core HRIS cannot be disabled.
    if (code === 'core_hris') return;
    // Cannot enable a module the plan doesn't support.
    if (!row.availability[planId]) return;
    setModules((prev) => {
      const next = new Set(prev);
      if (next.has(code)) next.delete(code);
      else next.add(code);
      return next;
    });
  };

  const onSave = () => {
    setError(null);
    if (!planId) {
      setError('Plan seçiniz.');
      return;
    }
    const plan: PlanData = { plan_id: planId, modules: Array.from(modules).sort() };
    start(async () => {
      const res = await saveStep(3, { plan });
      if (!res.ok) {
        setError(res.error ?? 'Kaydedilemedi.');
        return;
      }
      if (nextSlug) router.push(`/onboarding/${nextSlug}`);
    });
  };

  return (
    <div className="space-y-6">
      <div className="grid gap-3 md:grid-cols-4">
        {PLANS.map((p) => (
          <label
            key={p.id}
            className={`cursor-pointer rounded-lg border p-4 text-left text-sm ${
              planId === p.id ? 'border-accent ring-1 ring-accent bg-accent-soft/30' : 'border-line hover:border-ink-20'
            }`}
          >
            <input
              type="radio"
              name="plan_id"
              value={p.id}
              checked={planId === p.id}
              onChange={() => handlePlanChange(p.id)}
              className="sr-only"
            />
            <div className="font-semibold text-ink">{p.name}</div>
            <div className="mt-1 text-xs text-ink-60">{p.seats}</div>
            <div className="mt-3 text-base font-medium text-ink">{p.price}</div>
            <div className="mt-2 text-xs text-ink-60">{p.description}</div>
          </label>
        ))}
      </div>

      <div className="overflow-hidden rounded-lg border border-line">
        <table className="w-full text-sm">
          <thead className="bg-bg-2 text-xs uppercase text-ink-60">
            <tr>
              <th className="px-4 py-3 text-left">Modül</th>
              {PLANS.map((p) => (
                <th key={p.id} className="px-4 py-3 text-center">
                  {p.name}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {MODULES.map((m) => {
              const enabledForCurrent = m.availability[planId];
              const chosen = modules.has(m.code);
              return (
                <tr key={m.code} className="border-t border-line">
                  <td className="px-4 py-3">
                    <div className="font-medium text-ink">{m.name}</div>
                    <div className="text-xs text-ink-60">{m.description}</div>
                  </td>
                  {PLANS.map((p) => {
                    const inPlan = m.availability[p.id];
                    const isCurrent = p.id === planId;
                    return (
                      <td key={p.id} className="px-4 py-3 text-center">
                        {isCurrent ? (
                          <input
                            type="checkbox"
                            disabled={!enabledForCurrent || m.code === 'core_hris'}
                            checked={chosen && enabledForCurrent}
                            onChange={() => toggleModule(m.code)}
                            aria-label={`${m.name} — ${p.name}`}
                            className="h-4 w-4"
                          />
                        ) : (
                          <span className={inPlan ? 'text-ink-60' : 'text-ink-40'}>
                            {inPlan ? '✓' : '—'}
                          </span>
                        )}
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

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
