package service

import (
	"context"
	"fmt"
	"strings"
	"time"

	"github.com/google/uuid"
	"github.com/rs/zerolog"

	"github.com/upcore/assessment/internal/domain"
	"github.com/upcore/assessment/internal/event"
	"github.com/upcore/assessment/internal/repository"
)

// CandidateSubmitRequest is the payload when a candidate submits responses via token.
type CandidateSubmitRequest struct {
	SessionID  uuid.UUID       `json:"session_id" validate:"required"`
	Responses  []ResponseInput `json:"responses" validate:"required,min=1"`
	FocusLost  int             `json:"focus_lost_count"`
	ElapsedSec int             `json:"elapsed_seconds"`
}

// CandidateService handles token-based candidate interactions.
type CandidateService struct {
	assessments repository.AssessmentRepository
	sessions    repository.SessionRepository
	responses   repository.ResponseRepository
	publisher   event.Publisher
	log         zerolog.Logger

	maxFocusLost int
	minTimePerQ  float64
}

// NewCandidateService constructs the candidate service.
func NewCandidateService(
	assessments repository.AssessmentRepository,
	sessions repository.SessionRepository,
	responses repository.ResponseRepository,
	publisher event.Publisher,
	log zerolog.Logger,
	maxFocusLost int,
	minTimePerQ int,
) *CandidateService {
	return &CandidateService{
		assessments:  assessments,
		sessions:     sessions,
		responses:    responses,
		publisher:    publisher,
		log:          log,
		maxFocusLost: maxFocusLost,
		minTimePerQ:  float64(minTimePerQ),
	}
}

// GetPortal returns the assessment for a candidate token (public access).
func (s *CandidateService) GetPortal(ctx context.Context, token string) (*domain.Assessment, *domain.Session, error) {
	a, err := s.assessments.GetByToken(ctx, token)
	if err != nil {
		return nil, nil, domain.ErrInvalidToken
	}
	if a.IsExpired() {
		return nil, nil, domain.ErrAssessmentExpired
	}

	// Try to find an active session.
	sess, err := s.sessions.GetActiveByAssessment(ctx, a.ID)
	if err != nil {
		// No active session is fine -- candidate may not have started yet.
		return a, nil, nil
	}

	// Check for timeout.
	if sess.IsTimedOut() {
		now := time.Now().UTC()
		sess.Status = domain.SessionTimedOut
		sess.CompletedAt = &now
		if err := s.sessions.Update(ctx, sess); err != nil {
			s.log.Warn().Err(err).Msg("update timed out session")
		}
		return a, nil, nil
	}

	return a, sess, nil
}

// SubmitResponses handles response submission from a candidate (via token).
func (s *CandidateService) SubmitResponses(ctx context.Context, token string, req CandidateSubmitRequest) (int, error) {
	a, err := s.assessments.GetByToken(ctx, token)
	if err != nil {
		return 0, domain.ErrInvalidToken
	}
	if a.IsExpired() {
		return 0, domain.ErrAssessmentExpired
	}
	if a.Status == domain.StatusCompleted || a.Status == domain.StatusScored {
		return 0, domain.ErrAssessmentCompleted
	}

	sess, err := s.sessions.GetByID(ctx, req.SessionID)
	if err != nil {
		return 0, err
	}
	if sess.AssessmentID != a.ID {
		return 0, domain.ErrSessionNotFound
	}
	if sess.Status != domain.SessionActive {
		return 0, domain.ErrSessionCompleted
	}

	// Check timeout.
	if sess.IsTimedOut() {
		now := time.Now().UTC()
		sess.Status = domain.SessionTimedOut
		sess.CompletedAt = &now
		_ = s.sessions.Update(ctx, sess)
		return 0, domain.ErrSessionTimedOut
	}

	// Build response entities.
	responses := make([]*domain.Response, 0, len(req.Responses))
	for _, r := range req.Responses {
		resp := &domain.Response{
			SessionID:        sess.ID,
			AssessmentID:     a.ID,
			TenantID:         a.TenantID,
			ItemCode:         r.ItemCode,
			ItemIndex:        r.ItemIndex,
			ResponseValue:    r.ResponseValue,
			TimeSpentSeconds: r.TimeSpentSeconds,
		}
		if v := strings.TrimSpace(r.ResponseText); v != "" {
			resp.ResponseText = &v
		}
		responses = append(responses, resp)
	}

	n, err := s.responses.BulkCreate(ctx, responses)
	if err != nil {
		return n, fmt.Errorf("save candidate responses: %w", err)
	}

	// Update cheating metrics.
	metrics := domain.ParseCheatingMetrics(sess.CheatingMetrics)
	for _, r := range req.Responses {
		metrics.RecordQuestionTime(r.TimeSpentSeconds)
	}
	if req.FocusLost > 0 {
		metrics.FocusLostCount += req.FocusLost
	}
	sess.CheatingMetrics = metrics.ToJSONB()

	if req.ElapsedSec > sess.ElapsedSeconds {
		sess.ElapsedSeconds = req.ElapsedSec
	}
	lastIdx := sess.CurrentItemIndex
	for _, r := range req.Responses {
		if r.ItemIndex >= lastIdx {
			lastIdx = r.ItemIndex + 1
		}
	}
	sess.CurrentItemIndex = lastIdx

	if err := s.sessions.Update(ctx, sess); err != nil {
		s.log.Warn().Err(err).Msg("update session after candidate response submission")
	}

	return n, nil
}
