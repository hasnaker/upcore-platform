package domain

import (
	"time"

	"github.com/google/uuid"
)

// LineType enumerates reporting-line flavors.
type LineType string

const (
	LineSolid  LineType = "solid"
	LineDotted LineType = "dotted"
)

// ReportingLine captures a manager/report relationship over time.
type ReportingLine struct {
	ID            uuid.UUID  `db:"id" json:"id"`
	TenantID      uuid.UUID  `db:"tenant_id" json:"tenant_id"`
	EmployeeID    uuid.UUID  `db:"employee_id" json:"employee_id"`
	ManagerID     uuid.UUID  `db:"manager_id" json:"manager_id"`
	Type          LineType   `db:"line_type" json:"type"`
	EffectiveFrom time.Time  `db:"effective_from" json:"effective_from"`
	EffectiveTo   *time.Time `db:"effective_to" json:"effective_to,omitempty"`
	CreatedAt     time.Time  `db:"created_at" json:"created_at"`
}

// IsActive reports whether the line is in effect at the given instant.
func (r *ReportingLine) IsActive(at time.Time) bool {
	if at.Before(r.EffectiveFrom) {
		return false
	}
	if r.EffectiveTo != nil && !at.Before(*r.EffectiveTo) {
		return false
	}
	return true
}

// DetectCycle returns true if making managerID the manager of empID would
// create a cycle within the provided reporting graph (solid lines only).
// lines must contain the current active solid lines.
func DetectCycle(lines []ReportingLine, empID, managerID uuid.UUID) bool {
	if empID == managerID {
		return true
	}
	// Build manager map: employee -> manager (latest active per employee).
	mgr := make(map[uuid.UUID]uuid.UUID, len(lines))
	for _, l := range lines {
		if l.Type != LineSolid {
			continue
		}
		if l.EffectiveTo != nil {
			continue
		}
		mgr[l.EmployeeID] = l.ManagerID
	}
	// Walk from the candidate manager upward; if we ever hit empID, it's a cycle.
	visited := map[uuid.UUID]struct{}{}
	current := managerID
	for {
		if current == empID {
			return true
		}
		if _, seen := visited[current]; seen {
			return true // existing cycle — be safe
		}
		visited[current] = struct{}{}
		next, ok := mgr[current]
		if !ok {
			return false
		}
		current = next
	}
}

// ValidateLineType reports whether s is a recognised type.
func ValidateLineType(s string) bool {
	return s == string(LineSolid) || s == string(LineDotted)
}
