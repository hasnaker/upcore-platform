package domain

import (
	"time"

	"github.com/google/uuid"
)

// Posterior mirrors ml.effectiveness_posteriors and carries the Beta(α, β)
// distribution state for Thompson sampling.
type Posterior struct {
	ID             uuid.UUID  `db:"id" json:"id"`
	TenantID       *uuid.UUID `db:"tenant_id" json:"tenant_id,omitempty"`
	InterventionID uuid.UUID  `db:"intervention_id" json:"intervention_id"`
	Segment        string     `db:"segment" json:"segment"`
	Alpha          float64    `db:"alpha" json:"alpha"`
	Beta           float64    `db:"beta" json:"beta"`
	NObservations  int        `db:"n_observations" json:"n_observations"`
	MeanEffect     *float64   `db:"mean_effect" json:"mean_effect,omitempty"`
	LastUpdatedAt  time.Time  `db:"last_updated_at" json:"last_updated_at"`
	CreatedAt      time.Time  `db:"created_at" json:"created_at"`
}

// ExpectedSuccess returns the mean of Beta(α, β) = α / (α + β).
func (p *Posterior) ExpectedSuccess() float64 {
	denom := p.Alpha + p.Beta
	if denom <= 0 {
		return 0
	}
	return p.Alpha / denom
}

// Variance returns the variance of Beta(α, β) = αβ / ((α+β)^2 (α+β+1)).
func (p *Posterior) Variance() float64 {
	s := p.Alpha + p.Beta
	if s <= 0 {
		return 0
	}
	return (p.Alpha * p.Beta) / (s * s * (s + 1.0))
}

// Update applies a Bernoulli observation to the Beta posterior.
func (p *Posterior) Update(success bool) {
	if success {
		p.Alpha++
	} else {
		p.Beta++
	}
	p.NObservations++
	p.LastUpdatedAt = time.Now().UTC()
}

// EffectCategory classifies the mean_effect on Cohen's d thresholds.
// trivial < 0.2 <= small < 0.5 <= medium < 0.8 <= large.
func EffectCategory(d float64) string {
	abs := d
	if abs < 0 {
		abs = -abs
	}
	switch {
	case abs < 0.2:
		return "trivial"
	case abs < 0.5:
		return "small"
	case abs < 0.8:
		return "medium"
	default:
		return "large"
	}
}
