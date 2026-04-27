// Package domain defines the bordro aggregate types.
package domain

import (
	"database/sql/driver"
	"encoding/json"
	"errors"
	"fmt"
	"strings"
	"time"

	"github.com/google/uuid"
)

// JSONB wraps raw JSON for pg jsonb columns.
type JSONB []byte

// Value implements driver.Valuer.
func (j JSONB) Value() (driver.Value, error) {
	if len(j) == 0 {
		return []byte("{}"), nil
	}
	if !json.Valid(j) {
		return nil, fmt.Errorf("jsonb: invalid")
	}
	return []byte(j), nil
}

// Scan implements sql.Scanner.
func (j *JSONB) Scan(src any) error {
	if src == nil {
		*j = JSONB("{}")
		return nil
	}
	switch v := src.(type) {
	case []byte:
		cp := make([]byte, len(v))
		copy(cp, v)
		*j = JSONB(cp)
	case string:
		*j = JSONB([]byte(v))
	default:
		return fmt.Errorf("jsonb: unsupported type %T", src)
	}
	return nil
}

// MarshalJSON returns the raw bytes (or {}).
func (j JSONB) MarshalJSON() ([]byte, error) {
	if len(j) == 0 {
		return []byte("{}"), nil
	}
	return j, nil
}

// UnmarshalJSON captures raw bytes.
func (j *JSONB) UnmarshalJSON(data []byte) error {
	cp := make([]byte, len(data))
	copy(cp, data)
	*j = JSONB(cp)
	return nil
}

// Sentinel errors.
var (
	ErrNotFound      = errors.New("not found")
	ErrValidation    = errors.New("validation failed")
	ErrConflict      = errors.New("conflict")
	ErrForbidden     = errors.New("forbidden")
	ErrInvalidStatus = errors.New("invalid status transition")
	ErrPeriodLocked  = errors.New("payroll period is locked or finalised")
)

// ValidationError aggregates field-level errors.
type ValidationError struct{ Fields map[string]string }

// Error satisfies error.
func (e *ValidationError) Error() string { return "validation failed" }

// NewValidationError constructs the error.
func NewValidationError(fields map[string]string) *ValidationError {
	return &ValidationError{Fields: fields}
}

// ============================================================================
// Period
// ============================================================================

// PeriodStatus enumerates the lifecycle states.
type PeriodStatus string

const (
	PeriodOpen      PeriodStatus = "open"
	PeriodLocked    PeriodStatus = "locked"
	PeriodFinalised PeriodStatus = "finalised"
	PeriodClosed    PeriodStatus = "closed"
)

// IsValid reports whether the status is known.
func (s PeriodStatus) IsValid() bool {
	switch s {
	case PeriodOpen, PeriodLocked, PeriodFinalised, PeriodClosed:
		return true
	}
	return false
}

// IsEditable reports whether a run can still be added/mutated for this period.
func (s PeriodStatus) IsEditable() bool {
	return s == PeriodOpen
}

// Period mirrors app.payroll_periods.
type Period struct {
	ID          uuid.UUID    `db:"id" json:"id"`
	TenantID    uuid.UUID    `db:"tenant_id" json:"tenant_id"`
	PeriodYear  int          `db:"period_year" json:"period_year"`
	PeriodMonth int          `db:"period_month" json:"period_month"`
	StartDate   time.Time    `db:"start_date" json:"start_date"`
	EndDate     time.Time    `db:"end_date" json:"end_date"`
	PayDate     time.Time    `db:"pay_date" json:"pay_date"`
	Status      PeriodStatus `db:"status" json:"status"`
	CreatedBy   *uuid.UUID   `db:"created_by" json:"created_by,omitempty"`
	CreatedAt   time.Time    `db:"created_at" json:"created_at"`
	UpdatedAt   time.Time    `db:"updated_at" json:"updated_at"`
}

// ApplyDefaults fills DB-required defaults.
func (p *Period) ApplyDefaults() {
	if p.ID == uuid.Nil {
		p.ID = uuid.New()
	}
	if p.Status == "" {
		p.Status = PeriodOpen
	}
	if p.StartDate.IsZero() && p.PeriodYear > 0 && p.PeriodMonth > 0 {
		p.StartDate = time.Date(p.PeriodYear, time.Month(p.PeriodMonth), 1, 0, 0, 0, 0, time.UTC)
	}
	if p.EndDate.IsZero() && !p.StartDate.IsZero() {
		p.EndDate = p.StartDate.AddDate(0, 1, -1)
	}
	if p.PayDate.IsZero() && !p.EndDate.IsZero() {
		p.PayDate = p.EndDate
	}
}

// Validate enforces invariants.
func (p *Period) Validate() error {
	fields := map[string]string{}
	if p.PeriodYear < 2000 || p.PeriodYear > 2100 {
		fields["period_year"] = "out_of_range"
	}
	if p.PeriodMonth < 1 || p.PeriodMonth > 12 {
		fields["period_month"] = "out_of_range"
	}
	if !p.Status.IsValid() {
		fields["status"] = "invalid"
	}
	if !p.StartDate.IsZero() && !p.EndDate.IsZero() && p.EndDate.Before(p.StartDate) {
		fields["end_date"] = "must_be_after_start"
	}
	if len(fields) > 0 {
		return NewValidationError(fields)
	}
	return nil
}

// ============================================================================
// Run
// ============================================================================

// RunType enumerates kinds of payroll runs.
type RunType string

const (
	RunRegular    RunType = "regular"
	RunBonus      RunType = "bonus"
	RunIkramiye   RunType = "ikramiye"
	RunOffCycle   RunType = "off_cycle"
	RunCorrection RunType = "correction"
)

// IsValid reports whether the type is known.
func (t RunType) IsValid() bool {
	switch t {
	case RunRegular, RunBonus, RunIkramiye, RunOffCycle, RunCorrection:
		return true
	}
	return false
}

// RunStatus enumerates run states.
type RunStatus string

const (
	RunPreview    RunStatus = "preview"
	RunCalculated RunStatus = "calculated"
	RunApproved   RunStatus = "approved"
	RunFinalised  RunStatus = "finalised"
	RunVoided     RunStatus = "voided"
)

// IsValid reports whether the status is known.
func (s RunStatus) IsValid() bool {
	switch s {
	case RunPreview, RunCalculated, RunApproved, RunFinalised, RunVoided:
		return true
	}
	return false
}

// Run mirrors app.payroll_runs.
type Run struct {
	ID               uuid.UUID  `db:"id" json:"id"`
	TenantID         uuid.UUID  `db:"tenant_id" json:"tenant_id"`
	PeriodID         uuid.UUID  `db:"period_id" json:"period_id"`
	RunType          RunType    `db:"run_type" json:"run_type"`
	Status           RunStatus  `db:"status" json:"status"`
	TotalGross       float64    `db:"total_gross" json:"total_gross"`
	TotalNet         float64    `db:"total_net" json:"total_net"`
	TotalIncomeTax   float64    `db:"total_income_tax" json:"total_income_tax"`
	TotalSGKEmp      float64    `db:"total_sgk_emp" json:"total_sgk_emp"`
	TotalSGKEmpr     float64    `db:"total_sgk_empr" json:"total_sgk_empr"`
	TotalStamp       float64    `db:"total_stamp" json:"total_stamp"`
	EmployeeCount    int        `db:"employee_count" json:"employee_count"`
	ApprovedBy       *uuid.UUID `db:"approved_by" json:"approved_by,omitempty"`
	ApprovedAt       *time.Time `db:"approved_at" json:"approved_at,omitempty"`
	FinalisedAt      *time.Time `db:"finalised_at" json:"finalised_at,omitempty"`
	Notes            *string    `db:"notes" json:"notes,omitempty"`
	CreatedAt        time.Time  `db:"created_at" json:"created_at"`
	UpdatedAt        time.Time  `db:"updated_at" json:"updated_at"`
}

// ApplyDefaults fills DB-required defaults.
func (r *Run) ApplyDefaults() {
	if r.ID == uuid.Nil {
		r.ID = uuid.New()
	}
	if r.RunType == "" {
		r.RunType = RunRegular
	}
	if r.Status == "" {
		r.Status = RunPreview
	}
}

// Validate enforces invariants.
func (r *Run) Validate() error {
	fields := map[string]string{}
	if !r.RunType.IsValid() {
		fields["run_type"] = "invalid"
	}
	if !r.Status.IsValid() {
		fields["status"] = "invalid"
	}
	if len(fields) > 0 {
		return NewValidationError(fields)
	}
	return nil
}

// CanTransitionTo reports whether the run may move to the target status.
func (r *Run) CanTransitionTo(next RunStatus) bool {
	if !next.IsValid() || r.Status == next {
		return false
	}
	switch r.Status {
	case RunPreview:
		return next == RunCalculated || next == RunVoided
	case RunCalculated:
		return next == RunApproved || next == RunVoided || next == RunPreview
	case RunApproved:
		return next == RunFinalised || next == RunVoided
	case RunFinalised:
		return false
	case RunVoided:
		return false
	}
	return false
}

// ============================================================================
// Slip
// ============================================================================

// Slip mirrors app.payroll_slips.
type Slip struct {
	ID                  uuid.UUID `db:"id" json:"id"`
	TenantID            uuid.UUID `db:"tenant_id" json:"tenant_id"`
	RunID               uuid.UUID `db:"run_id" json:"run_id"`
	EmployeeID          uuid.UUID `db:"employee_id" json:"employee_id"`
	PeriodYear          int       `db:"period_year" json:"period_year"`
	PeriodMonth         int       `db:"period_month" json:"period_month"`
	WorkedDays          float64   `db:"worked_days" json:"worked_days"`
	BaseSalaryGross     float64   `db:"base_salary_gross" json:"base_salary_gross"`
	OvertimeGross       float64   `db:"overtime_gross" json:"overtime_gross"`
	BonusGross          float64   `db:"bonus_gross" json:"bonus_gross"`
	AllowanceGross      float64   `db:"allowance_gross" json:"allowance_gross"`
	TotalGross          float64   `db:"total_gross" json:"total_gross"`
	SGKEmployee         float64   `db:"sgk_employee" json:"sgk_employee"`
	SGKUnemploymentEmp  float64   `db:"sgk_unemployment_emp" json:"sgk_unemployment_emp"`
	IncomeTaxBase       float64   `db:"income_tax_base" json:"income_tax_base"`
	IncomeTax           float64   `db:"income_tax" json:"income_tax"`
	CumulativeTaxBase   float64   `db:"cumulative_tax_base" json:"cumulative_tax_base"`
	StampTax            float64   `db:"stamp_tax" json:"stamp_tax"`
	SGKEmployer         float64   `db:"sgk_employer" json:"sgk_employer"`
	UnemploymentEmployer float64  `db:"unemployment_employer" json:"unemployment_employer"`
	TotalNet            float64   `db:"total_net" json:"total_net"`
	Metadata            JSONB     `db:"metadata" json:"metadata"`
	CreatedAt           time.Time `db:"created_at" json:"created_at"`
	UpdatedAt           time.Time `db:"updated_at" json:"updated_at"`

	Items []SlipItem `db:"-" json:"items,omitempty"`
}

// ApplyDefaults fills DB-required defaults.
func (s *Slip) ApplyDefaults() {
	if s.ID == uuid.Nil {
		s.ID = uuid.New()
	}
	if s.WorkedDays == 0 {
		s.WorkedDays = 30
	}
	if len(s.Metadata) == 0 {
		s.Metadata = JSONB("{}")
	}
}

// SlipItemType enumerates slip item categories.
type SlipItemType string

const (
	ItemEarning             SlipItemType = "earning"
	ItemDeduction           SlipItemType = "deduction"
	ItemEmployerContribution SlipItemType = "employer_contribution"
	ItemInfo                SlipItemType = "info"
)

// IsValid reports whether the item type is known.
func (t SlipItemType) IsValid() bool {
	switch t {
	case ItemEarning, ItemDeduction, ItemEmployerContribution, ItemInfo:
		return true
	}
	return false
}

// SlipItem mirrors app.payroll_slip_items.
type SlipItem struct {
	ID          uuid.UUID    `db:"id" json:"id"`
	SlipID      uuid.UUID    `db:"slip_id" json:"slip_id"`
	ItemType    SlipItemType `db:"item_type" json:"item_type"`
	Code        string       `db:"code" json:"code"`
	Description string       `db:"description" json:"description"`
	Quantity    float64      `db:"quantity" json:"quantity"`
	Amount      float64      `db:"amount" json:"amount"`
	IsTaxable   bool         `db:"is_taxable" json:"is_taxable"`
	IsSGKable   bool         `db:"is_sgkable" json:"is_sgkable"`
	OrderIndex  int          `db:"order_index" json:"order_index"`
	CreatedAt   time.Time    `db:"created_at" json:"created_at"`
}

// ApplyDefaults fills DB-required defaults.
func (s *SlipItem) ApplyDefaults() {
	if s.ID == uuid.Nil {
		s.ID = uuid.New()
	}
	if s.Quantity == 0 {
		s.Quantity = 1
	}
}

// ============================================================================
// SlipInput captures what the service takes in to calculate a single slip.
// ============================================================================

// SlipInput is the request-side shape for a calculate batch.
type SlipInput struct {
	EmployeeID       uuid.UUID `json:"employee_id"`
	BaseSalaryGross  float64   `json:"base_salary_gross"`
	OvertimeGross    float64   `json:"overtime_gross,omitempty"`
	BonusGross       float64   `json:"bonus_gross,omitempty"`
	AllowanceTaxable float64   `json:"allowance_taxable,omitempty"`
	AllowanceExempt  float64   `json:"allowance_exempt,omitempty"`
	WorkedDays       float64   `json:"worked_days,omitempty"`

	// Tenant ayarlarını override etmek için (opsiyonel). Null → tenant settings kullanılır.
	MealDailyGrossOverride      *float64 `json:"meal_daily_gross_override,omitempty"`
	TransportDailyGrossOverride *float64 `json:"transport_daily_gross_override,omitempty"`

	// Cumulative wage-tax base before this slip (the caller fetches this from
	// the employee's prior finalised slips within the same fiscal year).
	CumulativeTaxBase float64 `json:"cumulative_tax_base,omitempty"`
}

// Validate enforces input invariants.
func (s *SlipInput) Validate() error {
	fields := map[string]string{}
	if s.EmployeeID == uuid.Nil {
		fields["employee_id"] = "required"
	}
	if s.BaseSalaryGross < 0 {
		fields["base_salary_gross"] = "must_be_positive"
	}
	if s.OvertimeGross < 0 {
		fields["overtime_gross"] = "must_be_positive"
	}
	if s.BonusGross < 0 {
		fields["bonus_gross"] = "must_be_positive"
	}
	if s.WorkedDays < 0 || s.WorkedDays > 31 {
		fields["worked_days"] = "out_of_range"
	}
	if len(fields) > 0 {
		return NewValidationError(fields)
	}
	return nil
}

// NormalizeCurrency ensures TRY fallback on explicit override fields.
func NormalizeCurrency(v string) string {
	s := strings.ToUpper(strings.TrimSpace(v))
	if s == "" {
		return "TRY"
	}
	return s
}
