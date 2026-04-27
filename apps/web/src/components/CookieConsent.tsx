'use client';

/**
 * CookieConsent — KVKK + ePrivacy Directive uyumlu çerez onay banner'ı.
 *
 * - Banner altta sabit; ilk ziyarette görünür.
 * - 3 kategori: Zorunlu (disabled, always on) / Analitik / Pazarlama.
 * - Detaylı ayarlar modal'ı ile kategori bazında toggle.
 * - Seçim localStorage (`upcore.cookie-consent.v1`) + server log
 *   (`/api/consent/cookie` — audit log forward).
 *
 * Referans:
 *  - KVKK Madde 5, 10 (açık rıza + aydınlatma)
 *  - ePrivacy Directive 2002/58/EC Madde 5(3)
 */

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { cn } from '@/lib/utils';

const STORAGE_KEY = 'upcore.cookie-consent.v1';
const POLICY_VERSION = '2026-04-24';

type ConsentCategory = 'necessary' | 'analytics' | 'marketing';

export interface CookieConsentState {
  version: string;
  decidedAt: string; // ISO
  categories: Record<ConsentCategory, boolean>;
}

const DEFAULT_STATE: CookieConsentState = {
  version: POLICY_VERSION,
  decidedAt: '',
  categories: {
    necessary: true,
    analytics: false,
    marketing: false,
  },
};

function readStored(): CookieConsentState | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as CookieConsentState;
    if (parsed.version !== POLICY_VERSION) {
      // Versiyon eskimiş — yeniden sor
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

async function forwardToServer(state: CookieConsentState): Promise<void> {
  try {
    await fetch('/api/consent/cookie', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(state),
      // Banner kapanış akışı engellenmemeli
      keepalive: true,
    });
  } catch {
    // Server log hatası UI'yi bloklamaz — localStorage yine de korur
  }
}

export const CookieConsent = () => {
  const [open, setOpen] = useState(false);
  const [showDetails, setShowDetails] = useState(false);
  const [state, setState] = useState<CookieConsentState>(DEFAULT_STATE);

  useEffect(() => {
    const stored = readStored();
    if (!stored) {
      setOpen(true);
    } else {
      setState(stored);
    }
  }, []);

  const persist = useCallback((next: CookieConsentState) => {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    } catch {
      // quota full / incognito — server log hâlâ push edilir
    }
    void forwardToServer(next);
  }, []);

  const acceptAll = useCallback(() => {
    const next: CookieConsentState = {
      version: POLICY_VERSION,
      decidedAt: new Date().toISOString(),
      categories: { necessary: true, analytics: true, marketing: true },
    };
    setState(next);
    persist(next);
    setOpen(false);
    setShowDetails(false);
  }, [persist]);

  const rejectOptional = useCallback(() => {
    const next: CookieConsentState = {
      version: POLICY_VERSION,
      decidedAt: new Date().toISOString(),
      categories: { necessary: true, analytics: false, marketing: false },
    };
    setState(next);
    persist(next);
    setOpen(false);
    setShowDetails(false);
  }, [persist]);

  const saveSelection = useCallback(() => {
    const next: CookieConsentState = {
      ...state,
      decidedAt: new Date().toISOString(),
      version: POLICY_VERSION,
    };
    setState(next);
    persist(next);
    setOpen(false);
    setShowDetails(false);
  }, [persist, state]);

  const toggleCategory = useCallback((category: ConsentCategory, value: boolean) => {
    setState((prev) => ({
      ...prev,
      categories: { ...prev.categories, [category]: value },
    }));
  }, []);

  const categoryInfo = useMemo(
    () => [
      {
        key: 'necessary' as ConsentCategory,
        title: 'Zorunlu Çerezler',
        description:
          'Oturum yönetimi, güvenlik ve temel site işlevleri için gereklidir. Kapatılamaz.',
        disabled: true,
      },
      {
        key: 'analytics' as ConsentCategory,
        title: 'Analitik Çerezler',
        description:
          'Sayfa ziyaret sayıları ve kullanıcı davranışı ile hizmeti iyileştirmek için kullanılır (Plausible — anonim, PII yok).',
        disabled: false,
      },
      {
        key: 'marketing' as ConsentCategory,
        title: 'Pazarlama Çerezleri',
        description:
          'Yeniden hedefleme ve kampanya performansı için üçüncü taraf pazarlama servisleri.',
        disabled: false,
      },
    ],
    [],
  );

  if (!open) return null;

  return (
    <div className="fixed inset-x-0 bottom-0 z-[100] border-t border-[#E5E7EB] bg-white shadow-[0_-8px_32px_-12px_rgba(0,0,0,0.15)]">
      <div className="mx-auto flex w-full max-w-[1200px] flex-col gap-4 px-6 py-5 md:flex-row md:items-center md:justify-between">
        <div className="flex-1">
          <h2 className="font-mono text-[11px] font-semibold uppercase tracking-[0.12em] text-[#111827]">
            Çerez Tercihleri
          </h2>
          <p className="mt-1.5 max-w-2xl text-[13px] leading-relaxed text-[#4B5563]">
            Bu site deneyimi iyileştirmek için çerez kullanır. Zorunlu çerezler
            her zaman açıktır; analitik ve pazarlama çerezleri için açık
            rızanızı alıyoruz (KVKK Madde 5). Detay için{' '}
            <Link href="/cerez-politikasi" className="underline decoration-[#FF5400] underline-offset-2 hover:text-[#FF5400]">
              Çerez Politikası
            </Link>{' '}
            ve{' '}
            <Link href="/gizlilik" className="underline decoration-[#FF5400] underline-offset-2 hover:text-[#FF5400]">
              Gizlilik Aydınlatma
            </Link>
            .
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setShowDetails(true)}
            className="rounded-none border border-[#E5E7EB] bg-white px-4 py-2 text-[12.5px] font-medium text-[#374151] transition hover:border-[#111827] hover:text-[#111827]"
          >
            Detaylı Ayarlar
          </button>
          <button
            type="button"
            onClick={rejectOptional}
            className="rounded-none border border-[#E5E7EB] bg-white px-4 py-2 text-[12.5px] font-medium text-[#374151] transition hover:border-[#111827] hover:text-[#111827]"
          >
            Sadece Zorunlu
          </button>
          <button
            type="button"
            onClick={acceptAll}
            className="rounded-none bg-[#FF5400] px-4 py-2 text-[12.5px] font-semibold text-white transition hover:bg-[#E64A00]"
          >
            Tümünü Kabul Et
          </button>
        </div>
      </div>

      {showDetails && (
        <div
          className="fixed inset-0 z-[110] flex items-center justify-center bg-black/50 px-4 py-8"
          role="dialog"
          aria-modal="true"
          aria-labelledby="cookie-details-title"
        >
          <div className="w-full max-w-xl overflow-hidden border border-[#E5E7EB] bg-white shadow-xl">
            <header className="flex items-start justify-between border-b border-[#E5E7EB] px-6 py-4">
              <div>
                <h3 id="cookie-details-title" className="font-mono text-[11px] font-semibold uppercase tracking-[0.12em] text-[#111827]">
                  Çerez Tercih Ayarları
                </h3>
                <p className="mt-1 text-[12px] text-[#6B7280]">
                  Her kategori için ayrı ayrı karar verebilirsiniz.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowDetails(false)}
                aria-label="Kapat"
                className="text-[#6B7280] hover:text-[#111827]"
              >
                ×
              </button>
            </header>

            <div className="max-h-[60vh] overflow-y-auto px-6 py-4">
              {categoryInfo.map((c) => (
                <div key={c.key} className="border-b border-[#F3F4F6] py-4 last:border-b-0">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <h4 className="text-[13px] font-semibold text-[#111827]">{c.title}</h4>
                      <p className="mt-1 text-[12.5px] leading-relaxed text-[#4B5563]">{c.description}</p>
                    </div>
                    <label className={cn('relative inline-flex cursor-pointer items-center', c.disabled && 'cursor-not-allowed opacity-50')}>
                      <input
                        type="checkbox"
                        className="peer sr-only"
                        checked={state.categories[c.key]}
                        disabled={c.disabled}
                        onChange={(e) => !c.disabled && toggleCategory(c.key, e.target.checked)}
                      />
                      <span className="h-6 w-11 bg-[#E5E7EB] transition peer-checked:bg-[#FF5400]" />
                      <span className="absolute left-0.5 top-0.5 h-5 w-5 bg-white transition peer-checked:translate-x-5" />
                    </label>
                  </div>
                </div>
              ))}
            </div>

            <footer className="flex items-center justify-end gap-2 border-t border-[#E5E7EB] bg-[#F9FAFB] px-6 py-3">
              <button
                type="button"
                onClick={rejectOptional}
                className="rounded-none border border-[#E5E7EB] bg-white px-4 py-2 text-[12.5px] font-medium text-[#374151] hover:border-[#111827] hover:text-[#111827]"
              >
                Sadece Zorunlu
              </button>
              <button
                type="button"
                onClick={saveSelection}
                className="rounded-none bg-[#111827] px-4 py-2 text-[12.5px] font-semibold text-white hover:bg-[#000000]"
              >
                Tercihlerimi Kaydet
              </button>
            </footer>
          </div>
        </div>
      )}
    </div>
  );
};
