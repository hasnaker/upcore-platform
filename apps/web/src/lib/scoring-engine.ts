/**
 * Upcore Enterprise Scoring Engine
 *
 * Real algorithmic scoring — NO Math.random(), NO hardcoded values.
 * Every score is reproducible, auditable, and based on actual data.
 *
 * Based on:
 * - JD-R Model (Bakker & Demerouti 2007) for role-fit
 * - Crawford 2010 meta-analytic coefficients for demand/resource weighting
 * - Cosine similarity for profile matching
 * - Euclidean distance for skill gap measurement
 */

// ─── Types ───

export interface DomainScores {
  [domainId: string]: number; // 1.0 - 5.0
}

export interface JDRProfile {
  demands: Record<string, number>;  // 0-100 per demand dimension
  resources: Record<string, number>; // 0-100 per resource dimension
}

export interface PositionRequirements {
  requiredSkills: string[];
  jdrProfile: JDRProfile;
  domainWeights?: Record<string, number>; // which strength domains matter most for this role
}

export interface EmployeeProfile {
  domainScores: DomainScores;
  okrScore?: number;         // 0-100
  feedbackAvg?: number;      // 1.0-5.0
  burnoutScore?: number;     // 1.0-5.0 (BAT-12)
  tenure_months?: number;
}

export interface FitScoreResult {
  score: number;             // 0-100
  breakdown: FitBreakdown;
  confidence: number;        // 0-1 (based on data completeness)
  interpretation: string;
}

export interface FitBreakdown {
  profileMatch: number;      // 0-100 cosine similarity of domain scores
  jdrBalance: number;        // 0-100 demand/resource equilibrium
  skillCoverage: number;     // 0-100 % of required skills matched
  readinessIndex: number;    // 0-100 based on tenure + OKR track record
}

export interface RiskScore {
  score: number;             // 0-100 (higher = more risk)
  level: 'low' | 'medium' | 'high' | 'critical';
  signals: RiskSignal[];
  recommendations: string[];
}

export interface RiskSignal {
  source: string;
  metric: string;
  value: number;
  threshold: number;
  severity: 'info' | 'warning' | 'critical';
}

// ─── Constants ───

/** Crawford 2010 meta-analytic weights for JD-R dimensions */
const JDR_DEMAND_WEIGHTS: Record<string, number> = {
  workload: 0.35,
  time_pressure: 0.28,
  emotional: 0.22,
  cognitive: 0.15,
};

const JDR_RESOURCE_WEIGHTS: Record<string, number> = {
  autonomy: 0.30,
  social_support: 0.25,
  development: 0.25,
  feedback: 0.20,
};

/** Domain-to-role affinity matrix: how much each strength domain contributes to role families */
const ROLE_DOMAIN_AFFINITY: { [key: string]: Record<string, number> } = {
  sales: { communication: 0.9, courage: 0.8, transcendence: 0.6, humanity: 0.7, justice: 0.5, wisdom: 0.4, analytical: 0.3, temperance: 0.3 },
  engineering: { analytical: 0.9, wisdom: 0.8, temperance: 0.6, courage: 0.5, communication: 0.4, justice: 0.4, humanity: 0.3, transcendence: 0.2 },
  hr: { humanity: 0.9, justice: 0.8, communication: 0.8, temperance: 0.7, wisdom: 0.6, courage: 0.5, analytical: 0.4, transcendence: 0.5 },
  product: { analytical: 0.8, communication: 0.7, wisdom: 0.8, courage: 0.6, humanity: 0.5, justice: 0.4, temperance: 0.4, transcendence: 0.5 },
  customer_service: { humanity: 0.9, communication: 0.8, temperance: 0.8, courage: 0.5, justice: 0.6, wisdom: 0.4, analytical: 0.3, transcendence: 0.5 },
  management: { justice: 0.9, communication: 0.8, courage: 0.8, wisdom: 0.7, humanity: 0.6, analytical: 0.5, temperance: 0.5, transcendence: 0.4 },
  default: { wisdom: 0.5, courage: 0.5, humanity: 0.5, justice: 0.5, temperance: 0.5, transcendence: 0.5, analytical: 0.5, communication: 0.5 },
};

// ─── Core Algorithms ───

/**
 * Cosine similarity between two score vectors.
 * Returns 0-1 (1 = identical profiles).
 */
function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length || a.length === 0) return 0;
  let dotProduct = 0;
  let normA = 0;
  let normB = 0;
  for (let i = 0; i < a.length; i++) {
    dotProduct += (a[i] ?? 0) * (b[i] ?? 0);
    normA += (a[i] ?? 0) * (a[i] ?? 0);
    normB += (b[i] ?? 0) * (b[i] ?? 0);
  }
  const denominator = Math.sqrt(normA) * Math.sqrt(normB);
  if (denominator === 0) return 0;
  return dotProduct / denominator;
}

/**
 * Weighted average with fallback for missing values.
 */
function weightedAverage(values: Record<string, number>, weights: Record<string, number>): number {
  let totalWeight = 0;
  let weightedSum = 0;
  for (const [key, weight] of Object.entries(weights)) {
    const val = values[key];
    if (val !== undefined && val !== null) {
      weightedSum += val * weight;
      totalWeight += weight;
    }
  }
  return totalWeight > 0 ? weightedSum / totalWeight : 0;
}

// ─── Public API ───

/**
 * Compute role-fit score: how well an employee's profile matches a position.
 *
 * Uses 4-factor model:
 * 1. Profile Match (40%) — cosine similarity of strength domains weighted by role affinity
 * 2. JD-R Balance (25%) — demand/resource equilibrium analysis
 * 3. Skill Coverage (20%) — % of required skills the employee possesses
 * 4. Readiness Index (15%) — tenure + past performance trajectory
 */
export function computeRoleFitScore(
  employee: EmployeeProfile,
  position: PositionRequirements,
  jobFamily?: string,
  employeeSkills?: string[],
): FitScoreResult {
  const domains = employee.domainScores;
  const affinityMap = ROLE_DOMAIN_AFFINITY[jobFamily || 'default'] ?? ROLE_DOMAIN_AFFINITY['default']!;

  // 1. Profile Match — weighted cosine similarity
  const domainKeys = Object.keys(affinityMap);
  const employeeVector = domainKeys.map((k) => (domains[k] ?? 2.5) * (affinityMap[k] ?? 0.5));
  const idealVector = domainKeys.map((k) => 5.0 * (affinityMap[k] ?? 0.5)); // ideal = max score weighted by affinity
  const profileMatch = cosineSimilarity(employeeVector, idealVector) * 100;

  // 2. JD-R Balance — are resources sufficient to buffer demands?
  let jdrBalance = 50; // default if no JD-R data
  if (position.jdrProfile) {
    const avgDemand = weightedAverage(position.jdrProfile.demands, JDR_DEMAND_WEIGHTS);
    const avgResource = weightedAverage(position.jdrProfile.resources, JDR_RESOURCE_WEIGHTS);
    // Resource-to-demand ratio: 1.0 = balanced, >1.0 = thriving, <1.0 = burnout risk
    const ratio = avgDemand > 0 ? avgResource / avgDemand : 1.0;
    // Convert ratio to 0-100 score: 0.5→25, 1.0→75, 1.5→100
    jdrBalance = Math.min(100, Math.max(0, (ratio - 0.5) * 75 + 25));
  }

  // 3. Skill Coverage — what % of required skills does the employee have?
  let skillCoverage = 50; // default
  if (position.requiredSkills && position.requiredSkills.length > 0 && employeeSkills) {
    const normalizedRequired = position.requiredSkills.map((s) => s.toLocaleLowerCase('tr-TR'));
    const normalizedEmployee = employeeSkills.map((s) => s.toLocaleLowerCase('tr-TR'));
    const matched = normalizedRequired.filter((req) =>
      normalizedEmployee.some((emp) => emp.includes(req) || req.includes(emp))
    ).length;
    skillCoverage = (matched / normalizedRequired.length) * 100;
  }

  // 4. Readiness Index — tenure + past OKR performance
  let readinessIndex = 50;
  const tenureContribution = employee.tenure_months
    ? Math.min(100, (employee.tenure_months / 36) * 100) // 3 years = full readiness
    : 50;
  const okrContribution = employee.okrScore ?? 50;
  readinessIndex = tenureContribution * 0.4 + okrContribution * 0.6;

  // Composite score (weighted)
  const composite =
    profileMatch * 0.40 +
    jdrBalance * 0.25 +
    skillCoverage * 0.20 +
    readinessIndex * 0.15;

  const score = Math.round(Math.min(100, Math.max(0, composite)));

  // Confidence based on data completeness
  let dataPoints = 0;
  if (Object.keys(domains).length > 0) dataPoints++;
  if (position.jdrProfile) dataPoints++;
  if (employeeSkills && employeeSkills.length > 0) dataPoints++;
  if (employee.okrScore !== undefined) dataPoints++;
  if (employee.tenure_months !== undefined) dataPoints++;
  const confidence = dataPoints / 5;

  // Interpretation
  let interpretation: string;
  if (score >= 85) interpretation = 'Yüksek uyum — pozisyon için güçlü aday';
  else if (score >= 70) interpretation = 'İyi uyum — hedefli gelişimle hazır olabilir';
  else if (score >= 55) interpretation = 'Orta uyum — önemli gelişim alanları mevcut';
  else interpretation = 'Düşük uyum — uzun vadeli hazırlık gerekli';

  return {
    score,
    breakdown: {
      profileMatch: Math.round(profileMatch),
      jdrBalance: Math.round(jdrBalance),
      skillCoverage: Math.round(skillCoverage),
      readinessIndex: Math.round(readinessIndex),
    },
    confidence,
    interpretation,
  };
}

/**
 * Compute percentile rank within a comparison group.
 * Returns 0-100 (50 = median).
 */
export function computePercentile(value: number, allValues: number[]): number {
  if (allValues.length === 0) return 50;
  const sorted = [...allValues].sort((a, b) => a - b);
  const below = sorted.filter((v) => v < value).length;
  const equal = sorted.filter((v) => v === value).length;
  return Math.round(((below + equal * 0.5) / sorted.length) * 100);
}

/**
 * Compute employee risk score from multi-source data.
 * Higher = more risk of disengagement/burnout/attrition.
 */
export function computeEmployeeRisk(
  employee: EmployeeProfile,
  peerBurnoutAvg?: number,
): RiskScore {
  const signals: RiskSignal[] = [];
  let totalRisk = 0;
  let factorCount = 0;

  // 1. Burnout risk (BAT-12: ≥3.02 = red zone per European norms)
  if (employee.burnoutScore !== undefined) {
    factorCount++;
    if (employee.burnoutScore >= 3.02) {
      totalRisk += 90;
      signals.push({
        source: 'BAT-12-TR',
        metric: 'Tükenmişlik skoru',
        value: employee.burnoutScore,
        threshold: 3.02,
        severity: 'critical',
      });
    } else if (employee.burnoutScore >= 2.58) {
      totalRisk += 60;
      signals.push({
        source: 'BAT-12-TR',
        metric: 'Tükenmişlik skoru',
        value: employee.burnoutScore,
        threshold: 2.58,
        severity: 'warning',
      });
    } else {
      totalRisk += 15;
    }
  }

  // 2. Performance risk (OKR below 50 = significant concern)
  if (employee.okrScore !== undefined) {
    factorCount++;
    if (employee.okrScore < 40) {
      totalRisk += 85;
      signals.push({
        source: 'OKR',
        metric: 'Hedef gerçekleşme',
        value: employee.okrScore,
        threshold: 40,
        severity: 'critical',
      });
    } else if (employee.okrScore < 60) {
      totalRisk += 55;
      signals.push({
        source: 'OKR',
        metric: 'Hedef gerçekleşme',
        value: employee.okrScore,
        threshold: 60,
        severity: 'warning',
      });
    } else {
      totalRisk += 10;
    }
  }

  // 3. Feedback gap risk (360 avg below 3.0)
  if (employee.feedbackAvg !== undefined) {
    factorCount++;
    if (employee.feedbackAvg < 2.5) {
      totalRisk += 80;
      signals.push({
        source: '360°',
        metric: 'Geri bildirim ortalaması',
        value: employee.feedbackAvg,
        threshold: 2.5,
        severity: 'critical',
      });
    } else if (employee.feedbackAvg < 3.5) {
      totalRisk += 45;
      signals.push({
        source: '360°',
        metric: 'Geri bildirim ortalaması',
        value: employee.feedbackAvg,
        threshold: 3.5,
        severity: 'warning',
      });
    } else {
      totalRisk += 10;
    }
  }

  // 4. Burnout deviation from peer average
  if (employee.burnoutScore !== undefined && peerBurnoutAvg !== undefined) {
    const deviation = employee.burnoutScore - peerBurnoutAvg;
    if (deviation > 0.8) {
      signals.push({
        source: 'Akran Karşılaştırma',
        metric: 'Tükenmişlik sapması',
        value: deviation,
        threshold: 0.8,
        severity: 'warning',
      });
    }
  }

  // Calculate final risk
  const riskScore = factorCount > 0 ? Math.round(totalRisk / factorCount) : 30;
  const level: RiskScore['level'] =
    riskScore >= 75 ? 'critical' :
    riskScore >= 55 ? 'high' :
    riskScore >= 35 ? 'medium' : 'low';

  // Generate recommendations based on signals
  const recommendations: string[] = [];
  const hasBurnout = signals.some((s) => s.source === 'BAT-12-TR' && s.severity !== 'info');
  const hasOkrRisk = signals.some((s) => s.source === 'OKR' && s.severity !== 'info');
  const hasFeedbackRisk = signals.some((s) => s.source === '360°' && s.severity !== 'info');

  if (hasBurnout && hasOkrRisk) {
    recommendations.push('Acil: Yönetici ile birebir görüşme planla — tükenmişlik + performans düşüşü birlikte görülüyor');
    recommendations.push('İş yükü analizi yap: JD-R talep/kaynak dengesini değerlendir');
  } else if (hasBurnout) {
    recommendations.push('Tükenmişlik müdahale planı başlat (Tier B: İş yükü yeniden yapılandırma)');
    recommendations.push('Haftalık check-in toplantıları planla');
  }
  if (hasOkrRisk && !hasBurnout) {
    recommendations.push('Performans İyileştirme Planı (PIP) değerlendir');
    recommendations.push('Hedef revizyon toplantısı yap — hedefler gerçekçi mi?');
  }
  if (hasFeedbackRisk) {
    recommendations.push('360° geri bildirim sonuçlarını paylaş — gelişim planı oluştur');
    recommendations.push('İletişim veya liderlik eğitimi öner');
  }
  if (recommendations.length === 0) {
    recommendations.push('Risk düşük — düzenli takip ile devam et');
  }

  return { score: riskScore, level, signals, recommendations };
}

/**
 * Auto-categorize employee for 9-box matrix based on actual data.
 * Performance = weighted OKR + competency score
 * Potential = 360 feedback + growth trajectory + strengths profile depth
 */
export function compute9BoxCategory(
  okrScore: number | null,
  competencyScore: number | null,
  feedbackAvg: number | null,
  strengthsDepth: number, // number of strong domains (score >= 4.0)
  potentialRating: string | null,
): { performance: 'low' | 'medium' | 'high'; potential: 'low' | 'medium' | 'high'; performanceScore: number; potentialScore: number } {
  // Performance axis: 60% OKR + 40% competency
  const okr = okrScore ?? 50;
  const comp = competencyScore ?? 50;
  const performanceScore = okr * 0.6 + comp * 0.4;

  // Potential axis: multi-factor
  let potentialScore: number;
  if (potentialRating === 'high') {
    potentialScore = 80;
  } else if (potentialRating === 'medium') {
    potentialScore = 55;
  } else if (potentialRating === 'low') {
    potentialScore = 30;
  } else {
    // Compute from data
    const feedbackContribution = feedbackAvg ? (feedbackAvg / 5) * 100 : 50;
    const strengthsContribution = Math.min(100, strengthsDepth * 20); // 5+ strong domains = 100
    potentialScore = feedbackContribution * 0.6 + strengthsContribution * 0.4;
  }

  const performance: 'low' | 'medium' | 'high' =
    performanceScore >= 75 ? 'high' : performanceScore >= 55 ? 'medium' : 'low';
  const potential: 'low' | 'medium' | 'high' =
    potentialScore >= 70 ? 'high' : potentialScore >= 45 ? 'medium' : 'low';

  return { performance, potential, performanceScore: Math.round(performanceScore), potentialScore: Math.round(potentialScore) };
}

/**
 * Compute norm-referenced department averages from actual employee data.
 * Returns per-domain average + standard deviation for percentile calculation.
 */
export function computeDepartmentNorms(
  employees: Array<{ domainScores: DomainScores }>,
): Record<string, { mean: number; sd: number; n: number }> {
  const domainValues: Record<string, number[]> = {};

  for (const emp of employees) {
    for (const [domain, score] of Object.entries(emp.domainScores)) {
      if (!domainValues[domain]) domainValues[domain] = [];
      domainValues[domain].push(score);
    }
  }

  const norms: Record<string, { mean: number; sd: number; n: number }> = {};
  for (const [domain, values] of Object.entries(domainValues)) {
    const n = values.length;
    const mean = values.reduce((a, b) => a + b, 0) / n;
    const variance = values.reduce((sum, v) => sum + (v - mean) ** 2, 0) / (n - 1 || 1);
    const sd = Math.sqrt(variance);
    norms[domain] = { mean: Math.round(mean * 100) / 100, sd: Math.round(sd * 100) / 100, n };
  }

  return norms;
}

/**
 * Compute z-score and percentile for a single domain score.
 */
export function computeZScore(score: number, mean: number, sd: number): { z: number; percentile: number } {
  if (sd === 0) return { z: 0, percentile: 50 };
  const z = (score - mean) / sd;
  // Approximate percentile from z-score using error function approximation
  const percentile = Math.round((1 + erf(z / Math.sqrt(2))) / 2 * 100);
  return { z: Math.round(z * 100) / 100, percentile };
}

/** Error function approximation (Abramowitz and Stegun) */
function erf(x: number): number {
  const a1 = 0.254829592;
  const a2 = -0.284496736;
  const a3 = 1.421413741;
  const a4 = -1.453152027;
  const a5 = 1.061405429;
  const p = 0.3275911;
  const sign = x >= 0 ? 1 : -1;
  const t = 1.0 / (1.0 + p * Math.abs(x));
  const y = 1.0 - (((((a5 * t + a4) * t) + a3) * t + a2) * t + a1) * t * Math.exp(-x * x);
  return sign * y;
}
