'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  ArrowRight,
  Calendar,
  CheckCircle2,
  Clock,
  Mail,
  Phone,
  Shield,
  Users,
} from 'lucide-react';

const schema = z.object({
  ad_soyad: z.string().min(2, 'Ad soyad zorunludur').max(120),
  sirket: z.string().min(2, 'Şirket adı zorunludur').max(200),
  rol: z.string().min(2, 'Pozisyon zorunludur').max(120),
  email: z.string().email('Geçerli e-posta giriniz'),
  telefon: z.string().min(10, '10+ hane telefon').max(20),
  calisan_sayisi: z.enum(['0-100', '100-500', '500-2000', '2000-10000', '10000+']),
  segment: z.enum(['kamu', 'holding', 'sirket', 'ats', 'diger']),
  ilgilendigi_modul: z.array(z.string()).min(1, 'En az bir modül seçin'),
  mesaj: z.string().max(1000).optional(),
  kvkk_onay: z.literal(true, {
    errorMap: () => ({ message: 'KVKK onayı zorunludur' }),
  }),
});

type FormValues = z.infer<typeof schema>;

const MODULES = [
  { value: 'kazanim', label: 'Kazanım (ATS + Assessment)' },
  { value: 'surdurme', label: 'Sürdürme (BAT-TR + JD-R)' },
  { value: 'gelistirme', label: 'Geliştirme (VIA + Job Crafting)' },
  { value: 'yerlestirme', label: 'Yerleştirme (İç Mobilite)' },
  { value: 'koruma', label: 'Koruma (Müdahaleler)' },
];

export default function DemoPage() {
  const [submitted, setSubmitted] = useState<FormValues | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { ilgilendigi_modul: [], segment: 'holding', calisan_sayisi: '500-2000' },
  });

  const onSubmit = async (values: FormValues) => {
    // NOTE: Backend demo-leads endpoint devreye alınıncaya kadar form payload
    // console'a yazılır + mailto fallback açılır.
    console.log('[demo lead]', values);
    await new Promise((r) => setTimeout(r, 600));
    setSubmitted(values);
  };

  if (submitted) {
    return (
      <div className="mx-auto max-w-2xl px-6 py-24 text-center">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-[#D1FAE5]">
          <CheckCircle2 className="h-8 w-8 text-[#059669]" />
        </div>
        <h1 className="mt-6 text-3xl font-semibold tracking-tight text-[#0A0A0A]">
          Talebiniz alındı, {submitted.ad_soyad.split(' ')[0]}.
        </h1>
        <p className="mt-3 text-[15px] text-[#525252]">
          Satış ekibimiz 24 iş saati içinde <strong>{submitted.email}</strong> adresinden
          dönüş yapacak. Takvim uyuşturduğumuzda {submitted.calisan_sayisi} çalışanlı{' '}
          {submitted.sirket} için özelleştirilmiş 30 dakikalık canlı demo yapacağız.
        </p>
        <div className="mt-8 rounded-xl border border-[#EDEDED] bg-[#FAFAFA] p-5 text-left text-[13px] text-[#525252]">
          <p className="font-semibold text-[#0A0A0A]">Sonraki adımlar:</p>
          <ol className="mt-2 list-decimal space-y-1 pl-5">
            <li>Demo linki ve takvim uyarlaması (24 saat içinde).</li>
            <li>30 dk canlı oturum: seçtiğiniz 3 modül + Q&amp;A.</li>
            <li>14 günlük pilot — kendi çalışan verilerinizle.</li>
            <li>İhtiyaca göre özel teklif ve KVKK anlaşması.</li>
          </ol>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto grid max-w-[1200px] gap-10 px-6 py-16 lg:grid-cols-[1.1fr_1fr] lg:py-24">
      {/* Left: copy */}
      <div>
        <h1 className="text-4xl font-semibold tracking-tight text-[#0A0A0A] sm:text-5xl">
          30 dakikada UpCore&apos;u ekibinize anlatalım
        </h1>
        <p className="mt-4 max-w-xl text-lg text-[#525252]">
          Demo sürümü yerine kendi çalışan verilerinizle pilot öneriyoruz. Gerçek BAT-TR
          simülasyonu, kendi pozisyonunuzda JD-R fit testi ve canlı Kanban.
        </p>

        <ul className="mt-10 flex flex-col gap-4">
          <Benefit
            icon={<Clock className="h-4 w-4 text-[#5E5CE6]" />}
            title="30 dakika"
            desc="Yalnızca ihtiyaç duyduğunuz 3 modüle odaklanırız."
          />
          <Benefit
            icon={<Users className="h-4 w-4 text-[#5E5CE6]" />}
            title="Ekibinizle birlikte"
            desc="Demoya 3 kişi kadar ekleyebilirsiniz — CHRO, IT, Finance."
          />
          <Benefit
            icon={<Shield className="h-4 w-4 text-[#5E5CE6]" />}
            title="KVKK güvencesi"
            desc="Demo sonrası veriniz 30 gün içinde silinir, ispat belgesi verilir."
          />
          <Benefit
            icon={<Calendar className="h-4 w-4 text-[#5E5CE6]" />}
            title="14 gün pilot"
            desc="Beğenirseniz 14 günlük pilot — kendi çalışan verileriniz, BAT-TR pulse test."
          />
        </ul>

        <div className="mt-10 rounded-xl border border-[#EDEDED] bg-[#FAFAFA] p-5">
          <p className="text-[11px] font-semibold uppercase tracking-widest text-[#A3A3A3]">
            Doğrudan ulaşın
          </p>
          <div className="mt-3 flex flex-col gap-2 text-[13px]">
            <a
              href="mailto:satis@upcore.app"
              className="inline-flex items-center gap-2 font-medium text-[#5E5CE6] hover:underline"
            >
              <Mail className="h-4 w-4" />
              satis@upcore.app
            </a>
            <a
              href="tel:+902123334455"
              className="inline-flex items-center gap-2 font-medium text-[#5E5CE6] hover:underline"
            >
              <Phone className="h-4 w-4" />
              +90 212 333 44 55
            </a>
          </div>
        </div>
      </div>

      {/* Right: form */}
      <form
        onSubmit={handleSubmit(onSubmit)}
        className="flex flex-col gap-4 rounded-xl border border-[#EDEDED] bg-white p-6 shadow-sm"
      >
        <h2 className="text-lg font-semibold text-[#0A0A0A]">Demo Talep Formu</h2>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Field label="Ad Soyad *" error={errors.ad_soyad?.message}>
            <input
              {...register('ad_soyad')}
              className="h-10 w-full rounded-md border border-[#EDEDED] bg-white px-3 text-sm focus:border-[#5E5CE6] focus:outline-none"
            />
          </Field>
          <Field label="Pozisyon / Rol *" error={errors.rol?.message}>
            <input
              {...register('rol')}
              placeholder="İK Direktörü, CHRO…"
              className="h-10 w-full rounded-md border border-[#EDEDED] bg-white px-3 text-sm focus:border-[#5E5CE6] focus:outline-none"
            />
          </Field>
        </div>

        <Field label="Şirket *" error={errors.sirket?.message}>
          <input
            {...register('sirket')}
            className="h-10 w-full rounded-md border border-[#EDEDED] bg-white px-3 text-sm focus:border-[#5E5CE6] focus:outline-none"
          />
        </Field>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Field label="E-posta *" error={errors.email?.message}>
            <input
              {...register('email')}
              type="email"
              className="h-10 w-full rounded-md border border-[#EDEDED] bg-white px-3 text-sm focus:border-[#5E5CE6] focus:outline-none"
            />
          </Field>
          <Field label="Telefon *" error={errors.telefon?.message}>
            <input
              {...register('telefon')}
              type="tel"
              placeholder="+90 …"
              className="h-10 w-full rounded-md border border-[#EDEDED] bg-white px-3 text-sm focus:border-[#5E5CE6] focus:outline-none"
            />
          </Field>
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Field label="Çalışan sayısı" error={errors.calisan_sayisi?.message}>
            <select
              {...register('calisan_sayisi')}
              className="h-10 w-full rounded-md border border-[#EDEDED] bg-white px-3 text-sm focus:border-[#5E5CE6] focus:outline-none"
            >
              <option value="0-100">0-100</option>
              <option value="100-500">100-500</option>
              <option value="500-2000">500-2000</option>
              <option value="2000-10000">2000-10.000</option>
              <option value="10000+">10.000+</option>
            </select>
          </Field>
          <Field label="Segment" error={errors.segment?.message}>
            <select
              {...register('segment')}
              className="h-10 w-full rounded-md border border-[#EDEDED] bg-white px-3 text-sm focus:border-[#5E5CE6] focus:outline-none"
            >
              <option value="kamu">Kamu / Belediye</option>
              <option value="holding">Holding / Grup</option>
              <option value="sirket">Tek Şirket</option>
              <option value="ats">Yüksek başvuru (ATS)</option>
              <option value="diger">Diğer</option>
            </select>
          </Field>
        </div>

        <Field label="İlgilendiğiniz modüller *" error={errors.ilgilendigi_modul?.message}>
          <div className="mt-1 grid grid-cols-1 gap-1.5 sm:grid-cols-2">
            {MODULES.map((m) => (
              <label
                key={m.value}
                className="flex cursor-pointer items-center gap-2 rounded-md border border-[#EDEDED] bg-white px-3 py-2 text-[12px] has-[:checked]:border-[#5E5CE6] has-[:checked]:bg-[#EEF0FD]"
              >
                <input
                  type="checkbox"
                  value={m.value}
                  {...register('ilgilendigi_modul')}
                  className="h-3.5 w-3.5 accent-[#5E5CE6]"
                />
                {m.label}
              </label>
            ))}
          </div>
        </Field>

        <Field label="Mesaj (opsiyonel)">
          <textarea
            {...register('mesaj')}
            rows={3}
            placeholder="Özel ihtiyaçlarınız, mevcut sisteminiz, entegrasyon beklentiniz…"
            className="w-full rounded-md border border-[#EDEDED] bg-white p-2.5 text-sm focus:border-[#5E5CE6] focus:outline-none"
          />
        </Field>

        <label className="flex items-start gap-2 rounded-md bg-[#FAFAFA] p-3 text-[11px] text-[#525252]">
          <input
            type="checkbox"
            {...register('kvkk_onay')}
            className="mt-0.5 h-4 w-4 accent-[#5E5CE6]"
          />
          <span>
            <strong className="text-[#0A0A0A]">KVKK onayı:</strong> Form verilerimin UpCore
            tarafından demo organizasyonu için işlenmesine izin veriyorum. Detaylı aydınlatma
            metni için{' '}
            <a href="/kvkk" className="text-[#5E5CE6] underline">
              kvkk.upcore.app
            </a>
            .
            {errors.kvkk_onay && (
              <span className="mt-1 block text-[#DC2626]">{errors.kvkk_onay.message}</span>
            )}
          </span>
        </label>

        <button
          type="submit"
          disabled={isSubmitting}
          className="inline-flex h-11 items-center justify-center gap-2 rounded-md bg-[#5E5CE6] px-5 text-[14px] font-semibold text-white hover:bg-[#4B4AC5] disabled:opacity-50"
        >
          {isSubmitting ? 'Gönderiliyor…' : 'Demo Talep Et'}
          <ArrowRight className="h-4 w-4" />
        </button>

        <p className="text-center text-[11px] text-[#A3A3A3]">
          24 iş saati içinde dönüş · Spam göndermiyoruz
        </p>
      </form>
    </div>
  );
}

const Field = ({
  label,
  error,
  children,
}: {
  label: string;
  error?: string;
  children: React.ReactNode;
}) => (
  <label className="flex flex-col gap-1">
    <span className="text-[11px] font-medium text-[#0A0A0A]">{label}</span>
    {children}
    {error && <span className="text-[11px] text-[#DC2626]">{error}</span>}
  </label>
);

const Benefit = ({
  icon,
  title,
  desc,
}: {
  icon: React.ReactNode;
  title: string;
  desc: string;
}) => (
  <li className="flex items-start gap-3">
    <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-[#EEF0FD]">
      {icon}
    </div>
    <div>
      <p className="text-sm font-semibold text-[#0A0A0A]">{title}</p>
      <p className="text-[12px] text-[#525252]">{desc}</p>
    </div>
  </li>
);
