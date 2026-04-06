package middleware

import (
	"context"
	"encoding/json"
	"net/http"

	"github.com/rs/zerolog/log"
)

type tenantIDKey struct{}
type userIDKey struct{}

// TenantMiddleware extracts the tenant_id from validated JWT claims and injects
// the X-Tenant-Id header downstream. Returns 403 if the tenant claim is missing
// on protected routes.
func TenantMiddleware() func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			claims := ClaimsFromContext(r.Context())

			// If no claims (unauthenticated route), pass through
			if claims == nil {
				next.ServeHTTP(w, r)
				return
			}

			tenantID := claims.GetTenantID()
			userID := claims.GetUserID()

			// Store in context for downstream use (logging, rate limiting)
			ctx := r.Context()
			ctx = context.WithValue(ctx, userIDKey{}, userID)

			if tenantID == "" {
				log.Warn().
					Str("user_id", userID).
					Str("path", r.URL.Path).
					Str("correlation_id", CorrelationID(r.Context())).
					Msg("missing tenant_id in JWT claims")

				w.Header().Set("Content-Type", "application/json; charset=utf-8")
				w.WriteHeader(http.StatusForbidden)
				_ = json.NewEncoder(w).Encode(map[string]string{
					"error":   "forbidden",
					"message": "tenant context required",
				})
				return
			}

			ctx = context.WithValue(ctx, tenantIDKey{}, tenantID)

			// Inject tenant ID header for downstream services
			r.Header.Set("X-Tenant-Id", tenantID)

			next.ServeHTTP(w, r.WithContext(ctx))
		})
	}
}

// TenantIDFromContext extracts the tenant ID from the context.
func TenantIDFromContext(ctx context.Context) string {
	if id, ok := ctx.Value(tenantIDKey{}).(string); ok {
		return id
	}
	return ""
}

// UserIDFromContext extracts the user ID from the context.
func UserIDFromContext(ctx context.Context) string {
	if id, ok := ctx.Value(userIDKey{}).(string); ok {
		return id
	}
	return ""
}
