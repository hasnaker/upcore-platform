package middleware

import (
	"net/http"

	"github.com/upcore/auth/internal/domain"
)

// RequireTenant ensures the request has a tenant_id in context (set by JWT
// middleware). Returns 401 otherwise.
func RequireTenant(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if _, ok := domain.TenantFromContext(r.Context()); !ok {
			writeJSONError(w, http.StatusUnauthorized, "missing_tenant", "tenant context required")
			return
		}
		next.ServeHTTP(w, r)
	})
}
