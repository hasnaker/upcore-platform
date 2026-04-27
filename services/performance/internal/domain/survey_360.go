// Package domain — 360° Feedback campaigns, invitations, responses.
package domain

import (
	"strings"
	"time"

	"github.com/google/uuid"
)

// ============================================================================
// AnonymityMode + CampaignStatus + InvitationStatus + Relation enums
// ============================================================================

// AnonymityMode enumerates anonymous vs named campaigns.
type AnonymityMode string

const (
	AnonModeAnonymous AnonymityMode = "anonymous"
	AnonModeNamed     AnonymityMode = "named"
)

// IsValid reports whether the anonymity mode is known.
func (m AnonymityMode) IsValid() bool {
	switch m {
	case AnonModeAnonymous, AnonModeNamed:
		return true
	}
	return false
}

// CampaignStatus enumerates 360 campaign lifecycle.
type CampaignStatus string

const (
	CampDraft       CampaignStatus = "draft"
	CampDistributed CampaignStatus = "distributed"
	CampCollecting  CampaignStatus = "collecting"
	CampComplete    CampaignStatus = "complete"
	CampCancelled   CampaignStatus = "cancelled"
)

// IsValid reports whether the campaign status is known.
func (s CampaignStatus) IsValid() bool {
	switch s {
	case CampDraft, CampDistributed, CampCollecting, CampComplete, CampCancelled:
		return true
	}
	return false
}

// CanTransitionTo reports whether the campaign may move to next.
func (s CampaignStatus) CanTransitionTo(next CampaignStatus) bool {
	if !next.IsValid() || s == next {
		return false
	}
	switch s {
	case CampDraft:
		return next == CampDistributed || next == CampCancelled
	case CampDistributed:
		return next == CampCollecting || next == CampCancelled
	case CampCollecting:
		return next == CampComplete || next == CampCancelled
	}
	return false
}

// InvitationStatus enumerates reviewer invitation lifecycle.
type InvitationStatus string

const (
	InvPending   InvitationStatus = "pending"
	InvSent      InvitationStatus = "sent"
	InvResponded InvitationStatus = "responded"
	InvDeclined  InvitationStatus = "declined"
	InvExpired   InvitationStatus = "expired"
)

// IsValid reports whether the invitation status is known.
func (s InvitationStatus) IsValid() bool {
	switch s {
	case InvPending, InvSent, InvResponded, InvDeclined, InvExpired:
		return true
	}
	return false
}

// Relation enumerates reviewer relation types.
type Relation string

const (
	RelSelf         Relation = "self"
	RelManager      Relation = "manager"
	RelPeer         Relation = "peer"
	RelDirectReport Relation = "direct_report"
)

// IsValid reports whether the relation is known.
func (r Relation) IsValid() bool {
	switch r {
	case RelSelf, RelManager, RelPeer, RelDirectReport:
		return true
	}
	return false
}

// ============================================================================
// Survey360Campaign
// ============================================================================

// Survey360Campaign mirrors app.survey_360_campaigns.
type Survey360Campaign struct {
	ID             uuid.UUID      `db:"id" json:"id"`
	TenantID       uuid.UUID      `db:"tenant_id" json:"tenant_id"`
	CycleID        uuid.UUID      `db:"cycle_id" json:"cycle_id"`
	SubjectUserID  uuid.UUID      `db:"subject_user_id" json:"subject_user_id"`
	CreatedBy      uuid.UUID      `db:"created_by" json:"created_by"`
	AnonymityMode  AnonymityMode  `db:"anonymity_mode" json:"anonymity_mode"`
	Status         CampaignStatus `db:"status" json:"status"`
	DueDate        time.Time      `db:"due_date" json:"due_date"`
	MinResponses   int            `db:"min_responses" json:"min_responses"`
	Metadata       JSONB          `db:"metadata" json:"metadata"`
	DistributedAt  *time.Time     `db:"distributed_at" json:"distributed_at,omitempty"`
	CompletedAt    *time.Time     `db:"completed_at" json:"completed_at,omitempty"`
	CreatedAt      time.Time      `db:"created_at" json:"created_at"`
	UpdatedAt      time.Time      `db:"updated_at" json:"updated_at"`
}

// ApplyDefaults populates DB-required fields.
func (c *Survey360Campaign) ApplyDefaults() {
	if c.ID == uuid.Nil {
		c.ID = uuid.New()
	}
	if c.Status == "" {
		c.Status = CampDraft
	}
	if c.AnonymityMode == "" {
		c.AnonymityMode = AnonModeAnonymous
	}
	if c.MinResponses == 0 {
		c.MinResponses = 3
	}
	if len(c.Metadata) == 0 {
		c.Metadata = JSONB("{}")
	}
}

// IsAnonymous reports whether the campaign hides reviewer identity.
func (c *Survey360Campaign) IsAnonymous() bool {
	return c.AnonymityMode == AnonModeAnonymous
}

// Validate enforces campaign invariants.
func (c *Survey360Campaign) Validate() error {
	fields := map[string]string{}
	if c.CycleID == uuid.Nil {
		fields["cycle_id"] = "required"
	}
	if c.SubjectUserID == uuid.Nil {
		fields["subject_user_id"] = "required"
	}
	if c.CreatedBy == uuid.Nil {
		fields["created_by"] = "required"
	}
	if !c.AnonymityMode.IsValid() {
		fields["anonymity_mode"] = "invalid"
	}
	if !c.Status.IsValid() {
		fields["status"] = "invalid"
	}
	if c.DueDate.IsZero() {
		fields["due_date"] = "required"
	}
	if c.MinResponses < 1 {
		fields["min_responses"] = "must_be_positive"
	}
	if len(fields) > 0 {
		return NewValidationError(fields)
	}
	return nil
}

// ============================================================================
// Survey360Invitation
// ============================================================================

// Survey360Invitation mirrors app.survey_360_invitations.
type Survey360Invitation struct {
	ID              uuid.UUID        `db:"id" json:"id"`
	TenantID        uuid.UUID        `db:"tenant_id" json:"tenant_id"`
	CampaignID      uuid.UUID        `db:"campaign_id" json:"campaign_id"`
	ReviewerUserID  uuid.UUID        `db:"reviewer_user_id" json:"reviewer_user_id"`
	Relation        Relation         `db:"relation" json:"relation"`
	Status          InvitationStatus `db:"status" json:"status"`
	SentAt          *time.Time       `db:"sent_at" json:"sent_at,omitempty"`
	RespondedAt     *time.Time       `db:"responded_at" json:"responded_at,omitempty"`
	CreatedAt       time.Time        `db:"created_at" json:"created_at"`
	UpdatedAt       time.Time        `db:"updated_at" json:"updated_at"`
}

// ApplyDefaults populates DB-required fields.
func (i *Survey360Invitation) ApplyDefaults() {
	if i.ID == uuid.Nil {
		i.ID = uuid.New()
	}
	if i.Status == "" {
		i.Status = InvPending
	}
}

// Validate enforces invitation invariants.
func (i *Survey360Invitation) Validate() error {
	fields := map[string]string{}
	if i.CampaignID == uuid.Nil {
		fields["campaign_id"] = "required"
	}
	if i.ReviewerUserID == uuid.Nil {
		fields["reviewer_user_id"] = "required"
	}
	if !i.Relation.IsValid() {
		fields["relation"] = "invalid"
	}
	if !i.Status.IsValid() {
		fields["status"] = "invalid"
	}
	if len(fields) > 0 {
		return NewValidationError(fields)
	}
	return nil
}

// ============================================================================
// Survey360Response
// ============================================================================

// Survey360Response mirrors app.survey_360_responses.
type Survey360Response struct {
	ID               uuid.UUID `db:"id" json:"id"`
	TenantID         uuid.UUID `db:"tenant_id" json:"tenant_id"`
	InvitationID     uuid.UUID `db:"invitation_id" json:"invitation_id"`
	CampaignID       uuid.UUID `db:"campaign_id" json:"campaign_id"`
	CompetencyCode   string    `db:"competency_code" json:"competency_code"`
	CompetencyNameTR string    `db:"competency_name_tr" json:"competency_name_tr"`
	Score            int16     `db:"score" json:"score"`
	Comment          *string   `db:"comment" json:"comment,omitempty"`
	CreatedAt        time.Time `db:"created_at" json:"created_at"`
}

// ApplyDefaults populates DB-required fields.
func (r *Survey360Response) ApplyDefaults() {
	if r.ID == uuid.Nil {
		r.ID = uuid.New()
	}
}

// Validate enforces response invariants.
func (r *Survey360Response) Validate() error {
	fields := map[string]string{}
	if r.InvitationID == uuid.Nil {
		fields["invitation_id"] = "required"
	}
	if r.CampaignID == uuid.Nil {
		fields["campaign_id"] = "required"
	}
	if strings.TrimSpace(r.CompetencyCode) == "" {
		fields["competency_code"] = "required"
	}
	if strings.TrimSpace(r.CompetencyNameTR) == "" {
		fields["competency_name_tr"] = "required"
	}
	if r.Score < 1 || r.Score > 5 {
		fields["score"] = "must_be_1_to_5"
	}
	if len(fields) > 0 {
		return NewValidationError(fields)
	}
	return nil
}

// ============================================================================
// Report projections
// ============================================================================

// CompetencyAggregate is one row in the radar report.
// Named mode attaches reviewer IDs; anonymous mode MUST leave them empty.
type CompetencyAggregate struct {
	CompetencyCode   string             `json:"competency_code"`
	CompetencyNameTR string             `json:"competency_name_tr"`
	Average          float64            `json:"average"`
	SampleSize       int                `json:"sample_size"`
	ByRelation       map[Relation]float64 `json:"by_relation"`
}

// Survey360Report is the radar-ready payload.
type Survey360Report struct {
	CampaignID    uuid.UUID             `json:"campaign_id"`
	SubjectUserID uuid.UUID             `json:"subject_user_id"`
	AnonymityMode AnonymityMode         `json:"anonymity_mode"`
	Status        CampaignStatus        `json:"status"`
	ResponseCount int                   `json:"response_count"`
	ReviewerCount int                   `json:"reviewer_count"`
	MinResponses  int                   `json:"min_responses"`
	Unlocked      bool                  `json:"unlocked"`
	LockedReason  string                `json:"locked_reason,omitempty"`
	Competencies  []CompetencyAggregate `json:"competencies"`
	Strengths     []string              `json:"strengths"`
	GrowthAreas   []string              `json:"growth_areas"`
}
