// Package middleware provides HTTP middlewares for the audit service.
package middleware

import (
	"context"
	"net/http"
	"strings"

	"github.com/google/uuid"
)

// ContextKey is a typed key for context values.
type ContextKey string

const (
	// CtxTenantID stores the tenant UUID.
	CtxTenantID ContextKey = "tenant_id"
	// CtxUserID stores the authenticated user UUID.
	CtxUserID ContextKey = "user_id"
	// CtxRole stores the user's role.
	CtxRole ContextKey = "role"
	// CtxRequestID stores the request ID.
	CtxRequestID ContextKey = "request_id"
)

// TenantIDFromContext returns the tenant ID or uuid.Nil.
func TenantIDFromContext(ctx context.Context) uuid.UUID {
	if v, ok := ctx.Value(CtxTenantID).(uuid.UUID); ok {
		return v
	}
	return uuid.Nil
}

// UserIDFromContext returns the user ID or uuid.Nil.
func UserIDFromContext(ctx context.Context) uuid.UUID {
	if v, ok := ctx.Value(CtxUserID).(uuid.UUID); ok {
		return v
	}
	return uuid.Nil
}

// RoleFromContext returns the user role.
func RoleFromContext(ctx context.Context) string {
	if v, ok := ctx.Value(CtxRole).(string); ok {
		return v
	}
	return ""
}

// TenantInjector extracts tenant/user headers (set by the API gateway after
// JWT validation) and injects them into the request context.
func TenantInjector(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		tenantStr := strings.TrimSpace(r.Header.Get("X-Tenant-ID"))
		userStr := strings.TrimSpace(r.Header.Get("X-User-ID"))
		role := strings.TrimSpace(r.Header.Get("X-User-Role"))

		ctx := r.Context()
		if tenantStr != "" {
			if tid, err := uuid.Parse(tenantStr); err == nil {
				ctx = context.WithValue(ctx, CtxTenantID, tid)
			}
		}
		if userStr != "" {
			if uid, err := uuid.Parse(userStr); err == nil {
				ctx = context.WithValue(ctx, CtxUserID, uid)
			}
		}
		if role != "" {
			ctx = context.WithValue(ctx, CtxRole, role)
		}
		next.ServeHTTP(w, r.WithContext(ctx))
	})
}
