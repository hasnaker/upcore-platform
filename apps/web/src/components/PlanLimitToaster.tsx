'use client';

/**
 * PlanLimitToaster — 402 Payment Required yanıtlarını yakalar ve kullanıcıya
 * "Planı yükselt" CTA'lı bir toast gösterir.
 *
 * Tüketim:
 *  - Root provider'larda `<PlanLimitToaster />` mount edilir.
 *  - `src/lib/api-client.ts` 402 gelince `upcore:plan-limit` custom event
 *    dispatch eder, bu component onu dinler.
 */

import { useEffect } from 'react';
import { toast } from 'sonner';

interface PlanLimitPayload {
  error?: string;
  code?: string;
  message?: string;
  message_tr?: string;
  resource?: string;
  used?: number;
  limit?: number;
  upgrade_url?: string;
  retry_after_seconds?: number;
  required_plan?: string;
}

interface PlanLimitEvent extends CustomEvent {
  detail: {
    payload: PlanLimitPayload;
    path: string;
    status: number;
  };
}

export const PlanLimitToaster = () => {
  useEffect(() => {
    const handler = (e: Event) => {
      const event = e as PlanLimitEvent;
      const p = event.detail?.payload ?? {};
      const title = p.message_tr || p.message || 'Plan limitine ulaştınız';
      const upgradeUrl = p.upgrade_url || '/panel/ayarlar/abonelik';

      toast.warning(title, {
        duration: 8000,
        description:
          p.resource && p.limit
            ? `${p.resource}: ${p.used ?? '?'} / ${p.limit}${p.required_plan ? ` — ${p.required_plan} plan gerekiyor` : ''}`
            : undefined,
        action: {
          label: 'Planı Yükselt',
          onClick: () => {
            if (typeof window !== 'undefined') {
              window.location.href = upgradeUrl;
            }
          },
        },
      });
    };

    window.addEventListener('upcore:plan-limit', handler as EventListener);
    return () => window.removeEventListener('upcore:plan-limit', handler as EventListener);
  }, []);

  return null;
};
