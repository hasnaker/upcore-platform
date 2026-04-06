package domain

// YillikIzinGunu returns the legal annual leave entitlement in WORKING DAYS per
// 4857 İş Kanunu Madde 53. Employees with less than 12 months tenure have no
// annual leave entitlement yet.
//
//	tenureMonths < 12    -> 0 days
//	1 <= tenureYears < 5 -> 14 days
//	5 <= tenureYears <15 -> 20 days
//	tenureYears >= 15    -> 26 days
func YillikIzinGunu(tenureMonths int) int {
	if tenureMonths < 12 {
		return 0
	}
	tenureYears := tenureMonths / 12
	switch {
	case tenureYears < 5:
		return 14
	case tenureYears < 15:
		return 20
	default:
		return 26
	}
}

// YillikIzinMinimum enforces the 4857/53 minimum of 20 days for employees
// under 18 or 50+ years old, regardless of tenure.
func YillikIzinMinimum(age int) int {
	if age < 18 || age >= 50 {
		return 20
	}
	return 0
}

// AnnualEntitlement combines tenure-based and age-based minimums. Returns the
// higher of the two figures. When tenure is below 12 months, the age-based
// minimum still does not apply (hire hasn't completed a year yet).
func AnnualEntitlement(tenureMonths, age int) int {
	base := YillikIzinGunu(tenureMonths)
	if base == 0 {
		return 0
	}
	if min := YillikIzinMinimum(age); min > base {
		return min
	}
	return base
}

// MaxCarryOver returns the carry-over cap per 4857: up to 2x annual entitlement
// may be carried across fiscal years (common Turkish HR practice).
func MaxCarryOver(annualEntitlement int) int {
	return annualEntitlement * 2
}
