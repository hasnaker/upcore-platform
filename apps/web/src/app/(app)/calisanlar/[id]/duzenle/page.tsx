'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter, useParams } from 'next/navigation';
import {
  fetchEmployee,
  updateEmployee,
  validateTCKN,
  type EmployeeView,
} from '@/lib/employee-mapper';

interface FormErrors {
  [key: string]: string;
}

export default function EmployeeEditPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const id = params.id;

  const [employee, setEmployee] = useState<EmployeeView | null>(null);
  const [loadError, setLoadError] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<FormErrors>({});
  const [globalError, setGlobalError] = useState('');
  const [success, setSuccess] = useState(false);

  const loadEmployee = useCallback(async () => {
    try {
      const data = await fetchEmployee(id);
      setEmployee(data);
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : 'Çalışan verileri yüklenemedi');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    loadEmployee();
  }, [loadEmployee]);

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
    const dogumTarihi = form.get('dogum_tarihi') as string;

    const newErrors: FormErrors = {};
    if (!ad) newErrors['ad'] = 'Ad zorunludur';
    if (!soyad) newErrors['soyad'] = 'Soyad zorunludur';
    if (!hireDate) newErrors['hire_date'] = 'İşe başlama tarihi zorunludur';
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) newErrors['email'] = 'Geçerli email girin';
    if (tckn && !validateTCKN(tckn)) newErrors['tckn'] = 'Geçersiz TCKN';

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setSaving(true);
    try {
      await updateEmployee(id, {
        ad,
        soyad,
        email_is: email || undefined,
        tckn: tckn || undefined,
        hire_date: hireDate,
        dogum_tarihi: dogumTarihi || undefined,
      });
      setSuccess(true);
      setTimeout(() => router.push(`/calisanlar/${id}`), 1500);
    } catch (err) {
      setGlobalError(err instanceof Error ? err.message : 'Güncelleme başarısız');
    } finally {
      setSaving(false);
    }
  }

  // Loading state
  if (loading) {
    return (
      <div className="mx-auto max-w-2xl" style={{ fontFamily: 'Inter, sans-serif' }}>
        <div className="flex flex-col gap-6 py-12">
          <div style={{ height: 32, width: 200, background: '#f0f0f0', borderRadius: 8 }} className="animate-pulse" />
          <div style={{ height: 16, width: 280, background: '#f0f0f0', borderRadius: 6 }} className="animate-pulse" />
          <div className="mt-4 flex flex-col gap-4">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} style={{ height: 40, background: '#fafafa', borderRadius: 8 }} className="animate-pulse" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  // Error state
  if (loadError || !employee) {
    return (
      <div className="mx-auto max-w-2xl" style={{ fontFamily: 'Inter, sans-serif' }}>
        <div className="flex flex-col items-center justify-center gap-3 py-20">
          <div
            style={{
              width: 48,
              height: 48,
              borderRadius: '50%',
              background: '#FEE2E2',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <svg className="h-6 w-6" style={{ color: '#DC2626' }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4.5c-.77-.833-2.694-.833-3.464 0L3.34 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
          </div>
          <p style={{ fontSize: 15, fontWeight: 600, color: '#111' }}>
            {loadError || 'Çalışan bulunamadı'}
          </p>
          <button
            onClick={() => router.push('/calisanlar')}
            style={{ fontSize: 13, color: '#5E5CE6', fontWeight: 500 }}
            className="hover:underline"
          >
            Çalışan listesine dön
          </button>
        </div>
      </div>
    );
  }

  // Success state
  if (success) {
    return (
      <div className="mx-auto max-w-2xl" style={{ fontFamily: 'Inter, sans-serif' }}>
        <div className="flex flex-col items-center justify-center gap-3 py-20">
          <div
            style={{
              width: 48,
              height: 48,
              borderRadius: '50%',
              background: '#DCFCE7',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <svg className="h-6 w-6" style={{ color: '#16A34A' }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <p style={{ fontSize: 15, fontWeight: 600, color: '#111' }}>Çalışan bilgileri güncellendi!</p>
          <p style={{ fontSize: 13, color: '#888' }}>Yönlendiriliyorsunuz...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl" style={{ fontFamily: 'Inter, sans-serif' }}>
      {/* Back button */}
      <button
        onClick={() => router.back()}
        className="mb-6 flex items-center gap-1 hover:opacity-70"
        style={{ fontSize: 13, color: '#888' }}
      >
        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
        </svg>
        Geri
      </button>

      <h1 style={{ fontSize: 24, fontWeight: 700, color: '#111' }}>Çalışan Düzenle</h1>
      <p style={{ fontSize: 14, color: '#888', marginTop: 4 }}>
        {employee.tamAd} bilgilerini güncelleyin. * zorunlu alanlar.
      </p>

      {globalError && (
        <div
          style={{
            marginTop: 16,
            borderRadius: 8,
            border: '1px solid #FCA5A5',
            background: '#FEF2F2',
            padding: 16,
            fontSize: 13,
            color: '#B91C1C',
          }}
        >
          {globalError}
        </div>
      )}

      <form onSubmit={handleSubmit} className="mt-8 flex flex-col gap-5">
        {/* Ad / Soyad */}
        <div className="grid grid-cols-2 gap-4">
          <Field
            name="ad"
            label="Ad *"
            error={errors['ad']}
            defaultValue={employee.ad}
            placeholder="Ayşe"
          />
          <Field
            name="soyad"
            label="Soyad *"
            error={errors['soyad']}
            defaultValue={employee.soyad}
            placeholder="Yılmaz"
          />
        </div>

        {/* Email */}
        <Field
          name="email"
          label="İş E-postası"
          type="email"
          error={errors['email']}
          defaultValue={employee.email}
          placeholder="ayse@sirket.com"
        />

        {/* TCKN */}
        <Field
          name="tckn"
          label="TC Kimlik No"
          error={errors['tckn']}
          defaultValue={employee.tckn ?? ''}
          placeholder="11 haneli"
          maxLength={11}
        />

        {/* Doğum Tarihi */}
        <Field
          name="dogum_tarihi"
          label="Doğum Tarihi"
          type="date"
          error={errors['dogum_tarihi']}
          defaultValue={employee.dogumTarihi ?? ''}
        />

        {/* İşe Başlama Tarihi */}
        <Field
          name="hire_date"
          label="İşe Başlama Tarihi *"
          type="date"
          error={errors['hire_date']}
          defaultValue={employee.iseBaslama}
        />

        {/* Actions */}
        <div
          className="flex justify-end gap-3 pt-6"
          style={{ borderTop: '1px solid #f0f0f0' }}
        >
          <button
            type="button"
            onClick={() => router.back()}
            style={{
              borderRadius: 8,
              border: '1px solid #e5e5e5',
              padding: '10px 20px',
              fontSize: 13,
              fontWeight: 600,
              color: '#555',
              background: '#fff',
            }}
            className="hover:bg-gray-50"
          >
            İptal
          </button>
          <button
            type="submit"
            disabled={saving}
            style={{
              borderRadius: 8,
              padding: '10px 20px',
              fontSize: 13,
              fontWeight: 600,
              background: '#111',
              color: '#fff',
              opacity: saving ? 0.5 : 1,
            }}
            className="hover:opacity-90 transition-opacity disabled:cursor-not-allowed"
          >
            {saving ? 'Kaydediliyor...' : 'Değişiklikleri Kaydet'}
          </button>
        </div>
      </form>
    </div>
  );
}

/* ─── Reusable Field Component ─── */

function Field({
  name,
  label,
  type = 'text',
  error,
  placeholder,
  maxLength,
  defaultValue,
}: {
  name: string;
  label: string;
  type?: string;
  error?: string;
  placeholder?: string;
  maxLength?: number;
  defaultValue?: string;
}) {
  return (
    <div>
      <label
        htmlFor={name}
        style={{ display: 'block', marginBottom: 6, fontSize: 13, fontWeight: 500, color: '#333' }}
      >
        {label}
      </label>
      <input
        id={name}
        name={name}
        type={type}
        placeholder={placeholder}
        maxLength={maxLength}
        defaultValue={defaultValue}
        style={{
          height: 40,
          width: '100%',
          borderRadius: 8,
          border: error ? '1px solid #FCA5A5' : '1px solid #e5e5e5',
          padding: '0 12px',
          fontSize: 14,
          color: '#111',
          outline: 'none',
        }}
        className="placeholder:text-gray-300 focus:ring-2 focus:ring-[#5E5CE6]/20 focus:border-[#5E5CE6]"
      />
      {error && (
        <p style={{ marginTop: 4, fontSize: 12, color: '#DC2626' }}>{error}</p>
      )}
    </div>
  );
}
