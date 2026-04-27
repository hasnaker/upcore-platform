/**
 * UpCap-TR portal — domain tipleri, item bankası ve etiket sözlükleri.
 *
 * Item bank UpCap-TR v1.0 (CPC-12 CC-BY çevirisi). 12 madde × 3 faktör
 * (umut-iyimserlik, dirençlilik, öz-yeterlik) — her faktörde 4 madde
 * (3 düz, 1 ters puanlı).
 */

export type Sector = 'public_sector' | 'holding' | 'sme' | 'health' | 'education';

export interface FactorBreakdown {
  factor: 'hope_optimism' | 'resilience' | 'self_efficacy';
  raw_mean: number;
  items_count: number;
}

export interface SectorComparison {
  sector: string;
  sector_mean: number;
  sector_sd: number;
  sector_percentile: number;
  delta_from_sector_mean: number;
}

export interface UpCapScoreResponse {
  scale_code: string;
  scale_version: string;
  composite_score: number;
  factors: Record<string, number>;
  factor_breakdown: FactorBreakdown[];
  percentile: number;
  t_score: number;
  interpretation: string;
  sector_comparison: SectorComparison | null;
  validated: boolean;
  disclaimer: string;
  scored_at: string;
}

export interface NormsResponse {
  scale_code: string;
  scale_version: string;
  validated: boolean;
  overall: Record<string, unknown>;
  sectors: Record<string, { mean_score: number; sd_score: number }>;
  age_bands: Record<string, { mean_score: number; sd_score: number }>;
  disclaimer: string;
}

export interface UpCapItem {
  code: string;
  factor: 'hope_optimism' | 'resilience' | 'self_efficacy';
  text: string;
  reverse?: boolean;
}

// UpCap-TR v1.0 — 12 madde. Sıra deliberate: faktör tabanlı blok yerine
// kullanıcı algısını dağıtmak için karıştırılmış (P11-PSY: response set
// bias azaltma).
export const ITEMS: readonly UpCapItem[] = [
  { code: 'upcap_01', factor: 'hope_optimism', text: 'İş hedeflerime ulaşmak için şu an birçok yol bulabilirim.' },
  { code: 'upcap_02', factor: 'hope_optimism', text: 'Şu an iş hedeflerimi kararlılıkla takip ediyorum.' },
  { code: 'upcap_03', factor: 'hope_optimism', text: 'İşimle ilgili olarak her zaman işlerin iyi tarafını görürüm.' },
  { code: 'upcap_04', factor: 'hope_optimism', text: 'İşimde işlerin benim için her zaman ters gideceğini düşünürüm.', reverse: true },
  { code: 'upcap_05', factor: 'resilience', text: 'İşimdeki zorlukların üstesinden genellikle bir yolla gelebilirim.' },
  { code: 'upcap_06', factor: 'resilience', text: 'İşteki aksiliklerden sonra toparlanmam uzun sürmez.' },
  { code: 'upcap_07', factor: 'resilience', text: 'İş yerinde stresli durumlarla başa çıkabilirim çünkü daha önce de benzer zorluklar yaşadım.' },
  { code: 'upcap_08', factor: 'resilience', text: 'İşte bir terslik olduğunda uzun süre toparlanamıyorum.', reverse: true },
  { code: 'upcap_09', factor: 'self_efficacy', text: 'İşimde karmaşık bir problemi analiz etmede kendime güvenirim.' },
  { code: 'upcap_10', factor: 'self_efficacy', text: 'Yönetimle strateji tartışmasında kendi görüşümü savunabilirim.' },
  { code: 'upcap_11', factor: 'self_efficacy', text: 'Yeni bir müşteri veya paydaşla görüşmede kendime güvenirim.' },
  { code: 'upcap_12', factor: 'self_efficacy', text: 'İşimde kendimi yeterli hissetmediğim pek çok durum vardır.', reverse: true },
];

export const FACTOR_LABELS: Record<string, string> = {
  hope_optimism: 'Umut-İyimserlik',
  resilience: 'Dirençlilik',
  self_efficacy: 'Öz-Yeterlik',
};

export const SECTOR_LABELS: Record<Sector, string> = {
  public_sector: 'Kamu / Belediye',
  holding: 'Holding',
  sme: 'KOBİ',
  health: 'Sağlık',
  education: 'Eğitim',
};

// Likert anchors (1-6 forced-choice, no "neutral" — JD-R best practice).
export const ANCHORS = [
  '1 · Kesinlikle katılmıyorum',
  '2 · Katılmıyorum',
  '3 · Biraz katılmıyorum',
  '4 · Biraz katılıyorum',
  '5 · Katılıyorum',
  '6 · Kesinlikle katılıyorum',
];
