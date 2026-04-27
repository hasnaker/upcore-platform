// Package service — PIP (Performans İyileştirme Planı) use cases.
package service

import (
	"context"
	"fmt"
	"strings"
	"time"

	"github.com/google/uuid"
	"github.com/rs/zerolog"

	"github.com/upcore/performance/internal/domain"
	"github.com/upcore/performance/internal/event"
	"github.com/upcore/performance/internal/repository"
)

// Event topics emitted by the PIP service.
const (
	// TopicPipInitiated fires when a draft PIP is created.
	TopicPipInitiated = "pip.case.initiated.v1"
	// TopicPipApproved fires when legal approves and case goes active.
	TopicPipApproved = "pip.case.approved.v1"
	// TopicPipCheckinRecorded fires per weekly check-in.
	TopicPipCheckinRecorded = "pip.checkin.recorded.v1"
	// TopicPipClosed fires on passed/terminated.
	TopicPipClosed = "pip.case.closed.v1"
)

// PipService bundles the PIP domain use cases.
type PipService struct {
	repo      repository.PipRepository
	publisher event.Publisher
	log       zerolog.Logger
}

// NewPipService constructs the service. publisher may be nil (no-op).
func NewPipService(repo repository.PipRepository, log zerolog.Logger) *PipService {
	return &PipService{repo: repo, log: log}
}

// WithPublisher wires an event publisher.
func (s *PipService) WithPublisher(p event.Publisher) *PipService {
	s.publisher = p
	return s
}

func (s *PipService) emit(ctx context.Context, topic string, payload any) {
	if s.publisher == nil {
		return
	}
	if err := s.publisher.Publish(ctx, topic, payload); err != nil {
		s.log.Error().Err(err).Str("topic", topic).Msg("pip publish failed")
	}
}

// ============================================================================
// Request DTOs
// ============================================================================

// InitiateRequest — POST /pip.
type InitiateRequest struct {
	EmployeeID     uuid.UUID  `json:"employee_id"`
	HRReviewerID   *uuid.UUID `json:"hr_reviewer_id,omitempty"`
	ReasonCategory string     `json:"reason_category"`
	ReasonSummary  string     `json:"reason_summary"`
	StartDate      string     `json:"start_date"`
	DurationDays   int        `json:"duration_days"`
	Goals          []GoalItem `json:"goals,omitempty"`
}

// GoalItem — initial goals bundled with the initiate request.
type GoalItem struct {
	Description      string `json:"description"`
	MeasurableTarget string `json:"measurable_target"`
	Deadline         string `json:"deadline"`
	Priority         string `json:"priority,omitempty"`
}

// ApproveLegalRequest — POST /pip/{id}/approve-legal.
type ApproveLegalRequest struct {
	LegalFileURL string `json:"legal_file_url"`
}

// AddGoalRequest — POST /pip/{id}/goals.
type AddGoalRequest struct {
	Description      string `json:"description"`
	MeasurableTarget string `json:"measurable_target"`
	Deadline         string `json:"deadline"`
	Priority         string `json:"priority,omitempty"`
}

// AddCheckinRequest — POST /pip/{id}/checkins.
type AddCheckinRequest struct {
	WeekNumber    int    `json:"week_number"`
	OnTrack       string `json:"on_track"`
	ManagerNotes  string `json:"manager_notes,omitempty"`
	EmployeeNotes string `json:"employee_notes,omitempty"`
}

// AcknowledgeCheckinRequest — POST /pip/checkins/{id}/acknowledge.
type AcknowledgeCheckinRequest struct {
	EmployeeNotes string `json:"employee_notes,omitempty"`
}

// ExtendRequest — POST /pip/{id}/extend.
type ExtendRequest struct {
	ExtensionDays int    `json:"extension_days"`
	Reason        string `json:"reason"`
}

// CloseRequest — POST /pip/{id}/close-passed | /close-terminated.
type CloseRequest struct {
	LegalFileURL  string `json:"legal_file_url,omitempty"`
	OutcomeReason string `json:"outcome_reason"`
	OutcomeNotes  string `json:"outcome_notes,omitempty"`
}

// ListFilter bundles query filters.
type ListFilter struct {
	EmployeeID    uuid.UUID
	ManagerID     uuid.UUID
	Status        string
	Reason        string
	IncludeClosed bool
}

// ============================================================================
// Commands
// ============================================================================

// InitiateCase creates a draft case, optionally with initial goals.
// Status starts as 'draft'; legal must later approve to go active.
func (s *PipService) InitiateCase(ctx context.Context, tenantID, managerID uuid.UUID, req InitiateRequest) (*domain.PipCase, error) {
	start, err := parseDate(req.StartDate)
	if err != nil {
		return nil, domain.NewValidationError(map[string]string{"start_date": "invalid"})
	}

	c := &domain.PipCase{
		TenantID:       tenantID,
		EmployeeID:     req.EmployeeID,
		InitiatedBy:    managerID,
		HRReviewerID:   req.HRReviewerID,
		ReasonCategory: domain.PipReasonCategory(strings.TrimSpace(req.ReasonCategory)),
		ReasonSummary:  strings.TrimSpace(req.ReasonSummary),
		StartDate:      start,
		DurationDays:   req.DurationDays,
	}
	c.ApplyDefaults()
	if err := c.Validate(); err != nil {
		return nil, err
	}
	if managerID == uuid.Nil {
		return nil, domain.NewValidationError(map[string]string{"initiated_by": "required"})
	}
	if c.EmployeeID == managerID {
		return nil, domain.NewValidationError(map[string]string{"employee_id": "manager_cannot_be_employee"})
	}

	// Validate bundled goals before opening the tx.
	pending := make([]*domain.PipGoal, 0, len(req.Goals))
	for i, gi := range req.Goals {
		dl, err := parseDate(gi.Deadline)
		if err != nil {
			return nil, domain.NewValidationError(map[string]string{
				fmt.Sprintf("goals[%d].deadline", i): "invalid",
			})
		}
		pri := strings.TrimSpace(gi.Priority)
		if pri == "" {
			pri = string(domain.PipPriorityMedium)
		}
		g := &domain.PipGoal{
			TenantID:         tenantID,
			CaseID:           c.ID,
			Description:      strings.TrimSpace(gi.Description),
			MeasurableTarget: strings.TrimSpace(gi.MeasurableTarget),
			Deadline:         dl,
			Priority:         domain.PipPriority(pri),
		}
		g.ApplyDefaults()
		if err := g.Validate(); err != nil {
			return nil, err
		}
		pending = append(pending, g)
	}

	if err := s.repo.CreateCaseWithGoals(ctx, c, pending); err != nil {
		return nil, err
	}

	// Emit once persisted. Status after initiate is still 'draft' — we go
	// pending_legal as a second step so HR can assign reviewer first.
	s.emit(ctx, TopicPipInitiated, map[string]any{
		"case_id":         c.ID,
		"tenant_id":       tenantID,
		"employee_id":     c.EmployeeID,
		"initiated_by":    c.InitiatedBy,
		"reason_category": c.ReasonCategory,
		"duration_days":   c.DurationDays,
		"status":          c.Status,
	})
	c.Goals = make([]domain.PipGoal, 0, len(pending))
	for _, g := range pending {
		c.Goals = append(c.Goals, *g)
	}
	return c, nil
}

// SubmitForLegal transitions draft → pending_legal.
func (s *PipService) SubmitForLegal(ctx context.Context, tenantID, caseID, actorID uuid.UUID, hrReviewerID *uuid.UUID) (*domain.PipCase, error) {
	c, err := s.repo.GetCase(ctx, tenantID, caseID)
	if err != nil {
		return nil, err
	}
	if !c.Status.CanTransitionTo(domain.PipStatusPendingLegal) {
		return nil, fmt.Errorf("%w: %s → pending_legal", domain.ErrInvalidStatus, c.Status)
	}
	if hrReviewerID != nil {
		c.HRReviewerID = hrReviewerID
		if err := s.repo.SetHRReviewer(ctx, tenantID, caseID, *hrReviewerID); err != nil {
			return nil, err
		}
	}
	if err := s.repo.UpdateCaseStatus(ctx, tenantID, caseID, nil, nil, nil, nil, domain.PipStatusPendingLegal); err != nil {
		return nil, err
	}
	c.Status = domain.PipStatusPendingLegal
	return c, nil
}

// ApproveLegal transitions pending_legal → active and records legal approval.
// Requires a legal file (mahkeme delili).
func (s *PipService) ApproveLegal(ctx context.Context, tenantID, caseID, legalReviewerID uuid.UUID, req ApproveLegalRequest) (*domain.PipCase, error) {
	if legalReviewerID == uuid.Nil {
		return nil, domain.NewValidationError(map[string]string{"legal_reviewer_id": "required"})
	}
	fileURL := strings.TrimSpace(req.LegalFileURL)
	if fileURL == "" {
		return nil, domain.NewValidationError(map[string]string{"legal_file_url": "required"})
	}
	c, err := s.repo.GetCase(ctx, tenantID, caseID)
	if err != nil {
		return nil, err
	}
	if !c.Status.CanTransitionTo(domain.PipStatusActive) {
		return nil, fmt.Errorf("%w: %s → active", domain.ErrInvalidStatus, c.Status)
	}
	reviewed := true
	if err := s.repo.UpdateCaseStatus(ctx, tenantID, caseID, &legalReviewerID, &reviewed, &fileURL, nil, domain.PipStatusActive); err != nil {
		return nil, err
	}
	c.Status = domain.PipStatusActive
	c.LegalReviewerID = &legalReviewerID
	c.LegalReviewed = true
	c.LegalFileURL = &fileURL
	s.emit(ctx, TopicPipApproved, map[string]any{
		"case_id":           c.ID,
		"tenant_id":         tenantID,
		"employee_id":       c.EmployeeID,
		"legal_reviewer_id": legalReviewerID,
		"status":            c.Status,
	})
	return c, nil
}

// AddGoal appends a goal to an active/pending case.
func (s *PipService) AddGoal(ctx context.Context, tenantID, caseID uuid.UUID, req AddGoalRequest) (*domain.PipGoal, error) {
	c, err := s.repo.GetCase(ctx, tenantID, caseID)
	if err != nil {
		return nil, err
	}
	if c.Status.IsClosed() {
		return nil, fmt.Errorf("%w: closed case", domain.ErrInvalidStatus)
	}
	dl, err := parseDate(req.Deadline)
	if err != nil {
		return nil, domain.NewValidationError(map[string]string{"deadline": "invalid"})
	}
	pri := strings.TrimSpace(req.Priority)
	if pri == "" {
		pri = string(domain.PipPriorityMedium)
	}
	g := &domain.PipGoal{
		TenantID:         tenantID,
		CaseID:           caseID,
		Description:      strings.TrimSpace(req.Description),
		MeasurableTarget: strings.TrimSpace(req.MeasurableTarget),
		Deadline:         dl,
		Priority:         domain.PipPriority(pri),
	}
	g.ApplyDefaults()
	if err := g.Validate(); err != nil {
		return nil, err
	}
	if err := s.repo.AddGoal(ctx, g); err != nil {
		return nil, err
	}
	return g, nil
}

// AddCheckin appends a weekly check-in. Requires active/extended case.
func (s *PipService) AddCheckin(ctx context.Context, tenantID, caseID, actorID uuid.UUID, req AddCheckinRequest) (*domain.PipCheckin, error) {
	c, err := s.repo.GetCase(ctx, tenantID, caseID)
	if err != nil {
		return nil, err
	}
	if !c.Status.IsActive() {
		return nil, fmt.Errorf("%w: case not active", domain.ErrInvalidStatus)
	}
	k := &domain.PipCheckin{
		TenantID:   tenantID,
		CaseID:     caseID,
		WeekNumber: req.WeekNumber,
		OnTrack:    domain.PipCheckinTrack(strings.TrimSpace(req.OnTrack)),
		CreatedBy:  actorID,
	}
	if v := strings.TrimSpace(req.ManagerNotes); v != "" {
		k.ManagerNotes = &v
	}
	if v := strings.TrimSpace(req.EmployeeNotes); v != "" {
		k.EmployeeNotes = &v
	}
	k.ApplyDefaults()
	if err := k.Validate(); err != nil {
		return nil, err
	}
	if err := s.repo.AddCheckin(ctx, k); err != nil {
		return nil, err
	}
	s.emit(ctx, TopicPipCheckinRecorded, map[string]any{
		"case_id":     caseID,
		"tenant_id":   tenantID,
		"week_number": k.WeekNumber,
		"on_track":    k.OnTrack,
		"created_by":  actorID,
	})
	return k, nil
}

// AcknowledgeCheckin records the employee's acknowledgement with
// IP + UA + timestamp (mahkeme delili niteliğinde).
func (s *PipService) AcknowledgeCheckin(ctx context.Context, tenantID, checkinID uuid.UUID, ip, userAgent string, req AcknowledgeCheckinRequest) error {
	ack := &domain.PipCheckin{}
	ack.SetAcknowledge(ip, userAgent)
	if v := strings.TrimSpace(req.EmployeeNotes); v != "" {
		ack.EmployeeNotes = &v
	}
	return s.repo.AcknowledgeCheckin(ctx, tenantID, checkinID, ack)
}

// ExtendCase extends an active case (30/60/90 more days).
// Status becomes 'extended'.
func (s *PipService) ExtendCase(ctx context.Context, tenantID, caseID uuid.UUID, req ExtendRequest) (*domain.PipCase, error) {
	if !domain.IsValidDuration(req.ExtensionDays) {
		return nil, domain.NewValidationError(map[string]string{"extension_days": "must_be_30_60_or_90"})
	}
	if strings.TrimSpace(req.Reason) == "" {
		return nil, domain.NewValidationError(map[string]string{"reason": "required"})
	}
	c, err := s.repo.GetCase(ctx, tenantID, caseID)
	if err != nil {
		return nil, err
	}
	if !c.Status.CanTransitionTo(domain.PipStatusExtended) {
		return nil, fmt.Errorf("%w: %s → extended", domain.ErrInvalidStatus, c.Status)
	}

	reason := strings.TrimSpace(req.Reason)
	newDuration := c.DurationDays + req.ExtensionDays
	if err := s.repo.SetDurationDays(ctx, tenantID, caseID, newDuration); err != nil {
		return nil, err
	}
	if err := s.repo.UpdateCaseStatus(ctx, tenantID, caseID, nil, nil, nil, &reason, domain.PipStatusExtended); err != nil {
		return nil, err
	}
	c.Status = domain.PipStatusExtended
	c.DurationDays = newDuration
	c.OutcomeReason = &reason
	return c, nil
}

// ClosePassed closes the case as passed.
func (s *PipService) ClosePassed(ctx context.Context, tenantID, caseID, actorID uuid.UUID, req CloseRequest) (*domain.PipCase, error) {
	return s.closeCase(ctx, tenantID, caseID, actorID, domain.PipStatusPassed, domain.PipOutcomePassed, req)
}

// CloseTerminated closes the case as terminated. İş Kanunu 25/2 — dosya
// zorunlu; `legal_file_url` boş olamaz.
func (s *PipService) CloseTerminated(ctx context.Context, tenantID, caseID, actorID uuid.UUID, req CloseRequest) (*domain.PipCase, error) {
	if strings.TrimSpace(req.LegalFileURL) == "" {
		return nil, domain.NewValidationError(map[string]string{"legal_file_url": "required_for_terminated"})
	}
	return s.closeCase(ctx, tenantID, caseID, actorID, domain.PipStatusTerminated, domain.PipOutcomeTerminated, req)
}

func (s *PipService) closeCase(ctx context.Context, tenantID, caseID, actorID uuid.UUID, nextStatus domain.PipStatus, result domain.PipOutcomeResult, req CloseRequest) (*domain.PipCase, error) {
	if actorID == uuid.Nil {
		return nil, domain.NewValidationError(map[string]string{"closed_by": "required"})
	}
	if strings.TrimSpace(req.OutcomeReason) == "" {
		return nil, domain.NewValidationError(map[string]string{"outcome_reason": "required"})
	}
	c, err := s.repo.GetCase(ctx, tenantID, caseID)
	if err != nil {
		return nil, err
	}
	if !c.Status.CanTransitionTo(nextStatus) {
		return nil, fmt.Errorf("%w: %s → %s", domain.ErrInvalidStatus, c.Status, nextStatus)
	}

	fileURL := strings.TrimSpace(req.LegalFileURL)
	outcomeReason := strings.TrimSpace(req.OutcomeReason)
	outcomeNotes := strings.TrimSpace(req.OutcomeNotes)

	outcome := &domain.PipOutcome{
		TenantID: tenantID,
		CaseID:   caseID,
		Result:   result,
		ClosedAt: time.Now().UTC(),
		ClosedBy: actorID,
	}
	if fileURL != "" {
		outcome.LegalFileURL = &fileURL
	}
	if outcomeNotes != "" {
		outcome.OutcomeNotes = &outcomeNotes
	}
	outcome.ApplyDefaults()
	if err := outcome.Validate(); err != nil {
		return nil, err
	}

	var legalFilePtr *string
	if fileURL != "" {
		legalFilePtr = &fileURL
	}
	if err := s.repo.CloseCase(ctx, tenantID, caseID, legalFilePtr, outcomeReason, nextStatus, outcome); err != nil {
		return nil, err
	}

	c.Status = nextStatus
	c.OutcomeReason = &outcomeReason
	if fileURL != "" {
		c.LegalFileURL = &fileURL
	}
	c.Outcome = outcome
	s.emit(ctx, TopicPipClosed, map[string]any{
		"case_id":     c.ID,
		"tenant_id":   tenantID,
		"employee_id": c.EmployeeID,
		"result":      result,
		"closed_by":   actorID,
	})
	return c, nil
}

// ============================================================================
// Queries
// ============================================================================

// Get returns a case + relations (goals, checkins, outcome).
func (s *PipService) Get(ctx context.Context, tenantID, caseID uuid.UUID) (*domain.PipCase, error) {
	return s.repo.GetCaseWithRelations(ctx, tenantID, caseID)
}

// List returns paginated cases with filter.
func (s *PipService) List(ctx context.Context, tenantID uuid.UUID, f ListFilter, page, limit int) ([]*domain.PipCase, int, error) {
	if limit <= 0 {
		limit = 50
	}
	if page < 0 {
		page = 0
	}
	return s.repo.ListCases(ctx, tenantID, repository.PipListFilter{
		EmployeeID:    f.EmployeeID,
		ManagerID:     f.ManagerID,
		Status:        f.Status,
		Reason:        f.Reason,
		IncludeClosed: f.IncludeClosed,
	}, limit, page*limit)
}

// ListForEmployee — employee portal view.
func (s *PipService) ListForEmployee(ctx context.Context, tenantID, employeeID uuid.UUID) ([]*domain.PipCase, error) {
	items, _, err := s.repo.ListCases(ctx, tenantID, repository.PipListFilter{
		EmployeeID:    employeeID,
		IncludeClosed: true,
	}, 200, 0)
	return items, err
}

// ListForManager — manager console view.
func (s *PipService) ListForManager(ctx context.Context, tenantID, managerID uuid.UUID) ([]*domain.PipCase, error) {
	items, _, err := s.repo.ListCases(ctx, tenantID, repository.PipListFilter{
		ManagerID:     managerID,
		IncludeClosed: true,
	}, 200, 0)
	return items, err
}

// ListForHR — HR panel view (all cases).
func (s *PipService) ListForHR(ctx context.Context, tenantID uuid.UUID, status, reason string) ([]*domain.PipCase, error) {
	items, _, err := s.repo.ListCases(ctx, tenantID, repository.PipListFilter{
		Status:        status,
		Reason:        reason,
		IncludeClosed: true,
	}, 500, 0)
	return items, err
}

// ============================================================================
// PDF export payload — rendered by the handler into a deterministic text PDF.
// ============================================================================

// BuildPDFPayload returns a struct suitable for PDF generation.
func (s *PipService) BuildPDFPayload(ctx context.Context, tenantID, caseID uuid.UUID) (*domain.PipCase, error) {
	c, err := s.repo.GetCaseWithRelations(ctx, tenantID, caseID)
	if err != nil {
		return nil, err
	}
	if c == nil {
		return nil, domain.ErrNotFound
	}
	return c, nil
}

