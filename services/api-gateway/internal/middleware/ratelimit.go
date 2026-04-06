package middleware

import (
	"encoding/json"
	"fmt"
	"net/http"
	"strconv"

	"github.com/rs/zerolog/log"

	"github.com/upcore/api-gateway/internal/ratelimit"
)

// RateLimitMiddleware applies per-tenant and per-user sliding-window rate limits.
// When exceeded, it returns 429 Too Many Requests with Retry-After headers.
func RateLimitMiddleware(limiter *ratelimit.Limiter, policyStore *ratelimit.PolicyStore) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			tenantID := TenantIDFromContext(r.Context())
			userID := UserIDFromContext(r.Context())

			// Skip rate limiting for unauthenticated routes (no tenant/user context)
			if tenantID == "" && userID == "" {
				next.ServeHTTP(w, r)
				return
			}

			policy := policyStore.PolicyFor(r.URL.Path)

			// Check per-tenant rate limit
			if tenantID != "" && policy.PerTenant > 0 {
				tenantKey := ratelimit.TenantKey(tenantID)
				result, err := limiter.Allow(r.Context(), tenantKey, policy.PerTenant)
				if err != nil {
					log.Error().Err(err).
						Str("tenant_id", tenantID).
						Str("correlation_id", CorrelationID(r.Context())).
						Msg("rate limit check error, allowing request")
					// Fail open on rate limit errors
				} else if !result.Allowed {
					writeRateLimitResponse(w, result)
					return
				}
			}

			// Check per-user rate limit
			if userID != "" && policy.PerUser > 0 {
				userKey := ratelimit.UserKey(tenantID, userID)
				result, err := limiter.Allow(r.Context(), userKey, policy.PerUser)
				if err != nil {
					log.Error().Err(err).
						Str("user_id", userID).
						Str("tenant_id", tenantID).
						Str("correlation_id", CorrelationID(r.Context())).
						Msg("rate limit check error, allowing request")
					// Fail open on rate limit errors
				} else if !result.Allowed {
					setRateLimitHeaders(w, result)
					writeRateLimitResponse(w, result)
					return
				} else {
					setRateLimitHeaders(w, result)
				}
			}

			next.ServeHTTP(w, r)
		})
	}
}

func setRateLimitHeaders(w http.ResponseWriter, result ratelimit.Result) {
	w.Header().Set("X-RateLimit-Limit", strconv.Itoa(result.Limit))
	w.Header().Set("X-RateLimit-Remaining", strconv.Itoa(result.Remaining))
}

func writeRateLimitResponse(w http.ResponseWriter, result ratelimit.Result) {
	w.Header().Set("Content-Type", "application/json; charset=utf-8")
	w.Header().Set("Retry-After", "60")
	w.Header().Set("X-RateLimit-Limit", strconv.Itoa(result.Limit))
	w.Header().Set("X-RateLimit-Remaining", fmt.Sprintf("%d", 0))
	w.WriteHeader(http.StatusTooManyRequests)
	_ = json.NewEncoder(w).Encode(map[string]string{
		"error":   "rate_limit_exceeded",
		"message": "too many requests, please try again later",
	})
}
