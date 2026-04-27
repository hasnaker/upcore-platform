/**
 * KVKK rıza yöneticisi — sayfa-özel hook'lar.
 *
 * Üst katman hook'ları (`useKvkkConsents`, `useKvkkConsentHistory`,
 * `useUpsertKvkkConsent`) zaten `@/hooks/useKvkkConsents` altında.
 * Bu dosya o hook'ları yeniden ihraç eder + sayfaya özel türetilmiş
 * davranışları (decisions Map'i, privacy modal state'i) sarmalar.
 */
'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  useKvkkConsentHistory,
  useKvkkConsents,
  useUpsertKvkkConsent,
} from '@/hooks/useKvkkConsents';
import type { ConsentType, DataConsent } from './types';
import { PRIVACY_ACCEPTANCE_STORAGE_KEY } from './types';

export {
  useKvkkConsentHistory,
  useKvkkConsents,
  useUpsertKvkkConsent,
};

/**
 * useConsentDecisions: catalog ile birlikte gelen ham consent dizisini
 * `consent_type → en güncel DataConsent` şeklinde Map'e indirir.
 *
 * Aynı tip için birden fazla kayıt varsa version'u en yüksek olan
 * korunur (versiyonlama yapısı `useUpsertKvkkConsent`'in immutable
 * append davranışıyla uyumlu).
 */
export function useConsentDecisions(consents: DataConsent[] | undefined) {
  return useMemo(() => {
    const map = new Map<ConsentType, DataConsent>();
    for (const c of consents ?? []) {
      const existing = map.get(c.consent_type);
      if (!existing || c.version > existing.version) {
        map.set(c.consent_type, c);
      }
    }
    return map;
  }, [consents]);
}

/**
 * usePrivacyAcceptance: localStorage tabanlı aydınlatma kabul state'i.
 *
 * SSR-safe: ilk render'da window erişimi yok, bu yüzden default false ile
 * başlar ve effect içinde gerçek değer hidrate edilir. Gating logic
 * (toggle disabled iken modal açıkken) sayfa shell'inde uygulanır.
 */
export function usePrivacyAcceptance(): {
  showModal: boolean;
  accept: () => void;
  decline: () => void;
  open: () => void;
} {
  const [showModal, setShowModal] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const stored = window.localStorage.getItem(PRIVACY_ACCEPTANCE_STORAGE_KEY);
    if (stored !== 'accepted') {
      setShowModal(true);
    }
  }, []);

  return {
    showModal,
    accept: () => {
      try {
        window.localStorage.setItem(PRIVACY_ACCEPTANCE_STORAGE_KEY, 'accepted');
      } catch {
        // Quota dolu / private mode — modal kapansın yine de.
      }
      setShowModal(false);
    },
    decline: () => setShowModal(false),
    open: () => setShowModal(true),
  };
}
