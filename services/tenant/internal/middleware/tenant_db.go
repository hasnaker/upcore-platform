package middleware

import (
	"context"
	"net/http"

	"github.com/google/uuid"
)

// TenantDBBinder — packages/go/tenantdb bridge middleware. The tenant
// service is special: a few admin routes operate on multiple tenants
// (platform-admin impersonation) and those MUST NOT call the binder;
// guard such routes with a stand-alone handler that uses the raw pool.
func TenantDBBinder(
	bind func(ctx context.Context, tenantID, userID uuid.UUID) context.Context,
) func(http.Handler) http.Handler {
	if bind == nil {
		panic("middleware: TenantDBBinder requires a non-nil bind function")
	}
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			tid := TenantIDFromContext(r.Context())
			if tid == uuid.Nil {
				next.ServeHTTP(w, r)
				return
			}
			ctx := bind(r.Context(), tid, UserIDFromContext(r.Context()))
			next.ServeHTTP(w, r.WithContext(ctx))
		})
	}
}
