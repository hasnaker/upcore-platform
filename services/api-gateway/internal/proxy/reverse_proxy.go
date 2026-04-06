package proxy

import (
	"encoding/json"
	"fmt"
	"net/http"
	"net/http/httputil"
	"strings"
	"time"

	"github.com/rs/zerolog/log"

	"github.com/upcore/api-gateway/internal/config"
)

// Gateway is the core reverse proxy that routes requests to upstream services.
type Gateway struct {
	routes    []config.RouteConfig
	upstreams map[string]*Upstream
	transport http.RoundTripper
}

// NewGateway creates a new reverse proxy gateway with the given routes and upstream config.
func NewGateway(routes []config.RouteConfig, upstreamCfg UpstreamConfig, defaultTimeout time.Duration) (*Gateway, error) {
	upstreams := make(map[string]*Upstream)

	for _, r := range routes {
		if _, exists := upstreams[r.Upstream]; exists {
			continue
		}

		u, err := NewUpstream(r.Upstream, r.Target, upstreamCfg)
		if err != nil {
			return nil, fmt.Errorf("create upstream %s: %w", r.Upstream, err)
		}
		upstreams[r.Upstream] = u
	}

	return &Gateway{
		routes:    routes,
		upstreams: upstreams,
		transport: NewTransport(defaultTimeout),
	}, nil
}

// Upstreams returns the map of upstream services for health checking.
func (g *Gateway) Upstreams() map[string]*Upstream {
	return g.upstreams
}

// ServeHTTP implements http.Handler. It routes the request to the matching
// upstream service.
func (g *Gateway) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	route := config.FindRoute(g.routes, r)
	if route == nil {
		writeJSON(w, http.StatusNotFound, map[string]string{
			"error":   "not_found",
			"message": fmt.Sprintf("no route for %s %s", r.Method, r.URL.Path),
		})
		return
	}

	upstream, ok := g.upstreams[route.Upstream]
	if !ok {
		writeJSON(w, http.StatusBadGateway, map[string]string{
			"error":   "bad_gateway",
			"message": fmt.Sprintf("upstream %s not configured", route.Upstream),
		})
		return
	}

	proxy := &httputil.ReverseProxy{
		Director:       g.director(upstream, route),
		Transport:      g.circuitBreakerTransport(upstream),
		ModifyResponse: g.modifyResponse,
		ErrorHandler:   g.errorHandler,
	}

	proxy.ServeHTTP(w, r)
}

// director returns a function that rewrites the request for the target upstream.
func (g *Gateway) director(upstream *Upstream, route *config.RouteConfig) func(req *http.Request) {
	return func(req *http.Request) {
		target := upstream.BaseURL

		req.URL.Scheme = target.Scheme
		req.URL.Host = target.Host
		req.Host = target.Host

		// Preserve the original path (upstream receives the full path)
		// e.g., /api/v1/employees/123 -> /api/v1/employees/123

		// Set forwarding headers
		if clientIP := req.RemoteAddr; clientIP != "" {
			prior := req.Header.Get("X-Forwarded-For")
			if prior != "" {
				clientIP = prior + ", " + clientIP
			}
			req.Header.Set("X-Forwarded-For", clientIP)
		}

		req.Header.Set("X-Forwarded-Host", req.Host)
		req.Header.Set("X-Forwarded-Proto", schemeFromRequest(req))
		req.Header.Set("X-Gateway-Upstream", upstream.Name)

		// Remove hop-by-hop headers
		req.Header.Del("Connection")
		req.Header.Del("Proxy-Connection")
		req.Header.Del("Keep-Alive")
		req.Header.Del("Proxy-Authenticate")
		req.Header.Del("Proxy-Authorization")
		req.Header.Del("Te")
		req.Header.Del("Trailer")
		req.Header.Del("Transfer-Encoding")
		req.Header.Del("Upgrade")
	}
}

// circuitBreakerTransport wraps the transport with circuit breaker logic.
func (g *Gateway) circuitBreakerTransport(upstream *Upstream) http.RoundTripper {
	return roundTripperFunc(func(req *http.Request) (*http.Response, error) {
		return upstream.Execute(func() (*http.Response, error) {
			return g.transport.RoundTrip(req)
		})
	})
}

// modifyResponse processes responses from upstream services.
func (g *Gateway) modifyResponse(resp *http.Response) error {
	// Remove internal upstream headers from the response
	resp.Header.Del("X-Gateway-Upstream")

	return nil
}

// errorHandler handles proxy errors (upstream failures, timeouts, circuit breaker).
func (g *Gateway) errorHandler(w http.ResponseWriter, r *http.Request, err error) {
	log.Error().
		Err(err).
		Str("method", r.Method).
		Str("path", r.URL.Path).
		Str("upstream", r.Header.Get("X-Gateway-Upstream")).
		Msg("proxy error")

	if strings.Contains(err.Error(), "circuit breaker is open") {
		writeJSON(w, http.StatusServiceUnavailable, map[string]string{
			"error":   "service_unavailable",
			"message": "service temporarily unavailable, please retry later",
		})
		return
	}

	if strings.Contains(err.Error(), "context deadline exceeded") ||
		strings.Contains(err.Error(), "timeout") {
		writeJSON(w, http.StatusGatewayTimeout, map[string]string{
			"error":   "gateway_timeout",
			"message": "upstream service did not respond in time",
		})
		return
	}

	writeJSON(w, http.StatusBadGateway, map[string]string{
		"error":   "bad_gateway",
		"message": "upstream service unavailable",
	})
}

// schemeFromRequest determines the scheme from the request.
func schemeFromRequest(r *http.Request) string {
	if r.TLS != nil {
		return "https"
	}
	if proto := r.Header.Get("X-Forwarded-Proto"); proto != "" {
		return proto
	}
	return "http"
}

// roundTripperFunc adapts a function to the http.RoundTripper interface.
type roundTripperFunc func(*http.Request) (*http.Response, error)

func (f roundTripperFunc) RoundTrip(r *http.Request) (*http.Response, error) {
	return f(r)
}

// writeJSON writes a JSON response with the given status code.
func writeJSON(w http.ResponseWriter, status int, data interface{}) {
	w.Header().Set("Content-Type", "application/json; charset=utf-8")
	w.WriteHeader(status)
	if err := json.NewEncoder(w).Encode(data); err != nil {
		log.Error().Err(err).Msg("failed to write JSON response")
	}
}
