// Package calculator implements Turkish labour-law leave calculations
// (4857 İş Kanunu) plus working-day / calendar utilities.
package calculator

import (
	"time"

	"github.com/upcore/leave/internal/domain"
)

// TenureMonths returns the number of complete calendar months between hireDate
// and asOf (asOf >= hireDate). Day-of-month is treated generously: if asOf's
// day is >= hireDate's day, the month is counted as complete.
func TenureMonths(hireDate, asOf time.Time) int {
	if asOf.Before(hireDate) {
		return 0
	}
	years := asOf.Year() - hireDate.Year()
	months := int(asOf.Month()) - int(hireDate.Month())
	total := years*12 + months
	if asOf.Day() < hireDate.Day() {
		total--
	}
	if total < 0 {
		total = 0
	}
	return total
}

// Age returns the employee's age in complete years as of asOf.
func Age(birthDate, asOf time.Time) int {
	if asOf.Before(birthDate) {
		return 0
	}
	years := asOf.Year() - birthDate.Year()
	// If birthday hasn't happened this year yet, subtract one.
	anniv := time.Date(asOf.Year(), birthDate.Month(), birthDate.Day(), 0, 0, 0, 0, asOf.Location())
	if asOf.Before(anniv) {
		years--
	}
	if years < 0 {
		years = 0
	}
	return years
}

// EntitlementAsOf computes the annual-leave entitlement per 4857 for an employee
// whose hire date and birthdate are known, as of a given date.
func EntitlementAsOf(hireDate, birthDate, asOf time.Time) int {
	months := TenureMonths(hireDate, asOf)
	age := Age(birthDate, asOf)
	return domain.AnnualEntitlement(months, age)
}

// ProRataFirstYear returns the fractional annual entitlement an employee is
// owed if they are hired partway through the year. The result is the full
// annual quota scaled by the proportion of the year remaining after hire,
// rounded to 0.5-day precision.
//
// Note: 4857 does NOT grant annual leave before the first 12 months; this
// helper exists only for HR policies that voluntarily pro-rate the first
// calendar year beyond the statutory minimum.
func ProRataFirstYear(hireDate time.Time, year int) float64 {
	if hireDate.Year() != year {
		if hireDate.Year() < year {
			return 14.0
		}
		return 0.0
	}
	yearStart := time.Date(year, time.January, 1, 0, 0, 0, 0, time.UTC)
	yearEnd := time.Date(year+1, time.January, 1, 0, 0, 0, 0, time.UTC)
	totalDays := yearEnd.Sub(yearStart).Hours() / 24
	remaining := yearEnd.Sub(hireDate).Hours() / 24
	if remaining <= 0 {
		return 0
	}
	share := remaining / totalDays
	raw := 14.0 * share
	// round to nearest 0.5
	return float64(int(raw*2+0.5)) / 2.0
}
