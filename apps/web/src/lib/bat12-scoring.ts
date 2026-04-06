/**
 * BAT-12-TR Scoring Module
 *
 * Burnout Assessment Tool — 12-item Turkish version
 * Adapted by Koçak, Gençay & Schaufeli (2022)
 *
 * 4 subscales (3 items each):
 *   - Tükenmişlik / Exhaustion (items 1-3)
 *   - Zihinsel Uzaklaşma / Mental Distance (items 4-6)
 *   - Bilişsel Bozulma / Cognitive Impairment (items 7-9)
 *   - Duygusal Bozulma / Emotional Impairment (items 10-12)
 *
 * Each item scored 1-5 (Hiçbir zaman – Her zaman)
 * Subscale score = mean of 3 items
 * Total score = mean of 4 subscale means
 *
 * Cut-off thresholds (provisional European norms, Schaufeli 2023):
 *   Green  ≤ 2.58  — Low risk
 *   Amber  2.59-3.01 — Moderate risk
 *   Red    ≥ 3.02  — High risk
 */

/** The 12 BAT-12-TR items in Turkish (Koçak, Gençay & Schaufeli, 2022) */
export const BAT12_ITEMS = [
  // Tükenmişlik / Exhaustion (1-3)
  { id: 1, subscale: 'exhaustion' as const, text: 'İşimde kendimi zihinsel olarak tükenmiş hissediyorum.' },
  { id: 2, subscale: 'exhaustion' as const, text: 'İş günümün sonunda enerjimin tamamen bittiğini hissediyorum.' },
  { id: 3, subscale: 'exhaustion' as const, text: 'İşe başlamadan önce bile yorgun hissediyorum.' },

  // Zihinsel Uzaklaşma / Mental Distance (4-6)
  { id: 4, subscale: 'mentalDistance' as const, text: 'İşimle ilgili her şeyi otomatik pilotta yapıyorum.' },
  { id: 5, subscale: 'mentalDistance' as const, text: 'İşimin amacını sorgulamaya başladım.' },
  { id: 6, subscale: 'mentalDistance' as const, text: 'İşimle aramda duygusal bir mesafe hissediyorum.' },

  // Bilişsel Bozulma / Cognitive Impairment (7-9)
  { id: 7, subscale: 'cognitive' as const, text: 'İş yerinde konsantre olmakta zorlanıyorum.' },
  { id: 8, subscale: 'cognitive' as const, text: 'İşimde düşünce hatası yapıyorum.' },
  { id: 9, subscale: 'cognitive' as const, text: 'İşimde unutkanlık yaşıyorum.' },

  // Duygusal Bozulma / Emotional Impairment (10-12)
  { id: 10, subscale: 'emotional' as const, text: 'İş yerinde duygularımı kontrol edemediğimi hissediyorum.' },
  { id: 11, subscale: 'emotional' as const, text: 'İşimdeki durumlara orantısız duygusal tepkiler veriyorum.' },
  { id: 12, subscale: 'emotional' as const, text: 'İş yerinde beklenmedik şekilde üzüntü veya sinir hissediyorum.' },
] as const;

/** Likert scale labels */
export const LIKERT_OPTIONS = [
  { value: 1, label: 'Hiçbir zaman' },
  { value: 2, label: 'Nadiren' },
  { value: 3, label: 'Bazen' },
  { value: 4, label: 'Sık sık' },
  { value: 5, label: 'Her zaman' },
] as const;

/** Risk level thresholds (provisional European norms, Schaufeli 2023) */
export const THRESHOLDS = {
  green: 2.58,
  amber: 3.01,
} as const;

export type RiskLevel = 'green' | 'amber' | 'red';

export type SubscaleKey = 'exhaustion' | 'mentalDistance' | 'cognitive' | 'emotional';

export interface SubscaleResult {
  key: SubscaleKey;
  label: string;
  labelTR: string;
  mean: number;
  level: RiskLevel;
  items: number[];
}

export interface BAT12Result {
  subscales: Record<SubscaleKey, SubscaleResult>;
  total: number;
  level: RiskLevel;
}

const SUBSCALE_META: Record<SubscaleKey, { label: string; labelTR: string }> = {
  exhaustion: { label: 'Exhaustion', labelTR: 'Tükenmişlik' },
  mentalDistance: { label: 'Mental Distance', labelTR: 'Zihinsel Uzaklaşma' },
  cognitive: { label: 'Cognitive Impairment', labelTR: 'Bilişsel Bozulma' },
  emotional: { label: 'Emotional Impairment', labelTR: 'Duygusal Bozulma' },
};

const SUBSCALE_ITEM_RANGES: Record<SubscaleKey, [number, number, number]> = {
  exhaustion: [0, 1, 2],
  mentalDistance: [3, 4, 5],
  cognitive: [6, 7, 8],
  emotional: [9, 10, 11],
};

/** Determine risk level from a mean score */
export const getRiskLevel = (score: number): RiskLevel => {
  if (score <= THRESHOLDS.green) return 'green';
  if (score <= THRESHOLDS.amber) return 'amber';
  return 'red';
};

/** Hex colors for each risk level */
export const RISK_COLORS: Record<RiskLevel, string> = {
  green: '#059669',
  amber: '#D97706',
  red: '#DC2626',
};

/** Background colors for each risk level */
export const RISK_BG_COLORS: Record<RiskLevel, string> = {
  green: '#D1FAE5',
  amber: '#FEF3C7',
  red: '#FEE2E2',
};

/** Turkish labels for each risk level */
export const RISK_LABELS: Record<RiskLevel, string> = {
  green: 'Düşük Risk',
  amber: 'Orta Risk',
  red: 'Yüksek Risk',
};

/**
 * Score the BAT-12-TR from 12 integer responses (each 1-5).
 *
 * @param responses — Array of 12 integers, each in [1, 5].
 *   Index 0 = item 1, index 11 = item 12.
 * @returns BAT12Result with subscale scores and total.
 * @throws Error if input is invalid.
 */
export const scoreBAT12 = (responses: number[]): BAT12Result => {
  if (responses.length !== 12) {
    throw new Error(`BAT-12-TR requires exactly 12 responses, got ${responses.length}`);
  }

  for (let i = 0; i < 12; i++) {
    const v = responses[i] ?? 0;
    if (!Number.isInteger(v) || v < 1 || v > 5) {
      throw new Error(`Response for item ${i + 1} must be an integer 1-5, got ${v}`);
    }
  }

  const subscales = {} as Record<SubscaleKey, SubscaleResult>;

  for (const [key, indices] of Object.entries(SUBSCALE_ITEM_RANGES) as [SubscaleKey, [number, number, number]][]) {
    const items = indices.map((i) => responses[i] ?? 0);
    const mean = items.reduce((a: number, b: number) => a + b, 0) / 3;
    const meta = SUBSCALE_META[key];
    subscales[key] = {
      key,
      label: meta.label,
      labelTR: meta.labelTR,
      mean: Math.round(mean * 100) / 100,
      level: getRiskLevel(mean),
      items,
    };
  }

  const total =
    (subscales.exhaustion.mean +
      subscales.mentalDistance.mean +
      subscales.cognitive.mean +
      subscales.emotional.mean) /
    4;

  const roundedTotal = Math.round(total * 100) / 100;

  return {
    subscales,
    total: roundedTotal,
    level: getRiskLevel(roundedTotal),
  };
};
