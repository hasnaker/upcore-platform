'use client';

/**
 * UpCap-TR portal hook'ları — norms fetch + score mutation.
 *
 * API katmanı `/api/upcap-tr/score` endpoint'i altında:
 *   - GET: norms (sektör + yaş bandı ortalamaları + validation flag).
 *   - POST: scoring (responses + sector → composite + percentile + T).
 *
 * Hata mesajları FastAPI tarafından `error` veya `detail` field'ında
 * dönebiliyor; iki şekli de destekliyoruz.
 */
import { useMutation, useQuery } from '@tanstack/react-query';
import type { NormsResponse, Sector, UpCapScoreResponse } from './types';

export function useUpcapNorms() {
  return useQuery<NormsResponse>({
    queryKey: ['upcap-tr', 'norms'],
    queryFn: async () => {
      const r = await fetch('/api/upcap-tr/score');
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      return r.json();
    },
  });
}

interface ScoreInput {
  responses: Record<string, number>;
  sector: Sector | '';
}

export function useScoreUpcap(onSuccess: (data: UpCapScoreResponse) => void) {
  return useMutation<UpCapScoreResponse, Error, ScoreInput>({
    mutationFn: async ({ responses, sector }) => {
      const r = await fetch('/api/upcap-tr/score', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ responses, sector: sector || null }),
      });
      const data = await r.json();
      if (!r.ok) {
        throw new Error(data?.error || data?.detail || `HTTP ${r.status}`);
      }
      return data;
    },
    onSuccess,
  });
}
