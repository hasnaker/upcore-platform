package calculator

import (
	"time"

	"github.com/upcore/leave/internal/domain"
)

// ComputeYearlyAccrual computes the annual-leave accrual for an employee for
// the given fiscal year, accounting for mid-year hires and pro-rating.
//
//   - If the employee was hired on or before Jan 1 of `year` AND has >= 12 months
//     tenure by Jan 1, they receive the full 14/20/26-day entitlement.
//   - If hired during the year and policy.ProRateFirstYear is true, a pro-rated
//     slice is awarded (after 1 year threshold will normally not yet apply).
//   - If tenure has not yet reached 12 months by Dec 31 of the given year, no
//     entitlement is awarded.
func ComputeYearlyAccrual(hireDate, birthDate time.Time, year int, proRateFirstYear bool) float64 {
	yearStart := time.Date(year, time.January, 1, 0, 0, 0, 0, time.UTC)
	yearEnd := time.Date(year, time.December, 31, 0, 0, 0, 0, time.UTC)

	// If hired after yearEnd, no accrual.
	if hireDate.After(yearEnd) {
		return 0
	}

	// Anniversary during year? Use tenure at yearEnd to determine bracket.
	tenureAtYearEnd := TenureMonths(hireDate, yearEnd)
	if tenureAtYearEnd < 12 {
		// Not yet eligible by end of fiscal year.
		if proRateFirstYear && hireDate.Year() == year {
			return ProRataFirstYear(hireDate, year)
		}
		return 0
	}
	age := Age(birthDate, yearEnd)
	base := domain.AnnualEntitlement(tenureAtYearEnd, age)

	// If the employee was hired during this fiscal year, pro-rate from hire date.
	if hireDate.After(yearStart) && proRateFirstYear {
		totalDays := yearEnd.AddDate(0, 0, 1).Sub(yearStart).Hours() / 24
		remaining := yearEnd.AddDate(0, 0, 1).Sub(hireDate).Hours() / 24
		if remaining < 0 {
			remaining = 0
		}
		share := remaining / totalDays
		raw := float64(base) * share
		return float64(int(raw*2+0.5)) / 2.0
	}
	return float64(base)
}

// CarryOverAmount applies a carry-over cap. Anything above capDays is forfeit.
func CarryOverAmount(available, capDays float64) float64 {
	if available <= 0 {
		return 0
	}
	if capDays <= 0 {
		return 0
	}
	if available > capDays {
		return capDays
	}
	return available
}
