package calculator

import (
	"testing"
	"time"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestTurkishPublicHolidays_2026(t *testing.T) {
	hs := TurkishPublicHolidays(2026)
	require.NotEmpty(t, hs)
	names := map[string]bool{}
	for _, h := range hs {
		names[h.Name] = true
	}
	// Fixed holidays
	assert.True(t, names["Yılbaşı"], "Yılbaşı must exist")
	assert.True(t, names["Cumhuriyet Bayramı"], "29 Ekim must exist")
	assert.True(t, names["Zafer Bayramı"], "30 Ağustos must exist")
	// Religious holidays 2026
	assert.True(t, names["Ramazan Bayramı 1. Gün"])
	assert.True(t, names["Kurban Bayramı 1. Gün"])

	// Total: 7 milli + 3 ramazan + 4 kurban = 14
	assert.Equal(t, 14, len(hs))
}

func TestIsWeekend(t *testing.T) {
	sat := time.Date(2026, 1, 3, 0, 0, 0, 0, time.UTC) // Saturday
	sun := time.Date(2026, 1, 4, 0, 0, 0, 0, time.UTC) // Sunday
	mon := time.Date(2026, 1, 5, 0, 0, 0, 0, time.UTC) // Monday
	assert.True(t, IsWeekend(sat))
	assert.True(t, IsWeekend(sun))
	assert.False(t, IsWeekend(mon))
}

func TestIsHoliday(t *testing.T) {
	set := BuildHolidaySet(TurkishPublicHolidays(2026))
	// 1 Ocak 2026 — Yılbaşı (Thursday)
	assert.True(t, IsHoliday(time.Date(2026, 1, 1, 0, 0, 0, 0, time.UTC), set))
	// 2 Ocak 2026 — regular Friday
	assert.False(t, IsHoliday(time.Date(2026, 1, 2, 0, 0, 0, 0, time.UTC), set))
	// Ramazan Bayramı 2026 — 20 Mart
	assert.True(t, IsHoliday(time.Date(2026, 3, 20, 0, 0, 0, 0, time.UTC), set))
}

func TestWorkingDaysBetween(t *testing.T) {
	set := BuildHolidaySet(TurkishPublicHolidays(2026))
	// Mon 5 Ocak — Fri 9 Ocak 2026 → 5 working days (no holidays)
	start := time.Date(2026, 1, 5, 0, 0, 0, 0, time.UTC)
	end := time.Date(2026, 1, 9, 0, 0, 0, 0, time.UTC)
	assert.Equal(t, 5, WorkingDaysBetween(start, end, set))

	// Week with 1 Ocak — Thu is Yılbaşı, Fri 2 is working
	start = time.Date(2025, 12, 29, 0, 0, 0, 0, time.UTC) // Mon
	end = time.Date(2026, 1, 2, 0, 0, 0, 0, time.UTC)     // Fri
	// Mon, Tue, Wed, Fri = 4 working (Thu 1 Ocak holiday)
	assert.Equal(t, 4, WorkingDaysBetween(start, end, set))

	// Around Ramazan Bayramı 2026 — 20/21/22 Mart are holidays
	// Mon 16 Mar - Fri 20 Mar: 4 (Mon-Thu) — Fri is holiday
	start = time.Date(2026, 3, 16, 0, 0, 0, 0, time.UTC)
	end = time.Date(2026, 3, 20, 0, 0, 0, 0, time.UTC)
	assert.Equal(t, 4, WorkingDaysBetween(start, end, set))
}

func TestLeaveDays_HalfDayHandling(t *testing.T) {
	set := BuildHolidaySet(TurkishPublicHolidays(2026))
	// 5-day week: Mon 5 - Fri 9 Ocak
	start := time.Date(2026, 1, 5, 0, 0, 0, 0, time.UTC)
	end := time.Date(2026, 1, 9, 0, 0, 0, 0, time.UTC)
	assert.Equal(t, 5.0, LeaveDays(start, end, false, false, set))
	assert.Equal(t, 4.5, LeaveDays(start, end, true, false, set))
	assert.Equal(t, 4.5, LeaveDays(start, end, false, true, set))
	assert.Equal(t, 4.0, LeaveDays(start, end, true, true, set))

	// Single-day half-day
	single := time.Date(2026, 1, 5, 0, 0, 0, 0, time.UTC)
	assert.Equal(t, 1.0, LeaveDays(single, single, false, false, set))
	assert.Equal(t, 0.5, LeaveDays(single, single, true, true, set))
}

func TestComputeYearlyAccrual(t *testing.T) {
	// Employee hired 2020-01-01, age 30, year 2025 → 5 years tenure at end → 20 days
	hire := time.Date(2020, 1, 1, 0, 0, 0, 0, time.UTC)
	birth := time.Date(1995, 1, 1, 0, 0, 0, 0, time.UTC)
	got := ComputeYearlyAccrual(hire, birth, 2025, false)
	assert.Equal(t, 20.0, got)

	// Employee hired 2024-07-01, year 2024 → no full year → 0 (not prorated)
	hire = time.Date(2024, 7, 1, 0, 0, 0, 0, time.UTC)
	got = ComputeYearlyAccrual(hire, birth, 2024, false)
	assert.Equal(t, 0.0, got)

	// Same hire, with pro-rating → ~7 days (184/366 * 14 ≈ 7.03 → 7.0)
	got = ComputeYearlyAccrual(hire, birth, 2024, true)
	assert.InDelta(t, 7.0, got, 0.5)
}

func TestCarryOverAmount(t *testing.T) {
	assert.Equal(t, 10.0, CarryOverAmount(10, 28))
	assert.Equal(t, 28.0, CarryOverAmount(35, 28))
	assert.Equal(t, 0.0, CarryOverAmount(-3, 28))
	assert.Equal(t, 0.0, CarryOverAmount(5, 0))
}
