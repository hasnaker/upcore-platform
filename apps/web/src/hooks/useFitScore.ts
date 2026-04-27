'use client';

import { useAuth } from '@clerk/nextjs';
import { useMutation } from '@tanstack/react-query';
import { apiFetch } from '@/lib/api-client';

// ============================================================================
// JD-R Fit Score — psychometric-scoring /api/v1/score/fit
// Pozisyon profili (6 talep + 6 kaynak) ↔ aday profili uyum skoru.
// ============================================================================

export interface JDRProfile {
  demands: Record<string, number>;
  resources: Record<string, number>;
}

export interface FitRequest {
  position: JDRProfile;
  candidate: JDRProfile;
  candidate_name?: string;
  position_title?: string;
}

export interface DimensionGap {
  key: string;
  label_tr: string;
  kind: 'demand' | 'resource';
  position: number;
  candidate: number;
  gap: number;
  severity: 'good_fit' | 'minor' | 'moderate' | 'critical';
}

export interface FitResponse {
  fit_score: number;
  demands_fit: number;
  resources_fit: number;
  risk_level: 'low' | 'medium' | 'high';
  risk_reasoning_tr: string;
  dimensions: DimensionGap[];
  interview_questions_tr: string[];
}

export function useComputeFit() {
  const { getToken } = useAuth();

  return useMutation<FitResponse, Error, FitRequest>({
    mutationFn: async (input) => {
      const token = await getToken({ template: 'upcore' });
      return apiFetch<FitResponse>('/api/v1/score/fit', {
        method: 'POST',
        body: input,
        token,
      });
    },
  });
}
