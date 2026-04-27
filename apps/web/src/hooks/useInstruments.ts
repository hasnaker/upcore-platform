'use client';

import { useAuth } from '@clerk/nextjs';
import { useQuery } from '@tanstack/react-query';
import { apiFetch } from '@/lib/api-client';

// ============================================================================
// Psychometric Instrument Catalog — peer-reviewed ölçekler
// GET /api/v1/score/instruments           → özet liste
// GET /api/v1/score/instruments/{code}    → tam item bankası
// ============================================================================

export interface InstrumentItem {
  code: string;
  order_index: number;
  question_tr: string;
  question_en?: string | null;
  scale_min: number;
  scale_max: number;
  dimension?: string | null;
  reverse_scored: boolean;
}

export interface Instrument {
  code: string;
  name_tr: string;
  name_en?: string | null;
  description_tr: string;
  citation: string;
  item_count: number;
  estimated_duration_min: number;
  language: string;
  scale_type: 'likert_5' | 'likert_7' | 'frequency_5';
  items: InstrumentItem[];
}

/** Kullanılabilir tüm ölçeklerin özet listesi. */
export function useInstruments() {
  const { getToken } = useAuth();

  return useQuery<Instrument[], Error>({
    queryKey: ['instruments', 'list'],
    staleTime: 60 * 60_000, // 1 saat — bu liste nadiren değişir
    queryFn: async () => {
      const token = await getToken({ template: 'upcore' });
      return apiFetch<Instrument[]>('/api/v1/score/instruments', {
        method: 'GET',
        token,
      });
    },
  });
}

/** Bir ölçeğin tam item bankası. */
export function useInstrument(code: string | null | undefined) {
  const { getToken } = useAuth();

  return useQuery<Instrument, Error>({
    queryKey: ['instruments', 'detail', code],
    enabled: !!code,
    staleTime: 60 * 60_000,
    queryFn: async () => {
      const token = await getToken({ template: 'upcore' });
      return apiFetch<Instrument>(`/api/v1/score/instruments/${code}`, {
        method: 'GET',
        token,
      });
    },
  });
}
