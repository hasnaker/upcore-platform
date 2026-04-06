package domain

import (
	"time"

	"github.com/google/uuid"
)

// HeadcountSnapshot is a point-in-time aggregation per department.
type HeadcountSnapshot struct {
	TenantID        uuid.UUID `db:"tenant_id" json:"tenant_id"`
	DepartmentID    uuid.UUID `db:"department_id" json:"department_id"`
	SnapshotDate    time.Time `db:"snapshot_date" json:"snapshot_date"`
	TotalCount      int       `db:"total_count" json:"total_count"`
	ActiveCount     int       `db:"active_count" json:"active_count"`
	TerminatedCount int       `db:"terminated_count" json:"terminated_count"`
	CreatedAt       time.Time `db:"created_at" json:"created_at"`
}

// HeadcountReport aggregates the current snapshot across the tenant.
type HeadcountReport struct {
	TenantID        uuid.UUID              `json:"tenant_id"`
	SnapshotDate    time.Time              `json:"snapshot_date"`
	Total           int                    `json:"total"`
	Active          int                    `json:"active"`
	Terminated      int                    `json:"terminated"`
	ByDepartment    []HeadcountDepartment  `json:"by_department"`
}

// HeadcountDepartment aggregates headcount for a single department.
type HeadcountDepartment struct {
	DepartmentID   uuid.UUID `json:"department_id"`
	DepartmentName string    `json:"department_name"`
	Path           string    `json:"path"`
	Total          int       `json:"total"`
	Active         int       `json:"active"`
	Terminated     int       `json:"terminated"`
}

// TrendPoint is a single entry in a trend report.
type TrendPoint struct {
	Date            time.Time `json:"date"`
	TotalCount      int       `json:"total_count"`
	ActiveCount     int       `json:"active_count"`
	TerminatedCount int       `json:"terminated_count"`
}

// TrendReport bundles a series of TrendPoint values.
type TrendReport struct {
	TenantID     uuid.UUID    `json:"tenant_id"`
	DepartmentID *uuid.UUID   `json:"department_id,omitempty"`
	Months       int          `json:"months"`
	Points       []TrendPoint `json:"points"`
}
