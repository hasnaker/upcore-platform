package domain

import (
	"strings"
	"time"

	"github.com/google/uuid"
)

// ReqStatus enumerates requisition lifecycle states.
type ReqStatus string

const (
	ReqStatusDraft  ReqStatus = "draft"
	ReqStatusOpen   ReqStatus = "open"
	ReqStatusOnHold ReqStatus = "on_hold"
	ReqStatusFilled ReqStatus = "filled"
	ReqStatusClosed ReqStatus = "closed"
)

// IsValid reports whether the status is a known value.
func (s ReqStatus) IsValid() bool {
	switch s {
	case ReqStatusDraft, ReqStatusOpen, ReqStatusOnHold, ReqStatusFilled, ReqStatusClosed:
		return true
	}
	return false
}

// String satisfies fmt.Stringer.
func (s ReqStatus) String() string { return string(s) }

// EmploymentType enumerates the contract arrangement.
type EmploymentType string

const (
	EmpTypeFullTime  EmploymentType = "full_time"
	EmpTypePartTime  EmploymentType = "part_time"
	EmpTypeContract  EmploymentType = "contract"
	EmpTypeIntern    EmploymentType = "intern"
)

// IsValid reports whether the employment type is legal.
func (t EmploymentType) IsValid() bool {
	switch t {
	case EmpTypeFullTime, EmpTypePartTime, EmpTypeContract, EmpTypeIntern:
		return true
	}
	return false
}

// Requisition represents an open position / job requisition.
type Requisition struct {
	ID               uuid.UUID      `db:"id" json:"id"`
	TenantID         uuid.UUID      `db:"tenant_id" json:"tenant_id"`
	PositionID       *uuid.UUID     `db:"position_id" json:"position_id,omitempty"`
	Title            string         `db:"title" json:"title"`
	Description      string         `db:"description" json:"description"`
	Requirements     *string        `db:"requirements" json:"requirements,omitempty"`
	Headcount        int            `db:"headcount" json:"headcount"`
	Location         *string        `db:"location" json:"location,omitempty"`
	EmploymentType   EmploymentType `db:"employment_type" json:"employment_type"`
	SalaryMin        *float64       `db:"salary_min" json:"salary_min,omitempty"`
	SalaryMax        *float64       `db:"salary_max" json:"salary_max,omitempty"`
	Status           ReqStatus      `db:"status" json:"status"`
	HiringManagerID  *uuid.UUID     `db:"hiring_manager_id" json:"hiring_manager_id,omitempty"`
	RecruiterID      *uuid.UUID     `db:"recruiter_id" json:"recruiter_id,omitempty"`
	OpenedAt         *time.Time     `db:"opened_at" json:"opened_at,omitempty"`
	ClosedAt         *time.Time     `db:"closed_at" json:"closed_at,omitempty"`
	CreatedAt        time.Time      `db:"created_at" json:"created_at"`
	UpdatedAt        time.Time      `db:"updated_at" json:"updated_at"`
}

// Validate checks required fields.
func (r *Requisition) Validate() error {
	fields := map[string]string{}
	if strings.TrimSpace(r.Title) == "" {
		fields["title"] = "required"
	}
	if r.Headcount <= 0 {
		fields["headcount"] = "must be > 0"
	}
	if r.EmploymentType != "" && !r.EmploymentType.IsValid() {
		fields["employment_type"] = "invalid"
	}
	if len(fields) > 0 {
		return NewValidationError(fields)
	}
	return nil
}

// IsOpen returns true when the requisition accepts applications.
func (r *Requisition) IsOpen() bool {
	return r.Status == ReqStatusOpen
}

// CanTransition reports whether the requisition may move to the given status.
func (r *Requisition) CanTransition(to ReqStatus) bool {
	if !r.Status.IsValid() || !to.IsValid() {
		return false
	}
	if r.Status == to {
		return false
	}
	switch r.Status {
	case ReqStatusDraft:
		return to == ReqStatusOpen
	case ReqStatusOpen:
		return to == ReqStatusOnHold || to == ReqStatusFilled || to == ReqStatusClosed
	case ReqStatusOnHold:
		return to == ReqStatusOpen || to == ReqStatusClosed
	case ReqStatusFilled:
		return to == ReqStatusClosed
	case ReqStatusClosed:
		return false
	}
	return false
}

// ApplyDefaults fills in defaults required by the DB constraints.
func (r *Requisition) ApplyDefaults() {
	if r.Status == "" {
		r.Status = ReqStatusDraft
	}
	if r.EmploymentType == "" {
		r.EmploymentType = EmpTypeFullTime
	}
	if r.Headcount <= 0 {
		r.Headcount = 1
	}
}
