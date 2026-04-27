// Package domain — PIP (Performans İyileştirme Planı) aggregate.
// İş Kanunu 25/2 prosedürüne uyumlu: legal review zorunlu, dosya
// mahkeme delil niteliğinde tutulur.
package domain

import (
	"net"
	"strings"
	"time"

	"github.com/google/uuid"
)

// ============================================================================
// PIP reason category
// ============================================================================

// PipReasonCategory enumerates why the PIP was opened.
type PipReasonCategory string

const (
	// PipReasonPerformance — performans düşüklüğü.
	PipReasonPerformance PipReasonCategory = "performance"
	// PipReasonAttendance — devamsızlık / geç kalma.
	PipReasonAttendance PipReasonCategory = "attendance"
	// PipReasonConduct — iş yeri davranışı / disiplin.
	PipReasonConduct PipReasonCategory = "conduct"
	// PipReasonCompetency — kompetans / nitelik eksikliği.
	PipReasonCompetency PipReasonCategory = "competency"
)

// IsValid reports whether the reason is known.
func (c PipReasonCategory) IsValid() bool {
	switch c {
	case PipReasonPerformance, PipReasonAttendance, PipReasonConduct, PipReasonCompetency:
		return true
	}
	return false
}

// ============================================================================
// PIP status + state machine
// ============================================================================

// PipStatus enumerates case lifecycle states.
type PipStatus string

const (
	// PipStatusDraft — yönetici oluşturdu, İK/legal beklemede.
	PipStatusDraft PipStatus = "draft"
	// PipStatusPendingLegal — İK reviewer atandı, legal onay bekliyor.
	PipStatusPendingLegal PipStatus = "pending_legal"
	// PipStatusActive — legal onayladı, süreç başladı.
	PipStatusActive PipStatus = "active"
	// PipStatusExtended — süre uzatıldı (30/60/90 yeni periyot).
	PipStatusExtended PipStatus = "extended"
	// PipStatusPassed — başarılı kapandı.
	PipStatusPassed PipStatus = "passed"
	// PipStatusTerminated — başarısız — iş sözleşmesi feshi (25/2).
	PipStatusTerminated PipStatus = "terminated"
)

// IsValid reports whether the status is known.
func (s PipStatus) IsValid() bool {
	switch s {
	case PipStatusDraft, PipStatusPendingLegal, PipStatusActive,
		PipStatusExtended, PipStatusPassed, PipStatusTerminated:
		return true
	}
	return false
}

// IsClosed reports whether the case has reached a terminal state.
func (s PipStatus) IsClosed() bool {
	return s == PipStatusPassed || s == PipStatusTerminated
}

// IsActive reports whether check-ins can still be added.
func (s PipStatus) IsActive() bool {
	return s == PipStatusActive || s == PipStatusExtended
}

// CanTransitionTo encodes the PIP state machine:
//
//	draft → pending_legal → active ⇄ extended → {passed|terminated}
//	(draft may also be terminated directly if withdrawn before legal review)
func (s PipStatus) CanTransitionTo(next PipStatus) bool {
	if !next.IsValid() || s == next {
		return false
	}
	switch s {
	case PipStatusDraft:
		return next == PipStatusPendingLegal
	case PipStatusPendingLegal:
		return next == PipStatusActive
	case PipStatusActive:
		return next == PipStatusExtended || next == PipStatusPassed || next == PipStatusTerminated
	case PipStatusExtended:
		return next == PipStatusPassed || next == PipStatusTerminated
	}
	return false
}

// ============================================================================
// PIP priority (goals)
// ============================================================================

// PipPriority enumerates goal priorities.
type PipPriority string

const (
	// PipPriorityLow goal priority.
	PipPriorityLow PipPriority = "low"
	// PipPriorityMedium goal priority.
	PipPriorityMedium PipPriority = "medium"
	// PipPriorityHigh goal priority.
	PipPriorityHigh PipPriority = "high"
)

// IsValid reports whether the priority is known.
func (p PipPriority) IsValid() bool {
	switch p {
	case PipPriorityLow, PipPriorityMedium, PipPriorityHigh:
		return true
	}
	return false
}

// ============================================================================
// PIP check-in track
// ============================================================================

// PipCheckinTrack enumerates weekly on/off-track.
type PipCheckinTrack string

const (
	// PipTrackOn — hedef doğrultusunda.
	PipTrackOn PipCheckinTrack = "on_track"
	// PipTrackOff — hedefin gerisinde.
	PipTrackOff PipCheckinTrack = "off_track"
)

// IsValid reports whether the value is known.
func (t PipCheckinTrack) IsValid() bool {
	switch t {
	case PipTrackOn, PipTrackOff:
		return true
	}
	return false
}

// ============================================================================
// PIP outcome result
// ============================================================================

// PipOutcomeResult enumerates outcomes.
type PipOutcomeResult string

const (
	// PipOutcomePassed — başarılı.
	PipOutcomePassed PipOutcomeResult = "passed"
	// PipOutcomeExtended — uzatıldı.
	PipOutcomeExtended PipOutcomeResult = "extended"
	// PipOutcomeTerminated — fesih.
	PipOutcomeTerminated PipOutcomeResult = "terminated"
)

// IsValid reports whether the outcome is known.
func (r PipOutcomeResult) IsValid() bool {
	switch r {
	case PipOutcomePassed, PipOutcomeExtended, PipOutcomeTerminated:
		return true
	}
	return false
}

// ============================================================================
// Aggregates
// ============================================================================

// ValidDurations lists the allowed case lengths (in days).
var ValidDurations = []int{30, 60, 90}

// IsValidDuration reports whether d is allowed by business + DB rules.
func IsValidDuration(d int) bool {
	for _, v := range ValidDurations {
		if d == v {
			return true
		}
	}
	return false
}

// PipCase mirrors app.pip_cases.
type PipCase struct {
	ID              uuid.UUID         `db:"id"                json:"id"`
	TenantID        uuid.UUID         `db:"tenant_id"         json:"tenant_id"`
	EmployeeID      uuid.UUID         `db:"employee_id"       json:"employee_id"`
	InitiatedBy     uuid.UUID         `db:"initiated_by"      json:"initiated_by"`
	HRReviewerID    *uuid.UUID        `db:"hr_reviewer_id"    json:"hr_reviewer_id,omitempty"`
	LegalReviewerID *uuid.UUID        `db:"legal_reviewer_id" json:"legal_reviewer_id,omitempty"`
	LegalReviewed   bool              `db:"legal_reviewed"    json:"legal_reviewed"`
	ReasonCategory  PipReasonCategory `db:"reason_category"   json:"reason_category"`
	ReasonSummary   string            `db:"reason_summary"    json:"reason_summary"`
	StartDate       time.Time         `db:"start_date"        json:"start_date"`
	DurationDays    int               `db:"duration_days"     json:"duration_days"`
	Status          PipStatus         `db:"status"            json:"status"`
	LegalFileURL    *string           `db:"legal_file_url"    json:"legal_file_url,omitempty"`
	OutcomeReason   *string           `db:"outcome_reason"    json:"outcome_reason,omitempty"`
	CreatedAt       time.Time         `db:"created_at"        json:"created_at"`
	UpdatedAt       time.Time         `db:"updated_at"        json:"updated_at"`

	Goals    []PipGoal    `db:"-" json:"goals,omitempty"`
	Checkins []PipCheckin `db:"-" json:"checkins,omitempty"`
	Outcome  *PipOutcome  `db:"-" json:"outcome,omitempty"`
}

// ApplyDefaults fills DB-required defaults.
func (c *PipCase) ApplyDefaults() {
	if c.ID == uuid.Nil {
		c.ID = uuid.New()
	}
	if c.Status == "" {
		c.Status = PipStatusDraft
	}
}

// Validate enforces invariants for draft create.
func (c *PipCase) Validate() error {
	fields := map[string]string{}
	if c.TenantID == uuid.Nil {
		fields["tenant_id"] = "required"
	}
	if c.EmployeeID == uuid.Nil {
		fields["employee_id"] = "required"
	}
	if c.InitiatedBy == uuid.Nil {
		fields["initiated_by"] = "required"
	}
	if !c.ReasonCategory.IsValid() {
		fields["reason_category"] = "invalid"
	}
	if strings.TrimSpace(c.ReasonSummary) == "" {
		fields["reason_summary"] = "required"
	}
	if c.StartDate.IsZero() {
		fields["start_date"] = "required"
	}
	if !IsValidDuration(c.DurationDays) {
		fields["duration_days"] = "must_be_30_60_or_90"
	}
	if !c.Status.IsValid() {
		fields["status"] = "invalid"
	}
	if len(fields) > 0 {
		return NewValidationError(fields)
	}
	return nil
}

// EndDate returns start_date + duration_days.
func (c *PipCase) EndDate() time.Time {
	if c.StartDate.IsZero() || c.DurationDays <= 0 {
		return time.Time{}
	}
	return c.StartDate.AddDate(0, 0, c.DurationDays)
}

// PipGoal mirrors app.pip_goals.
type PipGoal struct {
	ID               uuid.UUID   `db:"id"                 json:"id"`
	TenantID         uuid.UUID   `db:"tenant_id"          json:"tenant_id"`
	CaseID           uuid.UUID   `db:"case_id"            json:"case_id"`
	Description      string      `db:"description"        json:"description"`
	MeasurableTarget string      `db:"measurable_target"  json:"measurable_target"`
	Deadline         time.Time   `db:"deadline"           json:"deadline"`
	Priority         PipPriority `db:"priority"           json:"priority"`
	CreatedAt        time.Time   `db:"created_at"         json:"created_at"`
}

// ApplyDefaults fills DB-required defaults.
func (g *PipGoal) ApplyDefaults() {
	if g.ID == uuid.Nil {
		g.ID = uuid.New()
	}
	if g.Priority == "" {
		g.Priority = PipPriorityMedium
	}
}

// Validate enforces invariants.
func (g *PipGoal) Validate() error {
	fields := map[string]string{}
	if g.CaseID == uuid.Nil {
		fields["case_id"] = "required"
	}
	if strings.TrimSpace(g.Description) == "" {
		fields["description"] = "required"
	}
	if strings.TrimSpace(g.MeasurableTarget) == "" {
		fields["measurable_target"] = "required"
	}
	if g.Deadline.IsZero() {
		fields["deadline"] = "required"
	}
	if !g.Priority.IsValid() {
		fields["priority"] = "invalid"
	}
	if len(fields) > 0 {
		return NewValidationError(fields)
	}
	return nil
}

// PipCheckin mirrors app.pip_checkins.
type PipCheckin struct {
	ID                     uuid.UUID       `db:"id"                        json:"id"`
	TenantID               uuid.UUID       `db:"tenant_id"                 json:"tenant_id"`
	CaseID                 uuid.UUID       `db:"case_id"                   json:"case_id"`
	WeekNumber             int             `db:"week_number"               json:"week_number"`
	OnTrack                PipCheckinTrack `db:"on_track"                  json:"on_track"`
	ManagerNotes           *string         `db:"manager_notes"             json:"manager_notes,omitempty"`
	EmployeeNotes          *string         `db:"employee_notes"            json:"employee_notes,omitempty"`
	AcknowledgedByEmployee *time.Time      `db:"acknowledged_by_employee"  json:"acknowledged_by_employee,omitempty"`
	AcknowledgeIP          *string         `db:"acknowledge_ip"            json:"acknowledge_ip,omitempty"`
	AcknowledgeUserAgent   *string         `db:"acknowledge_user_agent"    json:"acknowledge_user_agent,omitempty"`
	CreatedBy              uuid.UUID       `db:"created_by"                json:"created_by"`
	CreatedAt              time.Time       `db:"created_at"                json:"created_at"`
}

// ApplyDefaults fills DB-required defaults.
func (c *PipCheckin) ApplyDefaults() {
	if c.ID == uuid.Nil {
		c.ID = uuid.New()
	}
}

// Validate enforces invariants.
func (c *PipCheckin) Validate() error {
	fields := map[string]string{}
	if c.CaseID == uuid.Nil {
		fields["case_id"] = "required"
	}
	if c.WeekNumber < 1 || c.WeekNumber > 52 {
		fields["week_number"] = "must_be_1_to_52"
	}
	if !c.OnTrack.IsValid() {
		fields["on_track"] = "invalid"
	}
	if c.CreatedBy == uuid.Nil {
		fields["created_by"] = "required"
	}
	if len(fields) > 0 {
		return NewValidationError(fields)
	}
	return nil
}

// SetAcknowledge records the employee acknowledgement with mahkeme-delil nitelikli IP + UA.
func (c *PipCheckin) SetAcknowledge(ip, userAgent string) {
	now := time.Now().UTC()
	c.AcknowledgedByEmployee = &now
	if trimmed := strings.TrimSpace(ip); trimmed != "" {
		if parsed := net.ParseIP(trimmed); parsed != nil {
			val := parsed.String()
			c.AcknowledgeIP = &val
		}
	}
	if ua := strings.TrimSpace(userAgent); ua != "" {
		if len(ua) > 500 {
			ua = ua[:500]
		}
		c.AcknowledgeUserAgent = &ua
	}
}

// PipOutcome mirrors app.pip_outcome.
type PipOutcome struct {
	ID           uuid.UUID        `db:"id"             json:"id"`
	TenantID     uuid.UUID        `db:"tenant_id"      json:"tenant_id"`
	CaseID       uuid.UUID        `db:"case_id"        json:"case_id"`
	Result       PipOutcomeResult `db:"result"         json:"result"`
	LegalFileURL *string          `db:"legal_file_url" json:"legal_file_url,omitempty"`
	OutcomeNotes *string          `db:"outcome_notes"  json:"outcome_notes,omitempty"`
	ClosedAt     time.Time        `db:"closed_at"      json:"closed_at"`
	ClosedBy     uuid.UUID        `db:"closed_by"      json:"closed_by"`
	CreatedAt    time.Time        `db:"created_at"     json:"created_at"`
}

// ApplyDefaults fills DB-required defaults.
func (o *PipOutcome) ApplyDefaults() {
	if o.ID == uuid.Nil {
		o.ID = uuid.New()
	}
	if o.ClosedAt.IsZero() {
		o.ClosedAt = time.Now().UTC()
	}
}

// Validate enforces invariants — İş Kanunu 25/2: terminated ise dosya zorunlu.
func (o *PipOutcome) Validate() error {
	fields := map[string]string{}
	if o.CaseID == uuid.Nil {
		fields["case_id"] = "required"
	}
	if !o.Result.IsValid() {
		fields["result"] = "invalid"
	}
	if o.ClosedBy == uuid.Nil {
		fields["closed_by"] = "required"
	}
	if o.Result == PipOutcomeTerminated {
		if o.LegalFileURL == nil || strings.TrimSpace(*o.LegalFileURL) == "" {
			fields["legal_file_url"] = "required_for_terminated"
		}
	}
	if len(fields) > 0 {
		return NewValidationError(fields)
	}
	return nil
}
