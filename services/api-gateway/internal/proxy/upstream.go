package proxy

import (
	"context"
	"fmt"
	"net/http"
	"net/url"
	"sync"
	"time"

	"github.com/rs/zerolog/log"
	gobreaker "github.com/sony/gobreaker"
)

// Upstream represents a backend service with health checking and circuit breaking.
type Upstream struct {
	Name      string
	BaseURL   *url.URL
	breaker   *gobreaker.CircuitBreaker
	healthy   bool
	healthMu  sync.RWMutex
	client    *http.Client
}

// UpstreamConfig holds circuit breaker configuration.
type UpstreamConfig struct {
	MaxFailures uint32
	Timeout     time.Duration
}

// DefaultUpstreamConfig returns sensible defaults for circuit breaker settings.
func DefaultUpstreamConfig() UpstreamConfig {
	return UpstreamConfig{
		MaxFailures: 5,
		Timeout:     30 * time.Second,
	}
}

// NewUpstream creates a new upstream with circuit breaker protection.
func NewUpstream(name, rawURL string, cfg UpstreamConfig) (*Upstream, error) {
	u, err := url.Parse(rawURL)
	if err != nil {
		return nil, fmt.Errorf("parse upstream URL %s: %w", rawURL, err)
	}

	settings := gobreaker.Settings{
		Name:        name,
		MaxRequests: 3, // half-open: allow 3 probe requests
		Interval:    60 * time.Second,
		Timeout:     cfg.Timeout,
		ReadyToTrip: func(counts gobreaker.Counts) bool {
			return counts.ConsecutiveFailures >= cfg.MaxFailures
		},
		OnStateChange: func(name string, from gobreaker.State, to gobreaker.State) {
			log.Warn().
				Str("upstream", name).
				Str("from", from.String()).
				Str("to", to.String()).
				Msg("circuit breaker state change")
		},
	}

	upstream := &Upstream{
		Name:    name,
		BaseURL: u,
		breaker: gobreaker.NewCircuitBreaker(settings),
		healthy: true,
		client: &http.Client{
			Timeout: 5 * time.Second,
		},
	}

	return upstream, nil
}

// IsHealthy returns the current health status of the upstream.
func (u *Upstream) IsHealthy() bool {
	u.healthMu.RLock()
	defer u.healthMu.RUnlock()
	return u.healthy
}

// BreakerState returns the current circuit breaker state.
func (u *Upstream) BreakerState() gobreaker.State {
	return u.breaker.State()
}

// Execute runs the given function through the circuit breaker.
func (u *Upstream) Execute(fn func() (*http.Response, error)) (*http.Response, error) {
	result, err := u.breaker.Execute(func() (interface{}, error) {
		return fn()
	})
	if err != nil {
		return nil, err
	}
	return result.(*http.Response), nil
}

// StartHealthCheck begins periodic health checking of the upstream service.
func (u *Upstream) StartHealthCheck(ctx context.Context, interval time.Duration) {
	ticker := time.NewTicker(interval)
	go func() {
		defer ticker.Stop()
		for {
			select {
			case <-ctx.Done():
				return
			case <-ticker.C:
				u.checkHealth(ctx)
			}
		}
	}()
}

// checkHealth performs a single health check against the upstream.
func (u *Upstream) checkHealth(ctx context.Context) {
	healthURL := fmt.Sprintf("%s/health", u.BaseURL.String())
	req, err := http.NewRequestWithContext(ctx, http.MethodGet, healthURL, nil)
	if err != nil {
		u.setHealthy(false)
		return
	}

	resp, err := u.client.Do(req)
	if err != nil {
		u.setHealthy(false)
		log.Debug().Err(err).Str("upstream", u.Name).Msg("health check failed")
		return
	}
	defer resp.Body.Close()

	healthy := resp.StatusCode == http.StatusOK
	u.setHealthy(healthy)
}

func (u *Upstream) setHealthy(healthy bool) {
	u.healthMu.Lock()
	defer u.healthMu.Unlock()
	if u.healthy != healthy {
		log.Info().
			Str("upstream", u.Name).
			Bool("healthy", healthy).
			Msg("upstream health status changed")
	}
	u.healthy = healthy
}
