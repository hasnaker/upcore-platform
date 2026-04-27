package middleware

import (
	"context"
	"net/http"

	"github.com/google/uuid"
)

// TenantDBBinder — see docs on packages/go/tenantdb. This is the thin
// per-service bridge that plugs the shared tenantdb handle into the RLS
// chain without pulling the whole tenantdb package into services that do
// not yet use pgx. Callers pass the bind closure from cmd/main.go.
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
