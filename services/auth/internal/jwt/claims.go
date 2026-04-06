package jwt

import (
	"fmt"

	"github.com/golang-jwt/jwt/v5"
	"github.com/google/uuid"
)

// Claims is the Upcore JWT payload. Compatible with Clerk JWTs that include
// custom claims (tenant_id, roles, role) via Clerk template.
type Claims struct {
	UserID   string   `json:"user_id,omitempty"`
	TenantID string   `json:"tenant_id,omitempty"`
	Email    string   `json:"email,omitempty"`
	Role     string   `json:"role,omitempty"`
	Roles    []string `json:"roles,omitempty"`
	ClerkID  string   `json:"clerk_id,omitempty"`

	jwt.RegisteredClaims
}

// ParsedUserID returns the user id as a uuid, or error if missing/invalid.
func (c *Claims) ParsedUserID() (uuid.UUID, error) {
	if c.UserID == "" {
		return uuid.Nil, fmt.Errorf("user_id claim missing")
	}
	return uuid.Parse(c.UserID)
}

// ParsedTenantID returns tenant id as uuid.
func (c *Claims) ParsedTenantID() (uuid.UUID, error) {
	if c.TenantID == "" {
		return uuid.Nil, fmt.Errorf("tenant_id claim missing")
	}
	return uuid.Parse(c.TenantID)
}

// EffectiveRoles returns the union of Role + Roles, deduplicated.
func (c *Claims) EffectiveRoles() []string {
	seen := make(map[string]struct{})
	var out []string
	if c.Role != "" {
		seen[c.Role] = struct{}{}
		out = append(out, c.Role)
	}
	for _, r := range c.Roles {
		if _, ok := seen[r]; ok || r == "" {
			continue
		}
		seen[r] = struct{}{}
		out = append(out, r)
	}
	return out
}
