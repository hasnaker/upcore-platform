/**
 * 4857 sayılı İş Kanunu Madde 53 — Yıllık Ücretli İzin Hesaplaması.
 *
 * İş süresi          | İzin günü
 * 1–5 yıl (dahil)    | 14 gün
 * 5–15 yıl           | 20 gün
 * 15+ yıl            | 26 gün
 *
 * Özel durumlar (Madde 53, son fıkra):
 *   - 18 yaşından küçük çalışanlar: en az 20 gün
 *   - 50 yaşından büyük çalışanlar: en az 20 gün
 *
 * Not: Yıllık izne hak kazanmak için en az 1 yıl çalışmış olmak gerekir.
 */
import { differenceInCalendarDays, differenceInYears } from 'date-fns';

interface LeaveBalance {
  entitled: number;
  used: number;
  remaining: number;
}

/**
 * Calculates the number of annual leave days an employee is entitled to
 * per Madde 53 of 4857 İş Kanunu.
 *
 * @param hireDate  - Employee's start date
 * @param asOf      - Calculation reference date
 * @param age       - Employee's current age
 * @returns Number of entitled leave days, or 0 if not yet eligible
 *
 * @example
 * // 3 years of service, age 30
 * calculateAnnualLeaveDays(new Date(2023, 0, 1), new Date(2026, 0, 1), 30) // 14
 */
export const calculateAnnualLeaveDays = (
  hireDate: Date,
  asOf: Date,
  age: number,
): number => {
  const tenureYears = differenceInYears(asOf, hireDate);

  // Must have completed at least 1 year
  if (tenureYears < 1) {
    return 0;
  }

  let baseDays: number;

  if (tenureYears <= 5) {
    // 1-5 yıl (dahil): 14 gün
    baseDays = 14;
  } else if (tenureYears <= 15) {
    // 5-15 yıl: 20 gün
    baseDays = 20;
  } else {
    // 15+ yıl: 26 gün
    baseDays = 26;
  }

  // Madde 53 son fıkra: 18 yaş altı veya 50 yaş üstü → minimum 20 gün
  if (age < 18 || age >= 50) {
    baseDays = Math.max(baseDays, 20);
  }

  return baseDays;
};

/**
 * Calculates the annual leave balance for an employee.
 *
 * @param hireDate  - Employee's start date
 * @param asOf      - Calculation reference date
 * @param age       - Employee's current age
 * @param usedDays  - Number of days already used this period
 * @returns Object with entitled, used, and remaining days
 */
export const calculateAnnualLeaveBalance = (
  hireDate: Date,
  asOf: Date,
  age: number,
  usedDays: number,
): LeaveBalance => {
  const entitled = calculateAnnualLeaveDays(hireDate, asOf, age);
  return {
    entitled,
    used: usedDays,
    remaining: entitled - usedDays,
  };
};
