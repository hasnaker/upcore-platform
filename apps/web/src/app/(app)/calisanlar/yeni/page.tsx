'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createEmployee, validateTCKN } from '@/lib/employee-mapper';

interface FormErrors { [key: string]: string }

export default function YeniCalisanPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<FormErrors>({});
  const [globalError, setGlobalError] = useState('');
  const [success, setSuccess] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setErrors({});
    setGlobalError('');

    const form = new FormData(e.currentTarget);
    const ad = (form.get('ad') as string)?.trim();
    const soyad = (form.get('soyad') as string)?.trim();
    const email = (form.get('email') as string)?.trim();
    const tckn = (form.get('tckn') as string)?.trim();
    const hireDate = form.get('hire_date') as string;

    const newErrors: FormErrors = {};
    if (!ad) newErrors['ad'] = 'Ad zorunludur';
    if (!soyad) newErrors['soyad'] = 'Soyad zorunludur';
    if (!hireDate) newErrors['hire_date'] = 'İşe başlama tarihi zorunludur';
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) newErrors['email'] = 'Geçerli email girin';
    if (tckn && !validateTCKN(tckn)) newErrors['tckn'] = 'Geçersiz TCKN';

    if (Object.keys(newErrors).length > 0) { setErrors(newErrors); return; }

    setLoading(true);
    try {
      await createEmployee({ ad, soyad, email_is: email || undefined, tckn: tckn || undefined, hire_date: hireDate });
      setSuccess(true);
      setTimeout(() => router.push('/calisanlar'), 1500);
    } catch (err) {
      setGlobalError(err instanceof Error ? err.message : 'Çalışan eklenemedi');
    } finally {
      setLoading(false);
    }
  }

  if (success) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 py-20">
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-green-100 text-green-600">
          <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
        </div>
        <p className="text-[15px] font-semibold text-[#111]">Çalışan başarıyla eklendi!</p>
        <p className="text-[13px] text-[#888]">Yönlendiriliyorsunuz...</p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl">
      <button onClick={() => router.back()} className="mb-6 flex items-center gap-1 text-[13px] text-[#888] hover:text-[#111]">
        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" /></svg>
        Geri
      </button>

      <h1 className="text-[24px] font-bold text-[#111]">Yeni Çalışan Ekle</h1>
      <p className="mt-1 text-[14px] text-[#888]">Bilgileri girin. * zorunlu alanlar.</p>

      {globalError && (
        <div className="mt-4 rounded-lg border border-red-200 bg-red-50 p-4 text-[13px] text-red-700">{globalError}</div>
      )}

      <form onSubmit={handleSubmit} className="mt-8 flex flex-col gap-5">
        <div className="grid grid-cols-2 gap-4">
          <Field name="ad" label="Ad *" error={errors['ad']} placeholder="Ayşe" />
          <Field name="soyad" label="Soyad *" error={errors['soyad']} placeholder="Yılmaz" />
        </div>
        <Field name="email" label="İş E-postası" type="email" error={errors['email']} placeholder="ayse@sirket.com" />
        <Field name="tckn" label="TC Kimlik No" error={errors['tckn']} placeholder="11 haneli" maxLength={11} />
        <Field name="hire_date" label="İşe Başlama Tarihi *" type="date" error={errors['hire_date']} />

        <div className="flex justify-end gap-3 border-t border-[#f0f0f0] pt-6">
          <button type="button" onClick={() => router.back()} className="rounded-lg border border-[#e5e5e5] px-5 py-2.5 text-[13px] font-semibold text-[#555] hover:bg-[#fafafa]">
            İptal
          </button>
          <button type="submit" disabled={loading} className="rounded-lg bg-[#111] px-5 py-2.5 text-[13px] font-semibold text-white hover:bg-[#333] disabled:opacity-50">
            {loading ? 'Kaydediliyor...' : 'Çalışan Ekle'}
          </button>
        </div>
      </form>
    </div>
  );
}

function Field({ name, label, type = 'text', error, placeholder, maxLength }: {
  name: string; label: string; type?: string; error?: string; placeholder?: string; maxLength?: number;
}) {
  return (
    <div>
      <label htmlFor={name} className="mb-1.5 block text-[13px] font-medium text-[#333]">{label}</label>
      <input id={name} name={name} type={type} placeholder={placeholder} maxLength={maxLength}
        className={`h-10 w-full rounded-lg border px-3 text-[14px] text-[#111] placeholder:text-[#ccc] focus:outline-none focus:ring-2 ${
          error ? 'border-red-300 focus:ring-red-200' : 'border-[#e5e5e5] focus:border-[#5E5CE6] focus:ring-[#5E5CE6]/20'
        }`}
      />
      {error && <p className="mt-1 text-[12px] text-red-600">{error}</p>}
    </div>
  );
}
