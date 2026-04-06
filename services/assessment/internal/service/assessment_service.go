// Package service implements the business-logic layer of the assessment service.
package service

import (
	"context"
	"crypto/rand"
	"encoding/hex"
	"fmt"
	"strings"
	"time"

	"github.com/google/uuid"
	"github.com/rs/zerolog"

	"github.com/upcore/assessment/internal/config"
	"github.com/upcore/assessment/internal/domain"
	"github.com/upcore/assessment/internal/event"
	"github.com/upcore/assessment/internal/repository"
	"github.com/upcore/assessment/internal/scoring"
)

// CreateAssessmentRequest is the payload for creating an assessment.
type CreateAssessmentRequest struct {
	EmployeeID     *uuid.UUID `json:"employee_id,omitempty"`
	CandidateEmail string     `json:"candidate_email,omitempty"`
	CandidateName  string     `json:"candidate_name,omitempty"`
	InstrumentCode string     `json:"instrument_code" validate:"required"`
	ExpiresAt      string     `json:"expires_at,omitempty"`
}

// SubmitResponsesRequest is a batch of item responses.
type SubmitResponsesRequest struct {
	SessionID  uuid.UUID       `json:"session_id" validate:"required"`
	Responses  []ResponseInput `json:"responses" validate:"required,min=1"`
	FocusLost  int             `json:"focus_lost_count"`
	ElapsedSec int             `json:"elapsed_seconds"`
}

// ResponseInput is a single item response from the client.
type ResponseInput struct {
	ItemCode         string  `json:"item_code" validate:"required"`
	ItemIndex        int     `json:"item_index"`
	ResponseValue    int     `json:"response_value"`
	ResponseText     string  `json:"response_text,omitempty"`
	TimeSpentSeconds float64 `json:"time_spent_seconds"`
}

// StartSessionRequest is the payload for starting a test session.
type StartSessionRequest struct {
	BrowserFingerprint string `json:"browser_fingerprint,omitempty"`
	UserAgent          string `json:"user_agent,omitempty"`
	IPAddress          string `json:"ip_address,omitempty"`
}

// AssessmentService orchestrates assessment operations with event emission.
type AssessmentService struct {
	assessments  repository.AssessmentRepository
	sessions     repository.SessionRepository
	responses    repository.ResponseRepository
	scores       repository.ScoreRepository
	sessionState repository.SessionStateRepository
	scorer       scoring.Client
	publisher    event.Publisher
	log          zerolog.Logger

	maxFocusLost int
	minTimePerQ  float64
}

// NewAssessmentService constructs the service.
func NewAssessmentService(
	assessments repository.AssessmentRepository,
	sessions repository.SessionRepository,
	responses repository.ResponseRepository,
	scores repository.ScoreRepository,
	sessionState repository.SessionStateRepository,
	scorer scoring.Client,
	publisher event.Publisher,
	cfg *config.Config,
	log zerolog.Logger,
) *AssessmentService {
	return &AssessmentService{
		assessments:  assessments,
		sessions:     sessions,
		responses:    responses,
		scores:       scores,
		sessionState: sessionState,
		scorer:       scorer,
		publisher:    publisher,
		log:          log,
		maxFocusLost: cfg.MaxFocusLostCount,
		minTimePerQ:  float64(cfg.MinTimePerQuestionSec),
	}
}

// Create validates and persists a new assessment. Emits assessment.created.v1.
func (s *AssessmentService) Create(ctx context.Context, tenantID, assignedBy uuid.UUID, req CreateAssessmentRequest) (*domain.Assessment, error) {
	instrument := domain.InstrumentCode(strings.TrimSpace(req.InstrumentCode))
	if !instrument.IsValid() {
		return nil, domain.ErrInvalidInstrument
	}

	if req.EmployeeID == nil && strings.TrimSpace(req.CandidateEmail) == "" {
		return nil, domain.NewValidationError(map[string]string{
			"employee_id":     "employee_id or candidate_email is required",
			"candidate_email": "employee_id or candidate_email is required",
		})
	}

	token, err := generateCandidateToken()
	if err != nil {
		return nil, fmt.Errorf("generate token: %w", err)
	}

	a := &domain.Assessment{
		TenantID:       tenantID,
		EmployeeID:     req.EmployeeID,
		InstrumentCode: string(instrument),
		Status:         domain.StatusPending,
		CandidateToken: token,
		Metadata:       domain.JSONB("{}"),
	}

	if v := strings.TrimSpace(req.CandidateEmail); v != "" {
		a.CandidateEmail = &v
	}
	if v := strings.TrimSpace(req.CandidateName); v != "" {
		a.CandidateName = &v
	}
	if assignedBy != uuid.Nil {
		a.AssignedBy = &assignedBy
	}
	if v := strings.TrimSpace(req.ExpiresAt); v != "" {
		t, err := time.Parse(time.RFC3339, v)
		if err != nil {
			return nil, domain.NewValidationError(map[string]string{
				"expires_at": "invalid date format, use RFC3339",
			})
		}
		a.ExpiresAt = &t
	}

	if err := s.assessments.Create(ctx, a); err != nil {
		return nil, err
	}

	s.publish(ctx, event.TopicAssessmentCreated, map[string]any{
		"assessment_id":   a.ID,
		"tenant_id":       a.TenantID,
		"instrument_code": a.InstrumentCode,
		"candidate_token": a.CandidateToken,
		"employee_id":     a.EmployeeID,
		"created_at":      a.CreatedAt,
	})
	return a, nil
}

// Get fetches an assessment by ID with tenant scoping.
func (s *AssessmentService) Get(ctx context.Context, tenantID, id uuid.UUID) (*domain.Assessment, error) {
	a, err := s.assessments.GetByID(ctx, id)
	if err != nil {
		return nil, err
	}
	if a.TenantID != tenantID {
		return nil, domain.ErrAssessmentNotFound
	}
	return a, nil
}

// GetByToken fetches an assessment by candidate token (public).
func (s *AssessmentService) GetByToken(ctx context.Context, token string) (*domain.Assessment, error) {
	a, err := s.assessments.GetByToken(ctx, token)
	if err != nil {
		return nil, domain.ErrInvalidToken
	}
	if a.IsExpired() {
		return nil, domain.ErrAssessmentExpired
	}
	return a, nil
}

// List returns a page of assessments.
func (s *AssessmentService) List(ctx context.Context, filter repository.ListFilter) ([]*domain.Assessment, int, error) {
	return s.assessments.List(ctx, filter)
}

// StartSession creates a new test session for an assessment.
func (s *AssessmentService) StartSession(ctx context.Context, assessmentID uuid.UUID, req StartSessionRequest) (*domain.Session, error) {
	a, err := s.assessments.GetByID(ctx, assessmentID)
	if err != nil {
		return nil, err
	}
	if a.IsExpired() {
		return nil, domain.ErrAssessmentExpired
	}
	if a.Status == domain.StatusCompleted || a.Status == domain.StatusScored {
		return nil, domain.ErrAssessmentCompleted
	}

	// Check for existing active session.
	existing, err := s.sessions.GetActiveByAssessment(ctx, assessmentID)
	if err == nil && existing != nil {
		return nil, domain.ErrSessionActive
	}

	instrument := domain.InstrumentCode(a.InstrumentCode)
	timeLimitSec := instrument.TimeLimitMinutes() * 60
	totalItems := instrument.ItemCount()

	sess := &domain.Session{
		AssessmentID:     assessmentID,
		TenantID:         a.TenantID,
		Status:           domain.SessionActive,
		StartedAt:        time.Now().UTC(),
		TimeLimitSeconds: timeLimitSec,
		TotalItems:       totalItems,
		CheatingMetrics:  domain.NewCheatingMetrics().ToJSONB(),
	}

	if v := strings.TrimSpace(req.BrowserFingerprint); v != "" {
		sess.BrowserFingerPrint = &v
	}
	if v := strings.TrimSpace(req.UserAgent); v != "" {
		sess.UserAgent = &v
	}
	if v := strings.TrimSpace(req.IPAddress); v != "" {
		sess.IPAddress = &v
	}

	if err := s.sessions.Create(ctx, sess); err != nil {
		return nil, err
	}

	// Update assessment status.
	if a.Status == domain.StatusPending {
		a.Status = domain.StatusInProgress
		if err := s.assessments.Update(ctx, a); err != nil {
			s.log.Warn().Err(err).Msg("update assessment status to in_progress failed")
		}
	}

	s.publish(ctx, event.TopicAssessmentStarted, map[string]any{
		"assessment_id": assessmentID,
		"session_id":    sess.ID,
		"tenant_id":     a.TenantID,
		"started_at":    sess.StartedAt,
	})

	return sess, nil
}

// ResumeSession returns the active session for an assessment.
func (s *AssessmentService) ResumeSession(ctx context.Context, assessmentID, sessionID uuid.UUID) (*domain.Session, error) {
	sess, err := s.sessions.GetByID(ctx, sessionID)
	if err != nil {
		return nil, err
	}
	if sess.AssessmentID != assessmentID {
		return nil, domain.ErrSessionNotFound
	}

	// Check for timeout.
	if sess.IsTimedOut() {
		sess.Status = domain.SessionTimedOut
		now := time.Now().UTC()
		sess.CompletedAt = &now
		if err := s.sessions.Update(ctx, sess); err != nil {
			s.log.Warn().Err(err).Msg("update timed out session failed")
		}
		return nil, domain.ErrSessionTimedOut
	}

	return sess, nil
}

// SubmitResponses saves a batch of item responses and updates cheating metrics.
func (s *AssessmentService) SubmitResponses(ctx context.Context, assessmentID uuid.UUID, req SubmitResponsesRequest) (int, error) {
	a, err := s.assessments.GetByID(ctx, assessmentID)
	if err != nil {
		return 0, err
	}
	if a.Status == domain.StatusCompleted || a.Status == domain.StatusScored {
		return 0, domain.ErrAssessmentCompleted
	}

	sess, err := s.sessions.GetByID(ctx, req.SessionID)
	if err != nil {
		return 0, err
	}
	if sess.AssessmentID != assessmentID {
		return 0, domain.ErrSessionNotFound
	}
	if sess.Status != domain.SessionActive {
		return 0, domain.ErrSessionCompleted
	}

	// Build response entities.
	responses := make([]*domain.Response, 0, len(req.Responses))
	for _, r := range req.Responses {
		resp := &domain.Response{
			SessionID:        sess.ID,
			AssessmentID:     assessmentID,
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
		return n, fmt.Errorf("save responses: %w", err)
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

	// Update session progress.
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
		s.log.Warn().Err(err).Msg("update session after response submission failed")
	}

	return n, nil
}

// Complete marks the assessment as completed and triggers scoring.
func (s *AssessmentService) Complete(ctx context.Context, tenantID, assessmentID uuid.UUID) (*domain.Assessment, error) {
	a, err := s.assessments.GetByID(ctx, assessmentID)
	if err != nil {
		return nil, err
	}
	if a.TenantID != tenantID {
		return nil, domain.ErrAssessmentNotFound
	}
	if a.Status == domain.StatusCompleted || a.Status == domain.StatusScored {
		return nil, domain.ErrAssessmentCompleted
	}

	// Close any active sessions.
	active, err := s.sessions.GetActiveByAssessment(ctx, assessmentID)
	if err == nil && active != nil {
		now := time.Now().UTC()
		active.Status = domain.SessionCompleted
		active.CompletedAt = &now
		if err := s.sessions.Update(ctx, active); err != nil {
			s.log.Warn().Err(err).Msg("close active session failed")
		}

		// Evaluate cheating metrics.
		metrics := domain.ParseCheatingMetrics(active.CheatingMetrics)
		instrument := domain.InstrumentCode(a.InstrumentCode)
		metrics.Evaluate(s.maxFocusLost, s.minTimePerQ, instrument.ExpectedTotalSeconds())
		active.CheatingMetrics = metrics.ToJSONB()
		if err := s.sessions.Update(ctx, active); err != nil {
			s.log.Warn().Err(err).Msg("save cheating metrics failed")
		}
	}

	a.Status = domain.StatusCompleted
	if err := s.assessments.Update(ctx, a); err != nil {
		return nil, err
	}

	s.publish(ctx, event.TopicAssessmentCompleted, map[string]any{
		"assessment_id":   assessmentID,
		"tenant_id":       a.TenantID,
		"instrument_code": a.InstrumentCode,
		"completed_at":    time.Now().UTC(),
	})

	// Trigger scoring asynchronously.
	go s.triggerScoring(context.Background(), a)

	return a, nil
}

// GetResults returns the scores for a completed assessment.
func (s *AssessmentService) GetResults(ctx context.Context, tenantID, assessmentID uuid.UUID) ([]*domain.Score, error) {
	a, err := s.assessments.GetByID(ctx, assessmentID)
	if err != nil {
		return nil, err
	}
	if a.TenantID != tenantID {
		return nil, domain.ErrAssessmentNotFound
	}
	return s.scores.ListByAssessment(ctx, assessmentID)
}

// TriggerReport publishes a report generation event.
func (s *AssessmentService) TriggerReport(ctx context.Context, tenantID, assessmentID uuid.UUID) error {
	a, err := s.assessments.GetByID(ctx, assessmentID)
	if err != nil {
		return err
	}
	if a.TenantID != tenantID {
		return domain.ErrAssessmentNotFound
	}
	if a.Status != domain.StatusScored && a.Status != domain.StatusCompleted {
		return domain.NewValidationError(map[string]string{
			"status": "assessment must be completed or scored to generate a report",
		})
	}

	s.publish(ctx, event.TopicAssessmentReportRequested, map[string]any{
		"assessment_id":   assessmentID,
		"tenant_id":       a.TenantID,
		"instrument_code": a.InstrumentCode,
		"requested_at":    time.Now().UTC(),
	})
	return nil
}

// triggerScoring calls the scoring service and persists results.
func (s *AssessmentService) triggerScoring(ctx context.Context, a *domain.Assessment) {
	responses, err := s.responses.ListByAssessment(ctx, a.ID)
	if err != nil {
		s.log.Error().Err(err).Str("assessment_id", a.ID.String()).Msg("load responses for scoring failed")
		return
	}

	items := make([]scoring.ResponseItem, 0, len(responses))
	for _, r := range responses {
		items = append(items, scoring.ResponseItem{
			ItemCode:         r.ItemCode,
			ItemIndex:        r.ItemIndex,
			ResponseValue:    r.ResponseValue,
			TimeSpentSeconds: r.TimeSpentSeconds,
		})
	}

	result, err := s.scorer.Score(ctx, scoring.ScoreRequest{
		AssessmentID:   a.ID,
		TenantID:       a.TenantID,
		InstrumentCode: a.InstrumentCode,
		Responses:      items,
	})
	if err != nil {
		s.log.Error().Err(err).Str("assessment_id", a.ID.String()).Msg("scoring failed")
		return
	}

	// Clear any existing scores and save new ones.
	if err := s.scores.DeleteByAssessment(ctx, a.ID); err != nil {
		s.log.Warn().Err(err).Msg("delete old scores failed")
	}

	for _, scale := range result.Scales {
		score := &domain.Score{
			AssessmentID: a.ID,
			TenantID:     a.TenantID,
			ScaleCode:    scale.ScaleCode,
			ScaleName:    scale.ScaleName,
			RawScore:     scale.RawScore,
			TScore:       scale.TScore,
			Percentile:   scale.Percentile,
			RiskLevel:    scale.RiskLevel,
			NormGroup:    scale.NormGroup,
			ScoredAt:     result.ScoredAt,
			Metadata:     domain.JSONB("{}"),
		}
		if err := s.scores.Create(ctx, score); err != nil {
			s.log.Error().Err(err).Str("scale", scale.ScaleCode).Msg("save score failed")
		}
	}

	// Update assessment status to scored.
	a.Status = domain.StatusScored
	if err := s.assessments.Update(ctx, a); err != nil {
		s.log.Error().Err(err).Msg("update assessment status to scored failed")
		return
	}

	s.publish(ctx, event.TopicAssessmentScored, map[string]any{
		"assessment_id":   a.ID,
		"tenant_id":       a.TenantID,
		"instrument_code": a.InstrumentCode,
		"scale_count":     len(result.Scales),
		"scored_at":       result.ScoredAt,
	})
}

// SubmitCandidateResponses handles response submission from a candidate via token.
func (s *AssessmentService) SubmitCandidateResponses(ctx context.Context, token string, req SubmitResponsesRequest) (int, error) {
	a, err := s.assessments.GetByToken(ctx, token)
	if err != nil {
		return 0, domain.ErrInvalidToken
	}
	if a.IsExpired() {
		return 0, domain.ErrAssessmentExpired
	}
	return s.SubmitResponses(ctx, a.ID, req)
}

// SaveSessionState persists the session state to Redis for auto-save.
func (s *AssessmentService) SaveSessionState(ctx context.Context, sessionID uuid.UUID, itemIndex, elapsedSec, focusLost int) error {
	return s.sessionState.UpdateProgress(ctx, sessionID, itemIndex, elapsedSec, focusLost)
}

// LoadSessionState retrieves the cached session state from Redis.
func (s *AssessmentService) LoadSessionState(ctx context.Context, sessionID uuid.UUID) (*repository.SessionState, error) {
	return s.sessionState.Load(ctx, sessionID)
}

// ----- helpers ---------------------------------------------------------------

func (s *AssessmentService) publish(ctx context.Context, topic string, payload any) {
	if err := s.publisher.Publish(ctx, topic, payload); err != nil {
		s.log.Warn().Err(err).Str("topic", topic).Msg("publish event failed")
	}
}

func generateCandidateToken() (string, error) {
	b := make([]byte, 32)
	if _, err := rand.Read(b); err != nil {
		return "", err
	}
	return hex.EncodeToString(b), nil
}
