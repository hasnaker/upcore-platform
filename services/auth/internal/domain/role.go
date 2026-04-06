package domain

import (
	"time"

	"github.com/google/uuid"
)

// System role names seeded per tenant.
const (
	RoleSuperAdmin   = "super_admin"
	RoleTenantAdmin  = "tenant_admin"
	RoleHRDirector   = "hr_director"
	RoleHRManager    = "hr_manager"
	RoleLineManager  = "line_manager"
	RoleEmployee     = "employee"
	RoleCandidate    = "candidate"
)

// SystemRoles lists the canonical roles seeded for every tenant.
var SystemRoles = []string{
	RoleSuperAdmin,
	RoleTenantAdmin,
	RoleHRDirector,
	RoleHRManager,
	RoleLineManager,
	RoleEmployee,
	RoleCandidate,
}

// Role represents an RBAC role. System roles have tenant_id NULL and are shared.
type Role struct {
	ID          uuid.UUID  `db:"id" json:"id"`
	TenantID    *uuid.UUID `db:"tenant_id" json:"tenant_id,omitempty"`
	Name        string     `db:"name" json:"name"`
	Description string     `db:"description" json:"description"`
	IsSystem    bool       `db:"is_system" json:"is_system"`
	CreatedAt   time.Time  `db:"created_at" json:"created_at"`
}

// UserRole is the join record assigning a role to a user.
type UserRole struct {
	UserID    uuid.UUID `db:"user_id" json:"user_id"`
	RoleID    uuid.UUID `db:"role_id" json:"role_id"`
	TenantID  uuid.UUID `db:"tenant_id" json:"tenant_id"`
	GrantedBy uuid.UUID `db:"granted_by" json:"granted_by"`
	GrantedAt time.Time `db:"granted_at" json:"granted_at"`
}

// Permission is a (action, resource) pair, e.g. (read, employees).
type Permission struct {
	Action   string `json:"action"`
	Resource string `json:"resource"`
}
