package saga

import (
	"sync"
	"time"

	"github.com/prometheus/client_golang/prometheus"
)

// Metrics exposes Prometheus collectors for saga activity. Each metric is
// cardinality-bounded (saga_name × status). Register() attaches them to a
// registry; with a nil registry they become no-ops so tests can skip setup.
type Metrics struct {
	InstancesTotal *prometheus.CounterVec    // {saga, status}
	StepsTotal     *prometheus.CounterVec    // {saga, step, direction, status}
	Duration       *prometheus.HistogramVec  // {saga, terminal_status}
	InFlight       *prometheus.GaugeVec      // {saga}
	enabled        bool
}

// NewMetrics builds the collectors. Pass registry=nil for no-op.
// Typical usage: saga.NewMetrics(prometheus.DefaultRegisterer).
func NewMetrics(registry prometheus.Registerer) *Metrics {
	m := &Metrics{
		InstancesTotal: prometheus.NewCounterVec(
			prometheus.CounterOpts{
				Name: "upcore_saga_instances_total",
				Help: "Number of saga instances by saga name and terminal status.",
			},
			[]string{"saga", "status"},
		),
		StepsTotal: prometheus.NewCounterVec(
			prometheus.CounterOpts{
				Name: "upcore_saga_steps_total",
				Help: "Number of saga step executions by saga, step name, direction, and outcome.",
			},
			[]string{"saga", "step", "direction", "status"},
		),
		Duration: prometheus.NewHistogramVec(
			prometheus.HistogramOpts{
				Name:    "upcore_saga_duration_seconds",
				Help:    "End-to-end saga duration (start → terminal state).",
				Buckets: []float64{0.1, 0.5, 1, 2, 5, 10, 30, 60, 300},
			},
			[]string{"saga", "status"},
		),
		InFlight: prometheus.NewGaugeVec(
			prometheus.GaugeOpts{
				Name: "upcore_saga_in_flight",
				Help: "Number of currently-running saga instances by saga name.",
			},
			[]string{"saga"},
		),
	}
	if registry != nil {
		registry.MustRegister(m.InstancesTotal, m.StepsTotal, m.Duration, m.InFlight)
		m.enabled = true
	}
	return m
}

// defaultMetrics is a shared instance used by the orchestrator when the caller
// does not provide one. Thread-safe; lazy-initialized to avoid test side-effects.
var (
	defaultMetrics     *Metrics
	defaultMetricsOnce sync.Once
)

// DefaultMetrics returns a singleton no-op metrics instance — useful when
// callers don't want to register to a registry but need non-nil pointers.
func DefaultMetrics() *Metrics {
	defaultMetricsOnce.Do(func() {
		defaultMetrics = NewMetrics(nil)
	})
	return defaultMetrics
}

// record helpers — no-op when enabled=false.

func (m *Metrics) recordInstance(saga, status string) {
	if m == nil || !m.enabled {
		return
	}
	m.InstancesTotal.WithLabelValues(saga, status).Inc()
}

func (m *Metrics) recordStep(saga, step, direction, status string) {
	if m == nil || !m.enabled {
		return
	}
	m.StepsTotal.WithLabelValues(saga, step, direction, status).Inc()
}

func (m *Metrics) recordDuration(saga, status string, d time.Duration) {
	if m == nil || !m.enabled {
		return
	}
	m.Duration.WithLabelValues(saga, status).Observe(d.Seconds())
}

func (m *Metrics) incInFlight(saga string) {
	if m == nil || !m.enabled {
		return
	}
	m.InFlight.WithLabelValues(saga).Inc()
}

func (m *Metrics) decInFlight(saga string) {
	if m == nil || !m.enabled {
		return
	}
	m.InFlight.WithLabelValues(saga).Dec()
}
