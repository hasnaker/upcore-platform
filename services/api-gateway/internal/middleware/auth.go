package middleware

import (
	"context"
	"encoding/json"
	"net/http"
	"strings"

	"github.com/rs/zerolog/log"

	gatewayjwt "github.com/upcore/api-gateway/internal/jwt"
)

type claimsKey struct{}

// AuthMiddleware validates JWT Bearer tokens on all requests except those
// matching skipPaths. On failure, it returns 401 Unauthorized.
func AuthMiddleware(validator *gatewayjwt.Validator, skipPaths []string) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			// Skip auth for whitelisted paths
			if shouldSkipAuth(r.URL.Path, skipPaths) {
				next.ServeHTTP(w, r)
				return
			}

			// Extract Bearer token
			authHeader := r.Header.Get("Authorization")
			if authHeader == "" {
				writeAuthError(w, http.StatusUnauthorized, "missing authorization header")
				return
			}

			if !strings.HasPrefix(authHeader, "Bearer ") && !strings.HasPrefix(authHeader, "bearer ") {
				writeAuthError(w, http.StatusUnauthorized, "invalid authorization header format")
				return
			}

			token := strings.TrimPrefix(authHeader, "Bearer ")
			token = strings.TrimPrefix(token, "bearer ")

			// Validate token
			claims, err := validator.Validate(token)
			if err != nil {
				log.Debug().Err(err).
					Str("path", r.URL.Path).
					Str("correlation_id", CorrelationID(r.Context())).
					Msg("jwt validation failed")

				writeAuthError(w, http.StatusUnauthorized, "invalid or expired token")
				return
			}

			// Store claims in context
			ctx := context.WithValue(r.Context(), claimsKey{}, claims)

			// Inject user headers for downstream services
			r.Header.Set("X-User-Id", claims.GetUserID())
			r.Header.Set("X-User-Roles", strings.Join(claims.GetRoles(), ","))
			if claims.Email != "" {
				r.Header.Set("X-User-Email", claims.Email)
			}

			next.ServeHTTP(w, r.WithContext(ctx))
		})
	}
}

// ClaimsFromContext extracts JWT claims from the request context.
func ClaimsFromContext(ctx context.Context) *gatewayjwt.Claims {
	claims, _ := ctx.Value(claimsKey{}).(*gatewayjwt.Claims)
	return claims
}

// shouldSkipAuth checks if the path matches any of the skip patterns.
func shouldSkipAuth(path string, skipPaths []string) bool {
	for _, skip := range skipPaths {
		if skip == path {
			return true
		}
		// Support wildcard suffix
		if strings.HasSuffix(skip, "*") {
			prefix := strings.TrimSuffix(skip, "*")
			if strings.HasPrefix(path, prefix) {
				return true
			}
		}
	}
	return false
}

func writeAuthError(w http.ResponseWriter, status int, message string) {
	w.Header().Set("Content-Type", "application/json; charset=utf-8")
	w.Header().Set("WWW-Authenticate", `Bearer realm="upcore"`)
	w.WriteHeader(status)
	_ = json.NewEncoder(w).Encode(map[string]string{
		"error":   "unauthorized",
		"message": message,
	})
}
