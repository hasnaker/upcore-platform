package domain

import (
	"time"

	"github.com/google/uuid"
)

// SubStatus enumerates subscription states.
type SubStatus string

const (
	SubStatusTrialing SubStatus = "trialing"
	SubStatusActive   SubStatus = "active"
	SubStatusPastDue  SubStatus = "past_due"
	SubStatusCanceled SubStatus = "canceled"
)

// Subscription tracks a tenant's current plan billing lifecycle.
type Subscription struct {
	ID                   uuid.UUID  `db:"id" json:"id"`
	TenantID             uuid.UUID  `db:"tenant_id" json:"tenant_id"`
	PlanID               string     `db:"plan_id" json:"plan_id"`
	Status               SubStatus  `db:"status" json:"status"`
	CurrentPeriodStart   time.Time  `db:"current_period_start" json:"current_period_start"`
	CurrentPeriodEnd     time.Time  `db:"current_period_end" json:"current_period_end"`
	CancelAt             *time.Time `db:"cancel_at" json:"cancel_at,omitempty"`
	StripeSubscriptionID *string    `db:"stripe_subscription_id" json:"stripe_subscription_id,omitempty"`
	IyzicoSubscriptionID *string    `db:"iyzico_subscription_id" json:"iyzico_subscription_id,omitempty"`
	Seats                int        `db:"seats" json:"seats"`
	TrialEndsAt          *time.Time `db:"trial_ends_at" json:"trial_ends_at,omitempty"`
	CreatedAt            time.Time  `db:"created_at" json:"created_at"`
	UpdatedAt            time.Time  `db:"updated_at" json:"updated_at"`
}

// IsActive returns true when subscription is billable.
func (s *Subscription) IsActive() bool {
	return s.Status == SubStatusActive || s.Status == SubStatusTrialing
}

// IsTrialing reports whether subscription is currently in trial.
func (s *Subscription) IsTrialing() bool {
	return s.Status == SubStatusTrialing && s.TrialEndsAt != nil && s.TrialEndsAt.After(time.Now())
}

// DaysUntilRenewal returns integer days until CurrentPeriodEnd.
func (s *Subscription) DaysUntilRenewal() int {
	d := time.Until(s.CurrentPeriodEnd)
	if d < 0 {
		return 0
	}
	return int(d.Hours() / 24)
}

// IsCanceled reports whether subscription has been canceled.
func (s *Subscription) IsCanceled() bool {
	return s.Status == SubStatusCanceled
}
