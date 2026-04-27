package middleware

import (
	"context"
	"net/http"

	"github.com/google/uuid"
)

// TenantDBBinder — packages/go/tenantdb bridge. bordro exposes TenantID /
// UserID (not *FromContext) so we wrap those.
func TenantDBBinder(
	bind func(ctx context.Context, tenantID, userID uuid.UUID) context.Context,
) func(http.Handler) http.Handler {
	if bind == nil {
		panic("middleware: TenantDBBinder requires a non-nil bind function")
	}
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			tid := TenantID(r.Context())
			if tid == uuid.Nil {
				next.ServeHTTP(w, r)
				return
			}
			ctx := bind(r.Context(), tid, UserID(r.Context()))
			next.ServeHTTP(w, r.WithContext(ctx))
		})
	}
}
