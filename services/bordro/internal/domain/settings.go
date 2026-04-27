package domain

import (
	"time"

	"github.com/google/uuid"
)

// BordroSettings mirrors app.tenant_bordro_settings.
type BordroSettings struct {
	ID                      uuid.UUID `db:"id" json:"id"`
	TenantID                uuid.UUID `db:"tenant_id" json:"tenant_id"`
	HoursPerMonth           float64   `db:"hours_per_month" json:"hours_per_month"`
	MealDailyGross          float64   `db:"meal_daily_gross" json:"meal_daily_gross"`
	MealExemptDaily         float64   `db:"meal_exempt_daily" json:"meal_exempt_daily"`
	TransportDailyGross     float64   `db:"transport_daily_gross" json:"transport_daily_gross"`
	TransportExemptDaily    float64   `db:"transport_exempt_daily" json:"transport_exempt_daily"`
	KidemYearlyCap          *float64  `db:"kidem_yearly_cap" json:"kidem_yearly_cap,omitempty"`
	ApplyMinWageExemption   bool      `db:"apply_min_wage_exemption" json:"apply_min_wage_exemption"`
	Enable5510Incentive     bool      `db:"-" json:"enable_5510_incentive"` // virtual flag; column optional
	OvertimeYTDResetMonth   int16     `db:"overtime_ytd_reset_month" json:"overtime_ytd_reset_month"`
	CreatedAt               time.Time `db:"created_at" json:"created_at"`
	UpdatedAt               time.Time `db:"updated_at" json:"updated_at"`
}

// ApplyDefaults fills DB-required defaults (matches migration 028).
func (b *BordroSettings) ApplyDefaults() {
	if b.ID == uuid.Nil {
		b.ID = uuid.New()
	}
	if b.HoursPerMonth == 0 {
		b.HoursPerMonth = 225.00
	}
	if b.MealExemptDaily == 0 {
		b.MealExemptDaily = 240.00
	}
	if b.TransportExemptDaily == 0 {
		b.TransportExemptDaily = 126.00
	}
	if b.OvertimeYTDResetMonth == 0 {
		b.OvertimeYTDResetMonth = 1
	}
}

// Validate enforces invariants.
func (b *BordroSettings) Validate() error {
	fields := map[string]string{}
	if b.HoursPerMonth <= 0 || b.HoursPerMonth > 300 {
		fields["hours_per_month"] = "must_be_in_range"
	}
	if b.MealDailyGross < 0 {
		fields["meal_daily_gross"] = "must_be_positive"
	}
	if b.TransportDailyGross < 0 {
		fields["transport_daily_gross"] = "must_be_positive"
	}
	if b.OvertimeYTDResetMonth < 1 || b.OvertimeYTDResetMonth > 12 {
		fields["overtime_ytd_reset_month"] = "must_be_1_to_12"
	}
	if len(fields) > 0 {
		return NewValidationError(fields)
	}
	return nil
}
