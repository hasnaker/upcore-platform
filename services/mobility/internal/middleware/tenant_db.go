package middleware

import (
	"context"
	"net/http"

	"github.com/google/uuid"
)

// TenantDBBinder — packages/go/tenantdb bridge. mobility exposes a
// (uuid.UUID, bool) shape for TenantID/UserID so we branch on the flag.
func TenantDBBinder(
	bind func(ctx context.Context, tenantID, userID uuid.UUID) context.Context,
) func(http.Handler) http.Handler {
	if bind == nil {
		panic("middleware: TenantDBBinder requires a non-nil bind function")
	}
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			tid, ok := TenantID(r.Context())
			if !ok || tid == uuid.Nil {
				next.ServeHTTP(w, r)
				return
			}
			uid, _ := UserID(r.Context())
			ctx := bind(r.Context(), tid, uid)
			next.ServeHTTP(w, r.WithContext(ctx))
		})
	}
}
