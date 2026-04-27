package middleware

import (
	"context"
	"net/http"

	"github.com/google/uuid"

	"github.com/upcore/auth/internal/domain"
)

// TenantDBBinder — packages/go/tenantdb bridge. auth stores the tenant
// and user via domain.TenantFromContext / domain.UserFromContext (both
// return (_, bool)).
func TenantDBBinder(
	bind func(ctx context.Context, tenantID, userID uuid.UUID) context.Context,
) func(http.Handler) http.Handler {
	if bind == nil {
		panic("middleware: TenantDBBinder requires a non-nil bind function")
	}
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			tid, ok := domain.TenantFromContext(r.Context())
			if !ok || tid == uuid.Nil {
				next.ServeHTTP(w, r)
				return
			}
			var uid uuid.UUID
			if u, ok := domain.UserFromContext(r.Context()); ok && u != nil {
				uid = u.UserID
			}
			ctx := bind(r.Context(), tid, uid)
			next.ServeHTTP(w, r.WithContext(ctx))
		})
	}
}
