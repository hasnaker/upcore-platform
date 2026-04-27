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

// PromRegistry is the leave service's private Prometheus registry.
var PromRegistry = prometheus.NewRegistry()

var (
	httpRequestsTotal = prometheus.NewCounterVec(
		prometheus.CounterOpts{
			Namespace: "upcore", Subsystem: "leave",
			Name: "http_requests_total",
			Help: "Total HTTP requests handled.",
		},
		[]string{"method", "route", "status"},
	)
	httpRequestDuration = prometheus.NewHistogramVec(
		prometheus.HistogramOpts{
			Namespace: "upcore", Subsystem: "leave",
			Name:    "http_request_duration_seconds",
			Help:    "HTTP request latency.",
			Buckets: []float64{0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10},
		},
		[]string{"method", "route", "status"},
	)
	httpRequestsInFlight = prometheus.NewGauge(
		prometheus.GaugeOpts{
			Namespace: "upcore", Subsystem: "leave",
			Name: "http_requests_in_flight",
			Help: "In-flight HTTP requests.",
		},
	)

	// Business metrics.
	LeaveRequestsCreated = prometheus.NewCounterVec(
		prometheus.CounterOpts{
			Namespace: "upcore", Subsystem: "leave",
			Name: "requests_created_total",
			Help: "Leave requests created, labelled by category.",
		},
		[]string{"category"}, // yıllık, mazeret, hastalık, vs.
	)
	LeaveRequestsTransitioned = prometheus.NewCounterVec(
		prometheus.CounterOpts{
			Namespace: "upcore", Subsystem: "leave",
			Name: "requests_transitioned_total",
			Help: "Leave request status transitions.",
		},
		[]string{"status"}, // pending, approved, rejected, cancelled
	)
	LeaveBalanceNegative = prometheus.NewCounter(
		prometheus.CounterOpts{
			Namespace: "upcore", Subsystem: "leave",
			Name: "balance_negative_total",
			Help: "Times an approval was attempted with insufficient balance (blocked by rules).",
		},
	)
)

var registerOnce sync.Once

// MustRegisterMetrics registers all service metrics once.
func MustRegisterMetrics() {
	registerOnce.Do(func() {
		PromRegistry.MustRegister(
			httpRequestsTotal, httpRequestDuration, httpRequestsInFlight,
			LeaveRequestsCreated, LeaveRequestsTransitioned, LeaveBalanceNegative,
			prometheus.NewGoCollector(),
			prometheus.NewProcessCollector(prometheus.ProcessCollectorOpts{}),
		)
	})
}

// MetricsHandler exposes the Prometheus /metrics endpoint.
func MetricsHandler() http.Handler {
	MustRegisterMetrics()
	return promhttp.HandlerFor(PromRegistry, promhttp.HandlerOpts{})
}

// Metrics records per-request count + duration.
func Metrics(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		start := time.Now()
		httpRequestsInFlight.Inc()
		defer httpRequestsInFlight.Dec()
		sr := &statusRec{ResponseWriter: w, status: http.StatusOK}
		next.ServeHTTP(sr, r)
		route := routeLabel(r)
		status := strconv.Itoa(sr.status)
		httpRequestsTotal.WithLabelValues(r.Method, route, status).Inc()
		httpRequestDuration.WithLabelValues(r.Method, route, status).Observe(time.Since(start).Seconds())
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
