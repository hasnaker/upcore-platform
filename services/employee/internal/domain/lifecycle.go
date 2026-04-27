package domain

import (
	"errors"
	"strings"
	"time"

	"github.com/google/uuid"
)

// ============================================================================
// Career Events
// ============================================================================

// CareerEventType enumerates career-timeline event kinds.
type CareerEventType string

const (
	CareerHire                CareerEventType = "hire"
	CareerPromotion           CareerEventType = "promotion"
	CareerTransfer            CareerEventType = "transfer"
	CareerRoleChange          CareerEventType = "role_change"
	CareerCompensationChange  CareerEventType = "compensation_change"
	CareerProbationPassed     CareerEventType = "probation_passed"
	CareerAward               CareerEventType = "award"
	CareerCommendation        CareerEventType = "commendation"
	CareerDisciplinary        CareerEventType = "disciplinary"
	CareerLeaveStart          CareerEventType = "leave_start"
	CareerLeaveEnd            CareerEventType = "leave_end"
	CareerTermination         CareerEventType = "termination"
	CareerRetire              CareerEventType = "retire"
)

// IsValid reports whether the event type is known.
func (t CareerEventType) IsValid() bool {
	switch t {
	case CareerHire, CareerPromotion, CareerTransfer, CareerRoleChange,
		CareerCompensationChange, CareerProbationPassed, CareerAward,
		CareerCommendation, CareerDisciplinary, CareerLeaveStart, CareerLeaveEnd,
		CareerTermination, CareerRetire:
		return true
	}
	return false
}

// CareerEvent mirrors app.career_events.
type CareerEvent struct {
	ID            uuid.UUID       `db:"id" json:"id"`
	TenantID      uuid.UUID       `db:"tenant_id" json:"tenant_id"`
	EmployeeID    uuid.UUID       `db:"employee_id" json:"employee_id"`
	EventType     CareerEventType `db:"event_type" json:"event_type"`
	EffectiveDate time.Time       `db:"effective_date" json:"effective_date"`
	FromValue     JSONB           `db:"from_value" json:"from_value,omitempty"`
	ToValue       JSONB           `db:"to_value" json:"to_value,omitempty"`
	ReasonTR      *string         `db:"reason_tr" json:"reason_tr,omitempty"`
	ApprovedBy    *uuid.UUID      `db:"approved_by" json:"approved_by,omitempty"`
	ApprovedAt    *time.Time      `db:"approved_at" json:"approved_at,omitempty"`
	Metadata      JSONB           `db:"metadata" json:"metadata"`
	CreatedAt     time.Time       `db:"created_at" json:"created_at"`
}

// ApplyDefaults fills required defaults.
func (c *CareerEvent) ApplyDefaults() {
	if c.ID == uuid.Nil {
		c.ID = uuid.New()
	}
	if len(c.Metadata) == 0 {
		c.Metadata = JSONB("{}")
	}
}

// Validate enforces invariants.
func (c *CareerEvent) Validate() error {
	fields := map[string]string{}
	if c.EmployeeID == uuid.Nil {
		fields["employee_id"] = "required"
	}
	if !c.EventType.IsValid() {
		fields["event_type"] = "invalid"
	}
	if c.EffectiveDate.IsZero() {
		fields["effective_date"] = "required"
	}
	if len(fields) > 0 {
		return NewValidationError(fields)
	}
	return nil
}

// ============================================================================
// Compensation Records
// ============================================================================

// CompensationType enumerates compensation categories.
type CompensationType string

const (
	CompBaseSalary CompensationType = "base_salary"
	CompBonus      CompensationType = "bonus"
	CompEquity     CompensationType = "equity"
	CompBenefit    CompensationType = "benefit"
	CompAllowance  CompensationType = "allowance"
	CompAdjustment CompensationType = "adjustment"
)

// IsValid reports whether the type is known.
func (t CompensationType) IsValid() bool {
	switch t {
	case CompBaseSalary, CompBonus, CompEquity, CompBenefit, CompAllowance, CompAdjustment:
		return true
	}
	return false
}

// CompensationFrequency enumerates payout cadences.
type CompensationFrequency string

const (
	FreqMonthly CompensationFrequency = "monthly"
	FreqAnnual  CompensationFrequency = "annual"
	FreqOneTime CompensationFrequency = "one_time"
	FreqHourly  CompensationFrequency = "hourly"
)

// IsValid reports whether the frequency is known.
func (f CompensationFrequency) IsValid() bool {
	switch f {
	case FreqMonthly, FreqAnnual, FreqOneTime, FreqHourly:
		return true
	}
	return false
}

// CompensationRecord mirrors app.compensation_records.
type CompensationRecord struct {
	ID                uuid.UUID             `db:"id" json:"id"`
	TenantID          uuid.UUID             `db:"tenant_id" json:"tenant_id"`
	EmployeeID        uuid.UUID             `db:"employee_id" json:"employee_id"`
	EffectiveDate     time.Time             `db:"effective_date" json:"effective_date"`
	CompensationType  CompensationType      `db:"compensation_type" json:"compensation_type"`
	Amount            float64               `db:"amount" json:"amount"`
	Currency          string                `db:"currency" json:"currency"`
	Frequency         CompensationFrequency `db:"frequency" json:"frequency"`
	ReasonTR          *string               `db:"reason_tr" json:"reason_tr,omitempty"`
	ApprovedBy        *uuid.UUID            `db:"approved_by" json:"approved_by,omitempty"`
	ApprovedAt        *time.Time            `db:"approved_at" json:"approved_at,omitempty"`
	SourceEventID     *uuid.UUID            `db:"source_event_id" json:"source_event_id,omitempty"`
	IsActive          bool                  `db:"is_active" json:"is_active"`
	CreatedAt         time.Time             `db:"created_at" json:"created_at"`
	UpdatedAt         time.Time             `db:"updated_at" json:"updated_at"`
}

// ApplyDefaults fills required defaults.
func (c *CompensationRecord) ApplyDefaults() {
	if c.ID == uuid.Nil {
		c.ID = uuid.New()
	}
	if c.Currency == "" {
		c.Currency = "TRY"
	}
	if c.Frequency == "" {
		c.Frequency = FreqMonthly
	}
}

// Validate enforces invariants.
func (c *CompensationRecord) Validate() error {
	fields := map[string]string{}
	if c.EmployeeID == uuid.Nil {
		fields["employee_id"] = "required"
	}
	if c.EffectiveDate.IsZero() {
		fields["effective_date"] = "required"
	}
	if !c.CompensationType.IsValid() {
		fields["compensation_type"] = "invalid"
	}
	if c.Amount < 0 {
		fields["amount"] = "must_be_positive"
	}
	if !c.Frequency.IsValid() {
		fields["frequency"] = "invalid"
	}
	if len(fields) > 0 {
		return NewValidationError(fields)
	}
	return nil
}

// ============================================================================
// Related Contacts (genişletilmiş EmergencyContact alternatifi)
// ============================================================================

// ContactKind enumerates related_contacts categories.
type ContactKind string

const (
	ContactKindEmergency ContactKind = "emergency"
	ContactKindFamily    ContactKind = "family"
	ContactKindReference ContactKind = "reference"
	ContactKindMedical   ContactKind = "medical"
	ContactKindLegal     ContactKind = "legal"
)

// IsValid reports whether the kind is known.
func (k ContactKind) IsValid() bool {
	switch k {
	case ContactKindEmergency, ContactKindFamily, ContactKindReference, ContactKindMedical, ContactKindLegal:
		return true
	}
	return false
}

// RelatedContact mirrors app.related_contacts.
type RelatedContact struct {
	ID         uuid.UUID   `db:"id" json:"id"`
	TenantID   uuid.UUID   `db:"tenant_id" json:"tenant_id"`
	EmployeeID uuid.UUID   `db:"employee_id" json:"employee_id"`
	Kind       ContactKind `db:"kind" json:"kind"`
	FullName   string      `db:"full_name" json:"full_name"`
	Relation   string      `db:"relation" json:"relation"`
	Phone      *string     `db:"phone" json:"phone,omitempty"`
	Email      *string     `db:"email" json:"email,omitempty"`
	IsPrimary  bool        `db:"is_primary" json:"is_primary"`
	Notes      *string     `db:"notes" json:"notes,omitempty"`
	CreatedAt  time.Time   `db:"created_at" json:"created_at"`
	UpdatedAt  time.Time   `db:"updated_at" json:"updated_at"`
}

// ApplyDefaults fills required defaults.
func (c *RelatedContact) ApplyDefaults() {
	if c.ID == uuid.Nil {
		c.ID = uuid.New()
	}
	if c.Kind == "" {
		c.Kind = ContactKindEmergency
	}
}

// Validate enforces invariants.
func (c *RelatedContact) Validate() error {
	fields := map[string]string{}
	if c.EmployeeID == uuid.Nil {
		fields["employee_id"] = "required"
	}
	if strings.TrimSpace(c.FullName) == "" {
		fields["full_name"] = "required"
	}
	if strings.TrimSpace(c.Relation) == "" {
		fields["relation"] = "required"
	}
	if !c.Kind.IsValid() {
		fields["kind"] = "invalid"
	}
	if len(fields) > 0 {
		return NewValidationError(fields)
	}
	return nil
}

// ============================================================================
// Employee Positions (multi-FTE)
// ============================================================================

// EmployeePosition mirrors app.employee_positions.
type EmployeePosition struct {
	ID             uuid.UUID  `db:"id" json:"id"`
	TenantID       uuid.UUID  `db:"tenant_id" json:"tenant_id"`
	EmployeeID     uuid.UUID  `db:"employee_id" json:"employee_id"`
	PositionID     uuid.UUID  `db:"position_id" json:"position_id"`
	DepartmentID   *uuid.UUID `db:"department_id" json:"department_id,omitempty"`
	FTEPercentage  float64    `db:"fte_percentage" json:"fte_percentage"`
	IsPrimary      bool       `db:"is_primary" json:"is_primary"`
	StartDate      time.Time  `db:"start_date" json:"start_date"`
	EndDate        *time.Time `db:"end_date" json:"end_date,omitempty"`
	CreatedAt      time.Time  `db:"created_at" json:"created_at"`
	UpdatedAt      time.Time  `db:"updated_at" json:"updated_at"`
}

// ApplyDefaults fills required defaults.
func (p *EmployeePosition) ApplyDefaults() {
	if p.ID == uuid.Nil {
		p.ID = uuid.New()
	}
	if p.FTEPercentage == 0 {
		p.FTEPercentage = 100.0
	}
}

// Validate enforces invariants.
func (p *EmployeePosition) Validate() error {
	fields := map[string]string{}
	if p.EmployeeID == uuid.Nil {
		fields["employee_id"] = "required"
	}
	if p.PositionID == uuid.Nil {
		fields["position_id"] = "required"
	}
	if p.StartDate.IsZero() {
		fields["start_date"] = "required"
	}
	if p.FTEPercentage <= 0 || p.FTEPercentage > 100 {
		fields["fte_percentage"] = "must_be_0_to_100"
	}
	if p.EndDate != nil && p.EndDate.Before(p.StartDate) {
		fields["end_date"] = "must_be_after_start"
	}
	if len(fields) > 0 {
		return NewValidationError(fields)
	}
	return nil
}

// ============================================================================
// Offboarding Events + Exit Interviews
// ============================================================================

// DepartureType enumerates offboarding reasons (4857 aligned).
type DepartureType string

const (
	DepResignation          DepartureType = "resignation"
	DepRetirement           DepartureType = "retirement"
	DepTerminationJustCause DepartureType = "termination_just_cause"
	DepTerminationMutual    DepartureType = "termination_mutual"
	DepDeath                DepartureType = "death"
	DepMedical              DepartureType = "medical"
	DepEndOfContract        DepartureType = "end_of_contract"
	DepConscription         DepartureType = "conscription"
	DepOther                DepartureType = "other"
)

// IsValid reports whether the type is known.
func (d DepartureType) IsValid() bool {
	switch d {
	case DepResignation, DepRetirement, DepTerminationJustCause, DepTerminationMutual,
		DepDeath, DepMedical, DepEndOfContract, DepConscription, DepOther:
		return true
	}
	return false
}

// OffboardingEvent mirrors app.offboarding_events.
type OffboardingEvent struct {
	ID                uuid.UUID     `db:"id" json:"id"`
	TenantID          uuid.UUID     `db:"tenant_id" json:"tenant_id"`
	EmployeeID        uuid.UUID     `db:"employee_id" json:"employee_id"`
	DepartureType     DepartureType `db:"departure_type" json:"departure_type"`
	NoticeDate        time.Time     `db:"notice_date" json:"notice_date"`
	LastWorkingDay    time.Time     `db:"last_working_day" json:"last_working_day"`
	ExitInterviewDone bool          `db:"exit_interview_done" json:"exit_interview_done"`
	ITAccessRevoked   bool          `db:"it_access_revoked" json:"it_access_revoked"`
	ITRevokedAt       *time.Time    `db:"it_revoked_at" json:"it_revoked_at,omitempty"`
	FinalPayDate      *time.Time    `db:"final_pay_date" json:"final_pay_date,omitempty"`
	HandoverComplete  bool          `db:"handover_complete" json:"handover_complete"`
	HandoverToID      *uuid.UUID    `db:"handover_to_id" json:"handover_to_id,omitempty"`
	Notes             *string       `db:"notes" json:"notes,omitempty"`
	CreatedAt         time.Time     `db:"created_at" json:"created_at"`
	UpdatedAt         time.Time     `db:"updated_at" json:"updated_at"`
}

// ApplyDefaults fills required defaults.
func (o *OffboardingEvent) ApplyDefaults() {
	if o.ID == uuid.Nil {
		o.ID = uuid.New()
	}
}

// Validate enforces invariants.
func (o *OffboardingEvent) Validate() error {
	fields := map[string]string{}
	if o.EmployeeID == uuid.Nil {
		fields["employee_id"] = "required"
	}
	if !o.DepartureType.IsValid() {
		fields["departure_type"] = "invalid"
	}
	if o.NoticeDate.IsZero() {
		fields["notice_date"] = "required"
	}
	if o.LastWorkingDay.IsZero() {
		fields["last_working_day"] = "required"
	} else if o.LastWorkingDay.Before(o.NoticeDate) {
		fields["last_working_day"] = "must_be_after_notice"
	}
	if len(fields) > 0 {
		return NewValidationError(fields)
	}
	return nil
}

// ExitInterview mirrors app.exit_interviews.
type ExitInterview struct {
	ID                 uuid.UUID  `db:"id" json:"id"`
	TenantID           uuid.UUID  `db:"tenant_id" json:"tenant_id"`
	OffboardingID      uuid.UUID  `db:"offboarding_id" json:"offboarding_id"`
	SatisfactionScore  *int       `db:"satisfaction_score" json:"satisfaction_score,omitempty"`
	WouldReturn        *bool      `db:"would_return" json:"would_return,omitempty"`
	WouldRecommend     *bool      `db:"would_recommend" json:"would_recommend,omitempty"`
	PrimaryReasonCode  *string    `db:"primary_reason_code" json:"primary_reason_code,omitempty"`
	DepartureNote      *string    `db:"departure_note" json:"departure_note,omitempty"`
	HRSummary          *string    `db:"hr_summary" json:"hr_summary,omitempty"`
	InterviewDate      *time.Time `db:"interview_date" json:"interview_date,omitempty"`
	InterviewerID      *uuid.UUID `db:"interviewer_id" json:"interviewer_id,omitempty"`
	IsAnonymous        bool       `db:"is_anonymous" json:"is_anonymous"`
	CreatedAt          time.Time  `db:"created_at" json:"created_at"`
	UpdatedAt          time.Time  `db:"updated_at" json:"updated_at"`
}

// ApplyDefaults fills required defaults.
func (i *ExitInterview) ApplyDefaults() {
	if i.ID == uuid.Nil {
		i.ID = uuid.New()
	}
}

// Validate enforces invariants.
func (i *ExitInterview) Validate() error {
	fields := map[string]string{}
	if i.OffboardingID == uuid.Nil {
		fields["offboarding_id"] = "required"
	}
	if i.SatisfactionScore != nil && (*i.SatisfactionScore < 1 || *i.SatisfactionScore > 5) {
		fields["satisfaction_score"] = "must_be_1_to_5"
	}
	if len(fields) > 0 {
		return NewValidationError(fields)
	}
	return nil
}

// ============================================================================
// Shared errors for the lifecycle feature group
// ============================================================================

var (
	ErrCareerEventNotFound     = errors.New("career event not found")
	ErrCompensationNotFound    = errors.New("compensation record not found")
	ErrRelatedContactNotFound  = errors.New("related contact not found")
	ErrEmployeePositionInvalid = errors.New("employee position invalid")
	ErrOffboardingNotFound     = errors.New("offboarding event not found")
	ErrOffboardingExists       = errors.New("offboarding event already exists for employee")
	ErrExitInterviewNotFound   = errors.New("exit interview not found")
	ErrExitInterviewExists     = errors.New("exit interview already submitted")
)
