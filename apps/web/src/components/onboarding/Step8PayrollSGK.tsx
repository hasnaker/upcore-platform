'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { saveStep } from '@/app/onboarding/actions';
import type { OnboardingDraft, PayrollData } from '@/app/onboarding/draft';

interface Step8PayrollSGKProps {
  draft: OnboardingDraft | null;
  nextSlug: string | null;
}

function normalizeIban(raw: string): string {
  return raw.toUpperCase().replace(/\s+/g, '').slice(0, 26);
}

function isValidTurkishIban(iban: string): boolean {
  const s = iban.trim().toUpperCase().replace(/\s+/g, '');
  if (!/^TR\d{24}$/.test(s)) return false;
  // ISO 13616 MOD-97-10: rearrange, convert letters to numbers, compute mod 97
  const rearranged = s.slice(4) + s.slice(0, 4);
  let converted = '';
  for (const ch of rearranged) {
    if (ch >= '0' && ch <= '9') converted += ch;
    else converted += (ch.charCodeAt(0) - 55).toString();
  }
  let remainder = 0;
  for (let i = 0; i < converted.length; i += 7) {
    const chunk = (remainder === 0 ? '' : remainder.toString()) + converted.slice(i, i + 7);
    remainder = parseInt(chunk, 10) % 97;
  }
  return remainder === 1;
}

export function Step8PayrollSGK({ draft, nextSlug }: Step8PayrollSGKProps) {
  const router = useRouter();
  const payrollModule = draft?.data.plan?.modules?.includes('payroll') ?? false;
  const existing = draft?.data.payroll;

  const [sgkCode, setSgkCode] = useState(existing?.sgk_workplace_code ?? '');
  const [iban, setIban] = useState(existing?.iban ?? '');
  const [paymentDay, setPaymentDay] = useState<number>(existing?.payment_day ?? 5);
  const [bankName, setBankName] = useState(existing?.bank_name ?? '');
  const [error, setError] = useState<string | null>(null);
  const [isPending, start] = useTransition();

  const onSave = () => {
    setError(null);
    if (payrollModule) {
      if (!sgkCode.trim()) {
        setError('SGK işyeri sicil numarası zorunlu.');
        return;
      }
      if (!iban.trim() || !isValidTurkishIban(iban)) {
        setError('Geçerli bir TR IBAN giriniz (TR + 24 rakam).');
        return;
      }
      if (paymentDay < 1 || paymentDay > 31) {
        setError('Ödeme günü 1-31 arasında olmalıdır.');
        return;
      }
    }
    const payload: PayrollData = {
      ...(sgkCode.trim() ? { sgk_workplace_code: sgkCode.trim() } : {}),
      ...(iban.trim() ? { iban: normalizeIban(iban) } : {}),
      ...(bankName.trim() ? { bank_name: bankName.trim() } : {}),
      payment_day: paymentDay,
    };
    start(async () => {
      const res = await saveStep(8, { payroll: payload });
      if (!res.ok) {
        setError(res.error ?? 'Kaydedilemedi.');
        return;
      }
      if (nextSlug) router.push(`/onboarding/${nextSlug}`);
    });
  };

  const skip = () => {
    start(async () => {
      const res = await saveStep(8, { payroll: { payment_day: 0 } });
      if (!res.ok) {
        setError(res.error ?? 'Kaydedilemedi.');
        return;
      }
      if (nextSlug) router.push(`/onboarding/${nextSlug}`);
    });
  };

  if (!payrollModule) {
    return (
      <div className="space-y-6">
        <div className="rounded-md border border-line bg-bg-2 p-4 text-sm">
          <p className="font-medium text-ink">Bordro modülü seçilmedi</p>
          <p className="mt-1 text-ink-60">
            SGK işyeri kodu ve banka bilgilerini sonradan plan yükseltip bordro modülünü açarak ekleyebilirsiniz.
          </p>
        </div>
        <button
          type="button"
          onClick={skip}
          disabled={isPending}
          className="inline-flex h-10 w-full items-center justify-center rounded-md bg-accent px-4 text-sm font-medium text-bg hover:bg-accent/90 disabled:opacity-60"
        >
          {isPending ? 'Atlanıyor…' : 'Atla ve devam et'}
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <label className="mb-1.5 block text-sm font-medium text-ink">SGK İşyeri Sicil No</label>
        <input
          value={sgkCode}
          onChange={(e) => setSgkCode(e.target.value)}
          placeholder="01234567890123456789012345"
          className="w-full rounded-md border border-line bg-bg px-3 py-2 text-sm"
        />
        <p className="mt-1 text-xs text-ink-60">
          SGK e-Bildirge sisteminde kayıtlı işyeri sicil numarası (26 hane).
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div>
          <label className="mb-1.5 block text-sm font-medium text-ink">Banka Adı</label>
          <input
            value={bankName}
            onChange={(e) => setBankName(e.target.value)}
            placeholder="Ziraat, İş Bankası, Garanti BBVA…"
            className="w-full rounded-md border border-line bg-bg px-3 py-2 text-sm"
          />
        </div>
        <div>
          <label className="mb-1.5 block text-sm font-medium text-ink">Ödeme Günü (1-31)</label>
          <input
            type="number"
            min={1}
            max={31}
            value={paymentDay}
            onChange={(e) => setPaymentDay(parseInt(e.target.value || '0', 10))}
            className="w-full rounded-md border border-line bg-bg px-3 py-2 text-sm"
          />
        </div>
      </div>

      <div>
        <label className="mb-1.5 block text-sm font-medium text-ink">Şirket Maaş Hesabı IBAN</label>
        <input
          value={iban}
          onChange={(e) => setIban(normalizeIban(e.target.value))}
          placeholder="TR33 0006 1005 1978 6457 8413 26"
          className="w-full rounded-md border border-line bg-bg px-3 py-2 font-mono text-sm uppercase"
        />
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
