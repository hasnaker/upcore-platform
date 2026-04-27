package bordro

import (
	"math"
	"testing"
)

func TestComputeAllowances_AllWithinCap(t *testing.T) {
	b := ComputeAllowances(AllowanceConfig{
		WorkingDays:             22,
		MealDailyGross:          200, // < 240 cap
		MealExemptDailyCap:      240,
		TransportDailyGross:     100, // < 126 cap
		TransportExemptDailyCap: 126,
	})
	if b.MealTaxable != 0 || b.TransportTaxable != 0 {
		t.Errorf("cap altında kalanlar tamamen istisna olmalı: %+v", b)
	}
	if math.Abs(b.TotalExempt-(22*200+22*100)) > 0.01 {
		t.Errorf("toplam istisna = %v, want %v", b.TotalExempt, 22*(200+100))
	}
}

func TestComputeAllowances_ExceedsCap(t *testing.T) {
	b := ComputeAllowances(AllowanceConfig{
		WorkingDays:             20,
		MealDailyGross:          300, // 60 TL/gün tavan üstü
		MealExemptDailyCap:      240,
		TransportDailyGross:     200, // 74 TL/gün tavan üstü
		TransportExemptDailyCap: 126,
	})
	// Meal: 20 × 240 = 4800 exempt, 20 × 60 = 1200 taxable
	if math.Abs(b.MealExempt-4800) > 0.01 {
		t.Errorf("meal exempt = %v", b.MealExempt)
	}
	if math.Abs(b.MealTaxable-1200) > 0.01 {
		t.Errorf("meal taxable = %v", b.MealTaxable)
	}
	// Transport: 20 × 126 = 2520 exempt, 20 × 74 = 1480 taxable
	if math.Abs(b.TransportExempt-2520) > 0.01 {
		t.Errorf("transport exempt = %v", b.TransportExempt)
	}
	if math.Abs(b.TransportTaxable-1480) > 0.01 {
		t.Errorf("transport taxable = %v", b.TransportTaxable)
	}
}

func TestComputeAllowances_ZeroInputs(t *testing.T) {
	b := ComputeAllowances(AllowanceConfig{WorkingDays: 22})
	if b.TotalGross != 0 || b.TotalExempt != 0 || b.TotalTaxable != 0 {
		t.Errorf("0 girdi → 0 çıktı: %+v", b)
	}
}

func TestComputeAllowances_ZeroWorkingDays(t *testing.T) {
	// İşe gelmezse hiçbir şey hesaplanmaz.
	b := ComputeAllowances(AllowanceConfig{
		WorkingDays:             0,
		MealDailyGross:          500,
		MealExemptDailyCap:      240,
		TransportDailyGross:     300,
		TransportExemptDailyCap: 126,
	})
	if b.TotalGross != 0 {
		t.Errorf("0 iş günü → 0 brüt: %v", b.TotalGross)
	}
}

func TestDefaultAllowanceCaps(t *testing.T) {
	meal, transport := DefaultAllowanceCaps()
	if meal != 240 {
		t.Errorf("default meal = %v, want 240", meal)
	}
	if transport != 126 {
		t.Errorf("default transport = %v, want 126", transport)
	}
}
