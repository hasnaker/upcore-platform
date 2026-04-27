package bordro

// Yemek ve yol yardımı vergi+SGK istisnaları (GVK Mük.67 + 61/f + SGK md.80).
//
// İlkeler:
//   - Günlük yemek brütü Maliye'nin açıkladığı günlük tavanı aşmıyorsa hem
//     gelir vergisi hem de SGK matrahından istisnadır (GVK Mük.67 + 5510/80).
//   - Yol yardımı (ulaşım) 2024 revizyonuyla günlük belirli tavan altında
//     (GVK 23/10) istisna; tavanı aşan kısım vergi ve SGK matrahına dahil.
//   - Tavanlar tenant bazlı yıl içi güncellemelerle değişir — paketteki
//     default'lar 2026 tahminidir; servis tenant ayarlarından override eder.

// AllowanceConfig captures per-day caps; both inputs are brüt TRY.
type AllowanceConfig struct {
	// WorkingDays — bu ay fiilen çalışılan gün sayısı (brüt yemek/yol
	// = günlük brüt × çalışılan gün). Normalde 22 iş günü.
	WorkingDays float64

	// MealDailyGross — işverenin bu ay çalışana verdiği GÜNLÜK yemek brütü.
	// Yemek kartı/ticket vs. dahil.
	MealDailyGross float64
	// MealExemptDailyCap — günlük yemek istisna tavanı (Maliye).
	MealExemptDailyCap float64

	// TransportDailyGross — günlük yol yardımı brütü.
	TransportDailyGross float64
	// TransportExemptDailyCap — günlük yol istisna tavanı.
	TransportExemptDailyCap float64
}

// AllowanceBreakdown reports the exempt vs taxable split for the month.
type AllowanceBreakdown struct {
	// Meal
	MealGross    float64 // WorkingDays × MealDailyGross
	MealExempt   float64 // vergi+SGK muafı kısmı
	MealTaxable  float64 // tavan üstü
	// Transport
	TransportGross   float64
	TransportExempt  float64
	TransportTaxable float64
	// Toplamlar
	TotalGross   float64
	TotalExempt  float64
	TotalTaxable float64
}

// ComputeAllowances applies GVK Mük.67 + 61/f per-day caps and returns
// the breakdown. Taxable chunks flow into payroll as AllowanceTaxable,
// exempt chunks flow into AllowanceExempt.
func ComputeAllowances(cfg AllowanceConfig) AllowanceBreakdown {
	if cfg.WorkingDays < 0 {
		cfg.WorkingDays = 0
	}
	mealDaily := cfg.MealDailyGross
	mealCap := cfg.MealExemptDailyCap
	transportDaily := cfg.TransportDailyGross
	transportCap := cfg.TransportExemptDailyCap

	mealExemptDaily := mealDaily
	if mealDaily > mealCap {
		mealExemptDaily = mealCap
	}
	mealTaxableDaily := 0.0
	if mealDaily > mealCap {
		mealTaxableDaily = mealDaily - mealCap
	}
	transportExemptDaily := transportDaily
	if transportDaily > transportCap {
		transportExemptDaily = transportCap
	}
	transportTaxableDaily := 0.0
	if transportDaily > transportCap {
		transportTaxableDaily = transportDaily - transportCap
	}

	out := AllowanceBreakdown{
		MealGross:        round2(mealDaily * cfg.WorkingDays),
		MealExempt:       round2(mealExemptDaily * cfg.WorkingDays),
		MealTaxable:      round2(mealTaxableDaily * cfg.WorkingDays),
		TransportGross:   round2(transportDaily * cfg.WorkingDays),
		TransportExempt:  round2(transportExemptDaily * cfg.WorkingDays),
		TransportTaxable: round2(transportTaxableDaily * cfg.WorkingDays),
	}
	out.TotalGross = round2(out.MealGross + out.TransportGross)
	out.TotalExempt = round2(out.MealExempt + out.TransportExempt)
	out.TotalTaxable = round2(out.MealTaxable + out.TransportTaxable)
	return out
}

// DefaultAllowanceCaps returns 2026 tahmini günlük tavanları.
// Tenant ayarları override eder.
func DefaultAllowanceCaps() (mealDaily, transportDaily float64) {
	return 240.00, 126.00
}
