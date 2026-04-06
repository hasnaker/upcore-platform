package domain

import (
	"strings"
	"time"

	"github.com/google/uuid"
)

// TeamRole enumerates member roles within a team.
type TeamRole string

const (
	TeamRoleMember TeamRole = "member"
	TeamRoleLead   TeamRole = "lead"
)

// Team is a cross-functional working group within a department.
type Team struct {
	ID              uuid.UUID  `db:"id" json:"id"`
	TenantID        uuid.UUID  `db:"tenant_id" json:"tenant_id"`
	Name            string     `db:"name" json:"name"`
	DepartmentID    *uuid.UUID `db:"department_id" json:"department_id,omitempty"`
	LeadEmployeeID  *uuid.UUID `db:"lead_employee_id" json:"lead_employee_id,omitempty"`
	Description     *string    `db:"description" json:"description,omitempty"`
	Active          bool       `db:"active" json:"active"`
	CreatedAt       time.Time  `db:"created_at" json:"created_at"`
	UpdatedAt       time.Time  `db:"updated_at" json:"updated_at"`
	DeletedAt       *time.Time `db:"deleted_at" json:"deleted_at,omitempty"`
}

// Validate verifies required fields.
func (t *Team) Validate() error {
	fields := map[string]string{}
	if strings.TrimSpace(t.Name) == "" {
		fields["name"] = "required"
	} else if len(t.Name) > 120 {
		fields["name"] = "max 120 chars"
	}
	if len(fields) > 0 {
		return NewValidationError(fields)
	}
	return nil
}

// TeamMember is the association row linking an employee to a team.
type TeamMember struct {
	TeamID     uuid.UUID `db:"team_id" json:"team_id"`
	EmployeeID uuid.UUID `db:"employee_id" json:"employee_id"`
	TenantID   uuid.UUID `db:"tenant_id" json:"tenant_id"`
	Role       TeamRole  `db:"role" json:"role"`
	JoinedAt   time.Time `db:"joined_at" json:"joined_at"`
}

// ValidRole returns true when the string represents a known team role.
func ValidRole(role string) bool {
	return role == string(TeamRoleMember) || role == string(TeamRoleLead)
}
