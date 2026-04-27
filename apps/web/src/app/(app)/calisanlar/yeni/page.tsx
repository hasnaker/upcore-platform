'use client';

import { useMemo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { ArrowLeft, AlertCircle, Check } from 'lucide-react';
import { toast } from 'sonner';
import { useCreateEmployee } from '@/hooks/useEmployees';
import { useDepartments, usePositions } from '@/hooks/useDepartments';
import { validateTCKN } from '@/lib/employee-mapper';

const CONTRACT_TYPES = [
  { value: 'permanent', label: 'Belirsiz süreli' },
  { value: 'fixed_term', label: 'Belirli süreli' },
  { value: 'parttime', label: 'Kısmi süreli' },
  { value: 'freelance', label: 'Serbest / danışman' },
  { value: 'intern', label: 'Stajyer' },
];

// Zod schema — Türkçe mesajlar
const schema = z.object({
  ad: z.string().min(1, 'Ad zorunludur').max(100, 'En fazla 100 karakter'),
  soyad: z.string().min(1, 'Soyad zorunludur').max(100, 'En fazla 100 karakter'),
  email: z.string().email('Geçerli e-posta giriniz'),
  tckn: z
    .string()
    .optional()
    .refine(
      (v) => !v || /^\d{11}$/.test(v),
      { message: 'TCKN 11 haneli olmalı' },
    )
    .refine(
      (v) => !v || validateTCKN(v),
      { message: 'TCKN geçersiz (mod 10/11 kontrolü başarısız)' },
    ),
  dogum_tarihi: z.string().optional(),
  hire_date: z.string().min(1, 'İşe başlama tarihi zorunludur'),
  department_id: z.string().optional(),
  position_id: z.string().optional(),
  manager_id: z.string().optional(),
  contract_type: z.string().optional(),
});

type FormValues = z.infer<typeof schema>;

export default function YeniCalisanPage() {
  const router = useRouter();
  const createMutation = useCreateEmployee();
  const { data: departments = [] } = useDepartments();

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      hire_date: new Date().toISOString().slice(0, 10),
    },
  });

  const selectedDepartmentId = watch('department_id');
  const { data: positions = [] } = usePositions(selectedDepartmentId || null);

  const onSubmit = async (values: FormValues) => {
    try {
      const result = await createMutation.mutateAsync({
        ad: values.ad,
        soyad: values.soyad,
        email_is: values.email,
        tckn: values.tckn || undefined,
        dogum_tarihi: values.dogum_tarihi || undefined,
        hire_date: values.hire_date,
        department_id: values.department_id || undefined,
        position_id: values.position_id || undefined,
        manager_id: values.manager_id || undefined,
      });
      toast.success(`${values.ad} ${values.soyad} eklendi`, {
        icon: <Check className="h-4 w-4" />,
      });
      router.push(`/calisanlar/${result.id}`);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Beklenmeyen hata';
      toast.error('Kayıt başarısız', { description: message });
    }
  };

  const serverError = createMutation.isError
    ? createMutation.error?.message ?? 'Beklenmeyen hata'
    : null;

  return (
    <div className="flex flex-col gap-6">
      <nav className="flex items-center gap-1 text-[12px] text-ink-40">
        <Link href="/calisanlar" className="hover:text-ink-60">
          Çalışanlar
        </Link>
        <span>›</span>
        <span className="text-ink-60">Yeni çalışan</span>
      </nav>

      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-ink">Yeni Çalışan</h1>
        <p className="mt-1 text-sm text-ink-60">
          Temel bilgileri doldurun. Tüm zorunlu alanlar (*) işaretlidir.
        </p>
      </div>

      {serverError && (
        <div className="flex items-start gap-3 rounded-lg border border-red/30 bg-red-soft p-4 text-sm text-red">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          <div>
            <p className="font-medium">Kayıt sırasında hata</p>
            <p className="mt-1 text-[12px]">{serverError}</p>
          </div>
        </div>
      )}

      <form
        onSubmit={handleSubmit(onSubmit)}
        noValidate
        className="flex flex-col gap-8 rounded-lg border border-line bg-bg p-6"
      >
        {/* Kişisel bilgiler */}
        <section>
          <h2 className="text-[11px] font-semibold uppercase tracking-widest text-ink-40">
            Kişisel
          </h2>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <Field label="Ad *" error={errors.ad?.message}>
              <input
                {...register('ad')}
                type="text"
                autoComplete="given-name"
                className="input"
              />
            </Field>
            <Field label="Soyad *" error={errors.soyad?.message}>
              <input
                {...register('soyad')}
                type="text"
                autoComplete="family-name"
                className="input"
              />
            </Field>
            <Field label="E-posta *" error={errors.email?.message}>
              <input
                {...register('email')}
                type="email"
                autoComplete="email"
                placeholder="ad@sirket.com"
                className="input"
              />
            </Field>
            <Field label="TCKN (opsiyonel)" error={errors.tckn?.message}>
              <input
                {...register('tckn')}
                type="text"
                maxLength={11}
                inputMode="numeric"
                placeholder="11 hane"
                className="input tabular-nums"
              />
            </Field>
            <Field label="Doğum tarihi" error={errors.dogum_tarihi?.message}>
              <input {...register('dogum_tarihi')} type="date" className="input" />
            </Field>
            <Field label="İşe başlama *" error={errors.hire_date?.message}>
              <input {...register('hire_date')} type="date" className="input" />
            </Field>
          </div>
        </section>

        {/* İş bilgileri */}
        <section>
          <h2 className="text-[11px] font-semibold uppercase tracking-widest text-ink-40">
            İş
          </h2>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <Field label="Departman" error={errors.department_id?.message}>
              <select {...register('department_id')} className="input">
                <option value="">— Seçiniz —</option>
                {departments.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name_tr}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Pozisyon" error={errors.position_id?.message}>
              <select
                {...register('position_id')}
                className="input"
                disabled={!selectedDepartmentId}
              >
                <option value="">
                  {selectedDepartmentId ? '— Seçiniz —' : 'Önce departman seçin'}
                </option>
                {positions.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.title_tr}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Sözleşme tipi" error={errors.contract_type?.message}>
              <select {...register('contract_type')} className="input">
                <option value="">— Seçiniz —</option>
                {CONTRACT_TYPES.map((c) => (
                  <option key={c.value} value={c.value}>
                    {c.label}
                  </option>
                ))}
              </select>
            </Field>
          </div>
        </section>

        <div className="flex items-center justify-between border-t border-line pt-6">
          <Link
            href="/calisanlar"
            className="inline-flex items-center gap-1 text-[13px] font-medium text-ink-60 hover:text-ink"
          >
            <ArrowLeft className="h-4 w-4" />
            Vazgeç
          </Link>
          <button
            type="submit"
            disabled={isSubmitting || createMutation.isPending}
            className="inline-flex items-center gap-1.5 rounded-md bg-accent px-5 py-2.5 text-[13px] font-semibold text-white transition-colors hover:bg-accent/90 disabled:opacity-50"
          >
            {isSubmitting || createMutation.isPending ? 'Kaydediliyor…' : 'Kaydet ve Aç'}
          </button>
        </div>
      </form>

      <style jsx>{`
        .input {
          height: 2.5rem;
          width: 100%;
          border-radius: 0.375rem;
          border: 1px solid var(--color-line);
          background: var(--color-bg);
          padding: 0 0.75rem;
          font-size: 0.875rem;
          color: var(--color-ink);
        }
        .input:focus {
          border-color: var(--color-accent);
          outline: none;
        }
        .input:disabled {
          background: var(--color-bg-3);
          color: var(--color-ink-40);
        }
      `}</style>
    </div>
  );
}

// Küçük helper — label + error mesaj yerleşimi.
const Field = ({
  label,
  error,
  children,
}: {
  label: string;
  error?: string;
  children: React.ReactNode;
}) => (
  <label className="flex flex-col gap-1.5">
    <span className="text-[12px] font-medium text-ink-80">{label}</span>
    {children}
    {error && <span className="text-[11px] text-red">{error}</span>}
  </label>
);

// ESLint unused-vars için useMemo import'u koruyalım (ileride computed alanlar için)
void useMemo;
