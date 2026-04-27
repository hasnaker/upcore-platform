// Package domain contains mobility service entities and errors.
package domain

import (
	"errors"
	"time"

	"github.com/google/uuid"
)

// Sentinel errors.
var (
	ErrNotFound              = errors.New("mobility: not found")
	ErrEmployeeIneligible    = errors.New("mobility: employee ineligible for rotation")
	ErrPositionNotOpen       = errors.New("mobility: target position is not open")
	ErrCooldownActive        = errors.New("mobility: employee is in rotation cooldown period")
	ErrValidation            = errors.New("mobility: validation failed")
	ErrUnauthorized          = errors.New("mobility: unauthorized")
	ErrSuccessionPoolFull    = errors.New("mobility: succession pool capacity reached")
	ErrSuccessionMaxPools    = errors.New("mobility: candidate already in maximum (3) succession pools")
	ErrSuccessionDuplicate   = errors.New("mobility: candidate already present in this pool")
	ErrSuccessionReadiness   = errors.New("mobility: invalid readiness value")
	ErrCareerStepConflict    = errors.New("mobility: career step order conflict")
	ErrDuplicateOpenRotation = errors.New("mobility: an open rotation already exists for this employee")
	ErrRejectReasonRequired  = errors.New("mobility: reject reason required (min 10 chars)")
	ErrInvalidTransition     = errors.New("mobility: invalid rotation status transition")
)

// SuccessionMaxPoolsPerCandidate is the hard cap enforced both in service + DB.
const SuccessionMaxPoolsPerCandidate = 3

// Readiness values accepted by the succession pool.
const (
	ReadinessNow = "ready_now"
	Readiness1Y  = "ready_1y"
	Readiness2Y  = "ready_2y"
)

// ValidReadiness reports whether v is one of the accepted readiness strings.
func ValidReadiness(v string) bool {
	switch v {
	case ReadinessNow, Readiness1Y, Readiness2Y:
		return true
	}
	return false
}

// RotationStatus tracks internal rotation workflow state.
type RotationStatus string

const (
	RotationProposed  RotationStatus = "proposed"
	RotationApproved  RotationStatus = "approved"
	RotationRejected  RotationStatus = "rejected"
	RotationActive    RotationStatus = "active"
	RotationCompleted RotationStatus = "completed"
	RotationCancelled RotationStatus = "cancelled"
)

// InternalRotation represents a cross-department/role transfer of an employee.
type InternalRotation struct {
	ID              uuid.UUID      `db:"id" json:"id"`
	TenantID        uuid.UUID      `db:"tenant_id" json:"tenant_id"`
	EmployeeID      uuid.UUID      `db:"employee_id" json:"employee_id"`
	FromPositionID  uuid.UUID      `db:"from_position_id" json:"from_position_id"`
	ToPositionID    uuid.UUID      `db:"to_position_id" json:"to_position_id"`
	FromDeptID      uuid.UUID      `db:"from_department_id" json:"from_department_id"`
	ToDeptID        uuid.UUID      `db:"to_department_id" json:"to_department_id"`
	Status          RotationStatus `db:"status" json:"status"`
	ReasonTR        string         `db:"reason_tr" json:"reason_tr"`
	StartDate       *time.Time     `db:"start_date" json:"start_date,omitempty"`
	EndDate         *time.Time     `db:"end_date" json:"end_date,omitempty"`
	ApprovedByID    *uuid.UUID     `db:"approved_by_id" json:"approved_by_id,omitempty"`
	ApprovedAt      *time.Time     `db:"approved_at" json:"approved_at,omitempty"`
	RequestedByID   uuid.UUID      `db:"requested_by_id" json:"requested_by_id"`
	CreatedAt       time.Time      `db:"created_at" json:"created_at"`
	UpdatedAt       time.Time      `db:"updated_at" json:"updated_at"`
}

// AllowedRotationTransition reports whether next is a valid successor state
// for from. Central definition used by both service logic and tests.
func AllowedRotationTransition(from, next RotationStatus) bool {
	switch from {
	case RotationProposed:
		return next == RotationApproved || next == RotationRejected || next == RotationCancelled
	case RotationApproved:
		return next == RotationActive || next == RotationCancelled
	case RotationActive:
		return next == RotationCompleted || next == RotationCancelled
	default:
		return false
	}
}

// CareerPath is a multi-step progression template (e.g. Junior → Mid → Senior).
type CareerPath struct {
	ID          uuid.UUID `db:"id" json:"id"`
	TenantID    uuid.UUID `db:"tenant_id" json:"tenant_id"`
	NameTR      string    `db:"name_tr" json:"name_tr"`
	DescTR      string    `db:"description_tr" json:"description_tr"`
	Discipline  string    `db:"discipline" json:"discipline"` // e.g. "engineering", "sales"
	IsActive    bool      `db:"is_active" json:"is_active"`
	CreatedAt   time.Time `db:"created_at" json:"created_at"`
	UpdatedAt   time.Time `db:"updated_at" json:"updated_at"`
}

// CareerPathStep is one rung in a CareerPath (ordered by step_order).
type CareerPathStep struct {
	ID              uuid.UUID `db:"id" json:"id"`
	PathID          uuid.UUID `db:"path_id" json:"path_id"`
	StepOrder       int       `db:"step_order" json:"step_order"`
	PositionID      uuid.UUID `db:"position_id" json:"position_id"`
	TitleTR         string    `db:"title_tr" json:"title_tr"`
	MinTenureMonths int       `db:"min_tenure_months" json:"min_tenure_months"`
	CriteriaTR      string    `db:"criteria_tr" json:"criteria_tr"`
	CreatedAt       time.Time `db:"created_at" json:"created_at"`
}

// SuccessionPlan links a critical position to candidate successor(s).
type SuccessionPlan struct {
	ID              uuid.UUID `db:"id" json:"id"`
	TenantID        uuid.UUID `db:"tenant_id" json:"tenant_id"`
	PositionID      uuid.UUID `db:"position_id" json:"position_id"`
	IncumbentEmpID  uuid.UUID `db:"incumbent_employee_id" json:"incumbent_employee_id"`
	RiskLevel       string    `db:"risk_level" json:"risk_level"`      // low|medium|high|critical
	CriticalityTR   string    `db:"criticality_tr" json:"criticality_tr"`
	CreatedAt       time.Time `db:"created_at" json:"created_at"`
	UpdatedAt       time.Time `db:"updated_at" json:"updated_at"`
}

// SuccessionCandidate is one potential successor for a position.
type SuccessionCandidate struct {
	ID                  uuid.UUID `db:"id" json:"id"`
	PlanID              uuid.UUID `db:"plan_id" json:"plan_id"`
	CandidateEmployeeID uuid.UUID `db:"candidate_employee_id" json:"candidate_employee_id"`
	Readiness           string    `db:"readiness" json:"readiness"` // ready_now|ready_1y|ready_2y
	FitScore            float64   `db:"fit_score" json:"fit_score"` // 0..100
	GapsTR              string    `db:"gaps_tr" json:"gaps_tr"`
	Rank                int       `db:"rank" json:"rank"`
	CreatedAt           time.Time `db:"created_at" json:"created_at"`
	UpdatedAt           time.Time `db:"updated_at" json:"updated_at"`
}

// ------- User / Tenant context (set by middleware from gateway headers) ------

type ctxKey string

const (
	CtxTenantID ctxKey = "tenant_id"
	CtxUserID   ctxKey = "user_id"
	CtxRole     ctxKey = "user_role"
)
