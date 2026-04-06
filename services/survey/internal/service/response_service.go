package service

import (
	"context"
	"encoding/json"
	"fmt"
	"time"

	"github.com/rs/zerolog"

	"github.com/upcore/survey/internal/config"
	"github.com/upcore/survey/internal/domain"
	"github.com/upcore/survey/internal/event"
	"github.com/upcore/survey/internal/repository"
)

// ResponseService handles survey response submission.
type ResponseService struct {
	responses   repository.ResponseRepository
	answers     repository.AnswerRepository
	invitations repository.InvitationRepository
	surveys     repository.SurveyRepository
	items       repository.ItemRepository
	publisher   event.Publisher
	cfg         *config.Config
	log         zerolog.Logger
}

// NewResponseService constructs a ResponseService.
func NewResponseService(
	responses repository.ResponseRepository,
	answers repository.AnswerRepository,
	invitations repository.InvitationRepository,
	surveys repository.SurveyRepository,
	items repository.ItemRepository,
	publisher event.Publisher,
	cfg *config.Config,
	log zerolog.Logger,
) *ResponseService {
	return &ResponseService{
		responses:   responses,
		answers:     answers,
		invitations: invitations,
		surveys:     surveys,
		items:       items,
		publisher:   publisher,
		cfg:         cfg,
		log:         log.With().Str("component", "response_service").Logger(),
	}
}

// AnswerInput is a single answer submitted by a respondent.
type AnswerInput struct {
	ItemCode  string  `json:"item_code"`
	ItemID    *string `json:"item_id,omitempty"`
	ValueInt  *int    `json:"value_int,omitempty"`
	ValueText *string `json:"value_text,omitempty"`
}

// SubmitByToken validates a token, anonymizes the employee into segments,
// stores the response + answers, marks the invitation submitted, and publishes
// the response event.
func (s *ResponseService) SubmitByToken(ctx context.Context, token string, answerInputs []AnswerInput) (*domain.Response, error) {
	inv, err := s.invitations.GetByToken(ctx, token)
	if err != nil {
		return nil, err
	}

	now := time.Now().UTC()

	if inv.IsCompleted() {
		return nil, domain.ErrAlreadySubmitted
	}
	if inv.IsExpired(now) {
		return nil, domain.ErrInvitationExpired
	}

	// Retrieve the survey to check anonymity settings
	survey, err := s.surveys.GetByID(ctx, inv.TenantID, inv.SurveyID)
	if err != nil {
		return nil, fmt.Errorf("get survey: %w", err)
	}

	// Build JSONB responses payload
	answersJSON, err := json.Marshal(answerInputs)
	if err != nil {
		return nil, fmt.Errorf("marshal answers: %w", err)
	}

	resp := &domain.Response{
		TenantID: inv.TenantID,
		SurveyID: inv.SurveyID,
		Responses: domain.JSONB(answersJSON),
	}

	// Anonymization: if the survey is anonymous, do NOT store employee_id
	// or invitation_id on the response. Only segment keys are persisted.
	if survey.IsAnonymous {
		// Anonymous: no employee or invitation link
		resp.EmployeeID = nil
		resp.InvitationID = nil
	} else {
		resp.InvitationID = &inv.ID
		resp.EmployeeID = &inv.EmployeeID
	}

	if err := s.responses.Create(ctx, resp); err != nil {
		return nil, fmt.Errorf("create response: %w", err)
	}

	// Store individual answers
	answers := make([]domain.Answer, len(answerInputs))
	for i, a := range answerInputs {
		answers[i] = domain.Answer{
			ItemCode:  a.ItemCode,
			ItemID:    a.ItemID,
			ValueInt:  a.ValueInt,
			ValueText: a.ValueText,
		}
	}
	if err := s.answers.BulkInsert(ctx, resp.ID, answers); err != nil {
		return nil, fmt.Errorf("insert answers: %w", err)
	}

	// Mark invitation as submitted
	if err := s.invitations.MarkSubmitted(ctx, inv.ID, now); err != nil {
		return nil, fmt.Errorf("mark submitted: %w", err)
	}

	// Publish event (no employee_id for anonymity)
	_ = s.publisher.Publish(ctx, event.TopicResponseSubmitted, map[string]any{
		"response_id":  resp.ID,
		"tenant_id":    resp.TenantID,
		"survey_id":    resp.SurveyID,
		"submitted_at": now,
	})

	s.log.Info().
		Str("response_id", resp.ID.String()).
		Bool("anonymous", survey.IsAnonymous).
		Msg("response submitted")
	return resp, nil
}

// HasSubmitted checks if a token has already been used.
func (s *ResponseService) HasSubmitted(ctx context.Context, token string) (bool, error) {
	inv, err := s.invitations.GetByToken(ctx, token)
	if err != nil {
		return false, err
	}
	return inv.IsCompleted(), nil
}

// GetSurveyForToken retrieves the survey and items for a token (public endpoint).
func (s *ResponseService) GetSurveyForToken(ctx context.Context, token string) (*domain.Survey, []*domain.Item, *domain.Invitation, error) {
	inv, err := s.invitations.GetByToken(ctx, token)
	if err != nil {
		return nil, nil, nil, err
	}

	now := time.Now().UTC()
	if inv.IsExpired(now) {
		return nil, nil, nil, domain.ErrInvitationExpired
	}

	survey, err := s.surveys.GetByID(ctx, inv.TenantID, inv.SurveyID)
	if err != nil {
		return nil, nil, nil, err
	}

	items, err := s.items.ListBySurvey(ctx, survey.ID)
	if err != nil {
		return nil, nil, nil, err
	}

	return survey, items, inv, nil
}
