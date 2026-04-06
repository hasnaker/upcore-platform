/**
 * Fazla mesai (overtime) calculation per 4857 sayılı İş Kanunu Madde 41.
 *
 * Rules:
 *   - Normal weekly working hours: 45 saat
 *   - Overtime rate: 1.5× (fazla çalışma)
 *   - Annual overtime cap: 270 saat per year
 */

interface OvertimeResult {
  /** Regular pay for 45-hour base week */
  regularPay: number;
  /** Overtime pay at 1.5× rate */
  overtimePay: number;
  /** Total hours worked */
  totalHours: number;
  /** Overtime hours, capped if exceeds yearly allowance */
  overtimeHours: number;
  /** Warning if annual cap would be exceeded at this rate */
  cappedOverHours?: number;
}

/** Maximum weekly normal hours (Madde 63) */
const WEEKLY_NORMAL_HOURS = 45;

/** Overtime multiplier (Madde 41) */
const OVERTIME_MULTIPLIER = 1.5;

/** Maximum annual overtime hours (Madde 41) */
const ANNUAL_OVERTIME_CAP = 270;

/**
 * Calculates overtime pay for a given week.
 *
 * @param weeklyHours       - Actual hours worked this week
 * @param hourlyRate        - Base hourly rate in TRY
 * @param yearlyOvertimeSoFar - Overtime hours accumulated so far this year (default: 0)
 * @returns Breakdown of regular pay, overtime pay, and hour details
 */
export const calculateOvertime = (
  weeklyHours: number,
  hourlyRate: number,
  yearlyOvertimeSoFar: number = 0,
): OvertimeResult => {
  const regularHours = Math.min(weeklyHours, WEEKLY_NORMAL_HOURS);
  const rawOvertimeHours = Math.max(0, weeklyHours - WEEKLY_NORMAL_HOURS);

  // Check annual cap
  const remainingAllowance = Math.max(0, ANNUAL_OVERTIME_CAP - yearlyOvertimeSoFar);
  const overtimeHours = Math.min(rawOvertimeHours, remainingAllowance);

  const regularPay = Math.round(regularHours * hourlyRate * 100) / 100;
  const overtimePay = Math.round(overtimeHours * hourlyRate * OVERTIME_MULTIPLIER * 100) / 100;

  const result: OvertimeResult = {
    regularPay,
    overtimePay,
    totalHours: weeklyHours,
    overtimeHours,
  };

  // Warn if hours were capped
  if (rawOvertimeHours > remainingAllowance) {
    result.cappedOverHours = rawOvertimeHours - overtimeHours;
  }

  return result;
};
