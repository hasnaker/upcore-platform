'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { commitDraft } from '@/app/onboarding/actions';
import type { OnboardingDraft } from '@/app/onboarding/draft';

interface Step10SummaryProps {
  draft: OnboardingDraft | null;
}

export function Step10Summary({ draft }: Step10SummaryProps) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [isPending, start] = useTransition();

  if (!draft) {
    return (
      <div className="rounded-md border border-red-soft bg-red-soft/40 p-4 text-sm text-red">
        Taslak yüklenemedi. Lütfen oturumu kontrol edip sayfayı yenileyin.
      </div>
    );
  }

  const d = draft.data;
  const completed = d.completed_steps ?? [];
  const readiness = Math.round((completed.length / 10) * 100);

  const commit = () => {
    setError(null);
    start(async () => {
      const res = await commitDraft();
      if (!res.ok) {
        setError(res.error);
        return;
      }
      router.push('/panel?welcome=1');
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between rounded-md border border-line bg-bg-2 p-4 text-sm">
        <div>
          <p className="font-medium text-ink">Kurulum hazırlık oranı</p>
          <p className="text-xs text-ink-60">{completed.length} / 10 adım tamamlandı</p>
        </div>
        <div className="text-2xl font-semibold text-ink">{readiness}%</div>
      </div>

      <SummaryBlock title="Şirket" step={1} completed={completed.includes(1)}>
        {d.company ? (
          <dl className="grid gap-1 text-sm">
            <Row k="Ad" v={d.company.name} />
            <Row k="URL" v={`upcore.app/${d.company.slug}`} />
            {d.company.vkn && <Row k="VKN" v={d.company.vkn} />}
            {d.company.sector && <Row k="Sektör" v={d.company.sector} />}
            {d.company.employee_count_band && <Row k="Çalışan sayısı" v={d.company.employee_count_band} />}
            {d.template && <Row k="Şablon" v={d.template} />}
          </dl>
        ) : (
          <Empty />
        )}
      </SummaryBlock>

      <SummaryBlock title="Admin Kullanıcı" step={2} completed={completed.includes(2)}>
        {d.admin ? (
          <dl className="grid gap-1 text-sm">
            <Row k="Ad Soyad" v={`${d.admin.first_name} ${d.admin.last_name}`} />
            <Row k="E-posta" v={d.admin.email} />
            {d.admin.phone && <Row k="Telefon" v={d.admin.phone} />}
            <Row k="2FA" v={d.admin.two_fa_ack ? 'Kabul edildi' : 'Eksik'} />
          </dl>
        ) : (
          <Empty />
        )}
      </SummaryBlock>

      <SummaryBlock title="Plan ve Modüller" step={3} completed={completed.includes(3)}>
        {d.plan ? (
          <dl className="grid gap-1 text-sm">
            <Row k="Plan" v={d.plan.plan_id} />
            <Row k="Modüller" v={d.plan.modules.join(', ') || '—'} />
          </dl>
        ) : (
          <Empty />
        )}
      </SummaryBlock>

      <SummaryBlock title="Çalışanlar" step={4} completed={completed.includes(4)}>
        {d.employees ? (
          <dl className="grid gap-1 text-sm">
            <Row k="Yöntem" v={d.employees.mode === 'csv' ? 'CSV' : 'Manuel'} />
            <Row k="Satır sayısı" v={String(d.employees.rows?.length ?? 0)} />
            {d.employees.csv_name && <Row k="Dosya" v={d.employees.csv_name} />}
          </dl>
        ) : (
          <Empty />
        )}
      </SummaryBlock>

      <SummaryBlock title="Organizasyon Şeması" step={5} completed={completed.includes(5)}>
        {d.org_chart ? (
          <dl className="grid gap-1 text-sm">
            <Row k="Şablon" v={d.org_chart.template} />
            <Row k="Departman sayısı" v={String(d.org_chart.departments.length)} />
          </dl>
        ) : (
          <Empty />
        )}
      </SummaryBlock>

      <SummaryBlock title="SSO" step={6} completed={completed.includes(6)}>
        {d.sso ? (
          <dl className="grid gap-1 text-sm">
            <Row k="Aktif" v={d.sso.enabled ? 'Evet' : 'Hayır'} />
            {d.sso.enabled && <Row k="Sağlayıcı" v={d.sso.provider || '—'} />}
          </dl>
        ) : (
          <Empty />
        )}
      </SummaryBlock>

      <SummaryBlock title="KVKK" step={7} completed={completed.includes(7)}>
        {d.kvkk ? (
          <dl className="grid gap-1 text-sm">
            <Row k="DPO" v={d.kvkk.dpo_name || '—'} />
            <Row k="DPO e-posta" v={d.kvkk.dpo_email || '—'} />
            <Row k="VERBIS" v={d.kvkk.verbis_ack ? 'Kabul edildi' : 'Eksik'} />
            <Row
              k="Metin versiyonları"
              v={`çalışan: ${d.kvkk.employee_notice_version ?? '—'}, aday: ${d.kvkk.candidate_notice_version ?? '—'}, ziyaretçi: ${d.kvkk.visitor_notice_version ?? '—'}`}
            />
          </dl>
        ) : (
          <Empty />
        )}
      </SummaryBlock>

      <SummaryBlock title="SGK / Bordro" step={8} completed={completed.includes(8)}>
        {d.payroll && (d.payroll.sgk_workplace_code || d.payroll.iban) ? (
          <dl className="grid gap-1 text-sm">
            {d.payroll.sgk_workplace_code && <Row k="SGK Kod" v={d.payroll.sgk_workplace_code} />}
            {d.payroll.iban && <Row k="IBAN" v={d.payroll.iban} />}
            {d.payroll.bank_name && <Row k="Banka" v={d.payroll.bank_name} />}
            {d.payroll.payment_day !== undefined && d.payroll.payment_day > 0 && (
              <Row k="Ödeme günü" v={String(d.payroll.payment_day)} />
            )}
          </dl>
        ) : (
          <Empty label="Bordro modülü seçilmedi veya atlandı" />
        )}
      </SummaryBlock>

      <SummaryBlock title="Entegrasyonlar" step={9} completed={completed.includes(9)}>
        {d.integrations ? (
          <dl className="grid gap-1 text-sm">
            <Row k="Slack" v={d.integrations.slack_enabled ? 'Açık' : 'Kapalı'} />
            <Row k="Teams" v={d.integrations.teams_enabled ? 'Açık' : 'Kapalı'} />
            {d.integrations.kariyer_net_url && <Row k="Kariyer.net" v={d.integrations.kariyer_net_url} />}
          </dl>
        ) : (
          <Empty />
        )}
      </SummaryBlock>

      {error && (
        <div className="rounded-md border border-red-soft bg-red-soft/40 p-3 text-sm text-red">{error}</div>
      )}

      <div className="sticky bottom-0 -mx-8 -mb-8 border-t border-line bg-bg/95 px-8 py-4 backdrop-blur">
        <button
          type="button"
          onClick={commit}
          disabled={isPending}
          className="inline-flex h-11 w-full items-center justify-center rounded-md bg-ink px-4 text-sm font-semibold text-bg hover:opacity-90 disabled:opacity-60"
        >
          {isPending ? 'Kuruluyor…' : 'Kuruluma başla — tenant oluştur'}
        </button>
        <p className="mt-2 text-center text-xs text-ink-60">
          Ticari kararlar (plan, seat, bordro) sonradan panel üzerinden değiştirilebilir.
        </p>
      </div>
    </div>
  );
}

function SummaryBlock({
  title,
  step,
  completed,
  children,
}: {
  title: string;
  step: number;
  completed: boolean;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-lg border border-line bg-bg p-4">
      <header className="mb-2 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span
            className={`inline-flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-semibold ${
              completed ? 'bg-ink text-bg' : 'border border-line text-ink-60'
            }`}
          >
            {completed ? '✓' : step}
          </span>
          <h3 className="text-sm font-semibold text-ink">{title}</h3>
        </div>
        <a href={`/onboarding/${['sirket','yonetici','modul','calisan','organizasyon','sso','kvkk','bordro','entegrasyon','ozet'][step-1]}`} className="text-xs text-ink-60 underline">
          Düzenle
        </a>
      </header>
      {children}
    </section>
  );
}

function Row({ k, v }: { k: string; v: string }) {
  return (
    <div className="grid grid-cols-[160px_1fr] gap-2">
      <dt className="text-ink-60">{k}</dt>
      <dd className="text-ink">{v}</dd>
    </div>
  );
}

function Empty({ label }: { label?: string }) {
  return <p className="text-sm text-ink-60">{label ?? 'Henüz doldurulmadı.'}</p>;
}
