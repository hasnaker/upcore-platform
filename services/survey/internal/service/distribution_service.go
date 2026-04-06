package service

import (
	"context"
	"fmt"
	"time"

	"github.com/google/uuid"
	"github.com/rs/zerolog"

	"github.com/upcore/survey/internal/config"
	"github.com/upcore/survey/internal/domain"
	"github.com/upcore/survey/internal/event"
	"github.com/upcore/survey/internal/repository"
)

// DistributionService manages survey distribution lifecycle.
type DistributionService struct {
	distributions repository.DistributionRepository
	schedules     repository.ScheduleRepository
	invitations   repository.InvitationRepository
	surveys       repository.SurveyRepository
	publisher     event.Publisher
	cfg           *config.Config
	log           zerolog.Logger
}

// NewDistributionService constructs a DistributionService.
func NewDistributionService(
	distributions repository.DistributionRepository,
	schedules repository.ScheduleRepository,
	invitations repository.InvitationRepository,
	surveys repository.SurveyRepository,
	publisher event.Publisher,
	cfg *config.Config,
	log zerolog.Logger,
) *DistributionService {
	return &DistributionService{
		distributions: distributions,
		schedules:     schedules,
		invitations:   invitations,
		surveys:       surveys,
		publisher:     publisher,
		cfg:           cfg,
		log:           log.With().Str("component", "distribution_service").Logger(),
	}
}

// Distribute creates a new distribution for a schedule, resolves audience,
// creates invitations, and publishes invite events.
func (s *DistributionService) Distribute(ctx context.Context, tenantID, scheduleID uuid.UUID) (*domain.Distribution, error) {
	sched, err := s.schedules.GetByID(ctx, tenantID, scheduleID)
	if err != nil {
		return nil, fmt.Errorf("get schedule: %w", err)
	}

	now := time.Now().UTC()
	ttl := time.Duration(s.cfg.InvitationTokenTTLDays) * 24 * time.Hour
	closesAt := now.Add(ttl)

	dist := &domain.Distribution{
		TenantID:      tenantID,
		ScheduleID:    &sched.ID,
		SurveyID:      sched.SurveyID,
		DistributedAt: now,
		ClosesAt:      closesAt,
		TargetCount:   0, // placeholder until audience resolved
		ResponseCount: 0,
		Status:        domain.DistStatusOpen,
	}
	if err := s.distributions.Create(ctx, dist); err != nil {
		return nil, fmt.Errorf("create distribution: %w", err)
	}

	// TODO: resolve audience from sched.AudienceFilter via employee-service API.
	// For now, distribution is created with target_count = 0.
	// In production: query employee-service, create invitations per employee.

	_ = s.publisher.Publish(ctx, event.TopicDistributed, map[string]any{
		"distribution_id": dist.ID,
		"tenant_id":       tenantID,
		"survey_id":       sched.SurveyID,
		"target_count":    dist.TargetCount,
		"closes_at":       closesAt,
	})

	s.log.Info().
		Str("distribution_id", dist.ID.String()).
		Str("schedule_id", scheduleID.String()).
		Msg("distribution created")
	return dist, nil
}

// Close marks a distribution as closed, triggering aggregation.
func (s *DistributionService) Close(ctx context.Context, tenantID, distID uuid.UUID) error {
	dist, err := s.distributions.GetByID(ctx, tenantID, distID)
	if err != nil {
		return err
	}
	if !dist.IsOpen() {
		return domain.ErrSurveyClosed
	}
	dist.Status = domain.DistStatusClosed
	if err := s.distributions.Update(ctx, dist); err != nil {
		return err
	}

	_ = s.publisher.Publish(ctx, event.TopicSurveyClosed, map[string]any{
		"distribution_id": distID,
		"tenant_id":       tenantID,
		"response_count":  dist.ResponseCount,
		"target_count":    dist.TargetCount,
		"response_rate":   dist.ResponseRate(),
	})

	s.log.Info().Str("distribution_id", distID.String()).Msg("distribution closed")
	return nil
}

// Get retrieves a distribution by ID.
func (s *DistributionService) Get(ctx context.Context, tenantID, distID uuid.UUID) (*domain.Distribution, error) {
	return s.distributions.GetByID(ctx, tenantID, distID)
}

// List returns distributions for a tenant.
func (s *DistributionService) List(ctx context.Context, f repository.DistFilter) ([]*domain.Distribution, int, error) {
	return s.distributions.List(ctx, f)
}

// SendReminders manually triggers reminder sending for a distribution.
func (s *DistributionService) SendReminders(ctx context.Context, tenantID, distID uuid.UUID) error {
	dist, err := s.distributions.GetByID(ctx, tenantID, distID)
	if err != nil {
		return err
	}
	if !dist.IsOpen() {
		return domain.ErrSurveyClosed
	}

	_ = s.publisher.Publish(ctx, event.TopicReminderDue, map[string]any{
		"distribution_id": distID,
		"tenant_id":       tenantID,
	})

	s.log.Info().Str("distribution_id", distID.String()).Msg("manual reminder triggered")
	return nil
}
