/**
 * ISO week helpers (Monday-start) for burnout weekly signal aggregation.
 */
import { startOfWeek, endOfWeek, getISOWeek, getISOWeekYear } from 'date-fns';

/**
 * Returns the start of the ISO week (Monday) for the given date.
 */
export const startOfWeekTr = (d: Date): Date => {
  return startOfWeek(d, { weekStartsOn: 1 });
};

/**
 * Returns the end of the ISO week (Sunday, 23:59:59.999) for the given date.
 */
export const endOfWeekTr = (d: Date): Date => {
  return endOfWeek(d, { weekStartsOn: 1 });
};

/**
 * Returns the ISO week key as "YYYY-WNN".
 *
 * @example
 * weekKey(new Date(2026, 3, 4)) // "2026-W14"
 */
export const weekKey = (d: Date): string => {
  const year = getISOWeekYear(d);
  const week = getISOWeek(d);
  return `${year}-W${String(week).padStart(2, '0')}`;
};
