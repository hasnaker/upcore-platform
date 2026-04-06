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
	// CtxTenantID is the key under which the tenant ID is stored in context.
	CtxTenantID ContextKey = "tenant_id"
	// CtxUserID is the key under which the user ID is stored in context.
	CtxUserID ContextKey = "user_id"
	// CtxEmployeeID is the key under which the user's employee ID is stored.
	CtxEmployeeID ContextKey = "employee_id"
	// CtxRole stores the authenticated user's role.
	CtxRole ContextKey = "role"
)

// TenantIDFromContext returns the tenant ID from context, or zero UUID.
func TenantIDFromContext(ctx context.Context) uuid.UUID {
	if v, ok := ctx.Value(CtxTenantID).(uuid.UUID); ok {
		return v
	}
	return uuid.Nil
}

// UserIDFromContext returns the user ID from context, or zero UUID.
func UserIDFromContext(ctx context.Context) uuid.UUID {
	if v, ok := ctx.Value(CtxUserID).(uuid.UUID); ok {
		return v
	}
	return uuid.Nil
}

// EmployeeIDFromContext returns the employee ID from context, or zero UUID.
func EmployeeIDFromContext(ctx context.Context) uuid.UUID {
	if v, ok := ctx.Value(CtxEmployeeID).(uuid.UUID); ok {
		return v
	}
	return uuid.Nil
}

// RoleFromContext returns the role from context, or empty string.
func RoleFromContext(ctx context.Context) string {
	if v, ok := ctx.Value(CtxRole).(string); ok {
		return v
	}
	return ""
}

// RequireAuth extracts tenant/user IDs from trusted gateway headers.
func RequireAuth(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		tenantStr := strings.TrimSpace(r.Header.Get("X-Tenant-ID"))
		userStr := strings.TrimSpace(r.Header.Get("X-User-ID"))
		if tenantStr == "" || userStr == "" {
			http.Error(w, `{"error":"unauthorized"}`, http.StatusUnauthorized)
			return
		}
		tid, err := uuid.Parse(tenantStr)
		if err != nil {
			http.Error(w, `{"error":"invalid X-Tenant-ID"}`, http.StatusUnauthorized)
			return
		}
		uid, err := uuid.Parse(userStr)
		if err != nil {
			http.Error(w, `{"error":"invalid X-User-ID"}`, http.StatusUnauthorized)
			return
		}
		role := r.Header.Get("X-User-Role")
		ctx := context.WithValue(r.Context(), CtxTenantID, tid)
		ctx = context.WithValue(ctx, CtxUserID, uid)
		ctx = context.WithValue(ctx, CtxRole, role)
		// optional employee id
		if empStr := strings.TrimSpace(r.Header.Get("X-Employee-ID")); empStr != "" {
			if eid, err := uuid.Parse(empStr); err == nil {
				ctx = context.WithValue(ctx, CtxEmployeeID, eid)
			}
		}
		next.ServeHTTP(w, r.WithContext(ctx))
	})
}

// RequireRole enforces that the context carries one of the allowed roles.
func RequireRole(roles ...string) func(http.Handler) http.Handler {
	allowed := make(map[string]struct{}, len(roles))
	for _, r := range roles {
		allowed[strings.ToLower(r)] = struct{}{}
	}
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			role := strings.ToLower(RoleFromContext(r.Context()))
			if _, ok := allowed[role]; !ok {
				http.Error(w, `{"error":"forbidden"}`, http.StatusForbidden)
				return
			}
			next.ServeHTTP(w, r)
		})
	}
}
