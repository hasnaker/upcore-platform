package service

import (
	"context"
	"strings"
	"time"

	"github.com/google/uuid"
	"github.com/rs/zerolog"

	"github.com/upcore/employee/internal/domain"
	"github.com/upcore/employee/internal/event"
	"github.com/upcore/employee/internal/repository"
)

// Onboarding event topics.
const (
	TopicOnboardingStarted   = "onboarding.started.v1"
	TopicOnboardingCompleted = "onboarding.completed.v1"
	TopicOnboardingTaskDone  = "onboarding.task.completed.v1"
)

// OnboardingService orchestrates the checklist + tasks workflow.
type OnboardingService struct {
	repo      repository.OnboardingRepository
	employees repository.EmployeeRepository
	publisher event.Publisher
	log       zerolog.Logger
}

// NewOnboardingService constructs an OnboardingService.
func NewOnboardingService(
	repo repository.OnboardingRepository,
	employees repository.EmployeeRepository,
	pub event.Publisher,
	log zerolog.Logger,
) *OnboardingService {
	return &OnboardingService{repo: repo, employees: employees, publisher: pub, log: log}
}

// StartRequest is the POST /employees/{id}/onboarding body.
type StartRequest struct {
	TemplateName string `json:"template_name,omitempty"`
	StartDate    string `json:"start_date,omitempty"`
}

// TaskUpdateRequest is the PATCH /onboarding/tasks/{id} body.
type TaskUpdateRequest struct {
	Status      string     `json:"status,omitempty"`
	OwnerUserID *uuid.UUID `json:"owner_user_id,omitempty"`
	Notes       string     `json:"notes,omitempty"`
}

// Start creates a new checklist for an employee from a named template.
func (s *OnboardingService) Start(ctx context.Context, tenantID, employeeID uuid.UUID, req StartRequest) (*domain.OnboardingChecklist, error) {
	if tenantID == uuid.Nil {
		return nil, domain.ErrUnauthorized
	}
	if _, err := s.employees.GetByID(ctx, tenantID, employeeID); err != nil {
		return nil, err
	}
	tpl, err := domain.ResolveTemplate(req.TemplateName)
	if err != nil {
		return nil, err
	}
	start, err := resolveStartDate(req.StartDate)
	if err != nil {
		return nil, domain.NewValidationError(map[string]string{"start_date": "invalid"})
	}

	checklist := &domain.OnboardingChecklist{
		TenantID:     tenantID,
		EmployeeID:   employeeID,
		TemplateName: tpl.Name,
		StartDate:    start,
		Status:       domain.OnboardingActive,
	}
	checklist.ApplyDefaults()
	if err := checklist.Validate(); err != nil {
		return nil, err
	}
	tasks := make([]domain.OnboardingTask, 0, len(tpl.Tasks))
	for i, spec := range tpl.Tasks {
		tasks = append(tasks, spec.ExpandForChecklist(checklist, i))
	}
	if err := s.repo.CreateWithTasks(ctx, checklist, tasks); err != nil {
		return nil, err
	}
	s.publish(ctx, TopicOnboardingStarted, checklist)
	return checklist, nil
}

// GetForEmployee returns the checklist owned by an employee (if any).
func (s *OnboardingService) GetForEmployee(ctx context.Context, tenantID, employeeID uuid.UUID) (*domain.OnboardingChecklist, error) {
	if tenantID == uuid.Nil {
		return nil, domain.ErrUnauthorized
	}
	return s.repo.GetByEmployee(ctx, tenantID, employeeID)
}

// Get returns a checklist by ID.
func (s *OnboardingService) Get(ctx context.Context, tenantID, id uuid.UUID) (*domain.OnboardingChecklist, error) {
	if tenantID == uuid.Nil {
		return nil, domain.ErrUnauthorized
	}
	return s.repo.GetByID(ctx, tenantID, id)
}

// List returns checklists across the tenant.
func (s *OnboardingService) List(ctx context.Context, tenantID uuid.UUID, status string, page, limit int) ([]*domain.OnboardingChecklist, int, error) {
	if tenantID == uuid.Nil {
		return nil, 0, domain.ErrUnauthorized
	}
	if limit <= 0 {
		limit = 50
	}
	if page < 0 {
		page = 0
	}
	return s.repo.List(ctx, tenantID, status, limit, page*limit)
}

// UpdateTask applies status / owner / note changes and recomputes completion %.
func (s *OnboardingService) UpdateTask(ctx context.Context, tenantID, taskID uuid.UUID, req TaskUpdateRequest) (*domain.OnboardingTask, error) {
	if tenantID == uuid.Nil {
		return nil, domain.ErrUnauthorized
	}
	t, err := s.repo.GetTask(ctx, tenantID, taskID)
	if err != nil {
		return nil, err
	}
	checklist, err := s.repo.GetByID(ctx, tenantID, t.ChecklistID)
	if err != nil {
		return nil, err
	}
	if checklist.Status != domain.OnboardingActive {
		return nil, domain.ErrOnboardingClosed
	}

	if v := strings.TrimSpace(req.Status); v != "" {
		status := domain.OnboardingTaskStatus(v)
		if !status.IsValid() {
			return nil, domain.NewValidationError(map[string]string{"status": "invalid"})
		}
		t.Status = status
		if status == domain.TaskCompleted {
			now := time.Now().UTC()
			t.CompletedAt = &now
		} else {
			t.CompletedAt = nil
		}
	}
	if req.OwnerUserID != nil {
		t.OwnerUserID = req.OwnerUserID
	}
	if v := strings.TrimSpace(req.Notes); v != "" {
		t.Notes = &v
	}

	if err := s.repo.UpdateTask(ctx, tenantID, t); err != nil {
		return nil, err
	}

	// Recompute completion % against the fresh task set.
	tasks, err := s.repo.ListTasks(ctx, tenantID, checklist.ID)
	if err != nil {
		return nil, err
	}
	pct := domain.ComputeCompletionPct(tasks)
	status := checklist.Status
	if pct == 100 {
		status = domain.OnboardingCompleted
	}
	if pct != checklist.CompletionPct || status != checklist.Status {
		if err := s.repo.UpdateChecklistStatus(ctx, tenantID, checklist.ID, status, pct); err != nil {
			return nil, err
		}
		if status == domain.OnboardingCompleted {
			checklist.Status = status
			checklist.CompletionPct = pct
			s.publish(ctx, TopicOnboardingCompleted, checklist)
		}
	}
	if t.Status == domain.TaskCompleted {
		s.publish(ctx, TopicOnboardingTaskDone, t)
	}
	return t, nil
}

// Templates returns the shipped template catalogue.
func (s *OnboardingService) Templates() []domain.OnboardingTemplate {
	all := domain.BuiltInTemplates()
	out := make([]domain.OnboardingTemplate, 0, len(all))
	for _, t := range all {
		out = append(out, t)
	}
	return out
}

func (s *OnboardingService) publish(ctx context.Context, topic string, payload any) {
	if s.publisher == nil {
		return
	}
	if err := s.publisher.Publish(ctx, topic, payload); err != nil {
		s.log.Warn().Err(err).Str("topic", topic).Msg("publish onboarding event failed")
	}
}

func resolveStartDate(raw string) (time.Time, error) {
	s := strings.TrimSpace(raw)
	if s == "" {
		return time.Now().UTC(), nil
	}
	if t, err := time.Parse(time.RFC3339, s); err == nil {
		return t.UTC(), nil
	}
	if t, err := time.Parse("2006-01-02", s); err == nil {
		return t.UTC(), nil
	}
	return time.Time{}, domain.ErrInvalidDate
}
