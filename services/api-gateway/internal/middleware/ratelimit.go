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
// On Redis outage the limiter is fail-closed by default: it returns
// 503 Service Unavailable. Operators can opt-in to a per-node in-memory token
// bucket fallback via RATE_LIMIT_MODE=fail_open_local.
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
					// The limiter never returns an error for store failures
					// (they surface as result.Source == "degraded" with
					// Allowed=false under fail-closed). Any error here is
					// programmer error — treat as fail-closed.
					log.Error().Err(err).
						Str("tenant_id", tenantID).
						Str("correlation_id", CorrelationID(r.Context())).
						Msg("rate limit internal error; rejecting")
					writeRateLimitUnavailable(w)
					return
				}
				if result.Source == "degraded" {
					log.Warn().
						Str("tenant_id", tenantID).
						Str("path", r.URL.Path).
						Msg("rate limit degraded: redis unavailable, failing closed")
					writeRateLimitUnavailable(w)
					return
				}
				if !result.Allowed {
					setRateLimitHeaders(w, result)
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
						Msg("rate limit internal error; rejecting")
					writeRateLimitUnavailable(w)
					return
				}
				if result.Source == "degraded" {
					log.Warn().
						Str("user_id", userID).
						Str("tenant_id", tenantID).
						Str("path", r.URL.Path).
						Msg("rate limit degraded: redis unavailable, failing closed")
					writeRateLimitUnavailable(w)
					return
				}
				if !result.Allowed {
					setRateLimitHeaders(w, result)
					writeRateLimitResponse(w, result)
					return
				}
				setRateLimitHeaders(w, result)
			}

			next.ServeHTTP(w, r)
		})
	}
}

func setRateLimitHeaders(w http.ResponseWriter, result ratelimit.Result) {
	w.Header().Set("X-RateLimit-Limit", strconv.Itoa(result.Limit))
	w.Header().Set("X-RateLimit-Remaining", strconv.Itoa(result.Remaining))
	if result.Source != "" {
		w.Header().Set("X-RateLimit-Source", result.Source)
	}
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

// writeRateLimitUnavailable is used when Redis is degraded and the limiter is
// in fail-closed mode. We return 503 with Retry-After so clients back off
// rather than hammer the degraded gateway.
func writeRateLimitUnavailable(w http.ResponseWriter) {
	w.Header().Set("Content-Type", "application/json; charset=utf-8")
	w.Header().Set("Retry-After", "5")
	w.WriteHeader(http.StatusServiceUnavailable)
	_ = json.NewEncoder(w).Encode(map[string]string{
		"error":   "rate_limit_unavailable",
		"message": "rate limiter is temporarily unavailable; please retry shortly",
	})
}
