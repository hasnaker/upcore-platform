package service

import (
	"context"
	"encoding/json"
	"time"

	"github.com/google/uuid"
	"github.com/rs/zerolog"

	"github.com/upcore/ats/internal/domain"
	"github.com/upcore/ats/internal/event"
	"github.com/upcore/ats/internal/repository"
)

// SubmitApplicationRequest is the payload for submitting a new application.
type SubmitApplicationRequest struct {
	CandidateID   uuid.UUID `json:"candidate_id"`
	RequisitionID uuid.UUID `json:"requisition_id"`
}

// ScoreRequest carries a score update.
type ScoreRequest struct {
	Score float64 `json:"score"`
}

// RejectRequest carries a rejection reason.
type RejectRequest struct {
	Reason string `json:"reason"`
}

// NoteRequest carries a note.
type NoteRequest struct {
	Note string `json:"note"`
}

// ApplicationService orchestrates application operations.
type ApplicationService struct {
	applications repository.ApplicationRepository
	requisitions repository.RequisitionRepository
	candidates   repository.CandidateRepository
	events       repository.EventRepository
	publisher    event.Publisher
	log          zerolog.Logger
}

// NewApplicationService constructs the service.
func NewApplicationService(
	applications repository.ApplicationRepository,
	requisitions repository.RequisitionRepository,
	candidates repository.CandidateRepository,
	events repository.EventRepository,
	publisher event.Publisher,
	log zerolog.Logger,
) *ApplicationService {
	return &ApplicationService{
		applications: applications,
		requisitions: requisitions,
		candidates:   candidates,
		events:       events,
		publisher:    publisher,
		log:          log,
	}
}

// Submit creates a new application at the "applied" stage. Emits ats.application.submitted.v1.
func (s *ApplicationService) Submit(ctx context.Context, tenantID uuid.UUID, req SubmitApplicationRequest) (*domain.Application, error) {
	// Validate candidate exists.
	if _, err := s.candidates.GetByID(ctx, tenantID, req.CandidateID); err != nil {
		return nil, err
	}
	// Validate requisition exists and is open.
	r, err := s.requisitions.GetByID(ctx, tenantID, req.RequisitionID)
	if err != nil {
		return nil, err
	}
	if !r.IsOpen() {
		return nil, domain.ErrRequisitionNotOpen
	}

	now := time.Now().UTC()
	app := &domain.Application{
		TenantID:       tenantID,
		CandidateID:    req.CandidateID,
		RequisitionID:  req.RequisitionID,
		CurrentStage:   domain.StageApplied,
		StageEnteredAt: now,
		AppliedAt:      now,
		UpdatedAt:      now,
	}

	if err := s.applications.Create(ctx, app); err != nil {
		return nil, err
	}

	// Record event.
	appliedStage := domain.StageApplied
	evt := &domain.ApplicationEvent{
		ID:            uuid.New(),
		TenantID:      tenantID,
		ApplicationID: app.ID,
		EventType:     domain.EventStageChanged,
		ToStage:       &appliedStage,
		CreatedAt:     now,
	}
	if err := s.events.Append(ctx, evt); err != nil {
		s.log.Warn().Err(err).Msg("append submit event failed")
	}

	s.publish(ctx, event.TopicApplicationSubmitted, map[string]any{
		"application_id": app.ID,
		"tenant_id":      tenantID,
		"candidate_id":   req.CandidateID,
		"requisition_id": req.RequisitionID,
		"applied_at":     now,
	})
	return app, nil
}

// Get fetches an application by id.
func (s *ApplicationService) Get(ctx context.Context, tenantID, id uuid.UUID) (*domain.Application, error) {
	return s.applications.GetByID(ctx, tenantID, id)
}

// List returns a page of applications.
func (s *ApplicationService) List(ctx context.Context, f repository.ApplicationFilter) ([]*domain.Application, int, error) {
	return s.applications.List(ctx, f)
}

// ListByRequisition returns all applications for a requisition.
func (s *ApplicationService) ListByRequisition(ctx context.Context, reqID uuid.UUID, stage *domain.Stage) ([]*domain.Application, error) {
	return s.applications.ListByRequisition(ctx, reqID, stage)
}

// ListForCandidate returns all applications for a candidate.
func (s *ApplicationService) ListForCandidate(ctx context.Context, candidateID uuid.UUID) ([]*domain.Application, error) {
	return s.applications.ListByCandidate(ctx, candidateID)
}

// Score updates the score on an application.
func (s *ApplicationService) Score(ctx context.Context, tenantID, appID uuid.UUID, score float64, by uuid.UUID) (*domain.Application, error) {
	app, err := s.applications.GetByID(ctx, tenantID, appID)
	if err != nil {
		return nil, err
	}
	if score < 0 || score > 100 {
		return nil, domain.ErrInvalidScore
	}
	app.Score = &score
	if err := s.applications.Update(ctx, app); err != nil {
		return nil, err
	}
	// Record event.
	payload, _ := json.Marshal(map[string]float64{"score": score})
	evt := &domain.ApplicationEvent{
		TenantID:      tenantID,
		ApplicationID: appID,
		EventType:     domain.EventScoreUpdated,
		ActorID:       &by,
		Payload:       domain.JSONB(payload),
		CreatedAt:     time.Now().UTC(),
	}
	if err := s.events.Append(ctx, evt); err != nil {
		s.log.Warn().Err(err).Msg("append score event failed")
	}
	return app, nil
}

// Reject rejects an application. Emits ats.application.rejected.v1.
func (s *ApplicationService) Reject(ctx context.Context, tenantID, appID uuid.UUID, reason string, by uuid.UUID) (*domain.Application, error) {
	app, err := s.applications.GetByID(ctx, tenantID, appID)
	if err != nil {
		return nil, err
	}
	evt, err := domain.Transition(app, domain.StageRejected, by, reason)
	if err != nil {
		return nil, err
	}
	if err := s.applications.Update(ctx, app); err != nil {
		return nil, err
	}
	if err := s.events.Append(ctx, evt); err != nil {
		s.log.Warn().Err(err).Msg("append reject event failed")
	}
	s.publish(ctx, event.TopicApplicationRejected, map[string]any{
		"application_id": appID,
		"tenant_id":      tenantID,
		"reason":         reason,
		"rejected_at":    time.Now().UTC(),
	})
	return app, nil
}

// Withdraw withdraws an application.
func (s *ApplicationService) Withdraw(ctx context.Context, tenantID, appID uuid.UUID) (*domain.Application, error) {
	app, err := s.applications.GetByID(ctx, tenantID, appID)
	if err != nil {
		return nil, err
	}
	evt, err := domain.Transition(app, domain.StageWithdrawn, uuid.Nil, "")
	if err != nil {
		return nil, err
	}
	if err := s.applications.Update(ctx, app); err != nil {
		return nil, err
	}
	if err := s.events.Append(ctx, evt); err != nil {
		s.log.Warn().Err(err).Msg("append withdraw event failed")
	}
	return app, nil
}

// AddNote records a note on an application.
func (s *ApplicationService) AddNote(ctx context.Context, tenantID, appID uuid.UUID, note string, by uuid.UUID) error {
	if _, err := s.applications.GetByID(ctx, tenantID, appID); err != nil {
		return err
	}
	payload, _ := json.Marshal(map[string]string{"note": note})
	evt := &domain.ApplicationEvent{
		TenantID:      tenantID,
		ApplicationID: appID,
		EventType:     domain.EventNoteAdded,
		ActorID:       &by,
		Payload:       domain.JSONB(payload),
		CreatedAt:     time.Now().UTC(),
	}
	return s.events.Append(ctx, evt)
}

// ListEvents returns all events for an application.
func (s *ApplicationService) ListEvents(ctx context.Context, tenantID, appID uuid.UUID) ([]*domain.ApplicationEvent, error) {
	if _, err := s.applications.GetByID(ctx, tenantID, appID); err != nil {
		return nil, err
	}
	return s.events.ListByApplication(ctx, appID)
}

func (s *ApplicationService) publish(ctx context.Context, topic string, payload any) {
	if err := s.publisher.Publish(ctx, topic, payload); err != nil {
		s.log.Warn().Err(err).Str("topic", topic).Msg("publish event failed")
	}
}
