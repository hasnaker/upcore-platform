package bordro

import (
	"errors"
	"math"
	"testing"
)

func TestOvertimeKind_Multiplier(t *testing.T) {
	cases := map[OvertimeKind]float64{
		OTWeekdayNormal:    1.5,
		OTWeekendOrHoliday: 2.0,
		OTNightSupplement:  2.0,
		OTFazlaSureli:      1.25,
	}
	for k, want := range cases {
		if got := k.Multiplier(); got != want {
			t.Errorf("%s: got %v want %v", k, got, want)
		}
	}
}

func TestComputeOvertime_Weekday(t *testing.T) {
	// 30k brüt / 225 saat = 133.33 TL/saat
	// 10 saat hafta içi × 1.5 = 15 saat × 133.33 = 2000 TL
	r, err := ComputeOvertime(30_000, 225, 0, []OvertimeEntry{
		{Hours: 10, Kind: OTWeekdayNormal},
	})
	if err != nil {
		t.Fatalf("unexpected: %v", err)
	}
	if math.Abs(r.TotalGrossAddition-2000) > 1 {
		t.Errorf("weekday gross = %v, want ~2000", r.TotalGrossAddition)
	}
	if r.WeekdayHours != 10 {
		t.Errorf("weekday hours = %v", r.WeekdayHours)
	}
}

func TestComputeOvertime_WeekendAndNight(t *testing.T) {
	// Sadece hafta sonu: 8 saat × 2.0 çarpanı → 16 saat × hourly
	r, _ := ComputeOvertime(45_000, 225, 0, []OvertimeEntry{
		{Hours: 8, Kind: OTWeekendOrHoliday},
	})
	expected := (45_000.0 / 225.0) * 8 * 2.0
	if math.Abs(r.TotalGrossAddition-expected) > 1 {
		t.Errorf("weekend gross = %v, want %v", r.TotalGrossAddition, expected)
	}
	if r.WeekendHolidayHours != 8 {
		t.Errorf("weekend hours = %v", r.WeekendHolidayHours)
	}
}

func TestComputeOvertime_AnnualLimitExceeded(t *testing.T) {
	// Zaten 265 saat yapılmış, 10 saat daha eklendiğinde 275 → ihlal.
	_, err := ComputeOvertime(30_000, 225, 265, []OvertimeEntry{
		{Hours: 10, Kind: OTWeekdayNormal},
	})
	if !errors.Is(err, ErrAnnualLimitExceeded) {
		t.Errorf("expected AnnualLimitExceeded, got %v", err)
	}
}

func TestComputeOvertime_AnnualLimitOnlyCountsWeekday(t *testing.T) {
	// Hafta sonu mesaisi 270 limitine dahil değil.
	r, err := ComputeOvertime(30_000, 225, 260, []OvertimeEntry{
		{Hours: 20, Kind: OTWeekendOrHoliday},
	})
	if err != nil {
		t.Fatalf("unexpected limit error: %v", err)
	}
	if r.WeekendHolidayHours != 20 {
		t.Errorf("expected 20 weekend hours")
	}
}

func TestComputeOvertime_MultipleKinds(t *testing.T) {
	r, err := ComputeOvertime(30_000, 225, 0, []OvertimeEntry{
		{Hours: 5, Kind: OTWeekdayNormal},
		{Hours: 4, Kind: OTWeekendOrHoliday},
		{Hours: 2, Kind: OTFazlaSureli},
	})
	if err != nil {
		t.Fatal(err)
	}
	// 5×1.5 + 4×2 + 2×1.25 = 7.5 + 8 + 2.5 = 18 saat × 133.33 = 2400 TL
	if math.Abs(r.TotalGrossAddition-2400) > 2 {
		t.Errorf("multi kind total = %v, want ~2400", r.TotalGrossAddition)
	}
	if r.ByKind[OTWeekdayNormal] == 0 || r.ByKind[OTFazlaSureli] == 0 {
		t.Error("ByKind breakdown missing")
	}
}

func TestDailyLegalCheck(t *testing.T) {
	if err := DailyLegalCheck(10); err != nil {
		t.Errorf("10h should pass: %v", err)
	}
	if err := DailyLegalCheck(12); err == nil {
		t.Errorf("12h should fail (4857/63 cap)")
	}
	if err := DailyLegalCheck(-1); err == nil {
		t.Errorf("negative should fail")
	}
}
