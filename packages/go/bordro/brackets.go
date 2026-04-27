// Package bordro implements Turkish payroll calculations per 4857 / 5510 / GVK.
// All monetary values use TRY and are represented as float64 (kuruş-level
// precision; round results to 2 decimals when persisting).
package bordro

// TaxBracket is one row in GVK madde 103 ücret dilimleri.
//
// The "upper" bound is nil for the top bracket.
type TaxBracket struct {
	Lower   float64  // inclusive
	Upper   *float64 // exclusive; nil for unlimited
	RatePct float64  // percent, e.g. 15 for %15
}

// TaxSchedule bundles the yearly wage-income brackets.
type TaxSchedule struct {
	Year     int
	Brackets []TaxBracket
}

// Brackets2026 returns the 2026 GVK 103 ücret gelirleri dilimleri
// (Resmi Gazete 31.12.2025).
func Brackets2026() TaxSchedule {
	up := func(v float64) *float64 { return &v }
	return TaxSchedule{
		Year: 2026,
		Brackets: []TaxBracket{
			{Lower: 0, Upper: up(158_000), RatePct: 15},
			{Lower: 158_000, Upper: up(330_000), RatePct: 20},
			{Lower: 330_000, Upper: up(1_200_000), RatePct: 27},
			{Lower: 1_200_000, Upper: up(4_300_000), RatePct: 35},
			{Lower: 4_300_000, Upper: nil, RatePct: 40},
		},
	}
}

// Brackets2025 returns the previous year schedule for back-dated runs.
func Brackets2025() TaxSchedule {
	up := func(v float64) *float64 { return &v }
	return TaxSchedule{
		Year: 2025,
		Brackets: []TaxBracket{
			{Lower: 0, Upper: up(110_000), RatePct: 15},
			{Lower: 110_000, Upper: up(230_000), RatePct: 20},
			{Lower: 230_000, Upper: up(870_000), RatePct: 27},
			{Lower: 870_000, Upper: up(3_000_000), RatePct: 35},
			{Lower: 3_000_000, Upper: nil, RatePct: 40},
		},
	}
}

// ScheduleFor returns the schedule for a given year, defaulting to 2026.
func ScheduleFor(year int) TaxSchedule {
	switch year {
	case 2025:
		return Brackets2025()
	default:
		return Brackets2026()
	}
}

// SGKRates bundles default social-security percentages per 5510.
type SGKRates struct {
	EmployeeSGK    float64 // %14
	EmployeeUnemp  float64 // %1
	EmployerSGK    float64 // %15.75 (teşvikli) veya %20.75 (genel)
	EmployerUnemp  float64 // %2
	MinBaseDaily   float64 // günlük asgari SGK matrahı (2026: 883.20 TL/gün)
	MaxBaseMonthly float64 // aylık üst sınır (7.5x asgari)
}

// DefaultSGKRates returns the 2026 baseline rates.
// Minimum wage (brüt) 2026: 26.496 TL/ay → günlük 883,20 TL. (Example values —
// always override with the current year's resmi rakam when persisting.)
func DefaultSGKRates() SGKRates {
	return SGKRates{
		EmployeeSGK:    14,
		EmployeeUnemp:  1,
		EmployerSGK:    20.75,
		EmployerUnemp:  2,
		MinBaseDaily:   883.20,
		MaxBaseMonthly: 198_720.00, // 7.5 × 30 × 883.20
	}
}

// StampTaxRate is the binde 7.59 wage stamp-tax rate per DVK.
const StampTaxRate = 0.00759

// MinimumWage returns the brüt aylık asgari ücret for a given year.
// 2026 rakamı Dec 2025 Resmi Gazete'de ilan edilir; bu paket açıklanan
// değerleri kullanır. Override için Slip.AsgariUcretMonthly set edilir.
func MinimumWage(year int) float64 {
	switch year {
	case 2025:
		return 22_104.67 // 2025 Ocak-Aralık (yıl içi ilan edilen)
	case 2026:
		return 26_496.00 // örnek baseline (gerçek rakam Ocak 2026 asgari ücret tespit komisyonu)
	}
	return 26_496.00
}

// MinWageTaxExemption returns (incomeTaxExempt, stampTaxExempt) aylık olarak.
// GVK Geçici 86 + DVK 2016 değişikliği uyarınca asgari ücret üzerinden
// hesaplanan gelir vergisi ve damga vergisi her çalışan için istisnadır.
//
// Formül: asgari ücretin SGK+işsizlik kesintilerinden sonraki kısmı
// (= vergi matrahı) üzerinden hesaplanan progressive tax, ve brüt asgari
// ücret üzerinden hesaplanan damga vergisi.
//
// İstisna her ay aynı miktar — kümülatif ilerlemez.
func MinWageTaxExemption(year int, rates SGKRates) (incomeTax, stampTax float64) {
	if rates.EmployeeSGK == 0 {
		rates = DefaultSGKRates()
	}
	wage := MinimumWage(year)
	sgkBase := wage
	if wage > rates.MaxBaseMonthly {
		sgkBase = rates.MaxBaseMonthly
	}
	sgk := sgkBase * rates.EmployeeSGK / 100.0
	unemp := sgkBase * rates.EmployeeUnemp / 100.0
	taxBase := wage - sgk - unemp
	if taxBase < 0 {
		taxBase = 0
	}
	schedule := ScheduleFor(year)
	// Istisna her ay ilk dilimden başlar — kümülatif 0.
	incomeTax = progressiveTax(0, taxBase, schedule)
	stampTax = wage * StampTaxRate
	return incomeTax, stampTax
}
