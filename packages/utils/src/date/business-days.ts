/**
 * Turkish business day calculations.
 *
 * Excludes weekends (Saturday/Sunday) and official Turkish public holidays
 * (resmi tatiller). Holiday dates for 2026-2028 are included.
 *
 * Religious holidays (Ramazan & Kurban Bayramı) shift each year per Hijri calendar.
 */
import { addDays, differenceInCalendarDays, isWeekend } from 'date-fns';

interface TurkishHoliday {
  date: string;
  name: string;
}

/** Official Turkish public holidays for 2026. */
export const TURKISH_HOLIDAYS_2026: TurkishHoliday[] = [
  { date: '2026-01-01', name: 'Yılbaşı' },
  { date: '2026-03-20', name: 'Ramazan Bayramı (1. gün)' },
  { date: '2026-03-21', name: 'Ramazan Bayramı (2. gün)' },
  { date: '2026-03-22', name: 'Ramazan Bayramı (3. gün)' },
  { date: '2026-04-23', name: 'Ulusal Egemenlik ve Çocuk Bayramı' },
  { date: '2026-05-01', name: 'Emek ve Dayanışma Günü' },
  { date: '2026-05-19', name: 'Atatürk\'ü Anma, Gençlik ve Spor Bayramı' },
  { date: '2026-05-27', name: 'Kurban Bayramı (1. gün)' },
  { date: '2026-05-28', name: 'Kurban Bayramı (2. gün)' },
  { date: '2026-05-29', name: 'Kurban Bayramı (3. gün)' },
  { date: '2026-05-30', name: 'Kurban Bayramı (4. gün)' },
  { date: '2026-07-15', name: 'Demokrasi ve Millî Birlik Günü' },
  { date: '2026-08-30', name: 'Zafer Bayramı' },
  { date: '2026-10-29', name: 'Cumhuriyet Bayramı' },
];

/** Official Turkish public holidays for 2027. */
export const TURKISH_HOLIDAYS_2027: TurkishHoliday[] = [
  { date: '2027-01-01', name: 'Yılbaşı' },
  { date: '2027-03-09', name: 'Ramazan Bayramı (1. gün)' },
  { date: '2027-03-10', name: 'Ramazan Bayramı (2. gün)' },
  { date: '2027-03-11', name: 'Ramazan Bayramı (3. gün)' },
  { date: '2027-04-23', name: 'Ulusal Egemenlik ve Çocuk Bayramı' },
  { date: '2027-05-01', name: 'Emek ve Dayanışma Günü' },
  { date: '2027-05-16', name: 'Kurban Bayramı (1. gün)' },
  { date: '2027-05-17', name: 'Kurban Bayramı (2. gün)' },
  { date: '2027-05-18', name: 'Kurban Bayramı (3. gün)' },
  { date: '2027-05-19', name: 'Atatürk\'ü Anma, Gençlik ve Spor Bayramı / Kurban Bayramı (4. gün)' },
  { date: '2027-07-15', name: 'Demokrasi ve Millî Birlik Günü' },
  { date: '2027-08-30', name: 'Zafer Bayramı' },
  { date: '2027-10-29', name: 'Cumhuriyet Bayramı' },
];

/** Official Turkish public holidays for 2028. */
export const TURKISH_HOLIDAYS_2028: TurkishHoliday[] = [
  { date: '2028-01-01', name: 'Yılbaşı' },
  { date: '2028-02-27', name: 'Ramazan Bayramı (1. gün)' },
  { date: '2028-02-28', name: 'Ramazan Bayramı (2. gün)' },
  { date: '2028-02-29', name: 'Ramazan Bayramı (3. gün)' },
  { date: '2028-04-23', name: 'Ulusal Egemenlik ve Çocuk Bayramı' },
  { date: '2028-05-01', name: 'Emek ve Dayanışma Günü' },
  { date: '2028-05-05', name: 'Kurban Bayramı (1. gün)' },
  { date: '2028-05-06', name: 'Kurban Bayramı (2. gün)' },
  { date: '2028-05-07', name: 'Kurban Bayramı (3. gün)' },
  { date: '2028-05-08', name: 'Kurban Bayramı (4. gün)' },
  { date: '2028-05-19', name: 'Atatürk\'ü Anma, Gençlik ve Spor Bayramı' },
  { date: '2028-07-15', name: 'Demokrasi ve Millî Birlik Günü' },
  { date: '2028-08-30', name: 'Zafer Bayramı' },
  { date: '2028-10-29', name: 'Cumhuriyet Bayramı' },
];

/** All known holidays indexed by date string for O(1) lookup. */
const ALL_HOLIDAYS = new Set<string>([
  ...TURKISH_HOLIDAYS_2026.map((h) => h.date),
  ...TURKISH_HOLIDAYS_2027.map((h) => h.date),
  ...TURKISH_HOLIDAYS_2028.map((h) => h.date),
]);

const toIsoDateStr = (d: Date): string => {
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
};

/**
 * Checks if a given date is an official Turkish public holiday.
 */
export const isTurkishHoliday = (d: Date): boolean => {
  return ALL_HOLIDAYS.has(toIsoDateStr(d));
};

/**
 * Checks if a given date is a Turkish business day (not weekend, not holiday).
 */
export const isBusinessDay = (d: Date): boolean => {
  return !isWeekend(d) && !isTurkishHoliday(d);
};

/**
 * Counts business days between two dates (inclusive of start, exclusive of end).
 */
export const businessDaysBetween = (start: Date, end: Date): number => {
  const totalDays = differenceInCalendarDays(end, start);
  if (totalDays <= 0) return 0;

  let count = 0;
  let current = new Date(start);

  for (let i = 0; i < totalDays; i++) {
    if (isBusinessDay(current)) {
      count++;
    }
    current = addDays(current, 1);
  }

  return count;
};

/**
 * Adds the specified number of business days to a date.
 * Skips weekends and Turkish holidays.
 */
export const addBusinessDaysTr = (start: Date, days: number): Date => {
  let current = new Date(start);
  let remaining = days;

  while (remaining > 0) {
    current = addDays(current, 1);
    if (isBusinessDay(current)) {
      remaining--;
    }
  }

  return current;
};
