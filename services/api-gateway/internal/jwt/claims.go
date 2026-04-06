package jwt

import (
	"github.com/golang-jwt/jwt/v5"
)

// Claims represents the Upcore-specific JWT claims from Clerk-issued tokens.
type Claims struct {
	jwt.RegisteredClaims

	// TenantID is the tenant (organization) the user belongs to.
	TenantID string `json:"tenant_id,omitempty"`

	// OrgID is the Clerk organization ID (maps to tenant).
	OrgID string `json:"org_id,omitempty"`

	// Roles are the user's roles within the tenant.
	Roles []string `json:"roles,omitempty"`

	// OrgRole is the Clerk organization role.
	OrgRole string `json:"org_role,omitempty"`

	// Email is the user's email address.
	Email string `json:"email,omitempty"`
}

// GetTenantID returns the tenant ID from claims, preferring tenant_id over org_id.
func (c *Claims) GetTenantID() string {
	if c.TenantID != "" {
		return c.TenantID
	}
	return c.OrgID
}

// GetUserID returns the subject (user ID) from the token.
func (c *Claims) GetUserID() string {
	return c.Subject
}

// GetRoles returns the user's roles, including org_role if present.
func (c *Claims) GetRoles() []string {
	roles := make([]string, 0, len(c.Roles)+1)
	roles = append(roles, c.Roles...)
	if c.OrgRole != "" {
		roles = append(roles, c.OrgRole)
	}
	return roles
}
