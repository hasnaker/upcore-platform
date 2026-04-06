package domain

import (
	"time"

	"github.com/google/uuid"
)

// ChangeType describes a single employment history event.
type ChangeType string

const (
	ChangeHire             ChangeType = "hire"
	ChangePromotion        ChangeType = "promotion"
	ChangeTransfer         ChangeType = "transfer"
	ChangeTitleChange      ChangeType = "title_change"
	ChangeDepartmentChange ChangeType = "department_change"
	ChangeManagerChange    ChangeType = "manager_change"
	ChangeSalaryChange     ChangeType = "salary_change"
	ChangeTypeChange       ChangeType = "type_change"
	ChangeTermination      ChangeType = "termination"
)

// IsValid reports whether the change type is legal.
func (c ChangeType) IsValid() bool {
	switch c {
	case ChangeHire, ChangePromotion, ChangeTransfer, ChangeTitleChange,
		ChangeDepartmentChange, ChangeManagerChange, ChangeSalaryChange,
		ChangeTypeChange, ChangeTermination:
		return true
	}
	return false
}

// EmploymentHistory is an append-only record of employment changes.
type EmploymentHistory struct {
	ID              uuid.UUID  `db:"id" json:"id"`
	TenantID        uuid.UUID  `db:"tenant_id" json:"tenant_id"`
	EmployeeID      uuid.UUID  `db:"employee_id" json:"employee_id"`
	ChangeType      ChangeType `db:"change_type" json:"change_type"`
	OldDepartmentID *uuid.UUID `db:"old_department_id" json:"old_department_id,omitempty"`
	NewDepartmentID *uuid.UUID `db:"new_department_id" json:"new_department_id,omitempty"`
	OldPositionID   *uuid.UUID `db:"old_position_id" json:"old_position_id,omitempty"`
	NewPositionID   *uuid.UUID `db:"new_position_id" json:"new_position_id,omitempty"`
	OldManagerID    *uuid.UUID `db:"old_manager_id" json:"old_manager_id,omitempty"`
	NewManagerID    *uuid.UUID `db:"new_manager_id" json:"new_manager_id,omitempty"`
	OldSalary       *float64   `db:"old_salary" json:"old_salary,omitempty"`
	NewSalary       *float64   `db:"new_salary" json:"new_salary,omitempty"`
	EffectiveDate   time.Time  `db:"effective_date" json:"effective_date"`
	Reason          *string    `db:"reason" json:"reason,omitempty"`
	ApprovedBy      *uuid.UUID `db:"approved_by" json:"approved_by,omitempty"`
	Metadata        JSONB      `db:"metadata" json:"metadata,omitempty"`
	CreatedAt       time.Time  `db:"created_at" json:"created_at"`
}

// NewHistoryEntry constructs a minimally-populated history row.
func NewHistoryEntry(tenantID, employeeID uuid.UUID, ct ChangeType, effective time.Time) *EmploymentHistory {
	return &EmploymentHistory{
		ID:            uuid.New(),
		TenantID:      tenantID,
		EmployeeID:    employeeID,
		ChangeType:    ct,
		EffectiveDate: effective,
		Metadata:      JSONB("{}"),
		CreatedAt:     time.Now().UTC(),
	}
}

// ApplyDefaults sets defaults for empty JSONB/metadata fields.
func (h *EmploymentHistory) ApplyDefaults() {
	if h.ID == uuid.Nil {
		h.ID = uuid.New()
	}
	if len(h.Metadata) == 0 {
		h.Metadata = JSONB("{}")
	}
	if h.CreatedAt.IsZero() {
		h.CreatedAt = time.Now().UTC()
	}
}
