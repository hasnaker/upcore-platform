import { z } from 'zod';

/**
 * Burnout risk levels (GREEN=safe → RED=critical).
 *
 * Scoring scale: 0-100 where higher is MORE at risk.
 * Thresholds are non-overlapping and cover the full [0, 100] range.
 */
export const BurnoutLevel = {
  GREEN: 'GREEN',
  YELLOW: 'YELLOW',
  ORANGE: 'ORANGE',
  RED: 'RED',
} as const;
export type BurnoutLevel = (typeof BurnoutLevel)[keyof typeof BurnoutLevel];

export const BurnoutLevelSchema = z.enum(['GREEN', 'YELLOW', 'ORANGE', 'RED']);

export const BURNOUT_LEVEL_THRESHOLDS: Record<
  BurnoutLevel,
  { min: number; max: number }
> = {
  GREEN: { min: 0, max: 29 },
  YELLOW: { min: 30, max: 54 },
  ORANGE: { min: 55, max: 74 },
  RED: { min: 75, max: 100 },
};

export function burnoutLevelFromScore(score: number): BurnoutLevel {
  if (score < 0 || score > 100) {
    throw new RangeError('Burnout score must be within [0, 100]');
  }
  if (score <= 29) return 'GREEN';
  if (score <= 54) return 'YELLOW';
  if (score <= 74) return 'ORANGE';
  return 'RED';
}
