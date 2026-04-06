package domain

import (
	"context"

	"github.com/google/uuid"
)

type contextKey string

const (
	ctxKeyUser   contextKey = "audit.user"
	ctxKeyTenant contextKey = "audit.tenant"
	ctxKeyReqID  contextKey = "audit.request_id"
)

// UserContext represents the authenticated caller.
type UserContext struct {
	UserID   uuid.UUID
	TenantID uuid.UUID
	Email    string
	Role     string
	Roles    []string
}

// HasRole reports whether the caller has the given role.
func (u *UserContext) HasRole(role string) bool {
	if u == nil {
		return false
	}
	if u.Role == role {
		return true
	}
	for _, r := range u.Roles {
		if r == role {
			return true
		}
	}
	return false
}

// HasAnyRole reports whether the caller has any of the given roles.
func (u *UserContext) HasAnyRole(roles ...string) bool {
	for _, r := range roles {
		if u.HasRole(r) {
			return true
		}
	}
	return false
}

// WithUser stores the user context.
func WithUser(ctx context.Context, u *UserContext) context.Context {
	return context.WithValue(ctx, ctxKeyUser, u)
}

// UserFromContext retrieves the user context or returns false.
func UserFromContext(ctx context.Context) (*UserContext, bool) {
	u, ok := ctx.Value(ctxKeyUser).(*UserContext)
	return u, ok
}

// WithTenant stores tenant id on the context.
func WithTenant(ctx context.Context, tenantID uuid.UUID) context.Context {
	return context.WithValue(ctx, ctxKeyTenant, tenantID)
}

// TenantFromContext retrieves the tenant id.
func TenantFromContext(ctx context.Context) (uuid.UUID, bool) {
	id, ok := ctx.Value(ctxKeyTenant).(uuid.UUID)
	return id, ok
}

// WithRequestID stores a correlation id.
func WithRequestID(ctx context.Context, id string) context.Context {
	return context.WithValue(ctx, ctxKeyReqID, id)
}

// RequestIDFromContext retrieves the correlation id.
func RequestIDFromContext(ctx context.Context) string {
	if v, ok := ctx.Value(ctxKeyReqID).(string); ok {
		return v
	}
	return ""
}
