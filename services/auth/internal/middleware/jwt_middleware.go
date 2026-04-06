package middleware

import (
	"context"
	"errors"
	"net/http"
	"strings"

	"github.com/upcore/auth/internal/domain"
	authjwt "github.com/upcore/auth/internal/jwt"
)

// JWTValidator is the contract the middleware uses.
type JWTValidator interface {
	Validate(ctx context.Context, token string) (*authjwt.Claims, error)
}

// RequireJWT validates the Authorization header and injects a UserContext.
func RequireJWT(v JWTValidator) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			tok, err := extractBearer(r)
			if err != nil {
				writeJSONError(w, http.StatusUnauthorized, "missing_token", err.Error())
				return
			}

			claims, err := v.Validate(r.Context(), tok)
			if err != nil {
				status := http.StatusUnauthorized
				code := "invalid_token"
				if errors.Is(err, domain.ErrTokenExpired) {
					code = "token_expired"
				}
				writeJSONError(w, status, code, err.Error())
				return
			}

			userID, err := claims.ParsedUserID()
			if err != nil {
				writeJSONError(w, http.StatusUnauthorized, "invalid_token", err.Error())
				return
			}
			tenantID, err := claims.ParsedTenantID()
			if err != nil {
				writeJSONError(w, http.StatusUnauthorized, "missing_tenant", err.Error())
				return
			}
			uc := &domain.UserContext{
				UserID:   userID,
				TenantID: tenantID,
				ClerkID:  claims.ClerkID,
				Email:    claims.Email,
				Role:     claims.Role,
				Roles:    claims.EffectiveRoles(),
			}
			ctx := domain.WithUser(r.Context(), uc)
			ctx = domain.WithTenant(ctx, tenantID)
			next.ServeHTTP(w, r.WithContext(ctx))
		})
	}
}

// extractBearer pulls the token from "Authorization: Bearer <token>".
func extractBearer(r *http.Request) (string, error) {
	h := r.Header.Get("Authorization")
	if h == "" {
		return "", errors.New("authorization header missing")
	}
	parts := strings.SplitN(h, " ", 2)
	if len(parts) != 2 || !strings.EqualFold(parts[0], "Bearer") {
		return "", errors.New("authorization header malformed")
	}
	if parts[1] == "" {
		return "", errors.New("empty token")
	}
	return parts[1], nil
}
