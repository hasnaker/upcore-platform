package middleware

import (
	"context"
	"net/http"

	"github.com/google/uuid"
)

// TenantDBBinder returns an HTTP middleware factory that can be plugged
// into any tenant-scoped route. Callers pass in a bind function that
// receives (tenantID, userID) for the current request and attaches a
// database handle (typically a tenantdb.TenantDB) to the context.
//
// Example wiring in cmd/main.go:
//
//	tdb := tenantdb.NewFromPool(pool)
//	r.Use(middleware.TenantInjector)
//	r.Use(middleware.TenantDBBinder(func(ctx context.Context, tenantID, userID uuid.UUID) context.Context {
//	    return tenantdb.WithHandle(ctx, tdb, tenantID, userID)
//	}))
//
// Keeping the binder generic (no direct tenantdb import) lets services opt
// in incrementally without forcing a shared module dependency.
func TenantDBBinder(
	bind func(ctx context.Context, tenantID, userID uuid.UUID) context.Context,
) func(http.Handler) http.Handler {
	if bind == nil {
		panic("middleware: TenantDBBinder requires a non-nil bind function")
	}
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			tenantID := TenantID(r.Context())
			if tenantID == uuid.Nil {
				// Unauthenticated request — health/ready or gateway proxy
				// pre-auth. No RLS setup needed; downstream repos will fail
				// loudly via app.current_tenant_id() if they try to query.
				next.ServeHTTP(w, r)
				return
			}
			ctx := bind(r.Context(), tenantID, UserID(r.Context()))
			next.ServeHTTP(w, r.WithContext(ctx))
		})
	}
}
