package service

import (
	"context"
	"fmt"
	"time"

	"github.com/google/uuid"
	"github.com/rs/zerolog"

	"github.com/upcore/survey/internal/domain"
	"github.com/upcore/survey/internal/event"
	"github.com/upcore/survey/internal/repository"
)

// ScheduleService manages survey schedule CRUD.
type ScheduleService struct {
	schedules repository.ScheduleRepository
	surveys   repository.SurveyRepository
	publisher event.Publisher
	log       zerolog.Logger
}

// NewScheduleService constructs a ScheduleService.
func NewScheduleService(
	schedules repository.ScheduleRepository,
	surveys repository.SurveyRepository,
	publisher event.Publisher,
	log zerolog.Logger,
) *ScheduleService {
	return &ScheduleService{
		schedules: schedules,
		surveys:   surveys,
		publisher: publisher,
		log:       log.With().Str("component", "schedule_service").Logger(),
	}
}

// CreateScheduleRequest is input for creating a schedule.
type CreateScheduleRequest struct {
	TenantID       uuid.UUID    `json:"tenant_id"`
	SurveyID       uuid.UUID    `json:"survey_id"`
	Name           string       `json:"name"`
	Frequency      string       `json:"frequency"`
	CronExpr       string       `json:"cron_expr"`
	AudienceFilter domain.JSONB `json:"audience_filter"`
	CreatedBy      *uuid.UUID   `json:"created_by,omitempty"`
}

// ScheduledRun is a computed future run.
type ScheduledRun struct {
	ScheduleID uuid.UUID `json:"schedule_id"`
	SurveyID   uuid.UUID `json:"survey_id"`
	Name       string    `json:"name"`
	NextRunAt  time.Time `json:"next_run_at"`
}

// Create creates a new survey schedule.
func (s *ScheduleService) Create(ctx context.Context, req CreateScheduleRequest) (*domain.Schedule, error) {
	cadence := domain.Cadence(req.Frequency)
	if !cadence.IsValid() {
		return nil, domain.ErrInvalidCadence
	}

	loc, _ := time.LoadLocation("Europe/Istanbul")
	nextRun := domain.ComputeNextRun(time.Now(), cadence, loc)

	sched := &domain.Schedule{
		TenantID:       req.TenantID,
		SurveyID:       req.SurveyID,
		Name:           req.Name,
		Frequency:      cadence,
		CronExpr:       req.CronExpr,
		AudienceFilter: req.AudienceFilter,
		IsActive:       true,
		NextRunAt:      &nextRun,
		CreatedBy:      req.CreatedBy,
	}

	if err := s.schedules.Create(ctx, sched); err != nil {
		return nil, fmt.Errorf("create schedule: %w", err)
	}

	_ = s.publisher.Publish(ctx, event.TopicScheduleCreated, map[string]any{
		"schedule_id": sched.ID,
		"tenant_id":   sched.TenantID,
		"survey_id":   sched.SurveyID,
		"next_run_at": nextRun,
	})

	s.log.Info().
		Str("schedule_id", sched.ID.String()).
		Time("next_run", nextRun).
		Msg("schedule created")
	return sched, nil
}

// Update updates a schedule.
func (s *ScheduleService) Update(ctx context.Context, tenantID, id uuid.UUID, updates map[string]any) (*domain.Schedule, error) {
	sched, err := s.schedules.GetByID(ctx, tenantID, id)
	if err != nil {
		return nil, err
	}
	if v, ok := updates["name"].(string); ok {
		sched.Name = v
	}
	if v, ok := updates["cron_expr"].(string); ok {
		sched.CronExpr = v
	}
	if err := s.schedules.Update(ctx, sched); err != nil {
		return nil, err
	}
	return sched, nil
}

// Pause deactivates a schedule.
func (s *ScheduleService) Pause(ctx context.Context, tenantID, id uuid.UUID) error {
	sched, err := s.schedules.GetByID(ctx, tenantID, id)
	if err != nil {
		return err
	}
	sched.IsActive = false
	return s.schedules.Update(ctx, sched)
}

// Resume reactivates a schedule.
func (s *ScheduleService) Resume(ctx context.Context, tenantID, id uuid.UUID) error {
	sched, err := s.schedules.GetByID(ctx, tenantID, id)
	if err != nil {
		return err
	}
	sched.IsActive = true
	loc, _ := time.LoadLocation("Europe/Istanbul")
	nextRun := domain.ComputeNextRun(time.Now(), sched.Frequency, loc)
	sched.NextRunAt = &nextRun
	return s.schedules.Update(ctx, sched)
}

// Delete removes a schedule.
func (s *ScheduleService) Delete(ctx context.Context, tenantID, id uuid.UUID) error {
	return s.schedules.Delete(ctx, tenantID, id)
}

// List returns schedules for a tenant.
func (s *ScheduleService) List(ctx context.Context, tenantID uuid.UUID, activeOnly bool, limit, offset int) ([]*domain.Schedule, int, error) {
	return s.schedules.List(ctx, tenantID, activeOnly, limit, offset)
}

// Get returns a single schedule.
func (s *ScheduleService) Get(ctx context.Context, tenantID, id uuid.UUID) (*domain.Schedule, error) {
	return s.schedules.GetByID(ctx, tenantID, id)
}

// GetNextRuns returns the computed next runs for active schedules.
func (s *ScheduleService) GetNextRuns(ctx context.Context, tenantID uuid.UUID, from, to time.Time) ([]ScheduledRun, error) {
	scheds, _, err := s.schedules.List(ctx, tenantID, true, 100, 0)
	if err != nil {
		return nil, err
	}
	loc, _ := time.LoadLocation("Europe/Istanbul")
	var runs []ScheduledRun
	for _, sc := range scheds {
		nextRun := domain.ComputeNextRun(from, sc.Frequency, loc)
		for nextRun.Before(to) {
			runs = append(runs, ScheduledRun{
				ScheduleID: sc.ID,
				SurveyID:   sc.SurveyID,
				Name:       sc.Name,
				NextRunAt:  nextRun,
			})
			nextRun = domain.ComputeNextRun(nextRun.Add(time.Hour), sc.Frequency, loc)
		}
	}
	return runs, nil
}
