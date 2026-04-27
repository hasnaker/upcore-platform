package middleware

import (
	"context"
	"net/http"
	"strings"
	"time"

	"github.com/jmoiron/sqlx"
	"golang.org/x/crypto/bcrypt"
)

// APIKeyAuth authenticates requests that use a long-lived API key (Bearer
// token with "upc_live_" or "upc_test_" prefix). This runs BEFORE the Clerk
// JWT middleware; if a key is present and valid, we set the same context
// values (tenant/user/role) that Clerk would — downstream services stay
// unchanged. If no API key header, the request falls through to JWT auth.
//
// Rate limiting is applied per-key by the downstream RateLimitMiddleware
// using the resolved tenant id.
type APIKeyAuth struct {
	DB *sqlx.DB
}

// NewAPIKeyAuth constructs.
func NewAPIKeyAuth(db *sqlx.DB) *APIKeyAuth { return &APIKeyAuth{DB: db} }

type keyRow struct {
	ID               string    `db:"id"`
	TenantID         string    `db:"tenant_id"`
	KeyHash          []byte    `db:"key_hash"`
	Scopes           []string  `db:"scopes"`
	RateLimitPerMin  int       `db:"rate_limit_per_minute"`
	RevokedAt        *time.Time `db:"revoked_at"`
	ExpiresAt        *time.Time `db:"expires_at"`
}

// Middleware runs the auth check.
func (a *APIKeyAuth) Middleware() func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			auth := r.Header.Get("Authorization")
			if !strings.HasPrefix(auth, "Bearer upc_") {
				next.ServeHTTP(w, r)
				return
			}
			token := strings.TrimPrefix(auth, "Bearer ")
			parts := strings.SplitN(token, "_", 4)
			if len(parts) < 3 {
				http.Error(w, "invalid api key format", http.StatusUnauthorized)
				return
			}
			// Prefix = first 16 chars of the key (matches key_prefix column).
			prefix := token
			if len(token) > 16 {
				prefix = token[:16]
			}
			var row keyRow
			err := a.DB.GetContext(r.Context(), &row,
				`SELECT id::text, tenant_id::text, key_hash, scopes, rate_limit_per_minute,
				        revoked_at, expires_at
				 FROM app.api_keys WHERE key_prefix = $1`, prefix)
			if err != nil {
				http.Error(w, "invalid api key", http.StatusUnauthorized)
				return
			}
			if row.RevokedAt != nil {
				http.Error(w, "key revoked", http.StatusUnauthorized)
				return
			}
			if row.ExpiresAt != nil && row.ExpiresAt.Before(time.Now()) {
				http.Error(w, "key expired", http.StatusUnauthorized)
				return
			}
			if err := bcrypt.CompareHashAndPassword(row.KeyHash, []byte(token)); err != nil {
				http.Error(w, "invalid api key", http.StatusUnauthorized)
				return
			}
			// Mark last_used_at (non-blocking).
			go func() {
				_, _ = a.DB.Exec(`UPDATE app.api_keys SET last_used_at = NOW() WHERE id = $1::uuid`, row.ID)
			}()

			// Inject tenant + synthesized user headers so downstream services
			// see the same shape as JWT-authenticated requests.
			r.Header.Set("X-Tenant-ID", row.TenantID)
			r.Header.Set("X-User-ID", "00000000-0000-0000-0000-000000000000")
			r.Header.Set("X-User-Role", "api")
			r.Header.Set("X-API-Key-ID", row.ID)

			ctx := context.WithValue(r.Context(), ctxAPIKeyScopes{}, row.Scopes)
			next.ServeHTTP(w, r.WithContext(ctx))
		})
	}
}

type ctxAPIKeyScopes struct{}

// ScopesFromContext returns the scopes granted to the calling API key,
// or nil if the caller authenticated via JWT (not API key).
func ScopesFromContext(ctx context.Context) []string {
	if v, ok := ctx.Value(ctxAPIKeyScopes{}).([]string); ok {
		return v
	}
	return nil
}

// RequireScope gates a route to API keys that include a specific scope
// (e.g. "read:employees"). Non-API-key callers pass through.
func RequireScope(scope string) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			scopes := ScopesFromContext(r.Context())
			if scopes == nil {
				next.ServeHTTP(w, r)
				return
			}
			for _, s := range scopes {
				if s == scope || s == "*" {
					next.ServeHTTP(w, r)
					return
				}
			}
			http.Error(w, "scope not granted: "+scope, http.StatusForbidden)
		})
	}
}
