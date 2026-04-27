'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import {
  AlertCircle, ArrowRight, Building2, CheckCircle2, CreditCard,
  Loader2, PartyPopper, Rocket, Save, Users, UserPlus,
} from 'lucide-react';
import { toast } from 'sonner';
import {
  useSGKWorkplace, useUpsertWorkplace, useBordroSettings, useUpsertBordroSettings,
  type WorkplaceInput, type BordroSettingsInput,
} from '@/hooks/useBordro';
import { useEmployees, useCreateEmployee } from '@/hooks/useEmployees';
import { useMyNotificationPreferences, useUpdateMyPreferences } from '@/hooks/useNotifications';

/**
 * Tenant First-Run Wizard — /baslangic
 *
 * Yeni oluşturulan tenant için 5 adımlık ilk kurulum:
 *   1) SGK İşyeri (APB/İGB için zorunlu)
 *   2) Bordro parametreleri (yemek/yol istisna tavanı)
 *   3) İlk çalışan (manuel ekleme, CSV import link'i)
 *   4) Bildirim tercihleri
 *   5) Tamamlandı — kurum sağlığı panosuna git
 *
 * Her adım atlanabilir, ama eksik kalırsa üstte çubuğunda görünür.
 */
const STEPS = [
  { key: 'workplace', label: 'SGK İşyeri', icon: Building2 },
  { key: 'bordro', label: 'Bordro Ayarları', icon: CreditCard },
  { key: 'employee', label: 'İlk Çalışan', icon: UserPlus },
  { key: 'notifications', label: 'Bildirimler', icon: Rocket },
  { key: 'done', label: 'Tamamlandı', icon: PartyPopper },
] as const;

type StepKey = typeof STEPS[number]['key'];

export default function BaslangicPage() {
  const [step, setStep] = useState<StepKey>('workplace');

  return (
    <div className="flex flex-col gap-6">
      <header>
        <h1 className="flex items-center gap-2 text-2xl font-semibold tracking-tight text-[#0A0A0A]">
          <Rocket className="h-6 w-6 text-[#5E5CE6]" />
          Kurum Kurulumu
        </h1>
        <p className="mt-1 text-sm text-[#737373]">
          5 adımda UpCore&apos;u kurumunuza hazırlayın. Her adım atlanabilir, sonradan Ayarlar&apos;dan tamamlayabilirsiniz.
        </p>
      </header>

      <StepIndicator current={step} onSelect={setStep} />

      <section className="rounded-xl border border-[#EDEDED] bg-white p-6">
        {step === 'workplace' && <WorkplaceStep onNext={() => setStep('bordro')} />}
        {step === 'bordro' && <BordroStep onNext={() => setStep('employee')} onBack={() => setStep('workplace')} />}
        {step === 'employee' && <EmployeeStep onNext={() => setStep('notifications')} onBack={() => setStep('bordro')} />}
        {step === 'notifications' && <NotificationsStep onNext={() => setStep('done')} onBack={() => setStep('employee')} />}
        {step === 'done' && <DoneStep />}
      </section>
    </div>
  );
}

/* ─── Step indicator ─── */

function StepIndicator({ current, onSelect }: { current: StepKey; onSelect: (s: StepKey) => void }) {
  const wp = useSGKWorkplace();
  const bordroSettings = useBordroSettings();
  const emps = useEmployees({ page: 1, limit: 1 });
  const prefs = useMyNotificationPreferences();

  const completion: Record<StepKey, boolean> = {
    workplace: Boolean(wp.data),
    bordro: Boolean(bordroSettings.data),
    employee: (emps.data?.total ?? 0) > 0,
    notifications: Boolean(prefs.data),
    done: Boolean(
      wp.data && bordroSettings.data && (emps.data?.total ?? 0) > 0 && prefs.data,
    ),
  };

  return (
    <ol className="flex items-center gap-2 overflow-x-auto">
      {STEPS.map((s, idx) => {
        const active = s.key === current;
        const complete = completion[s.key];
        const Icon = s.icon;
        return (
          <li key={s.key} className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => onSelect(s.key)}
              className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-sm font-medium transition-colors ${
                active
                  ? 'border-[#5E5CE6] bg-[#EEF2FF] text-[#5E5CE6]'
                  : complete
                    ? 'border-[#BBF7D0] bg-[#F0FDF4] text-[#166534]'
                    : 'border-[#EDEDED] bg-white text-[#737373] hover:bg-[#FAFAFA]'
              }`}
            >
              {complete && !active ? (
                <CheckCircle2 className="h-4 w-4" />
              ) : (
                <Icon className="h-4 w-4" />
              )}
              <span className="hidden whitespace-nowrap sm:inline">
                {idx + 1}. {s.label}
              </span>
            </button>
            {idx < STEPS.length - 1 ? <span className="text-[#A3A3A3]">→</span> : null}
          </li>
        );
      })}
    </ol>
  );
}

/* ─── Step 1: Workplace ─── */

function WorkplaceStep({ onNext }: { onNext: () => void }) {
  const q = useSGKWorkplace();
  const upsert = useUpsertWorkplace();
  const [form, setForm] = useState<WorkplaceInput>({
    sicil_no: '',
    unvan: '',
    vergi_no: '',
    vergi_dairesi: '',
    il: '',
    ilce: '',
    kanun_turu: '09100',
  });

  useMemo(() => {
    if (q.data) {
      setForm({
        sicil_no: q.data.sicil_no,
        unvan: q.data.unvan,
        vergi_no: q.data.vergi_no,
        vergi_dairesi: q.data.vergi_dairesi ?? '',
        il: q.data.il ?? '',
        ilce: q.data.ilce ?? '',
        kanun_turu: q.data.kanun_turu,
      });
    }
  }, [q.data]);

  const canSave = form.sicil_no.trim() && form.unvan.trim() && form.vergi_no.trim();

  return (
    <StepLayout
      title="SGK İşyeri Bilgileri"
      desc="APB (aylık prim bildirgesi), İGB (işe giriş) ve İAB (işten ayrılış) XML üretimi için zorunlu alanlar."
      onNext={onNext}
      nextLabel="Devam"
      nextDisabled={!canSave}
      onSave={() =>
        upsert.mutate(form, {
          onSuccess: () => toast.success('SGK İşyeri kaydedildi'),
          onError: (e) => toast.error(e.message),
        })
      }
      saving={upsert.isPending}
    >
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Sicil No *" value={form.sicil_no} onChange={(v) => setForm({ ...form, sicil_no: v })} />
        <Field label="Ticari Unvan *" value={form.unvan} onChange={(v) => setForm({ ...form, unvan: v })} />
        <Field label="Vergi No *" value={form.vergi_no} onChange={(v) => setForm({ ...form, vergi_no: v })} />
        <Field label="Vergi Dairesi" value={form.vergi_dairesi ?? ''} onChange={(v) => setForm({ ...form, vergi_dairesi: v })} />
        <Field label="İl" value={form.il ?? ''} onChange={(v) => setForm({ ...form, il: v })} />
        <Field label="İlçe" value={form.ilce ?? ''} onChange={(v) => setForm({ ...form, ilce: v })} />
      </div>
      {upsert.error ? <ErrorLine message={upsert.error.message} /> : null}
    </StepLayout>
  );
}

/* ─── Step 2: Bordro settings ─── */

function BordroStep({ onNext, onBack }: { onNext: () => void; onBack: () => void }) {
  const q = useBordroSettings();
  const upsert = useUpsertBordroSettings();
  const [form, setForm] = useState<Required<Pick<BordroSettingsInput,
    'hours_per_month' | 'meal_daily_gross' | 'meal_exempt_daily' |
    'transport_daily_gross' | 'transport_exempt_daily' | 'apply_min_wage_exemption'>>>({
    hours_per_month: 225,
    meal_daily_gross: 0,
    meal_exempt_daily: 240,
    transport_daily_gross: 0,
    transport_exempt_daily: 126,
    apply_min_wage_exemption: true,
  });

  useMemo(() => {
    if (q.data) {
      setForm({
        hours_per_month: q.data.hours_per_month,
        meal_daily_gross: q.data.meal_daily_gross,
        meal_exempt_daily: q.data.meal_exempt_daily,
        transport_daily_gross: q.data.transport_daily_gross,
        transport_exempt_daily: q.data.transport_exempt_daily,
        apply_min_wage_exemption: q.data.apply_min_wage_exemption,
      });
    }
  }, [q.data]);

  return (
    <StepLayout
      title="Bordro Parametreleri"
      desc="Yemek/yol günlük istisna tavanları (GVK Mük.67 + 61/f) ve asgari ücret istisnası."
      onNext={onNext}
      onBack={onBack}
      onSave={() =>
        upsert.mutate(form, {
          onSuccess: () => toast.success('Bordro ayarları kaydedildi'),
          onError: (e) => toast.error(e.message),
        })
      }
      saving={upsert.isPending}
    >
      <div className="grid gap-3 sm:grid-cols-2">
        <NumberField
          label="Saatlik ücret tabanı (aylık saat)"
          value={form.hours_per_month}
          onChange={(v) => setForm({ ...form, hours_per_month: v })}
        />
        <div />
        <NumberField
          label="Yemek günlük brüt (TL)"
          value={form.meal_daily_gross}
          onChange={(v) => setForm({ ...form, meal_daily_gross: v })}
        />
        <NumberField
          label="Yemek istisna tavanı (TL)"
          value={form.meal_exempt_daily}
          onChange={(v) => setForm({ ...form, meal_exempt_daily: v })}
        />
        <NumberField
          label="Yol günlük brüt (TL)"
          value={form.transport_daily_gross}
          onChange={(v) => setForm({ ...form, transport_daily_gross: v })}
        />
        <NumberField
          label="Yol istisna tavanı (TL)"
          value={form.transport_exempt_daily}
          onChange={(v) => setForm({ ...form, transport_exempt_daily: v })}
        />
      </div>
      <label className="mt-3 flex items-center gap-2 text-sm text-[#525252]">
        <input
          type="checkbox"
          checked={form.apply_min_wage_exemption}
          onChange={(e) => setForm({ ...form, apply_min_wage_exemption: e.target.checked })}
        />
        Asgari ücret gelir+damga vergisi istisnasını uygula (GVK Gç.86)
      </label>
      {upsert.error ? <ErrorLine message={upsert.error.message} /> : null}
    </StepLayout>
  );
}

/* ─── Step 3: First employee ─── */

function EmployeeStep({ onNext, onBack }: { onNext: () => void; onBack: () => void }) {
  const emps = useEmployees({ page: 1, limit: 1 });
  const create = useCreateEmployee();
  const [form, setForm] = useState({ ad: '', soyad: '', email: '', employee_no: '' });

  const existing = (emps.data?.total ?? 0) > 0;

  const submit = () => {
    if (!form.ad.trim() || !form.soyad.trim() || !form.email.trim()) return;
    create.mutate(
      {
        ad: form.ad.trim(),
        soyad: form.soyad.trim(),
        email_is: form.email.trim().toLowerCase(),
        employee_no: form.employee_no.trim() || `EMP${Date.now().toString().slice(-5)}`,
        hire_date: new Date().toISOString().slice(0, 10),
        employment_status: 'active',
        employment_type: 'full_time',
      } as Parameters<typeof create.mutate>[0],
      {
        onSuccess: () => {
          toast.success('Çalışan eklendi');
          setForm({ ad: '', soyad: '', email: '', employee_no: '' });
        },
        onError: (e) => toast.error(e.message),
      },
    );
  };

  return (
    <StepLayout
      title="İlk Çalışan"
      desc="Manuel ekleme yapın veya CSV ile toplu import edin. Minimum 1 çalışan olunca diğer modüller çalışabilir."
      onNext={onNext}
      onBack={onBack}
    >
      {existing ? (
        <div className="rounded-lg border border-[#BBF7D0] bg-[#F0FDF4] p-4">
          <p className="flex items-center gap-2 text-sm font-medium text-[#166534]">
            <CheckCircle2 className="h-4 w-4" />
            {emps.data?.total} çalışan mevcut
          </p>
          <p className="mt-1 text-xs text-[#14532D]">
            Devam edebilirsiniz. Daha fazlasını{' '}
            <Link href="/calisanlar" className="underline">
              Çalışanlar
            </Link>{' '}
            sayfasından ekleyin.
          </p>
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Ad *" value={form.ad} onChange={(v) => setForm({ ...form, ad: v })} />
          <Field label="Soyad *" value={form.soyad} onChange={(v) => setForm({ ...form, soyad: v })} />
          <Field label="Kurum E-posta *" value={form.email} onChange={(v) => setForm({ ...form, email: v })} />
          <Field
            label="Sicil No (boş bırakılırsa otomatik)"
            value={form.employee_no}
            onChange={(v) => setForm({ ...form, employee_no: v })}
          />
          <div className="sm:col-span-2">
            <button
              type="button"
              onClick={submit}
              disabled={create.isPending || !form.ad.trim() || !form.soyad.trim() || !form.email.trim()}
              className="inline-flex items-center gap-2 rounded-md bg-[#0A0A0A] px-3 py-2 text-sm font-medium text-white hover:bg-[#333] disabled:opacity-50"
            >
              {create.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <UserPlus className="h-4 w-4" />}
              Çalışanı Ekle
            </button>
            <Link
              href="/calisanlar"
              className="ml-3 text-xs text-[#5E5CE6] hover:underline"
            >
              veya CSV import sayfasına git →
            </Link>
            {create.error ? <ErrorLine message={create.error.message} /> : null}
          </div>
        </div>
      )}
    </StepLayout>
  );
}

/* ─── Step 4: Notifications ─── */

function NotificationsStep({ onNext, onBack }: { onNext: () => void; onBack: () => void }) {
  const q = useMyNotificationPreferences();
  const update = useUpdateMyPreferences();
  const prefs = q.data;
  const toggle = (key: 'email_enabled' | 'sms_enabled' | 'inapp_enabled') => {
    if (!prefs) return;
    update.mutate({ [key]: !prefs[key] });
  };
  return (
    <StepLayout
      title="Bildirim Tercihleri"
      desc="Hangi kanallardan bildirim almak istediğinizi seçin. Sonradan Bildirimler sayfasından değiştirebilirsiniz."
      onNext={onNext}
      onBack={onBack}
    >
      {q.isLoading ? (
        <div className="flex items-center gap-2 text-xs text-[#737373]">
          <Loader2 className="h-3 w-3 animate-spin" /> Yükleniyor…
        </div>
      ) : !prefs ? (
        <p className="text-xs text-[#737373]">Tercihler alınamadı.</p>
      ) : (
        <ul className="divide-y divide-[#EDEDED] rounded-lg border border-[#EDEDED]">
          <PrefRow label="E-posta" desc="Haftalık özetler" on={prefs.email_enabled} onToggle={() => toggle('email_enabled')} pending={update.isPending} />
          <PrefRow label="SMS" desc="Acil durum + onay talepleri" on={prefs.sms_enabled} onToggle={() => toggle('sms_enabled')} pending={update.isPending} />
          <PrefRow label="Uygulama İçi" desc="Panel üstü zil" on={prefs.inapp_enabled} onToggle={() => toggle('inapp_enabled')} pending={update.isPending} />
        </ul>
      )}
    </StepLayout>
  );
}

function PrefRow({
  label, desc, on, onToggle, pending,
}: { label: string; desc: string; on: boolean; onToggle: () => void; pending: boolean }) {
  return (
    <li className="flex items-center justify-between p-4">
      <div>
        <p className="text-sm font-medium text-[#0A0A0A]">{label}</p>
        <p className="text-xs text-[#737373]">{desc}</p>
      </div>
      <button
        type="button"
        onClick={onToggle}
        disabled={pending}
        className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors ${
          on ? 'bg-[#5E5CE6]' : 'bg-[#E5E5E5]'
        } disabled:opacity-50`}
      >
        <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${on ? 'translate-x-6' : 'translate-x-1'}`} />
      </button>
    </li>
  );
}

/* ─── Step 5: Done ─── */

function DoneStep() {
  const wp = useSGKWorkplace();
  const bordroSettings = useBordroSettings();
  const emps = useEmployees({ page: 1, limit: 1 });
  const prefs = useMyNotificationPreferences();

  const checklist = [
    { label: 'SGK İşyeri', done: Boolean(wp.data), href: '/ayarlar/canli' },
    { label: 'Bordro Parametreleri', done: Boolean(bordroSettings.data), href: '/bordro/canli' },
    { label: 'En az 1 çalışan', done: (emps.data?.total ?? 0) > 0, href: '/calisanlar' },
    { label: 'Bildirim tercihleri', done: Boolean(prefs.data), href: '/bildirimler' },
  ];
  const allDone = checklist.every((c) => c.done);

  return (
    <div className="text-center">
      <PartyPopper className="mx-auto h-12 w-12 text-[#5E5CE6]" />
      <h2 className="mt-3 text-xl font-semibold text-[#0A0A0A]">
        {allDone ? 'Kurulum tamamlandı!' : 'Neredeyse tamamsınız'}
      </h2>
      <p className="mt-1 text-sm text-[#525252]">
        {allDone
          ? 'UpCore kurumunuz için hazır. Yönetici paneline göz atarak başlayın.'
          : 'Aşağıdaki eksikleri tamamladığınızda tüm modüller çalışır hale gelir.'}
      </p>

      <ul className="mx-auto mt-6 max-w-md space-y-2 text-left">
        {checklist.map((c) => (
          <li
            key={c.label}
            className={`flex items-center justify-between rounded-lg border p-3 ${
              c.done ? 'border-[#BBF7D0] bg-[#F0FDF4]' : 'border-[#FDE68A] bg-[#FFFBEB]'
            }`}
          >
            <span className="flex items-center gap-2 text-sm">
              {c.done ? (
                <CheckCircle2 className="h-4 w-4 text-[#16A34A]" />
              ) : (
                <AlertCircle className="h-4 w-4 text-[#D97706]" />
              )}
              {c.label}
            </span>
            {!c.done ? (
              <Link href={c.href} className="text-xs text-[#5E5CE6] hover:underline">
                Tamamla →
              </Link>
            ) : null}
          </li>
        ))}
      </ul>

      <div className="mt-6 flex justify-center gap-2">
        <Link
          href="/executive/canli"
          className="inline-flex items-center gap-2 rounded-md bg-[#5E5CE6] px-4 py-2 text-sm font-medium text-white hover:bg-[#4B49B6]"
        >
          Yönetici Paneline Git <ArrowRight className="h-4 w-4" />
        </Link>
        <Link
          href="/calisanlar"
          className="inline-flex items-center gap-2 rounded-md border border-[#EDEDED] bg-white px-4 py-2 text-sm font-medium text-[#0A0A0A] hover:bg-[#FAFAFA]"
        >
          <Users className="h-4 w-4" />
          Ekibi Davet Et
        </Link>
      </div>
    </div>
  );
}

/* ─── Shared UI helpers ─── */

function StepLayout({
  title, desc, children, onNext, onBack, nextLabel, nextDisabled, onSave, saving,
}: {
  title: string;
  desc: string;
  children: React.ReactNode;
  onNext: () => void;
  onBack?: () => void;
  nextLabel?: string;
  nextDisabled?: boolean;
  onSave?: () => void;
  saving?: boolean;
}) {
  return (
    <div>
      <h2 className="text-lg font-semibold text-[#0A0A0A]">{title}</h2>
      <p className="mt-1 text-xs text-[#737373]">{desc}</p>
      <div className="mt-4">{children}</div>
      <div className="mt-6 flex items-center justify-between">
        <div>
          {onBack ? (
            <button
              type="button"
              onClick={onBack}
              className="rounded-md border border-[#EDEDED] bg-white px-3 py-2 text-sm text-[#525252] hover:bg-[#FAFAFA]"
            >
              ← Geri
            </button>
          ) : null}
        </div>
        <div className="flex gap-2">
          {onSave ? (
            <button
              type="button"
              onClick={onSave}
              disabled={saving}
              className="inline-flex items-center gap-2 rounded-md border border-[#EDEDED] bg-white px-3 py-2 text-sm text-[#0A0A0A] hover:bg-[#FAFAFA] disabled:opacity-50"
            >
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              Kaydet
            </button>
          ) : null}
          <button
            type="button"
            onClick={onNext}
            disabled={nextDisabled}
            className="inline-flex items-center gap-2 rounded-md bg-[#5E5CE6] px-3 py-2 text-sm font-medium text-white hover:bg-[#4B49B6] disabled:opacity-50"
          >
            {nextLabel ?? 'Atla & Devam'}
            <ArrowRight className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}

function Field({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <label className="block">
      <span className="mb-1 block text-[11px] font-medium uppercase tracking-wider text-[#737373]">{label}</span>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-md border border-[#EDEDED] px-2 py-1.5 text-sm"
      />
    </label>
  );
}

function NumberField({ label, value, onChange }: { label: string; value: number; onChange: (v: number) => void }) {
  return (
    <label className="block">
      <span className="mb-1 block text-[11px] font-medium uppercase tracking-wider text-[#737373]">{label}</span>
      <input
        type="number"
        value={value}
        onChange={(e) => onChange(Number(e.target.value) || 0)}
        className="w-full rounded-md border border-[#EDEDED] px-2 py-1.5 text-sm"
      />
    </label>
  );
}

function ErrorLine({ message }: { message: string }) {
  return (
    <p className="mt-3 flex items-center gap-1 text-xs text-[#DC2626]">
      <AlertCircle className="h-3 w-3" />
      {message}
    </p>
  );
}
