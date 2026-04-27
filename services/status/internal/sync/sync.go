// Package sync runs the 1-minute synthetic probe loop that keeps status
// component rows fresh. It queries Prometheus for auto-sync components; if
// Prometheus is unreachable it falls back to direct HTTP /health probes.
package sync

import (
	"context"
	"net/http"
	"time"

	"github.com/rs/zerolog"

	"github.com/upcore/status/internal/prometheus"
	"github.com/upcore/status/internal/service"
)

// Worker drives the periodic sync loop.
type Worker struct {
	Svc    *service.Service
	Prom   *prometheus.Client
	HTTP   *http.Client
	Logger zerolog.Logger
	Every  time.Duration
}

// NewWorker constructs a Worker with a 60 second interval.
func NewWorker(svc *service.Service, prom *prometheus.Client, logger zerolog.Logger) *Worker {
	return &Worker{
		Svc:    svc,
		Prom:   prom,
		HTTP:   &http.Client{Timeout: 4 * time.Second},
		Logger: logger,
		Every:  60 * time.Second,
	}
}

// Run blocks until ctx is done; calls SyncOnce every Every.
func (w *Worker) Run(ctx context.Context) {
	// Fire an immediate probe so first-run /api/v2/status is fresh.
	w.SyncOnce(ctx)
	t := time.NewTicker(w.Every)
	defer t.Stop()
	for {
		select {
		case <-ctx.Done():
			return
		case <-t.C:
			w.SyncOnce(ctx)
		}
	}
}

// SyncOnce runs a single sync pass.
func (w *Worker) SyncOnce(ctx context.Context) {
	comps, err := w.Svc.ListComponents(ctx)
	if err != nil {
		w.Logger.Error().Err(err).Msg("sync: list components")
		return
	}

	// Gather prometheus jobs for bulk query.
	var jobs []string
	jobToComp := map[string][]service.Component{}
	var httpTargets []service.Component
	for _, c := range comps {
		if !c.AutoSyncEnabled {
			continue
		}
		if c.PrometheusJob != nil && *c.PrometheusJob != "" {
			jobs = append(jobs, *c.PrometheusJob)
			jobToComp[*c.PrometheusJob] = append(jobToComp[*c.PrometheusJob], c)
		} else if c.HealthcheckURL != nil && *c.HealthcheckURL != "" {
			httpTargets = append(httpTargets, c)
		}
	}

	// 1. Prometheus batch.
	promHealth, ok := w.Prom.SampleHealth(ctx, jobs)
	if ok {
		for job, comps := range jobToComp {
			h, has := promHealth[job]
			for _, c := range comps {
				newStatus := service.StatusOperational
				latency := 0
				if has {
					latency = h.P95LatencyMs
					if !h.Up {
						newStatus = service.StatusMajorOutage
					}
				} else {
					// No samples found in Prometheus — treat as degraded, not
					// outage, so noisy jobs don't page us every minute.
					newStatus = service.StatusDegraded
				}
				if newStatus != c.Status {
					if err := w.Svc.SetComponentStatus(ctx, c.ID, newStatus); err != nil {
						w.Logger.Warn().Err(err).Str("component", c.Code).Msg("sync: set status")
					}
				}
				_ = w.Svc.RecordProbe(ctx, c.ID, newStatus == service.StatusOperational, latency)
			}
		}
	}

	// 2. HTTP /health targets (integrations etc).
	for _, c := range httpTargets {
		ok, latency := w.probeHTTP(ctx, *c.HealthcheckURL)
		newStatus := service.StatusOperational
		if !ok {
			newStatus = service.StatusMajorOutage
		}
		if newStatus != c.Status {
			if err := w.Svc.SetComponentStatus(ctx, c.ID, newStatus); err != nil {
				w.Logger.Warn().Err(err).Str("component", c.Code).Msg("sync: set status http")
			}
		}
		_ = w.Svc.RecordProbe(ctx, c.ID, ok, latency)
	}
}

func (w *Worker) probeHTTP(ctx context.Context, url string) (bool, int) {
	start := time.Now()
	req, err := http.NewRequestWithContext(ctx, http.MethodGet, url, nil)
	if err != nil {
		return false, 0
	}
	resp, err := w.HTTP.Do(req)
	if err != nil {
		return false, int(time.Since(start).Milliseconds())
	}
	defer resp.Body.Close()
	latency := int(time.Since(start).Milliseconds())
	return resp.StatusCode >= 200 && resp.StatusCode < 400, latency
}
