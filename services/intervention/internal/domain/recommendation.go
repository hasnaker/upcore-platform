package domain

import "github.com/google/uuid"

// Recommendation is a ranked suggestion for an employee.
type Recommendation struct {
	InterventionID  uuid.UUID    `json:"intervention_id"`
	Code            string       `json:"code"`
	TitleTR         string       `json:"title_tr"`
	Category        Category     `json:"category"`
	EvidenceTier    EvidenceTier `json:"evidence_tier"`
	Score           float64      `json:"score"`
	ThompsonSample  float64      `json:"thompson_sample"`
	ExpectedSuccess float64      `json:"expected_success"`
	NObservations   int          `json:"n_observations"`
	RationaleTR     string       `json:"rationale_tr"`
}
