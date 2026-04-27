'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { saveStep } from '@/app/onboarding/actions';
import type { CompanyData, OnboardingDraft, TemplateCode } from '@/app/onboarding/draft';
import { slugify } from '@/lib/utils';

interface Step1CompanyProps {
  draft: OnboardingDraft | null;
  nextSlug: string | null;
}

const TEMPLATES: Array<{ code: TemplateCode; name: string; hint: string }> = [
  { code: 'kobi', name: 'KOBİ (1-50 çalışan)', hint: 'Küçük işletme, hızlı kurulum' },
  { code: 'tech', name: 'Tech Scale-up', hint: 'Ürün + mühendislik odaklı' },
  { code: 'holding', name: 'Holding / Multi-Entity', hint: 'Birden fazla şirket' },
  { code: 'belediye', name: 'Belediye / Kamu', hint: '657/4B/4857 memur tipleri' },
];

const BANDS = ['1-10', '11-50', '51-200', '201-1000', '1000+'] as const;

export function Step1Company({ draft, nextSlug }: Step1CompanyProps) {
  const router = useRouter();
  const existing = draft?.data.company;
  const [name, setName] = useState(existing?.name ?? '');
  const [slug, setSlug] = useState(existing?.slug ?? '');
  const [slugEdited, setSlugEdited] = useState(!!existing?.slug);
  const [vkn, setVkn] = useState(existing?.vkn ?? '');
  const [sector, setSector] = useState(existing?.sector ?? '');
  const [band, setBand] = useState<CompanyData['employee_count_band']>(existing?.employee_count_band ?? '11-50');
  const [template, setTemplate] = useState<TemplateCode>(draft?.data.template ?? '');
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [isPending, start] = useTransition();

  const handleNameChange = (v: string) => {
    setName(v);
    if (!slugEdited) setSlug(slugify(v));
  };

  const onSave = () => {
    setError(null);
    setFieldErrors({});
    const fe: Record<string, string> = {};
    if (!name.trim() || name.trim().length < 2) fe['name'] = 'Şirket adı en az 2 karakter olmalıdır.';
    if (!slug.trim() || !/^[a-z0-9]+(-[a-z0-9]+)*$/.test(slug.trim())) {
      fe['slug'] = 'URL küçük harf, rakam ve tire içerebilir.';
    }
    if (vkn && !/^\d{10}$/.test(vkn.trim())) fe['vkn'] = 'VKN 10 haneli rakam olmalıdır.';
    if (Object.keys(fe).length > 0) {
      setFieldErrors(fe);
      return;
    }
    const payload: { company: CompanyData; template?: TemplateCode } = {
      company: {
        name: name.trim(),
        slug: slug.trim(),
        ...(vkn.trim() ? { vkn: vkn.trim() } : {}),
        ...(sector.trim() ? { sector: sector.trim() } : {}),
        ...(band ? { employee_count_band: band } : {}),
        country: 'TR',
        locale: 'tr-TR',
      },
    };
    if (template) payload.template = template;

    start(async () => {
      const res = await saveStep(1, payload);
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
      <div>
        <label htmlFor="company_name" className="mb-1.5 block text-sm font-medium text-ink">
          Şirket Adı
        </label>
        <input
          id="company_name"
          value={name}
          onChange={(e) => handleNameChange(e.target.value)}
          placeholder="Örn. Acme Teknoloji A.Ş."
          className="w-full rounded-md border border-line bg-bg px-3 py-2 text-sm"
          aria-invalid={fieldErrors['name'] ? 'true' : undefined}
        />
        {fieldErrors['name'] && <p className="mt-1 text-xs text-red">{fieldErrors['name']}</p>}
      </div>

      <div>
        <label htmlFor="company_slug" className="mb-1.5 block text-sm font-medium text-ink">
          Şirket URL&apos;si
        </label>
        <div className="flex items-center overflow-hidden rounded-md border border-line bg-bg">
          <span className="border-r border-line bg-bg-2 px-3 py-2 text-sm text-ink-60">upcore.app/</span>
          <input
            id="company_slug"
            value={slug}
            onChange={(e) => {
              setSlugEdited(true);
              setSlug(e.target.value.toLowerCase());
            }}
            placeholder="acme"
            pattern="^[a-z0-9]+(-[a-z0-9]+)*$"
            className="flex-1 bg-bg px-3 py-2 text-sm"
          />
        </div>
        {fieldErrors['slug'] && <p className="mt-1 text-xs text-red">{fieldErrors['slug']}</p>}
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div>
          <label htmlFor="vkn" className="mb-1.5 block text-sm font-medium text-ink">
            VKN (Vergi Numarası)
          </label>
          <input
            id="vkn"
            value={vkn}
            onChange={(e) => setVkn(e.target.value.replace(/\D/g, '').slice(0, 10))}
            placeholder="10 haneli"
            className="w-full rounded-md border border-line bg-bg px-3 py-2 text-sm"
          />
          {fieldErrors['vkn'] && <p className="mt-1 text-xs text-red">{fieldErrors['vkn']}</p>}
        </div>
        <div>
          <label htmlFor="sector" className="mb-1.5 block text-sm font-medium text-ink">
            Sektör
          </label>
          <input
            id="sector"
            value={sector}
            onChange={(e) => setSector(e.target.value)}
            placeholder="Örn. Teknoloji / Perakende / Kamu"
            className="w-full rounded-md border border-line bg-bg px-3 py-2 text-sm"
          />
        </div>
      </div>

      <div>
        <label className="mb-1.5 block text-sm font-medium text-ink">Çalışan sayısı</label>
        <div className="flex flex-wrap gap-2">
          {BANDS.map((b) => (
            <label
              key={b}
              className={`cursor-pointer rounded-md border px-3 py-1.5 text-sm ${
                band === b ? 'border-accent bg-accent-soft/30 text-ink' : 'border-line text-ink-60'
              }`}
            >
              <input
                type="radio"
                name="band"
                value={b}
                checked={band === b}
                onChange={() => setBand(b)}
                className="sr-only"
              />
              {b}
            </label>
          ))}
        </div>
      </div>

      <div>
        <label className="mb-1.5 block text-sm font-medium text-ink">Hazır şablon (opsiyonel)</label>
        <p className="mb-3 text-xs text-ink-60">
          Seçerseniz departmanlar, pozisyonlar ve KVKK metinleri o sektör için hazır gelir. Sonradan da değiştirebilirsiniz.
        </p>
        <div className="grid gap-2 md:grid-cols-2">
          {TEMPLATES.map((t) => (
            <label
              key={t.code}
              className={`flex cursor-pointer items-start gap-3 rounded-lg border p-3 text-sm ${
                template === t.code ? 'border-accent ring-1 ring-accent bg-accent-soft/30' : 'border-line'
              }`}
            >
              <input
                type="radio"
                name="template"
                value={t.code}
                checked={template === t.code}
                onChange={() => setTemplate(t.code)}
                className="sr-only"
              />
              <span className="flex-1">
                <span className="block font-medium text-ink">{t.name}</span>
                <span className="block text-xs text-ink-60">{t.hint}</span>
              </span>
            </label>
          ))}
        </div>
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
