package calculator

import (
	"testing"
	"time"

	"github.com/stretchr/testify/assert"

	"github.com/upcore/leave/internal/domain"
)

func TestYillikIzinGunu_4857_Brackets(t *testing.T) {
	cases := []struct {
		name   string
		months int
		want   int
	}{
		{"under 1 year", 6, 0},
		{"exactly 1 year", 12, 14},
		{"2 years", 24, 14},
		{"just under 5 years", 59, 14},
		{"exactly 5 years", 60, 20},
		{"10 years", 120, 20},
		{"just under 15 years", 179, 20},
		{"exactly 15 years", 180, 26},
		{"20 years", 240, 26},
	}
	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			assert.Equal(t, tc.want, domain.YillikIzinGunu(tc.months))
		})
	}
}

func TestYillikIzinMinimum_AgeBounds(t *testing.T) {
	assert.Equal(t, 20, domain.YillikIzinMinimum(17), "under 18 → 20")
	assert.Equal(t, 0, domain.YillikIzinMinimum(18), "18 → 0 (no min)")
	assert.Equal(t, 0, domain.YillikIzinMinimum(49), "49 → 0")
	assert.Equal(t, 20, domain.YillikIzinMinimum(50), "50+ → 20")
	assert.Equal(t, 20, domain.YillikIzinMinimum(60))
}

func TestAnnualEntitlement_AgeMinimumOverrides(t *testing.T) {
	// 2 years tenure, age 55 → base 14 but minimum 20 applies
	assert.Equal(t, 20, domain.AnnualEntitlement(24, 55))
	// 2 years tenure, age 30 → base 14
	assert.Equal(t, 14, domain.AnnualEntitlement(24, 30))
	// 10 years tenure, age 60 → base 20 == min 20
	assert.Equal(t, 20, domain.AnnualEntitlement(120, 60))
	// 20 years tenure, age 60 → base 26 > min 20
	assert.Equal(t, 26, domain.AnnualEntitlement(240, 60))
	// under 1 year → 0 even if age 60
	assert.Equal(t, 0, domain.AnnualEntitlement(6, 60))
}

func TestTenureMonths(t *testing.T) {
	hire := time.Date(2020, 3, 15, 0, 0, 0, 0, time.UTC)
	cases := []struct {
		asOf time.Time
		want int
	}{
		{time.Date(2020, 3, 14, 0, 0, 0, 0, time.UTC), 0},
		{time.Date(2020, 3, 15, 0, 0, 0, 0, time.UTC), 0},
		{time.Date(2020, 4, 15, 0, 0, 0, 0, time.UTC), 1},
		{time.Date(2021, 3, 14, 0, 0, 0, 0, time.UTC), 11},
		{time.Date(2021, 3, 15, 0, 0, 0, 0, time.UTC), 12},
		{time.Date(2025, 3, 15, 0, 0, 0, 0, time.UTC), 60},
	}
	for _, tc := range cases {
		assert.Equal(t, tc.want, TenureMonths(hire, tc.asOf), tc.asOf.Format(time.DateOnly))
	}
}

func TestAge(t *testing.T) {
	birth := time.Date(1990, 6, 15, 0, 0, 0, 0, time.UTC)
	// Day before 34th birthday
	assert.Equal(t, 33, Age(birth, time.Date(2024, 6, 14, 0, 0, 0, 0, time.UTC)))
	// 34th birthday
	assert.Equal(t, 34, Age(birth, time.Date(2024, 6, 15, 0, 0, 0, 0, time.UTC)))
	// After 34th birthday
	assert.Equal(t, 34, Age(birth, time.Date(2024, 12, 31, 0, 0, 0, 0, time.UTC)))
	// Before next birthday
	assert.Equal(t, 34, Age(birth, time.Date(2025, 1, 1, 0, 0, 0, 0, time.UTC)))
}

func TestEntitlementAsOf_KnownScenarios(t *testing.T) {
	// Employee: age 30, hired 2020-01-01, asOf 2025-06-30 → 5 years 6 months → 20
	hire := time.Date(2020, 1, 1, 0, 0, 0, 0, time.UTC)
	birth := time.Date(1995, 1, 1, 0, 0, 0, 0, time.UTC)
	asOf := time.Date(2025, 6, 30, 0, 0, 0, 0, time.UTC)
	assert.Equal(t, 20, EntitlementAsOf(hire, birth, asOf))

	// 55-year-old at 2 years tenure → 20
	hire2 := time.Date(2023, 1, 1, 0, 0, 0, 0, time.UTC)
	birth2 := time.Date(1969, 1, 1, 0, 0, 0, 0, time.UTC)
	assert.Equal(t, 20, EntitlementAsOf(hire2, birth2, asOf))
}

func TestMaxCarryOver(t *testing.T) {
	assert.Equal(t, 28, domain.MaxCarryOver(14))
	assert.Equal(t, 40, domain.MaxCarryOver(20))
	assert.Equal(t, 52, domain.MaxCarryOver(26))
}
