package service

import (
	"context"
	"fmt"

	"github.com/google/uuid"
	"github.com/rs/zerolog"

	"github.com/upcore/survey/internal/domain"
	"github.com/upcore/survey/internal/event"
	"github.com/upcore/survey/internal/repository"
)

// SurveyService manages survey CRUD.
type SurveyService struct {
	surveys   repository.SurveyRepository
	items     repository.ItemRepository
	publisher event.Publisher
	log       zerolog.Logger
}

// NewSurveyService constructs a SurveyService.
func NewSurveyService(
	surveys repository.SurveyRepository,
	items repository.ItemRepository,
	publisher event.Publisher,
	log zerolog.Logger,
) *SurveyService {
	return &SurveyService{
		surveys:   surveys,
		items:     items,
		publisher: publisher,
		log:       log.With().Str("component", "survey_service").Logger(),
	}
}

// List returns surveys for a tenant.
func (s *SurveyService) List(ctx context.Context, tenantID uuid.UUID, limit, offset int) ([]*domain.Survey, int, error) {
	return s.surveys.List(ctx, tenantID, limit, offset)
}

// GetByCode returns a survey by type code.
func (s *SurveyService) GetByCode(ctx context.Context, tenantID uuid.UUID, code string) (*domain.Survey, error) {
	return s.surveys.GetByCode(ctx, tenantID, code)
}

// GetWithItems returns a survey with its items.
func (s *SurveyService) GetWithItems(ctx context.Context, tenantID uuid.UUID, code string) (*domain.Survey, []*domain.Item, error) {
	survey, err := s.surveys.GetByCode(ctx, tenantID, code)
	if err != nil {
		return nil, nil, err
	}
	items, err := s.items.ListBySurvey(ctx, survey.ID)
	if err != nil {
		return nil, nil, err
	}
	return survey, items, nil
}

// GetItems returns items for a survey.
func (s *SurveyService) GetItems(ctx context.Context, surveyID uuid.UUID) ([]*domain.Item, error) {
	return s.items.ListBySurvey(ctx, surveyID)
}

// CreateRequest is the input for creating a survey.
type CreateRequest struct {
	TenantID    uuid.UUID          `json:"tenant_id"`
	TitleTR     string             `json:"title_tr"`
	TitleEN     *string            `json:"title_en,omitempty"`
	Description *string            `json:"description_tr,omitempty"`
	SurveyType  domain.SurveyType  `json:"survey_type"`
	IsAnonymous bool               `json:"is_anonymous"`
	Cadence     *domain.Cadence    `json:"cadence,omitempty"`
	Language    string             `json:"language"`
	CreatedBy   *uuid.UUID         `json:"created_by,omitempty"`
	Items       []CreateItemInput  `json:"items,omitempty"`
}

// CreateItemInput defines an item to create inline with a survey.
type CreateItemInput struct {
	ItemCode        string           `json:"item_code"`
	TextTR          string           `json:"text_tr"`
	TextEN          *string          `json:"text_en,omitempty"`
	Dimension       string           `json:"dimension"`
	ResponseType    domain.RespType  `json:"response_type"`
	ResponseOptions domain.JSONB     `json:"response_options,omitempty"`
	ReverseScored   bool             `json:"reverse_scored"`
	OrderIndex      int              `json:"order_index"`
}

// Create creates a new survey with optional inline items.
func (s *SurveyService) Create(ctx context.Context, req CreateRequest) (*domain.Survey, error) {
	survey := &domain.Survey{
		TenantID:    req.TenantID,
		TitleTR:     req.TitleTR,
		TitleEN:     req.TitleEN,
		DescriptionTR: req.Description,
		SurveyType:  req.SurveyType,
		IsAnonymous: req.IsAnonymous,
		Cadence:     req.Cadence,
		CreatedBy:   req.CreatedBy,
	}
	if err := survey.Validate(); err != nil {
		return nil, err
	}
	if err := s.surveys.Create(ctx, survey); err != nil {
		return nil, fmt.Errorf("create survey: %w", err)
	}

	// Create inline items if provided
	if len(req.Items) > 0 {
		items := make([]*domain.Item, len(req.Items))
		for i, in := range req.Items {
			items[i] = &domain.Item{
				SurveyID:        survey.ID,
				ItemCode:        in.ItemCode,
				TextTR:          in.TextTR,
				TextEN:          in.TextEN,
				Dimension:       in.Dimension,
				ResponseType:    in.ResponseType,
				ResponseOptions: in.ResponseOptions,
				ReverseScored:   in.ReverseScored,
				OrderIndex:      in.OrderIndex,
			}
		}
		if err := s.items.BulkInsert(ctx, items); err != nil {
			return nil, fmt.Errorf("create items: %w", err)
		}
	}

	s.log.Info().Str("survey_id", survey.ID.String()).Msg("survey created")
	return survey, nil
}

// Update updates an existing survey.
func (s *SurveyService) Update(ctx context.Context, tenantID, id uuid.UUID, updates map[string]any) (*domain.Survey, error) {
	survey, err := s.surveys.GetByID(ctx, tenantID, id)
	if err != nil {
		return nil, err
	}
	if v, ok := updates["title_tr"].(string); ok {
		survey.TitleTR = v
	}
	if v, ok := updates["status"].(string); ok {
		newStatus := domain.SurveyStatus(v)
		if !domain.CanTransition(survey.Status, newStatus) {
			return nil, domain.ErrInvalidStatus
		}
		survey.Status = newStatus
	}
	if v, ok := updates["is_anonymous"].(bool); ok {
		survey.IsAnonymous = v
	}
	if err := survey.Validate(); err != nil {
		return nil, err
	}
	if err := s.surveys.Update(ctx, survey); err != nil {
		return nil, err
	}
	return survey, nil
}

// Clone duplicates a survey with its items (admin helper).
func (s *SurveyService) Clone(ctx context.Context, tenantID, sourceID uuid.UUID) (*domain.Survey, error) {
	source, err := s.surveys.GetByID(ctx, tenantID, sourceID)
	if err != nil {
		return nil, err
	}
	items, err := s.items.ListBySurvey(ctx, sourceID)
	if err != nil {
		return nil, err
	}

	clone := *source
	clone.ID = uuid.Nil
	clone.Status = domain.StatusDraft
	clone.TitleTR = source.TitleTR + " (kopya)"
	if err := s.surveys.Create(ctx, &clone); err != nil {
		return nil, fmt.Errorf("clone survey: %w", err)
	}

	cloneItems := make([]*domain.Item, len(items))
	for i, item := range items {
		ci := *item
		ci.ID = uuid.Nil
		ci.SurveyID = clone.ID
		cloneItems[i] = &ci
	}
	if err := s.items.BulkInsert(ctx, cloneItems); err != nil {
		return nil, fmt.Errorf("clone items: %w", err)
	}

	s.log.Info().
		Str("source_id", sourceID.String()).
		Str("clone_id", clone.ID.String()).
		Msg("survey cloned")
	return &clone, nil
}
