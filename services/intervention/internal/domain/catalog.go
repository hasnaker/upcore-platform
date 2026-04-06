package domain

import (
	"time"

	"github.com/google/uuid"
	"github.com/lib/pq"
)

// Category classifies interventions by the JD-R area they address.
type Category string

const (
	CategoryCoaching      Category = "coaching"
	CategoryWorkload      Category = "workload"
	CategoryFlexibility   Category = "flexibility"
	CategoryRecognition   Category = "recognition"
	CategorySkillDev      Category = "skill_dev"
	CategoryWellbeing     Category = "wellbeing"
	CategorySocialSupport Category = "social_support"
	CategoryRoleDesign    Category = "role_design"
	CategoryLeadership    Category = "leadership"
	CategoryEnvironment   Category = "environment"
	CategoryOther         Category = "other"
)

// IsValidCategory returns true if c is a known intervention category.
func IsValidCategory(c Category) bool {
	switch c {
	case CategoryCoaching, CategoryWorkload, CategoryFlexibility, CategoryRecognition,
		CategorySkillDev, CategoryWellbeing, CategorySocialSupport, CategoryRoleDesign,
		CategoryLeadership, CategoryEnvironment, CategoryOther:
		return true
	}
	return false
}

// EvidenceTier is the strength of empirical support.
// A = meta-analytic (>=3 RCTs), B = multiple studies, C = theoretical/single study.
type EvidenceTier string

const (
	EvidenceTierA EvidenceTier = "A"
	EvidenceTierB EvidenceTier = "B"
	EvidenceTierC EvidenceTier = "C"
)

// IsValidEvidenceTier returns true if e is A, B, or C.
func IsValidEvidenceTier(e EvidenceTier) bool {
	return e == EvidenceTierA || e == EvidenceTierB || e == EvidenceTierC
}

// EvidenceWeight maps evidence tier to a numeric weight for ranking.
func EvidenceWeight(e EvidenceTier) float64 {
	switch e {
	case EvidenceTierA:
		return 1.0
	case EvidenceTierB:
		return 0.7
	case EvidenceTierC:
		return 0.4
	}
	return 0.0
}

// DeliveryMode describes how an intervention is delivered to employees.
type DeliveryMode string

const (
	DeliveryMode1on1         DeliveryMode = "1on1"
	DeliveryModeGroup        DeliveryMode = "group"
	DeliveryModeSelfService  DeliveryMode = "self_service"
	DeliveryModeWorkshop     DeliveryMode = "workshop"
	DeliveryModePolicyChange DeliveryMode = "policy_change"
	DeliveryModeTool         DeliveryMode = "tool"
	DeliveryModeAsync        DeliveryMode = "async"
)

// IsValidDeliveryMode returns true if m is a known delivery mode.
func IsValidDeliveryMode(m DeliveryMode) bool {
	switch m {
	case DeliveryMode1on1, DeliveryModeGroup, DeliveryModeSelfService,
		DeliveryModeWorkshop, DeliveryModePolicyChange, DeliveryModeTool, DeliveryModeAsync:
		return true
	}
	return false
}

// CostTier groups interventions by rough cost bracket.
type CostTier string

const (
	CostTierLow      CostTier = "low"
	CostTierMedium   CostTier = "medium"
	CostTierHigh     CostTier = "high"
	CostTierVariable CostTier = "variable"
)

// Intervention mirrors app.interventions.
type Intervention struct {
	ID                 uuid.UUID      `db:"id" json:"id"`
	TenantID           *uuid.UUID     `db:"tenant_id" json:"tenant_id,omitempty"`
	Code               string         `db:"code" json:"code"`
	TitleTR            string         `db:"title_tr" json:"title_tr"`
	TitleEN            *string        `db:"title_en" json:"title_en,omitempty"`
	DescriptionTR      string         `db:"description_tr" json:"description_tr"`
	DescriptionEN      *string        `db:"description_en" json:"description_en,omitempty"`
	Category           Category       `db:"category" json:"category"`
	EvidenceTier       EvidenceTier   `db:"evidence_tier" json:"evidence_tier"`
	TargetDrivers      pq.StringArray `db:"target_drivers" json:"target_drivers"`
	TargetBurnoutBand  pq.StringArray `db:"target_burnout_band" json:"target_burnout_band"`
	DeliveryMode       DeliveryMode   `db:"delivery_mode" json:"delivery_mode"`
	ExpectedEffectSize *float64       `db:"expected_effect_size" json:"expected_effect_size,omitempty"`
	TimeToEffectWeeks  *int           `db:"time_to_effect_weeks" json:"time_to_effect_weeks,omitempty"`
	DurationWeeks      *int           `db:"duration_weeks" json:"duration_weeks,omitempty"`
	CostTier           *CostTier      `db:"cost_tier" json:"cost_tier,omitempty"`
	Citations          []byte         `db:"citations" json:"-"`
	Active             bool           `db:"active" json:"active"`
	CreatedAt          time.Time      `db:"created_at" json:"created_at"`
	UpdatedAt          time.Time      `db:"updated_at" json:"updated_at"`
}

// Validate checks required fields and enumerated values.
func (i *Intervention) Validate() error {
	fields := map[string]string{}
	if i.Code == "" {
		fields["code"] = "required"
	}
	if i.TitleTR == "" {
		fields["title_tr"] = "required"
	}
	if i.DescriptionTR == "" {
		fields["description_tr"] = "required"
	}
	if !IsValidCategory(i.Category) {
		fields["category"] = "invalid"
	}
	if !IsValidEvidenceTier(i.EvidenceTier) {
		fields["evidence_tier"] = "invalid"
	}
	if !IsValidDeliveryMode(i.DeliveryMode) {
		fields["delivery_mode"] = "invalid"
	}
	if len(fields) > 0 {
		return NewValidationError(fields)
	}
	return nil
}

// CatalogFilter narrows a catalog listing.
type CatalogFilter struct {
	Category     *Category
	EvidenceTier *EvidenceTier
	DeliveryMode *DeliveryMode
	TargetDriver *string
	ActiveOnly   bool
	Search       string
	Limit        int
	Offset       int
}
