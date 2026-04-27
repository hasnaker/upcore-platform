'use client';

import { useState } from 'react';
import { AlertCircle, GitBranch, Loader2, Plus, Users, Crown } from 'lucide-react';
import {
  useCareerPaths,
  useSuccessionPlans,
  useSuccessionCandidates,
  useCreateCareerPath,
  type SuccessionPlan,
} from '@/hooks/useMobility';

/**
 * Canlı Kariyer paneli — services/mobility gerçek veri:
 *   - Kariyer yolları (role family × adım serisi)
 *   - Yedekleme planları (pozisyon başına kritiklik + aday havuzu)
 *
 * Backend: services/mobility, gateway /api/v1/mobility
 */
export default function KariyerCanliPage() {
  const [tab, setTab] = useState<'paths' | 'succession'>('paths');

  return (
    <div className="flex flex-col gap-6">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight text-[#0A0A0A]">
          Canlı Kariyer Gelişim
        </h1>
        <p className="mt-1 text-sm text-[#737373]">
          Kariyer yolları, rotasyon planları ve yedekleme havuzları — Mobility servisinden gerçek veri.
        </p>
      </header>

      <div className="flex gap-1 rounded-xl border border-[#EDEDED] bg-[#FAFAFA] p-1">
        {[
          { key: 'paths' as const, label: 'Kariyer Yolları', icon: GitBranch },
          { key: 'succession' as const, label: 'Yedekleme Planları', icon: Crown },
        ].map((t) => (
          <button
            key={t.key}
            type="button"
            onClick={() => setTab(t.key)}
            className={`flex flex-1 items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-[13px] font-medium transition-all ${
              tab === t.key ? 'bg-white text-[#0A0A0A] shadow-sm' : 'text-[#737373] hover:text-[#0A0A0A]'
            }`}
          >
            <t.icon className="h-4 w-4" />
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'paths' ? <CareerPathsPanel /> : <SuccessionPanel />}
    </div>
  );
}

/* ─── Career Paths ─── */

function CareerPathsPanel() {
  const q = useCareerPaths();
  const create = useCreateCareerPath();
  const [form, setForm] = useState({ name_tr: '', description: '', target_role_family: '' });
  const [showForm, setShowForm] = useState(false);

  const submit = () => {
    if (!form.name_tr.trim() || !form.target_role_family.trim()) return;
    create.mutate(form, {
      onSuccess: () => {
        setForm({ name_tr: '', description: '', target_role_family: '' });
        setShowForm(false);
      },
    });
  };

  return (
    <section className="rounded-xl border border-[#EDEDED] bg-white p-5">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-sm font-semibold text-[#0A0A0A]">Kariyer Yolları</h2>
          <p className="text-xs text-[#737373]">Role family bazında adım adım gelişim şablonları</p>
        </div>
        <button
          type="button"
          onClick={() => setShowForm((v) => !v)}
          className="inline-flex items-center gap-2 rounded-md bg-[#5E5CE6] px-3 py-2 text-sm font-medium text-white hover:bg-[#4B49B6]"
        >
          <Plus className="h-4 w-4" />
          Yeni Yol
        </button>
      </div>

      {showForm ? (
        <div className="mt-4 grid gap-3 rounded-lg border border-[#EDEDED] bg-[#FAFAFA] p-4 sm:grid-cols-3">
          <label className="block">
            <span className="mb-1 block text-[11px] font-medium uppercase tracking-wider text-[#737373]">
              Yol Adı *
            </span>
            <input
              value={form.name_tr}
              onChange={(e) => setForm({ ...form, name_tr: e.target.value })}
              placeholder="örn. Backend Geliştirici → Tech Lead"
              className="w-full rounded-md border border-[#EDEDED] bg-white px-2 py-1.5 text-sm"
            />
          </label>
          <label className="block">
            <span className="mb-1 block text-[11px] font-medium uppercase tracking-wider text-[#737373]">
              Rol Ailesi *
            </span>
            <input
              value={form.target_role_family}
              onChange={(e) => setForm({ ...form, target_role_family: e.target.value })}
              placeholder="engineering"
              className="w-full rounded-md border border-[#EDEDED] bg-white px-2 py-1.5 text-sm"
            />
          </label>
          <label className="block">
            <span className="mb-1 block text-[11px] font-medium uppercase tracking-wider text-[#737373]">
              Açıklama
            </span>
            <input
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              className="w-full rounded-md border border-[#EDEDED] bg-white px-2 py-1.5 text-sm"
            />
          </label>
          <div className="sm:col-span-3 flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setShowForm(false)}
              className="rounded-md border border-[#EDEDED] bg-white px-3 py-1.5 text-sm text-[#525252] hover:bg-[#FAFAFA]"
            >
              İptal
            </button>
            <button
              type="button"
              onClick={submit}
              disabled={create.isPending}
              className="rounded-md bg-[#0A0A0A] px-3 py-1.5 text-sm font-medium text-white hover:bg-[#333] disabled:opacity-50"
            >
              {create.isPending ? 'Kaydediliyor…' : 'Kaydet'}
            </button>
          </div>
          {create.error ? (
            <p className="sm:col-span-3 text-xs text-[#DC2626]">Hata: {create.error.message}</p>
          ) : null}
        </div>
      ) : null}

      {q.isLoading ? (
        <Loading />
      ) : q.error ? (
        <ErrorBanner message={q.error.message} />
      ) : (q.data?.items.length ?? 0) === 0 ? (
        <Empty
          icon={<GitBranch className="h-8 w-8 text-[#A3A3A3]" />}
          title="Henüz kariyer yolu yok"
          hint="Role family seçerek ilk kariyer şablonunu oluşturun."
        />
      ) : (
        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {(q.data?.items ?? []).map((p) => (
            <article
              key={p.id}
              className="rounded-lg border border-[#EDEDED] p-4 transition-colors hover:border-[#5E5CE6]"
            >
              <p className="text-xs font-medium uppercase tracking-wider text-[#737373]">
                {p.target_role_family}
              </p>
              <h3 className="mt-1 text-sm font-semibold text-[#0A0A0A]">{p.name_tr}</h3>
              {p.description ? (
                <p className="mt-1 text-xs text-[#525252]">{p.description}</p>
              ) : null}
              <div className="mt-3 flex items-center gap-2 text-[11px] text-[#737373]">
                <GitBranch className="h-3 w-3" />
                {p.steps?.length ?? 0} adım
                <span
                  className={`ml-auto rounded-full px-1.5 py-0.5 text-[10px] ${
                    p.active ? 'bg-[#DCFCE7] text-[#14532D]' : 'bg-[#F5F5F5] text-[#737373]'
                  }`}
                >
                  {p.active ? 'Aktif' : 'Pasif'}
                </span>
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}

/* ─── Succession Plans ─── */

function SuccessionPanel() {
  const q = useSuccessionPlans();
  const [openPlanId, setOpenPlanId] = useState<string | null>(null);

  return (
    <section className="rounded-xl border border-[#EDEDED] bg-white p-5">
      <div>
        <h2 className="text-sm font-semibold text-[#0A0A0A]">Yedekleme Planları</h2>
        <p className="text-xs text-[#737373]">
          Kritik pozisyonlar için hazır aday havuzu ve hazırlık seviyeleri.
        </p>
      </div>

      {q.isLoading ? (
        <Loading />
      ) : q.error ? (
        <ErrorBanner message={q.error.message} />
      ) : (q.data?.items.length ?? 0) === 0 ? (
        <Empty
          icon={<Crown className="h-8 w-8 text-[#A3A3A3]" />}
          title="Yedekleme planı yok"
          hint="Kritik pozisyonları seçerek aday havuzu oluşturun."
        />
      ) : (
        <ul className="mt-4 space-y-2">
          {(q.data?.items ?? []).map((plan) => (
            <SuccessionRow
              key={plan.id}
              plan={plan}
              open={openPlanId === plan.id}
              onToggle={() => setOpenPlanId(openPlanId === plan.id ? null : plan.id)}
            />
          ))}
        </ul>
      )}
    </section>
  );
}

function SuccessionRow({
  plan,
  open,
  onToggle,
}: {
  plan: SuccessionPlan;
  open: boolean;
  onToggle: () => void;
}) {
  const candidates = useSuccessionCandidates(open ? plan.id : null);
  return (
    <li className="rounded-lg border border-[#EDEDED]">
      <button
        type="button"
        onClick={onToggle}
        className="flex w-full items-center justify-between p-3 text-left hover:bg-[#FAFAFA]"
      >
        <div>
          <p className="text-sm font-medium text-[#0A0A0A]">{plan.position_title_tr}</p>
          <p className="text-[11px] text-[#737373]">
            <CriticalityBadge level={plan.criticality} /> · {plan.successor_pool_size} aday
          </p>
        </div>
        <Users className="h-4 w-4 text-[#737373]" />
      </button>
      {open ? (
        <div className="border-t border-[#EDEDED] bg-[#FAFAFA] p-3">
          {candidates.isLoading ? (
            <div className="flex items-center gap-2 text-xs text-[#737373]">
              <Loader2 className="h-3 w-3 animate-spin" /> Adaylar yükleniyor…
            </div>
          ) : candidates.error ? (
            <p className="text-xs text-[#DC2626]">Aday listesi yüklenemedi: {candidates.error.message}</p>
          ) : (candidates.data?.items.length ?? 0) === 0 ? (
            <p className="text-xs text-[#737373]">Henüz aday atanmamış.</p>
          ) : (
            <table className="w-full text-xs">
              <thead>
                <tr className="text-[#737373]">
                  <th className="p-1.5 text-left">Aday</th>
                  <th className="p-1.5 text-left">Hazırlık</th>
                  <th className="p-1.5 text-right">Perf/Potansiyel</th>
                </tr>
              </thead>
              <tbody>
                {(candidates.data?.items ?? []).map((c) => (
                  <tr key={c.id} className="border-t border-[#EDEDED]">
                    <td className="p-1.5 text-[#0A0A0A]">{c.employee_name}</td>
                    <td className="p-1.5">
                      <ReadinessBadge level={c.readiness_level} />
                    </td>
                    <td className="p-1.5 text-right tabular-nums text-[#525252]">
                      {c.performance_rating?.toFixed(1) ?? '—'} / {c.potential_rating?.toFixed(1) ?? '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      ) : null}
    </li>
  );
}

function CriticalityBadge({ level }: { level: SuccessionPlan['criticality'] }) {
  const tone =
    level === 'critical'
      ? 'bg-[#FEE2E2] text-[#7F1D1D]'
      : level === 'high'
        ? 'bg-[#FEF3C7] text-[#92400E]'
        : level === 'medium'
          ? 'bg-[#EEF2FF] text-[#5E5CE6]'
          : 'bg-[#F5F5F5] text-[#525252]';
  return <span className={`rounded-full px-1.5 py-0.5 text-[10px] font-medium ${tone}`}>{level}</span>;
}

function ReadinessBadge({ level }: { level: string }) {
  const label =
    level === 'ready_now'
      ? 'Şimdi Hazır'
      : level === '1_2_years'
        ? '1-2 Yıl'
        : level === '3_5_years'
          ? '3-5 Yıl'
          : 'Havuz';
  const tone =
    level === 'ready_now'
      ? 'bg-[#DCFCE7] text-[#14532D]'
      : level === '1_2_years'
        ? 'bg-[#EEF2FF] text-[#5E5CE6]'
        : 'bg-[#F5F5F5] text-[#525252]';
  return <span className={`rounded-full px-1.5 py-0.5 text-[10px] font-medium ${tone}`}>{label}</span>;
}

/* ─── shared ─── */

function Loading() {
  return (
    <div className="mt-6 flex h-32 items-center justify-center text-sm text-[#737373]">
      <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Yükleniyor…
    </div>
  );
}

function ErrorBanner({ message }: { message: string }) {
  return (
    <div className="mt-4 flex items-start gap-2 rounded-md border border-[#FECACA] bg-[#FEF2F2] p-3 text-[12px] text-[#991B1B]">
      <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
      <span>{message}</span>
    </div>
  );
}

function Empty({
  icon,
  title,
  hint,
}: {
  icon: React.ReactNode;
  title: string;
  hint: string;
}) {
  return (
    <div className="mt-6 rounded-lg border border-dashed border-[#EDEDED] bg-[#FAFAFA] p-8 text-center">
      <div className="mx-auto w-fit">{icon}</div>
      <p className="mt-2 text-sm font-medium text-[#0A0A0A]">{title}</p>
      <p className="mt-1 text-xs text-[#737373]">{hint}</p>
    </div>
  );
}
