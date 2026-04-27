package domain

import (
	"strings"
	"time"

	"github.com/google/uuid"
	"github.com/lib/pq"
)

// CompetencyCategory enumerates the 6 buckets in the seed catalog.
type CompetencyCategory string

const (
	CompCatLeadership CompetencyCategory = "leadership"
	CompCatExecution  CompetencyCategory = "execution"
	CompCatTeamwork   CompetencyCategory = "teamwork"
	CompCatTechnical  CompetencyCategory = "technical"
	CompCatBehavioral CompetencyCategory = "behavioral"
	CompCatBusiness   CompetencyCategory = "business"
)

// IsValid reports whether the category is known.
func (c CompetencyCategory) IsValid() bool {
	switch c {
	case CompCatLeadership, CompCatExecution, CompCatTeamwork,
		CompCatTechnical, CompCatBehavioral, CompCatBusiness:
		return true
	}
	return false
}

// Competency mirrors app.competencies.
type Competency struct {
	ID            uuid.UUID           `db:"id" json:"id"`
	TenantID      *uuid.UUID          `db:"tenant_id" json:"tenant_id,omitempty"` // NULL = global
	Code          string              `db:"code" json:"code"`
	NameTR        string              `db:"name_tr" json:"name_tr"`
	NameEN        *string             `db:"name_en" json:"name_en,omitempty"`
	DescriptionTR *string             `db:"description_tr" json:"description_tr,omitempty"`
	Category      CompetencyCategory  `db:"category" json:"category"`
	AppliesTo     pq.StringArray      `db:"applies_to" json:"applies_to"`
	Anchors       JSONB               `db:"anchors" json:"anchors"`
	IsActive      bool                `db:"is_active" json:"is_active"`
	CreatedAt     time.Time           `db:"created_at" json:"created_at"`
	UpdatedAt     time.Time           `db:"updated_at" json:"updated_at"`
}

// ApplyDefaults fills DB-required defaults.
func (c *Competency) ApplyDefaults() {
	if c.ID == uuid.Nil {
		c.ID = uuid.New()
	}
	if len(c.AppliesTo) == 0 {
		c.AppliesTo = pq.StringArray{"all"}
	}
	if len(c.Anchors) == 0 {
		c.Anchors = JSONB("{}")
	}
}

// Validate enforces invariants.
func (c *Competency) Validate() error {
	fields := map[string]string{}
	if strings.TrimSpace(c.Code) == "" {
		fields["code"] = "required"
	}
	if strings.TrimSpace(c.NameTR) == "" {
		fields["name_tr"] = "required"
	}
	if !c.Category.IsValid() {
		fields["category"] = "invalid"
	}
	if len(fields) > 0 {
		return NewValidationError(fields)
	}
	return nil
}
