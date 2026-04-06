/**
 * UpStrengths-TR Scoring Engine
 * Calculates domain scores from 24-item assessment responses
 * Produces ranked strengths, shadow strengths, and weakness areas
 */

import { STRENGTH_DOMAINS, ASSESSMENT_QUESTIONS, DEVELOPMENT_SUGGESTIONS } from './strengths-data';

export interface DomainScore {
  domainId: string;
  name_tr: string;
  name_en: string;
  score: number;
  rank: number;
  color: string;
  description_tr: string;
  facets: { name: string; score: number }[];
}

export interface StrengthsResult {
  domains: DomainScore[];
  top5: DomainScore[];
  shadow: DomainScore[];
  weaknesses: DomainScore[];
  overallProfile: number; // 0-100
  roleFitScore: number; // 0-100
  developmentSuggestions: { domain: string; suggestions: string[] }[];
  timestamp: string;
}

export type AssessmentAnswers = Record<number, number>; // questionId -> score (1-5)

/**
 * Calculate strengths results from assessment answers
 */
export function calculateStrengths(answers: AssessmentAnswers): StrengthsResult {
  // Group questions by domain
  const domainQuestions: Record<string, { questionId: number; score: number; facet: string }[]> = {};

  for (const question of ASSESSMENT_QUESTIONS) {
    const score = answers[question.id];
    if (score === undefined) continue;

    if (!domainQuestions[question.domainId]) {
      domainQuestions[question.domainId] = [];
    }
    domainQuestions[question.domainId]!.push({
      questionId: question.id,
      score,
      facet: question.facet,
    });
  }

  // Calculate domain scores
  const domainScores: DomainScore[] = STRENGTH_DOMAINS.map((domain) => {
    const questions = domainQuestions[domain.id] ?? [];
    const totalScore = questions.reduce((sum, q) => sum + q.score, 0);
    const avgScore = questions.length > 0 ? totalScore / questions.length : 0;

    const facets = domain.facets.map((facetName) => {
      const facetQuestion = questions.find((q) => q.facet === facetName);
      return {
        name: facetName,
        score: facetQuestion?.score ?? 0,
      };
    });

    return {
      domainId: domain.id,
      name_tr: domain.name_tr,
      name_en: domain.name_en,
      score: Math.round(avgScore * 100) / 100,
      rank: 0,
      color: domain.color,
      description_tr: domain.description_tr,
      facets,
    };
  });

  // Sort by score descending and assign ranks
  domainScores.sort((a, b) => b.score - a.score);
  domainScores.forEach((ds, index) => {
    ds.rank = index + 1;
  });

  // Top 5 (signature strengths)
  const top5 = domainScores.slice(0, 5);

  // Shadow strengths (#6-#7, as there are only 8 domains)
  const shadow = domainScores.slice(5, 7);

  // Weaknesses (bottom 1-3, only those below 3.0)
  const weaknesses = domainScores
    .slice(-3)
    .filter((d) => d.score < 3.0)
    .reverse();

  // Overall profile completeness (based on answer count)
  const totalQuestions = ASSESSMENT_QUESTIONS.length;
  const answeredQuestions = Object.keys(answers).length;
  const overallProfile = Math.round((answeredQuestions / totalQuestions) * 100);

  // Role fit score — deterministic computation from domain profile
  // Uses weighted domain contribution: top domains contribute more
  const avgTopScore = top5.reduce((sum, d) => sum + d.score, 0) / top5.length;
  const avgAllScore = domainScores.reduce((sum, d) => sum + d.score, 0) / domainScores.length;
  const profileDepth = domainScores.filter((d) => d.score >= 4.0).length; // strong domains
  const profileBreadth = domainScores.filter((d) => d.score >= 3.0).length; // competent domains
  // Formula: 50% top-5 strength, 25% overall average, 15% depth, 10% breadth
  const roleFitScore = Math.min(100, Math.round(
    (avgTopScore / 5) * 100 * 0.50 +
    (avgAllScore / 5) * 100 * 0.25 +
    (profileDepth / 8) * 100 * 0.15 +
    (profileBreadth / 8) * 100 * 0.10
  ));

  // Development suggestions for top 5
  const developmentSuggestions = top5.map((domain) => ({
    domain: domain.name_tr,
    suggestions: DEVELOPMENT_SUGGESTIONS[domain.domainId] ?? [],
  }));

  return {
    domains: domainScores,
    top5,
    shadow,
    weaknesses,
    overallProfile,
    roleFitScore,
    developmentSuggestions,
    timestamp: new Date().toISOString(),
  };
}

/**
 * Save results to localStorage
 */
export function saveResults(results: StrengthsResult): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem('upcore_strengths_result', JSON.stringify(results));
}

/**
 * Load results from localStorage
 */
export function loadResults(): StrengthsResult | null {
  if (typeof window === 'undefined') return null;
  try {
    const data = localStorage.getItem('upcore_strengths_result');
    if (!data) return null;
    return JSON.parse(data) as StrengthsResult;
  } catch {
    return null;
  }
}

/**
 * Save answers to localStorage (for persistence during assessment)
 */
export function saveAnswers(answers: AssessmentAnswers): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem('upcore_strengths_answers', JSON.stringify(answers));
}

/**
 * Load answers from localStorage
 */
export function loadAnswers(): AssessmentAnswers | null {
  if (typeof window === 'undefined') return null;
  try {
    const data = localStorage.getItem('upcore_strengths_answers');
    if (!data) return null;
    return JSON.parse(data) as AssessmentAnswers;
  } catch {
    return null;
  }
}

/**
 * Clear all strengths data from localStorage
 */
export function clearStrengthsData(): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem('upcore_strengths_result');
  localStorage.removeItem('upcore_strengths_answers');
}

/**
 * Get score label in Turkish
 */
export function getScoreLabel(score: number): string {
  if (score >= 4.5) return 'Olağanüstü';
  if (score >= 4.0) return 'Çok Güçlü';
  if (score >= 3.5) return 'Güçlü';
  if (score >= 3.0) return 'Orta';
  if (score >= 2.5) return 'Gelişim Alanı';
  return 'Dikkat Gerektiren';
}

/**
 * Get score color
 */
export function getScoreColor(score: number): string {
  if (score >= 4.0) return '#059669';
  if (score >= 3.0) return '#D97706';
  return '#DC2626';
}
