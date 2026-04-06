package service

import (
	"context"
	"time"

	"github.com/rs/zerolog"

	"github.com/upcore/survey/internal/config"
	"github.com/upcore/survey/internal/domain"
	"github.com/upcore/survey/internal/repository"
)

// SchedulerWorker polls for due schedules and triggers distributions.
type SchedulerWorker struct {
	schedules repository.ScheduleRepository
	distSvc   *DistributionService
	cfg       *config.Config
	log       zerolog.Logger
}

// NewSchedulerWorker constructs a SchedulerWorker.
func NewSchedulerWorker(
	schedules repository.ScheduleRepository,
	distSvc *DistributionService,
	cfg *config.Config,
	log zerolog.Logger,
) *SchedulerWorker {
	return &SchedulerWorker{
		schedules: schedules,
		distSvc:   distSvc,
		cfg:       cfg,
		log:       log.With().Str("component", "scheduler_worker").Logger(),
	}
}

// Run starts the polling loop. It blocks until ctx is cancelled.
func (w *SchedulerWorker) Run(ctx context.Context) error {
	interval := time.Duration(w.cfg.SchedulerIntervalMinutes) * time.Minute
	ticker := time.NewTicker(interval)
	defer ticker.Stop()

	w.log.Info().Dur("interval", interval).Msg("scheduler worker started")

	for {
		select {
		case <-ctx.Done():
			w.log.Info().Msg("scheduler worker stopping")
			return ctx.Err()
		case <-ticker.C:
			w.processDueSchedules(ctx)
		}
	}
}

func (w *SchedulerWorker) processDueSchedules(ctx context.Context) {
	now := time.Now().UTC()
	due, err := w.schedules.ListDue(ctx, now)
	if err != nil {
		w.log.Error().Err(err).Msg("list due schedules")
		return
	}

	if len(due) == 0 {
		return
	}

	w.log.Info().Int("count", len(due)).Msg("processing due schedules")
	for _, sched := range due {
		if err := w.processDueSchedule(ctx, sched); err != nil {
			w.log.Error().Err(err).
				Str("schedule_id", sched.ID.String()).
				Msg("process due schedule failed")
		}
	}
}

func (w *SchedulerWorker) processDueSchedule(ctx context.Context, sched *domain.Schedule) error {
	// Trigger distribution
	_, err := w.distSvc.Distribute(ctx, sched.TenantID, sched.ID)
	if err != nil {
		return err
	}

	// Advance next_run_at
	loc, _ := time.LoadLocation(w.cfg.TenantTimezone)
	now := time.Now().UTC()
	nextRun := domain.ComputeNextRun(now, sched.Frequency, loc)

	if err := w.schedules.UpdateNextRun(ctx, sched.ID, nextRun, now); err != nil {
		return err
	}

	w.log.Info().
		Str("schedule_id", sched.ID.String()).
		Time("next_run", nextRun).
		Msg("schedule triggered, next run updated")
	return nil
}
