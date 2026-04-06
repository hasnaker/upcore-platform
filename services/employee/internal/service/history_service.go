package service

import (
	"context"
	"strings"
	"time"

	"github.com/google/uuid"

	"github.com/upcore/employee/internal/domain"
	"github.com/upcore/employee/internal/event"
	"github.com/upcore/employee/internal/repository"
)

// HistoryService manages append-only employment history entries.
type HistoryService struct {
	employees repository.EmployeeRepository
	history   repository.HistoryRepository
	publisher event.Publisher
}

// NewHistoryService constructs a HistoryService.
func NewHistoryService(employees repository.EmployeeRepository, history repository.HistoryRepository, publisher event.Publisher) *HistoryService {
	return &HistoryService{employees: employees, history: history, publisher: publisher}
}

// AppendRequest describes a history entry submitted via the API.
type AppendRequest struct {
	ChangeType      string     `json:"change_type"`
	OldDepartmentID *uuid.UUID `json:"old_department_id,omitempty"`
	NewDepartmentID *uuid.UUID `json:"new_department_id,omitempty"`
	OldPositionID   *uuid.UUID `json:"old_position_id,omitempty"`
	NewPositionID   *uuid.UUID `json:"new_position_id,omitempty"`
	OldManagerID    *uuid.UUID `json:"old_manager_id,omitempty"`
	NewManagerID    *uuid.UUID `json:"new_manager_id,omitempty"`
	OldSalary       *float64   `json:"old_salary,omitempty"`
	NewSalary       *float64   `json:"new_salary,omitempty"`
	EffectiveDate   string     `json:"effective_date"`
	Reason          string     `json:"reason,omitempty"`
}

// Append validates and writes a history entry for the given employee.
func (s *HistoryService) Append(ctx context.Context, tenantID, employeeID, by uuid.UUID, req AppendRequest) (*domain.EmploymentHistory, error) {
	// Verify employee exists in this tenant.
	if _, err := s.employees.GetByID(ctx, tenantID, employeeID); err != nil {
		return nil, err
	}
	ct := domain.ChangeType(strings.TrimSpace(req.ChangeType))
	if !ct.IsValid() {
		return nil, domain.NewValidationError(map[string]string{"change_type": "invalid"})
	}
	eff, err := time.Parse("2006-01-02", strings.TrimSpace(req.EffectiveDate))
	if err != nil {
		return nil, domain.ErrInvalidDate
	}
	h := domain.NewHistoryEntry(tenantID, employeeID, ct, eff)
	h.OldDepartmentID = req.OldDepartmentID
	h.NewDepartmentID = req.NewDepartmentID
	h.OldPositionID = req.OldPositionID
	h.NewPositionID = req.NewPositionID
	h.OldManagerID = req.OldManagerID
	h.NewManagerID = req.NewManagerID
	h.OldSalary = req.OldSalary
	h.NewSalary = req.NewSalary
	if reason := strings.TrimSpace(req.Reason); reason != "" {
		h.Reason = &reason
	}
	if by != uuid.Nil {
		bid := by
		h.ApprovedBy = &bid
	}
	if err := s.history.Append(ctx, nil, h); err != nil {
		return nil, err
	}

	// Emit topic based on type.
	switch ct {
	case domain.ChangePromotion, domain.ChangeTransfer, domain.ChangeTitleChange:
		_ = s.publisher.Publish(ctx, event.TopicEmployeePositionChange, map[string]any{
			"employee_id":       employeeID,
			"tenant_id":         tenantID,
			"old_position_id":   req.OldPositionID,
			"new_position_id":   req.NewPositionID,
			"effective_date":    eff,
		})
	case domain.ChangeManagerChange:
		_ = s.publisher.Publish(ctx, event.TopicEmployeeManagerChange, map[string]any{
			"employee_id":      employeeID,
			"tenant_id":        tenantID,
			"old_manager_id":   req.OldManagerID,
			"new_manager_id":   req.NewManagerID,
			"effective_date":   eff,
		})
	}
	return h, nil
}

// List returns paginated history entries.
func (s *HistoryService) List(ctx context.Context, tenantID, employeeID uuid.UUID, page, limit int) ([]*domain.EmploymentHistory, int, error) {
	if _, err := s.employees.GetByID(ctx, tenantID, employeeID); err != nil {
		return nil, 0, err
	}
	return s.history.ListByEmployee(ctx, employeeID, page, limit)
}
