package middleware

import (
	"context"
	"net/http"

	"github.com/google/uuid"
)

// TenantDBBinder — packages/go/tenantdb bridge. The gateway is a reverse
// proxy so it never talks to app.* tables directly; the binder is still
// provided so operators can point a small set of admin endpoints at the
// gateway-resident DB handle (api key rotation, webhook dispatcher) without
// re-implementing the RLS setup.
//
// The gateway stores tenant/user as strings (not uuid.UUID); we parse them
// here and skip the request on parse error.
func TenantDBBinder(
	bind func(ctx context.Context, tenantID, userID uuid.UUID) context.Context,
) func(http.Handler) http.Handler {
	if bind == nil {
		panic("middleware: TenantDBBinder requires a non-nil bind function")
	}
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			tidStr := TenantIDFromContext(r.Context())
			if tidStr == "" {
				next.ServeHTTP(w, r)
				return
			}
			tid, err := uuid.Parse(tidStr)
			if err != nil {
				// Non-UUID tenant = not a real tenant; pass through.
				next.ServeHTTP(w, r)
				return
			}
			var uid uuid.UUID
			if uidStr := UserIDFromContext(r.Context()); uidStr != "" {
				uid, _ = uuid.Parse(uidStr)
			}
			ctx := bind(r.Context(), tid, uid)
			next.ServeHTTP(w, r.WithContext(ctx))
		})
	}
}
