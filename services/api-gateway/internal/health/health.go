package health

import (
	"context"
	"encoding/json"
	"net/http"
	"sync"
	"time"

	"github.com/redis/go-redis/v9"
	"github.com/rs/zerolog/log"

	"github.com/upcore/api-gateway/internal/proxy"
)

// Status represents the health status of a dependency.
type Status struct {
	Status string `json:"status"`
}

// DetailedStatus includes downstream service health.
type DetailedStatus struct {
	Status    string            `json:"status"`
	Redis     string            `json:"redis"`
	Upstreams map[string]string `json:"upstreams"`
}

// ReadinessStatus holds the readiness check result.
type ReadinessStatus struct {
	Status string `json:"status"`
	Redis  string `json:"redis"`
}

// HealthHandler returns a simple liveness probe handler.
func HealthHandler() http.HandlerFunc {
	return func(w http.ResponseWriter, _ *http.Request) {
		w.Header().Set("Content-Type", "application/json; charset=utf-8")
		w.WriteHeader(http.StatusOK)
		_ = json.NewEncoder(w).Encode(Status{Status: "ok"})
	}
}

// ReadinessHandler checks Redis connectivity and returns readiness status.
func ReadinessHandler(redisClient *redis.Client) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		ctx, cancel := context.WithTimeout(r.Context(), 3*time.Second)
		defer cancel()

		status := ReadinessStatus{
			Status: "ready",
			Redis:  "ok",
		}
		httpStatus := http.StatusOK

		// Check Redis
		if err := redisClient.Ping(ctx).Err(); err != nil {
			status.Redis = "unavailable"
			status.Status = "not_ready"
			httpStatus = http.StatusServiceUnavailable
			log.Warn().Err(err).Msg("readiness: redis ping failed")
		}

		w.Header().Set("Content-Type", "application/json; charset=utf-8")
		w.WriteHeader(httpStatus)
		_ = json.NewEncoder(w).Encode(status)
	}
}

// AggregateHealthHandler checks all upstream services' health endpoints.
func AggregateHealthHandler(upstreams map[string]*proxy.Upstream) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		ctx, cancel := context.WithTimeout(r.Context(), 5*time.Second)
		defer cancel()

		results := make(map[string]string)
		var mu sync.Mutex
		var wg sync.WaitGroup

		for name, u := range upstreams {
			wg.Add(1)
			go func(name string, u *proxy.Upstream) {
				defer wg.Done()

				status := "healthy"
				if !u.IsHealthy() {
					status = "unhealthy"
				}

				// Also check circuit breaker state
				state := u.BreakerState()
				if state.String() == "open" {
					status = "circuit_open"
				}

				mu.Lock()
				results[name] = status
				mu.Unlock()
			}(name, u)
		}

		wg.Wait()

		// Cancel the context if still active
		_ = ctx

		overallStatus := "ok"
		for _, s := range results {
			if s != "healthy" {
				overallStatus = "degraded"
				break
			}
		}

		detail := DetailedStatus{
			Status:    overallStatus,
			Upstreams: results,
		}

		httpStatus := http.StatusOK
		if overallStatus != "ok" {
			httpStatus = http.StatusOK // We still return 200 for degraded (gateway itself is healthy)
		}

		w.Header().Set("Content-Type", "application/json; charset=utf-8")
		w.WriteHeader(httpStatus)
		_ = json.NewEncoder(w).Encode(detail)
	}
}
