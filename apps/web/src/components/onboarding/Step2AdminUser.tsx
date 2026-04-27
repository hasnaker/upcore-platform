'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { saveStep } from '@/app/onboarding/actions';
import type { AdminData, OnboardingDraft } from '@/app/onboarding/draft';

interface Step2AdminUserProps {
  draft: OnboardingDraft | null;
  nextSlug: string | null;
}

export function Step2AdminUser({ draft, nextSlug }: Step2AdminUserProps) {
  const router = useRouter();
  const existing = draft?.data.admin;
  const [firstName, setFirstName] = useState(existing?.first_name ?? '');
  const [lastName, setLastName] = useState(existing?.last_name ?? '');
  const [email, setEmail] = useState(existing?.email ?? draft?.admin_email ?? '');
  const [phone, setPhone] = useState(existing?.phone ?? '');
  const [twoFA, setTwoFA] = useState<boolean>(existing?.two_fa_ack ?? false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [isPending, start] = useTransition();

  const onSave = () => {
    setError(null);
    setFieldErrors({});
    const fe: Record<string, string> = {};
    if (!firstName.trim()) fe['first_name'] = 'Ad zorunludur.';
    if (!lastName.trim()) fe['last_name'] = 'Soyad zorunludur.';
    if (!/^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/.test(email.trim())) {
      fe['email'] = 'Geçerli bir e-posta girin.';
    }
    if (!twoFA) fe['two_fa_ack'] = 'İki adımlı doğrulamayı kabul etmelisiniz.';
    if (Object.keys(fe).length > 0) {
      setFieldErrors(fe);
      return;
    }
    const admin: AdminData = {
      email: email.trim().toLowerCase(),
      first_name: firstName.trim(),
      last_name: lastName.trim(),
      two_fa_ack: twoFA,
      ...(phone.trim() ? { phone: phone.trim() } : {}),
    };
    start(async () => {
      const res = await saveStep(2, { admin });
      if (!res.ok) {
        setError(res.error ?? 'Kaydedilemedi.');
        if (res.fieldErrors) setFieldErrors(res.fieldErrors);
        return;
      }
      if (nextSlug) router.push(`/onboarding/${nextSlug}`);
    });
  };

  return (
    <div className="space-y-6">
      <div className="rounded-md border border-line bg-bg-2 p-4 text-sm text-ink-60">
        <p className="font-medium text-ink">Güvenlik gereksinimleri</p>
        <ul className="mt-2 list-disc space-y-1 pl-5 text-xs">
          <li>Clerk üzerinden en az 12 karakter, sayı + özel karakter içeren parola</li>
          <li>İki adımlı doğrulama (2FA) zorunlu — SMS veya TOTP</li>
          <li>İlk giriş sonrası şifre değişikliği tetiklenir</li>
        </ul>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div>
          <label htmlFor="first_name" className="mb-1.5 block text-sm font-medium text-ink">
            Ad
          </label>
          <input
            id="first_name"
            value={firstName}
            onChange={(e) => setFirstName(e.target.value)}
            className="w-full rounded-md border border-line bg-bg px-3 py-2 text-sm"
            aria-invalid={fieldErrors['first_name'] ? 'true' : undefined}
          />
          {fieldErrors['first_name'] && <p className="mt-1 text-xs text-red">{fieldErrors['first_name']}</p>}
        </div>
        <div>
          <label htmlFor="last_name" className="mb-1.5 block text-sm font-medium text-ink">
            Soyad
          </label>
          <input
            id="last_name"
            value={lastName}
            onChange={(e) => setLastName(e.target.value)}
            className="w-full rounded-md border border-line bg-bg px-3 py-2 text-sm"
            aria-invalid={fieldErrors['last_name'] ? 'true' : undefined}
          />
          {fieldErrors['last_name'] && <p className="mt-1 text-xs text-red">{fieldErrors['last_name']}</p>}
        </div>
      </div>

      <div>
        <label htmlFor="admin_email" className="mb-1.5 block text-sm font-medium text-ink">
          E-posta
        </label>
        <input
          id="admin_email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full rounded-md border border-line bg-bg px-3 py-2 text-sm"
          aria-invalid={fieldErrors['email'] ? 'true' : undefined}
        />
        {fieldErrors['email'] && <p className="mt-1 text-xs text-red">{fieldErrors['email']}</p>}
      </div>

      <div>
        <label htmlFor="phone" className="mb-1.5 block text-sm font-medium text-ink">
          Telefon (opsiyonel)
        </label>
        <input
          id="phone"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          placeholder="+90 5xx xxx xx xx"
          className="w-full rounded-md border border-line bg-bg px-3 py-2 text-sm"
        />
      </div>

      <label className="flex cursor-pointer items-start gap-3 rounded-md border border-line bg-bg p-4 text-sm">
        <input
          type="checkbox"
          checked={twoFA}
          onChange={(e) => setTwoFA(e.target.checked)}
          className="mt-0.5 h-4 w-4"
        />
        <span className="flex-1">
          <span className="block font-medium text-ink">İki Adımlı Doğrulamayı (2FA) anlıyorum</span>
          <span className="block text-xs text-ink-60">
            İlk girişte Clerk TOTP veya SMS doğrulaması aktif olacak. Kurumsal güvenlik politikası gereği zorunludur.
          </span>
        </span>
      </label>
      {fieldErrors['two_fa_ack'] && <p className="text-xs text-red">{fieldErrors['two_fa_ack']}</p>}

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
