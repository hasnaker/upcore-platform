package bordro

import (
	"errors"
	"math"
)

// Fazla mesai (4857 İş Kanunu md. 41 + 63).
//
//   - Haftalık normal çalışma 45 saat. 45'in üzerindeki her saat "fazla çalışma".
//   - Fazla çalışma ücreti: saatlik ücretin %50 zamlı (1.5x) versiyonu.
//   - Hafta tatili, ulusal bayram ve genel tatillerde yapılan çalışma %100 zamlı.
//   - Fazla çalışma toplamı yılda 270 saati geçemez (ihlal idari para cezası).
//   - Hafta içi günlük 11 saat üstü çalışma yasak (gece çalışması için ayrı).

// OvertimeKind enumerates the legal multiplier categories.
type OvertimeKind string

const (
	// OTWeekdayNormal — hafta içi fazla (45 saati aşan): %50 zam → 1.5x.
	OTWeekdayNormal OvertimeKind = "weekday_normal"
	// OTWeekendOrHoliday — hafta tatili / genel tatil: %100 zam → 2.0x.
	OTWeekendOrHoliday OvertimeKind = "weekend_holiday"
	// OTNightSupplement — gece çalışması 4857/69 — %100 zam + gündüz mesaisi yasağı.
	OTNightSupplement OvertimeKind = "night"
	// OTFazlaSureli — "fazla sürelerle çalışma" (haftalık 45'ten az ama 40+ olan
	// işyerlerinde fark için). %25 zam → 1.25x. 4857/41 son fıkra.
	OTFazlaSureli OvertimeKind = "fazla_sureli"
)

// OvertimeEntry represents a single overtime event.
type OvertimeEntry struct {
	Hours float64
	Kind  OvertimeKind
}

// AnnualLimitHours is the statutory maximum for OTWeekdayNormal per 4857/41.
const AnnualLimitHours = 270

// Multiplier returns the gross wage multiplier for the given overtime kind.
func (k OvertimeKind) Multiplier() float64 {
	switch k {
	case OTWeekdayNormal:
		return 1.5
	case OTWeekendOrHoliday, OTNightSupplement:
		return 2.0
	case OTFazlaSureli:
		return 1.25
	}
	return 1.0
}

// IsValid reports whether the kind is known.
func (k OvertimeKind) IsValid() bool {
	switch k {
	case OTWeekdayNormal, OTWeekendOrHoliday, OTNightSupplement, OTFazlaSureli:
		return true
	}
	return false
}

// ErrAnnualLimitExceeded is returned when cumulative weekday overtime crosses
// the 270-hour ceiling. Caller should block or flag for HR review.
var ErrAnnualLimitExceeded = errors.New("bordro: yıllık fazla mesai 270 saat sınırını aştı (4857/41)")

// OvertimeResult summarises an overtime computation.
type OvertimeResult struct {
	HourlyRate         float64
	TotalHours         float64
	WeekdayHours       float64
	WeekendHolidayHours float64
	FazlaSureliHours   float64
	NightHours         float64
	TotalGrossAddition float64
	// ByKind decomposes the gross by category (useful for slip items).
	ByKind map[OvertimeKind]float64
}

// ComputeOvertime returns the gross salary addition for a list of overtime
// entries given the base monthly gross salary. cumulativeWeekdayYTD is the
// total weekday overtime hours the employee has already logged this year — the
// function returns ErrAnnualLimitExceeded when the sum crosses 270h.
//
// Saatlik ücret 4857/32'ye göre: aylık brüt / (haftalık çalışma × 4,33) — ya da
// yaygın pratikte aylık brüt / 225 (45 × 4,33 ≈ 194.85, fakat toplu iş
// sözleşmelerinde 225 saat de kullanılır). Biz 225'i kullanıyoruz — tenant
// override için `hoursPerMonth` parametresi var.
func ComputeOvertime(
	monthlyGross float64,
	hoursPerMonth float64,
	cumulativeWeekdayYTD float64,
	entries []OvertimeEntry,
) (OvertimeResult, error) {
	if hoursPerMonth <= 0 {
		hoursPerMonth = 225
	}
	hourly := monthlyGross / hoursPerMonth
	res := OvertimeResult{
		HourlyRate: round2(hourly),
		ByKind:     map[OvertimeKind]float64{},
	}
	weekdaySum := 0.0
	for _, e := range entries {
		if e.Hours <= 0 || !e.Kind.IsValid() {
			continue
		}
		gross := hourly * e.Hours * e.Kind.Multiplier()
		res.TotalHours += e.Hours
		res.TotalGrossAddition += gross
		res.ByKind[e.Kind] = round2(res.ByKind[e.Kind] + gross)

		switch e.Kind {
		case OTWeekdayNormal:
			res.WeekdayHours += e.Hours
			weekdaySum += e.Hours
		case OTWeekendOrHoliday:
			res.WeekendHolidayHours += e.Hours
		case OTFazlaSureli:
			res.FazlaSureliHours += e.Hours
		case OTNightSupplement:
			res.NightHours += e.Hours
		}
	}
	res.TotalGrossAddition = round2(res.TotalGrossAddition)

	// 270 saat kontrolü
	if cumulativeWeekdayYTD+weekdaySum > AnnualLimitHours+0.0001 {
		return res, ErrAnnualLimitExceeded
	}
	return res, nil
}

// Round2 is the exported 2-decimal helper for tests that need it.
func Round2(v float64) float64 { return round2(v) }

// MaxHoursPerDay is the daily ceiling per 4857/63 — günde 11 saat.
const MaxHoursPerDay = 11

// DailyLegalCheck raises an error when single-day hours exceed the legal cap.
// Caller runs this per day during time-entry validation.
func DailyLegalCheck(hours float64) error {
	if hours > MaxHoursPerDay+0.01 {
		return errors.New("bordro: günlük 11 saat üstü çalışma yasaktır (4857/63)")
	}
	if hours < 0 {
		return errors.New("bordro: negatif saat geçersiz")
	}
	return nil
}

// assertMathImport keeps the math import honest when the file is edited later.
var _ = math.Inf
