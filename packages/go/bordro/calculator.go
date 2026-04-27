package bordro

import "math"

// Slip holds the inputs needed to calculate one month's payroll.
type Slip struct {
	// Gross wage for this period (base + overtime + bonus).
	GrossBase       float64
	OvertimeGross   float64
	BonusGross      float64
	AllowanceTaxable float64 // taxable allowances (yemek üstü, yakacak vb.)
	AllowanceExempt  float64 // vergi+sgk muafı ödemeler

	// Cumulative wage tax base prior to this period (Ocak-önceki aylar
	// toplamı). Used to advance through GVK 103 dilimleri correctly.
	CumulativeTaxBase float64

	// Worked days in the period (normally 30, parmak 22 iş günü değil).
	WorkedDays float64

	// Optional overrides; when zero, DefaultSGKRates() is used.
	Rates *SGKRates
	Year  int // used to pick the right tax schedule (0 → 2026)

	// ApplyMinWageExemption enables GVK Geçici 86 + DVK istisnaları.
	// Enterprise flow: true (gerçek yasal zorunluluk). Test/back-compat: false.
	ApplyMinWageExemption bool
}

// Result captures the calculated outputs for one slip.
type Result struct {
	GrossTotal          float64
	SGKEmployee         float64
	UnemploymentEmp     float64
	IncomeTaxBase       float64
	IncomeTaxGross      float64 // istisna uygulanmadan önce (denetim için)
	IncomeTax           float64 // istisna sonrası ödenecek
	IncomeTaxExemption  float64 // asgari ücret gelir vergisi istisnası
	StampTaxGross       float64
	StampTax            float64
	StampTaxExemption   float64
	TotalDeductions     float64
	NetPay              float64
	SGKEmployer         float64
	UnemploymentEmpr    float64
	TotalEmployerCost   float64
	CumulativeTaxBaseAfter float64
}

// Calculate returns the full tax + SGK + net breakdown for a slip.
//
//	net = gross - (sgk_emp + unemp_emp + income_tax + stamp) + exempt_allowance
//
// It advances through the GVK 103 dilimleri using CumulativeTaxBase so that
// consecutive monthly runs honour the cumulative progression.
func Calculate(s Slip) Result {
	rates := DefaultSGKRates()
	if s.Rates != nil {
		rates = *s.Rates
	}
	year := s.Year
	if year == 0 {
		year = 2026
	}
	schedule := ScheduleFor(year)

	// 1. Brüt toplam
	grossForSGK := s.GrossBase + s.OvertimeGross + s.BonusGross + s.AllowanceTaxable
	grossTotal := grossForSGK + s.AllowanceExempt

	// 2. SGK matrahı — üst sınır uygulanır
	sgkBase := math.Min(grossForSGK, rates.MaxBaseMonthly)

	sgkEmp := round2(sgkBase * rates.EmployeeSGK / 100.0)
	unempEmp := round2(sgkBase * rates.EmployeeUnemp / 100.0)
	sgkEmpr := round2(sgkBase * rates.EmployerSGK / 100.0)
	unempEmpr := round2(sgkBase * rates.EmployerUnemp / 100.0)

	// 3. Gelir vergisi matrahı = brüt (vergilenebilir) - SGK işçi - işsizlik işçi
	incomeTaxBase := grossForSGK - sgkEmp - unempEmp
	if incomeTaxBase < 0 {
		incomeTaxBase = 0
	}
	incomeTaxGross := progressiveTax(s.CumulativeTaxBase, incomeTaxBase, schedule)

	// 4. Damga vergisi (binde 7.59, AGİ hariç tüm brüt üzerinden)
	stampGross := grossForSGK * StampTaxRate

	// 5. Asgari ücret istisnaları (GVK Geçici 86 + DVK). Aylık sabit.
	// Enterprise default: apply. Back-compat: only when flag set.
	var incomeExempt, stampExempt float64
	if s.ApplyMinWageExemption {
		incomeExempt, stampExempt = MinWageTaxExemption(year, rates)
	}
	incomeTax := incomeTaxGross - incomeExempt
	if incomeTax < 0 {
		incomeTax = 0
	}
	stamp := stampGross - stampExempt
	if stamp < 0 {
		stamp = 0
	}

	deductions := sgkEmp + unempEmp + incomeTax + stamp
	net := grossTotal - deductions

	return Result{
		GrossTotal:             round2(grossTotal),
		SGKEmployee:            sgkEmp,
		UnemploymentEmp:        unempEmp,
		IncomeTaxBase:          round2(incomeTaxBase),
		IncomeTaxGross:         round2(incomeTaxGross),
		IncomeTax:              round2(incomeTax),
		IncomeTaxExemption:     round2(incomeExempt),
		StampTaxGross:          round2(stampGross),
		StampTax:               round2(stamp),
		StampTaxExemption:      round2(stampExempt),
		TotalDeductions:        round2(deductions),
		NetPay:                 round2(net),
		SGKEmployer:            sgkEmpr,
		UnemploymentEmpr:       unempEmpr,
		TotalEmployerCost:      round2(grossTotal + sgkEmpr + unempEmpr),
		CumulativeTaxBaseAfter: round2(s.CumulativeTaxBase + incomeTaxBase),
	}
}

// progressiveTax walks the schedule starting from cumulativePrior and applies
// each dilim's rate until the "chunk" is consumed. Returns the tax owed for
// the chunk alone.
func progressiveTax(cumulativePrior, chunk float64, schedule TaxSchedule) float64 {
	if chunk <= 0 {
		return 0
	}
	remaining := chunk
	cursor := cumulativePrior
	total := 0.0
	for _, b := range schedule.Brackets {
		if remaining <= 0 {
			break
		}
		// portion of this chunk that falls in this bracket
		segmentUpper := math.MaxFloat64
		if b.Upper != nil {
			segmentUpper = *b.Upper
		}
		if cursor >= segmentUpper {
			continue
		}
		roomInBracket := segmentUpper - cursor
		apply := math.Min(remaining, roomInBracket)
		total += apply * b.RatePct / 100.0
		cursor += apply
		remaining -= apply
	}
	return total
}

// KıdemTazminatı returns the legally mandated severance amount per 4857.
//
// formula: giydirilmiş brüt x tam yıl kıdem + kesir gün oransal.
// Cap: yıllık giydirilmiş brüt, Maliye'nin açıkladığı kıdem tazminatı
// tavanını aşamaz — caller should pass the yearly cap so we can clamp.
func KidemTazminati(grossMonthly float64, tenureYears, extraDays float64, yearlyCap float64) float64 {
	perYear := grossMonthly
	if yearlyCap > 0 && perYear > yearlyCap {
		perYear = yearlyCap
	}
	total := perYear * tenureYears
	if extraDays > 0 {
		total += perYear * (extraDays / 365.0)
	}
	return round2(total)
}

// IhbarTazminati returns notice-period indemnity per 4857/17. Days depend
// on tenure: <6ay=14, 6ay-1.5y=28, 1.5y-3y=42, 3y+=56 gün.
func IhbarTazminati(grossMonthly, tenureMonths float64) float64 {
	days := 0.0
	switch {
	case tenureMonths < 6:
		days = 14
	case tenureMonths < 18:
		days = 28
	case tenureMonths < 36:
		days = 42
	default:
		days = 56
	}
	daily := grossMonthly / 30.0
	return round2(daily * days)
}

func round2(v float64) float64 {
	return math.Round(v*100) / 100
}
