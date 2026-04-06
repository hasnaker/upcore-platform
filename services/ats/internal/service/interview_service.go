package service

import (
	"context"
	"encoding/json"
	"strings"
	"time"

	"github.com/google/uuid"
	"github.com/rs/zerolog"

	"github.com/upcore/ats/internal/domain"
	"github.com/upcore/ats/internal/event"
	"github.com/upcore/ats/internal/repository"
)

// ScheduleInterviewRequest is the payload for scheduling an interview.
type ScheduleInterviewRequest struct {
	ApplicationID   uuid.UUID `json:"application_id"`
	Round           int       `json:"round"`
	ScheduledAt     string    `json:"scheduled_at"`
	DurationMinutes int       `json:"duration_minutes"`
	InterviewerIDs  []string  `json:"interviewer_ids"`
	Location        string    `json:"location,omitempty"`
	MeetingURL      string    `json:"meeting_url,omitempty"`
}

// FeedbackRequest is the payload for submitting interview feedback.
type FeedbackRequest struct {
	Feedback       map[string]any `json:"feedback"`
	OverallScore   int            `json:"overall_score"`
	Recommendation string         `json:"recommendation"`
}

// InterviewService orchestrates interview operations.
type InterviewService struct {
	interviews   repository.InterviewRepository
	applications repository.ApplicationRepository
	events       repository.EventRepository
	publisher    event.Publisher
	log          zerolog.Logger
}

// NewInterviewService constructs the service.
func NewInterviewService(
	interviews repository.InterviewRepository,
	applications repository.ApplicationRepository,
	events repository.EventRepository,
	publisher event.Publisher,
	log zerolog.Logger,
) *InterviewService {
	return &InterviewService{
		interviews:   interviews,
		applications: applications,
		events:       events,
		publisher:    publisher,
		log:          log,
	}
}

// Schedule creates a new interview. Emits ats.interview.scheduled.v1.
func (s *InterviewService) Schedule(ctx context.Context, tenantID uuid.UUID, req ScheduleInterviewRequest) (*domain.Interview, error) {
	// Validate application exists.
	if _, err := s.applications.GetByID(ctx, tenantID, req.ApplicationID); err != nil {
		return nil, err
	}

	scheduledAt, err := time.Parse(time.RFC3339, strings.TrimSpace(req.ScheduledAt))
	if err != nil {
		return nil, domain.ErrInvalidDate
	}

	interviewerIDs := domain.StringArray(req.InterviewerIDs)

	interview := &domain.Interview{
		TenantID:        tenantID,
		ApplicationID:   req.ApplicationID,
		Round:           req.Round,
		ScheduledAt:     scheduledAt,
		DurationMinutes: req.DurationMinutes,
		InterviewerIDs:  interviewerIDs,
	}
	if v := strings.TrimSpace(req.Location); v != "" {
		interview.Location = &v
	}
	if v := strings.TrimSpace(req.MeetingURL); v != "" {
		interview.MeetingURL = &v
	}

	if err := interview.Validate(); err != nil {
		return nil, err
	}

	if err := s.interviews.Create(ctx, interview); err != nil {
		return nil, err
	}

	// Record event.
	payload, _ := json.Marshal(map[string]any{
		"interview_id": interview.ID,
		"round":        interview.Round,
		"scheduled_at": interview.ScheduledAt,
	})
	evt := &domain.ApplicationEvent{
		TenantID:      tenantID,
		ApplicationID: req.ApplicationID,
		EventType:     domain.EventInterviewScheduled,
		Payload:       domain.JSONB(payload),
		CreatedAt:     time.Now().UTC(),
	}
	if err := s.events.Append(ctx, evt); err != nil {
		s.log.Warn().Err(err).Msg("append interview event failed")
	}

	s.publish(ctx, event.TopicInterviewScheduled, map[string]any{
		"interview_id":   interview.ID,
		"tenant_id":      tenantID,
		"application_id": req.ApplicationID,
		"round":          interview.Round,
		"scheduled_at":   interview.ScheduledAt,
	})
	return interview, nil
}

// Reschedule updates an interview's schedule.
func (s *InterviewService) Reschedule(ctx context.Context, tenantID, id uuid.UUID, scheduledAt string, durationMinutes int) (*domain.Interview, error) {
	interview, err := s.interviews.GetByID(ctx, tenantID, id)
	if err != nil {
		return nil, err
	}
	if interview.Status != domain.InterviewScheduled {
		return nil, domain.ErrInterviewAlreadyDone
	}
	t, err := time.Parse(time.RFC3339, strings.TrimSpace(scheduledAt))
	if err != nil {
		return nil, domain.ErrInvalidDate
	}
	interview.ScheduledAt = t
	if durationMinutes > 0 {
		interview.DurationMinutes = durationMinutes
	}
	if err := s.interviews.Update(ctx, interview); err != nil {
		return nil, err
	}
	return interview, nil
}

// Cancel cancels an interview.
func (s *InterviewService) Cancel(ctx context.Context, tenantID, id uuid.UUID) (*domain.Interview, error) {
	interview, err := s.interviews.GetByID(ctx, tenantID, id)
	if err != nil {
		return nil, err
	}
	if interview.Status != domain.InterviewScheduled {
		return nil, domain.ErrInterviewAlreadyDone
	}
	interview.Status = domain.InterviewCanceled
	if err := s.interviews.Update(ctx, interview); err != nil {
		return nil, err
	}
	return interview, nil
}

// MarkCompleted marks an interview as completed.
func (s *InterviewService) MarkCompleted(ctx context.Context, tenantID, id uuid.UUID) (*domain.Interview, error) {
	interview, err := s.interviews.GetByID(ctx, tenantID, id)
	if err != nil {
		return nil, err
	}
	if interview.Status == domain.InterviewCompleted {
		return nil, domain.ErrInterviewAlreadyDone
	}
	interview.Status = domain.InterviewCompleted
	if err := s.interviews.Update(ctx, interview); err != nil {
		return nil, err
	}
	return interview, nil
}

// SubmitFeedback records feedback for an interview.
func (s *InterviewService) SubmitFeedback(ctx context.Context, tenantID, id uuid.UUID, req FeedbackRequest, by uuid.UUID) (*domain.Interview, error) {
	interview, err := s.interviews.GetByID(ctx, tenantID, id)
	if err != nil {
		return nil, err
	}
	feedbackJSON, _ := json.Marshal(req.Feedback)
	interview.Feedback = domain.JSONB(feedbackJSON)
	interview.OverallScore = &req.OverallScore
	if req.Recommendation != "" {
		rec := domain.Recommendation(req.Recommendation)
		if !rec.IsValid() {
			return nil, domain.NewValidationError(map[string]string{"recommendation": "invalid"})
		}
		interview.Recommendation = &rec
	}
	interview.Status = domain.InterviewCompleted
	if err := s.interviews.Update(ctx, interview); err != nil {
		return nil, err
	}
	return interview, nil
}

// GetByID fetches a single interview.
func (s *InterviewService) GetByID(ctx context.Context, tenantID, id uuid.UUID) (*domain.Interview, error) {
	return s.interviews.GetByID(ctx, tenantID, id)
}

// ListByApplication returns interviews for an application.
func (s *InterviewService) ListByApplication(ctx context.Context, applicationID uuid.UUID) ([]*domain.Interview, error) {
	return s.interviews.ListByApplication(ctx, applicationID)
}

// ListForInterviewer returns interviews for a specific interviewer.
func (s *InterviewService) ListForInterviewer(ctx context.Context, tenantID, userID uuid.UUID, from, to time.Time) ([]*domain.Interview, error) {
	return s.interviews.ListForInterviewer(ctx, tenantID, userID, from, to)
}

func (s *InterviewService) publish(ctx context.Context, topic string, payload any) {
	if err := s.publisher.Publish(ctx, topic, payload); err != nil {
		s.log.Warn().Err(err).Str("topic", topic).Msg("publish event failed")
	}
}
