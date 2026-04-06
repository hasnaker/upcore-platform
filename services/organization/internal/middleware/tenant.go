package middleware

import (
	"net/http"

	"github.com/google/uuid"
)

// RequireTenant short-circuits when no tenant is present in context.
// Must run after RequireAuth.
func RequireTenant(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if TenantIDFromContext(r.Context()) == uuid.Nil {
			http.Error(w, `{"error":"missing tenant"}`, http.StatusUnauthorized)
			return
		}
		next.ServeHTTP(w, r)
	})
}
