package service

import (
	"context"
	"time"

	"github.com/google/uuid"
	"github.com/rs/zerolog"

	"github.com/upcore/ats/internal/domain"
	"github.com/upcore/ats/internal/event"
	"github.com/upcore/ats/internal/repository"
)

// MoveRequest is the payload for moving an application to a new stage.
type MoveRequest struct {
	ToStage string `json:"to_stage"`
	Reason  string `json:"reason,omitempty"`
}

// BulkMoveRequest is the payload for bulk-moving applications.
type BulkMoveRequest struct {
	ApplicationIDs []uuid.UUID `json:"application_ids"`
	ToStage        string      `json:"to_stage"`
	Reason         string      `json:"reason,omitempty"`
}

// CreateStageRequest is the payload for creating a custom pipeline stage.
type CreateStageRequest struct {
	Name       string  `json:"name"`
	Color      *string `json:"color,omitempty"`
	IsTerminal bool    `json:"is_terminal"`
}

// UpdateStageRequest is the payload for updating a custom pipeline stage.
type UpdateStageRequest struct {
	Name       *string `json:"name,omitempty"`
	Color      *string `json:"color,omitempty"`
	IsTerminal *bool   `json:"is_terminal,omitempty"`
}

// ReorderStagesRequest carries the new order.
type ReorderStagesRequest struct {
	Order []uuid.UUID `json:"order"`
}

// PipelineService orchestrates pipeline stage operations.
type PipelineService struct {
	applications repository.ApplicationRepository
	events       repository.EventRepository
	stages       repository.StageRepository
	publisher    event.Publisher
	log          zerolog.Logger
}

// NewPipelineService constructs the service.
func NewPipelineService(
	applications repository.ApplicationRepository,
	events repository.EventRepository,
	stages repository.StageRepository,
	publisher event.Publisher,
	log zerolog.Logger,
) *PipelineService {
	return &PipelineService{
		applications: applications,
		events:       events,
		stages:       stages,
		publisher:    publisher,
		log:          log,
	}
}

// MoveToStage validates and applies a pipeline stage transition. Emits ats.application.stage.changed.v1.
// When transitioning to "hired", also emits ats.application.hired.v1.
func (s *PipelineService) MoveToStage(ctx context.Context, tenantID, appID uuid.UUID, toStage domain.Stage, actorID uuid.UUID, reason string) (*domain.Application, error) {
	app, err := s.applications.GetByID(ctx, tenantID, appID)
	if err != nil {
		return nil, err
	}

	evt, err := domain.Transition(app, toStage, actorID, reason)
	if err != nil {
		return nil, err
	}

	if err := s.applications.Update(ctx, app); err != nil {
		return nil, err
	}
	if err := s.events.Append(ctx, evt); err != nil {
		s.log.Warn().Err(err).Msg("append stage change event failed")
	}

	s.publish(ctx, event.TopicApplicationStageChanged, map[string]any{
		"application_id": appID,
		"tenant_id":      tenantID,
		"from_stage":     evt.FromStage,
		"to_stage":       toStage,
		"changed_by":     actorID,
		"changed_at":     time.Now().UTC(),
	})

	// Emit hired event when transitioning to hired.
	if toStage == domain.StageHired {
		s.publish(ctx, event.TopicApplicationHired, map[string]any{
			"application_id": appID,
			"tenant_id":      tenantID,
			"candidate_id":   app.CandidateID,
			"requisition_id": app.RequisitionID,
			"hired_at":       time.Now().UTC(),
		})
	}
	return app, nil
}

// BulkMove moves multiple applications to a new stage.
func (s *PipelineService) BulkMove(ctx context.Context, tenantID uuid.UUID, appIDs []uuid.UUID, toStage domain.Stage, actorID uuid.UUID, reason string) (int, []error) {
	moved := 0
	var errs []error
	for _, id := range appIDs {
		if _, err := s.MoveToStage(ctx, tenantID, id, toStage, actorID, reason); err != nil {
			errs = append(errs, err)
		} else {
			moved++
		}
	}
	return moved, errs
}

// GetBoard builds a kanban board for a requisition.
func (s *PipelineService) GetBoard(ctx context.Context, tenantID, reqID uuid.UUID) (*domain.KanbanBoard, error) {
	apps, err := s.applications.ListByRequisition(ctx, reqID, nil)
	if err != nil {
		return nil, err
	}

	stages := []domain.Stage{
		domain.StageApplied, domain.StageScreened, domain.StageAssessed,
		domain.StageInterviewed, domain.StageOffered, domain.StageHired,
		domain.StageRejected, domain.StageWithdrawn,
	}

	grouped := make(map[domain.Stage][]*domain.Application, len(stages))
	for _, stage := range stages {
		grouped[stage] = []*domain.Application{}
	}
	for _, app := range apps {
		grouped[app.CurrentStage] = append(grouped[app.CurrentStage], app)
	}

	columns := make([]domain.KanbanColumn, 0, len(stages))
	for _, stage := range stages {
		apps := grouped[stage]
		columns = append(columns, domain.KanbanColumn{
			Stage:        string(stage),
			Count:        len(apps),
			Applications: apps,
		})
	}

	return &domain.KanbanBoard{
		RequisitionID: reqID,
		Stages:        columns,
	}, nil
}

// ListStages returns all pipeline stages for a tenant.
func (s *PipelineService) ListStages(ctx context.Context, tenantID uuid.UUID) ([]*domain.PipelineStage, error) {
	return s.stages.ListByTenant(ctx, tenantID)
}

// CreateCustomStage creates a new custom pipeline stage.
func (s *PipelineService) CreateCustomStage(ctx context.Context, tenantID uuid.UUID, req CreateStageRequest) (*domain.PipelineStage, error) {
	if req.Name == "" {
		return nil, domain.NewValidationError(map[string]string{"name": "required"})
	}
	// Get current max order.
	stages, err := s.stages.ListByTenant(ctx, tenantID)
	if err != nil {
		return nil, err
	}
	maxOrder := 0
	for _, st := range stages {
		if st.OrderIndex > maxOrder {
			maxOrder = st.OrderIndex
		}
	}

	stage := &domain.PipelineStage{
		TenantID:   tenantID,
		Name:       req.Name,
		OrderIndex: maxOrder + 1,
		Color:      req.Color,
		IsSystem:   false,
		IsTerminal: req.IsTerminal,
	}
	if err := s.stages.Create(ctx, stage); err != nil {
		return nil, err
	}
	return stage, nil
}

// UpdateStage updates a custom pipeline stage.
func (s *PipelineService) UpdateStage(ctx context.Context, tenantID, id uuid.UUID, req UpdateStageRequest) (*domain.PipelineStage, error) {
	stage, err := s.stages.GetByID(ctx, tenantID, id)
	if err != nil {
		return nil, err
	}
	if stage.IsSystem {
		return nil, domain.NewValidationError(map[string]string{"stage": "cannot modify system stage"})
	}
	if req.Name != nil {
		stage.Name = *req.Name
	}
	if req.Color != nil {
		stage.Color = req.Color
	}
	if req.IsTerminal != nil {
		stage.IsTerminal = *req.IsTerminal
	}
	if err := s.stages.Update(ctx, stage); err != nil {
		return nil, err
	}
	return stage, nil
}

// ReorderStages reorders pipeline stages.
func (s *PipelineService) ReorderStages(ctx context.Context, tenantID uuid.UUID, order []uuid.UUID) error {
	return s.stages.Reorder(ctx, tenantID, order)
}

// Applications returns the application repository (used by analytics handlers).
func (s *PipelineService) Applications() repository.ApplicationRepository {
	return s.applications
}

func (s *PipelineService) publish(ctx context.Context, topic string, payload any) {
	if err := s.publisher.Publish(ctx, topic, payload); err != nil {
		s.log.Warn().Err(err).Str("topic", topic).Msg("publish event failed")
	}
}
