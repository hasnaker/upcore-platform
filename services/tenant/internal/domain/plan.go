package domain

import (
	"database/sql/driver"
	"encoding/json"
	"fmt"
	"time"
)

// PlanTier identifies plan tiers.
type PlanTier string

const (
	PlanTierFree       PlanTier = "free"
	PlanTierStarter    PlanTier = "starter"
	PlanTierGrowth     PlanTier = "growth"
	PlanTierPlatform   PlanTier = "platform"
	PlanTierEnterprise PlanTier = "enterprise"
)

// PlanFeatures is the JSONB features blob.
type PlanFeatures struct {
	MaxEmployees *int     `json:"max_employees"`
	Modules      []string `json:"modules"`
	Extra        map[string]any `json:"extra,omitempty"`
}

// Value implements driver.Valuer for writes.
func (p PlanFeatures) Value() (driver.Value, error) {
	return json.Marshal(p)
}

// Scan implements sql.Scanner for reads.
func (p *PlanFeatures) Scan(src any) error {
	if src == nil {
		*p = PlanFeatures{}
		return nil
	}
	var b []byte
	switch v := src.(type) {
	case []byte:
		b = v
	case string:
		b = []byte(v)
	default:
		return fmt.Errorf("unsupported PlanFeatures src type %T", src)
	}
	return json.Unmarshal(b, p)
}

// Plan represents a subscription tier.
type Plan struct {
	ID           string       `db:"id" json:"id"`
	Name         string       `db:"name" json:"name"`
	Tier         PlanTier     `db:"tier" json:"tier"`
	PriceMonthly *int64       `db:"price_monthly" json:"price_monthly"`
	Features     PlanFeatures `db:"features" json:"features"`
	IsActive     bool         `db:"is_active" json:"is_active"`
	CreatedAt    time.Time    `db:"created_at" json:"created_at"`
	UpdatedAt    time.Time    `db:"updated_at" json:"updated_at"`
}

// HasModule reports whether the plan grants access to a module.
func (p *Plan) HasModule(name string) bool {
	for _, m := range p.Features.Modules {
		if m == name || m == "all" {
			return true
		}
	}
	return false
}

// SeatCap returns the max employees allowed. 0 means unlimited.
func (p *Plan) SeatCap() int {
	if p.Features.MaxEmployees == nil {
		return 0
	}
	return *p.Features.MaxEmployees
}

// CanAddSeats reports whether the plan can accommodate the requested total seats.
func (p *Plan) CanAddSeats(total int) bool {
	cap := p.SeatCap()
	if cap == 0 {
		return true
	}
	return total <= cap
}
