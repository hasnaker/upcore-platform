import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

export type OfferStatus = 'draft' | 'sent' | 'viewed' | 'accepted' | 'declined' | 'revoked' | 'expired';

export type OfferLetter = {
  id: string;
  tenant_id: string;
  candidate_id?: string;
  requisition_id?: string;
  employee_id?: string;
  ad_soyad: string;
  email: string;
  position_title: string;
  salary_brut?: number;
  salary_currency: string;
  start_date: string;
  expires_at: string;
  status: OfferStatus;
  sent_at?: string;
  viewed_at?: string;
  decided_at?: string;
  decline_reason?: string;
  pdf_url?: string;
  created_at: string;
  updated_at: string;
};

type OffersListResponse = {
  items: OfferLetter[];
  total: number;
  page: number;
  limit: number;
};

export function useOffers(params?: { status?: OfferStatus; page?: number; limit?: number }) {
  const qs = new URLSearchParams();
  if (params?.status) qs.set('status', params.status);
  if (params?.page !== undefined) qs.set('page', String(params.page));
  if (params?.limit !== undefined) qs.set('limit', String(params.limit));
  const url = `/api/offers${qs.toString() ? `?${qs.toString()}` : ''}`;

  return useQuery<OffersListResponse>({
    queryKey: ['offers', params],
    queryFn: async () => {
      const r = await fetch(url, { cache: 'no-store' });
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      return r.json();
    },
  });
}

export type OnboardPayload = {
  employee_no: string;
  template_name?: string;
  hire_date?: string;
};

export type OnboardResponse = {
  saga_id: string;
  status: string;
  current_step: number;
  total_steps: number;
};

export function useTriggerOnboarding(offerId: string) {
  const qc = useQueryClient();
  return useMutation<OnboardResponse, Error, OnboardPayload>({
    mutationFn: async (payload) => {
      const r = await fetch(`/api/offers/${offerId}/onboard`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!r.ok) {
        const body = await r.json().catch(() => ({}));
        throw new Error(body.message || body.error || `HTTP ${r.status}`);
      }
      return r.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['offers'] });
    },
  });
}
