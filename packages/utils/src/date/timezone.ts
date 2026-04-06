/**
 * Europe/Istanbul timezone conversions.
 *
 * Turkey is permanently on TRT (UTC+3) since 2016 — no DST changes.
 */
import { toZonedTime, fromZonedTime } from 'date-fns-tz';

/** Turkey's timezone identifier. */
export const TR_TIMEZONE = 'Europe/Istanbul' as const;

/**
 * Converts a UTC date to Europe/Istanbul (TRT, UTC+3).
 */
export const toTrZone = (d: Date): Date => {
  return toZonedTime(d, TR_TIMEZONE);
};

/**
 * Converts a date assumed to be in Europe/Istanbul to UTC.
 */
export const fromTrZone = (d: Date): Date => {
  return fromZonedTime(d, TR_TIMEZONE);
};

/**
 * Returns the current time in Europe/Istanbul.
 */
export const nowInTr = (): Date => {
  return toZonedTime(new Date(), TR_TIMEZONE);
};
