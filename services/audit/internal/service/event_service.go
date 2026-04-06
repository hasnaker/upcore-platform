package service

import (
	"context"
	"time"

	"github.com/google/uuid"
	"github.com/rs/zerolog"

	"github.com/upcore/audit/internal/domain"
	"github.com/upcore/audit/internal/event"
	"github.com/upcore/audit/internal/repository"
)

// EventService contains the business logic for audit event operations.
type EventService struct {
	repo      repository.EventRepository
	publisher event.Publisher
	log       zerolog.Logger
}

// NewEventService constructs an EventService.
func NewEventService(
	repo repository.EventRepository,
	publisher event.Publisher,
	log zerolog.Logger,
) *EventService {
	return &EventService{repo: repo, publisher: publisher, log: log}
}

// Log validates and persists a single audit event (sync / HTTP fallback).
func (s *EventService) Log(ctx context.Context, tenantID uuid.UUID, req *domain.LogRequest) (*domain.Event, error) {
	e := req.ToEvent(tenantID)
	if err := e.Validate(); err != nil {
		return nil, err
	}
	if err := s.repo.Insert(ctx, e); err != nil {
		return nil, err
	}
	// Fire-and-forget publish for analytics.
	go func() {
		_ = s.publisher.Publish(context.Background(), event.TopicEventLogged, map[string]any{
			"event_id":      e.ID,
			"tenant_id":     e.TenantID,
			"service":       e.Service,
			"action":        e.Action,
			"resource_type": e.ResourceType,
			"actor_id":      e.ActorID,
			"occurred_at":   e.OccurredAt,
		})
	}()
	return e, nil
}

// Query returns a paginated, filtered list of audit events.
func (s *EventService) Query(ctx context.Context, filter domain.QueryFilter, page, limit int) ([]*domain.Event, int, error) {
	return s.repo.Query(ctx, filter, page, limit)
}

// GetByID retrieves a single audit event.
func (s *EventService) GetByID(ctx context.Context, tenantID, id uuid.UUID) (*domain.Event, error) {
	return s.repo.GetByID(ctx, tenantID, id)
}

// GetResourceHistory returns all events for a specific resource.
func (s *EventService) GetResourceHistory(ctx context.Context, tenantID uuid.UUID, resourceType string, resourceID uuid.UUID) ([]*domain.Event, error) {
	return s.repo.GetResourceHistory(ctx, tenantID, resourceType, resourceID)
}

// GetActorActivity returns events initiated by a specific actor.
func (s *EventService) GetActorActivity(ctx context.Context, tenantID, actorID uuid.UUID, from, to time.Time) ([]*domain.Event, error) {
	return s.repo.GetActorActivity(ctx, tenantID, actorID, from, to)
}

// GetStatsSummary returns aggregated event statistics for a tenant.
func (s *EventService) GetStatsSummary(ctx context.Context, tenantID uuid.UUID, from, to time.Time) (*domain.StatsSummary, error) {
	byAction, err := s.repo.CountByAction(ctx, tenantID, from, to)
	if err != nil {
		return nil, err
	}
	byService, err := s.repo.CountByService(ctx, tenantID, from, to)
	if err != nil {
		return nil, err
	}
	byResult, err := s.repo.CountByResult(ctx, tenantID, from, to)
	if err != nil {
		return nil, err
	}

	total := 0
	for _, c := range byAction {
		total += c
	}

	return &domain.StatsSummary{
		Total:     total,
		ByAction:  byAction,
		ByService: byService,
		ByResult:  byResult,
	}, nil
}
