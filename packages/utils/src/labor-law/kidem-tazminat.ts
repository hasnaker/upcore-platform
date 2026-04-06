/**
 * Kıdem Tazminatı (severance pay) preview calculation.
 *
 * 4857 sayılı İş Kanunu'na göre kıdem tazminatı:
 *   - Her tam yıl için 30 günlük brüt maaş
 *   - Kısmi yıllar gün bazında oranlanır
 *   - Tavan (ceiling) uygulanır (Hazine Müsteşarlığı tarafından her 6 ayda güncellenir)
 *
 * @estimate Bu hesaplamalar bilgilendirme amaçlıdır, hukuki tavsiye niteliği taşımaz.
 */
import { differenceInCalendarDays } from 'date-fns';

interface SeveranceEstimate {
  /** Full years of service */
  years: number;
  /** Remaining months after full years */
  months: number;
  /** Estimated severance amount in TRY */
  amount: number;
  /** The per-year cap applied (if applicable) */
  cappedAt: number;
}

/**
 * 2026 kıdem tazminatı tavanı (per 6-month period).
 * This is an estimated projection; update with official Hazine figures.
 * @estimate
 */
const SEVERANCE_CAP_2026 = 35_058.58;

/**
 * Estimates severance pay for an employee.
 *
 * @param hireDate           - Employee's start date
 * @param terminationDate    - Date of termination
 * @param monthlySalaryGross - Monthly gross salary in TRY
 * @returns Breakdown of years, months, amount, and cap applied
 *
 * @estimate This is a preview calculation only. Actual amounts may vary
 * based on the latest official ceiling and precise proration rules.
 */
export const estimateSeverance = (
  hireDate: Date,
  terminationDate: Date,
  monthlySalaryGross: number,
): SeveranceEstimate => {
  const totalDays = differenceInCalendarDays(terminationDate, hireDate);

  if (totalDays < 0) {
    return { years: 0, months: 0, amount: 0, cappedAt: SEVERANCE_CAP_2026 };
  }

  const years = Math.floor(totalDays / 365);
  const remainingDays = totalDays % 365;
  const months = Math.floor(remainingDays / 30);

  // Cap the monthly salary at the ceiling
  const effectiveMonthlySalary = Math.min(monthlySalaryGross, SEVERANCE_CAP_2026);

  // Daily salary (30-day month convention)
  const dailySalary = effectiveMonthlySalary / 30;

  // Full years: 30 days each
  const fullYearAmount = years * 30 * dailySalary;

  // Partial: remaining days prorated
  const partialAmount = remainingDays * dailySalary;

  const amount = Math.round((fullYearAmount + partialAmount) * 100) / 100;

  return {
    years,
    months,
    amount,
    cappedAt: SEVERANCE_CAP_2026,
  };
};
