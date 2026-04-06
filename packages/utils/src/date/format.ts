/**
 * Turkish date formatting presets using date-fns with tr locale.
 */
import { format, formatDistanceToNow, isToday, isYesterday, isSameYear } from 'date-fns';
import { tr } from 'date-fns/locale';

type DateInput = Date | string | number;

const toDate = (d: DateInput): Date => {
  if (d instanceof Date) return d;
  return new Date(d);
};

export type DatePreset = 'short' | 'long' | 'dayMonth' | 'time' | 'iso';

const PRESET_FORMATS: Record<DatePreset, string> = {
  short: 'dd.MM.yyyy',
  long: 'd MMMM yyyy EEEE',
  dayMonth: 'd MMMM',
  time: 'HH:mm',
  iso: "yyyy-MM-dd'T'HH:mm:ss",
};

/**
 * Formats a date using Turkish locale with the given preset.
 *
 * @param d - Date, ISO string, or timestamp
 * @param preset - 'short' (04.04.2026), 'long' (4 Nisan 2026 Cumartesi),
 *                 'dayMonth' (4 Nisan), 'time' (14:30)
 *
 * @example
 * formatDateTr(new Date(2026, 3, 4), 'short') // "04.04.2026"
 * formatDateTr(new Date(2026, 3, 4), 'long')  // "4 Nisan 2026 Cumartesi"
 */
export const formatDateTr = (d: DateInput, preset: DatePreset = 'short'): string => {
  const date = toDate(d);
  const fmt = PRESET_FORMATS[preset];
  return format(date, fmt, { locale: tr });
};

/**
 * Formats a date as a relative time string in Turkish.
 *
 * @example
 * formatRelativeTr(twoHoursAgo) // "2 saat önce"
 * formatRelativeTr(yesterday)   // "dün"
 */
export const formatRelativeTr = (d: DateInput): string => {
  const date = toDate(d);

  if (isToday(date)) {
    return formatDistanceToNow(date, { locale: tr, addSuffix: true });
  }

  if (isYesterday(date)) {
    return 'dün';
  }

  if (isSameYear(date, new Date())) {
    return formatDateTr(date, 'dayMonth');
  }

  return formatDateTr(date, 'short');
};

/**
 * Formats a date range in Turkish.
 *
 * @example
 * formatDateRangeTr(start, end) // "4 Nisan – 10 Nisan 2026"
 * // same month:                // "4 – 10 Nisan 2026"
 */
export const formatDateRangeTr = (start: DateInput, end: DateInput): string => {
  const s = toDate(start);
  const e = toDate(end);

  const sameYear = s.getFullYear() === e.getFullYear();
  const sameMonth = sameYear && s.getMonth() === e.getMonth();

  if (sameMonth) {
    return `${format(s, 'd', { locale: tr })} \u2013 ${format(e, 'd MMMM yyyy', { locale: tr })}`;
  }

  if (sameYear) {
    return `${format(s, 'd MMMM', { locale: tr })} \u2013 ${format(e, 'd MMMM yyyy', { locale: tr })}`;
  }

  return `${formatDateTr(s, 'short')} \u2013 ${formatDateTr(e, 'short')}`;
};
