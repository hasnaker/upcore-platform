package middleware

import (
	"net/http"
	"strconv"
	"strings"
	"sync"
	"time"

	"github.com/go-chi/chi/v5"
	"github.com/prometheus/client_golang/prometheus"
	"github.com/prometheus/client_golang/prometheus/promhttp"
)

// PromRegistry is the service's Prometheus registry. Using a private registry
// instead of the default means our /metrics endpoint won't expose Go runtime
// metrics from unrelated libraries — cleaner dashboards.
var PromRegistry = prometheus.NewRegistry()

var (
	httpRequestsTotal = prometheus.NewCounterVec(
		prometheus.CounterOpts{
			Namespace: "upcore",
			Subsystem: "bordro",
			Name:      "http_requests_total",
			Help:      "Total number of HTTP requests handled by this service.",
		},
		[]string{"method", "route", "status"},
	)
	httpRequestDuration = prometheus.NewHistogramVec(
		prometheus.HistogramOpts{
			Namespace: "upcore",
			Subsystem: "bordro",
			Name:      "http_request_duration_seconds",
			Help:      "Histogram of HTTP request latencies.",
			Buckets:   []float64{0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10},
		},
		[]string{"method", "route", "status"},
	)
	httpRequestsInFlight = prometheus.NewGauge(
		prometheus.GaugeOpts{
			Namespace: "upcore",
			Subsystem: "bordro",
			Name:      "http_requests_in_flight",
			Help:      "Current number of in-flight HTTP requests.",
		},
	)

	// Business metrics — payroll-specific signals we want to dashboard.
	PayrollRunsTotal = prometheus.NewCounterVec(
		prometheus.CounterOpts{
			Namespace: "upcore",
			Subsystem: "bordro",
			Name:      "payroll_runs_total",
			Help:      "Total number of payroll runs executed, labelled by status + run_type.",
		},
		[]string{"status", "run_type"},
	)
	PayrollSlipsGenerated = prometheus.NewCounterVec(
		prometheus.CounterOpts{
			Namespace: "upcore",
			Subsystem: "bordro",
			Name:      "payroll_slips_generated_total",
			Help:      "Total number of payroll slips produced (Calculate + CalculateAllActive).",
		},
		[]string{"source"}, // "manual" | "bulk"
	)
	SGKXMLGenerated = prometheus.NewCounterVec(
		prometheus.CounterOpts{
			Namespace: "upcore",
			Subsystem: "bordro",
			Name:      "sgk_xml_generated_total",
			Help:      "Total number of SGK e-Bildirge XML documents produced.",
		},
		[]string{"bildirge_type"}, // "APB" | "IGB" | "IAB"
	)
)

var registerOnce sync.Once

// MustRegisterMetrics registers all service metrics on the private registry.
// Safe to call multiple times.
func MustRegisterMetrics() {
	registerOnce.Do(func() {
		PromRegistry.MustRegister(
			httpRequestsTotal,
			httpRequestDuration,
			httpRequestsInFlight,
			PayrollRunsTotal,
			PayrollSlipsGenerated,
			SGKXMLGenerated,
			// Include Go process + build info collectors for ops parity.
			prometheus.NewGoCollector(),
			prometheus.NewProcessCollector(prometheus.ProcessCollectorOpts{}),
		)
	})
}

// MetricsHandler returns an http.Handler exposing the Prometheus registry.
func MetricsHandler() http.Handler {
	MustRegisterMetrics()
	return promhttp.HandlerFor(PromRegistry, promhttp.HandlerOpts{})
}

// Metrics wraps an http.Handler and records request count + duration.
// Route label uses the chi route pattern (e.g. `/api/v1/bordro/runs/{id}`)
// so histogram cardinality stays bounded.
func Metrics(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		start := time.Now()
		httpRequestsInFlight.Inc()
		defer httpRequestsInFlight.Dec()

		sr := &statusRec{ResponseWriter: w, status: http.StatusOK}
		next.ServeHTTP(sr, r)

		route := routeLabel(r)
		status := strconv.Itoa(sr.status)
		elapsed := time.Since(start).Seconds()
		httpRequestsTotal.WithLabelValues(r.Method, route, status).Inc()
		httpRequestDuration.WithLabelValues(r.Method, route, status).Observe(elapsed)
	})
}

type statusRec struct {
	http.ResponseWriter
	status int
}

func (s *statusRec) WriteHeader(code int) {
	s.status = code
	s.ResponseWriter.WriteHeader(code)
}

// routeLabel returns the chi pattern if present (e.g. `/runs/{id}`) or the
// raw path with IDs stripped to avoid cardinality explosion.
func routeLabel(r *http.Request) string {
	if rc := chi.RouteContext(r.Context()); rc != nil {
		if p := rc.RoutePattern(); p != "" {
			return p
		}
	}
	return stripIDs(r.URL.Path)
}

func stripIDs(path string) string {
	parts := strings.Split(path, "/")
	for i, p := range parts {
		if len(p) == 36 && strings.Count(p, "-") == 4 {
			parts[i] = "{id}"
		}
	}
	return strings.Join(parts, "/")
}
