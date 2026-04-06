package service

import (
	"context"
	"time"

	"github.com/google/uuid"
	"github.com/rs/zerolog"

	"github.com/upcore/organization/internal/domain"
	"github.com/upcore/organization/internal/event"
	"github.com/upcore/organization/internal/repository"
)

// ReorgService handles reporting-line changes with cycle detection.
type ReorgService struct {
	reports   repository.ReportingRepository
	publisher event.Publisher
	log       zerolog.Logger
}

// NewReorgService creates a ReorgService.
func NewReorgService(reports repository.ReportingRepository, publisher event.Publisher, log zerolog.Logger) *ReorgService {
	return &ReorgService{reports: reports, publisher: publisher, log: log}
}

// SetManagerInput captures the set-manager request body.
type SetManagerInput struct {
	EmployeeID    uuid.UUID `json:"employee_id" validate:"required"`
	ManagerID     uuid.UUID `json:"manager_id" validate:"required"`
	Type          string    `json:"type" validate:"required,oneof=solid dotted"`
	EffectiveFrom time.Time `json:"effective_from"`
}

// OrgChartNode is a node in the reporting-line tree returned by GetOrgChart.
type OrgChartNode struct {
	EmployeeID uuid.UUID       `json:"employee_id"`
	Children   []*OrgChartNode `json:"children"`
}

// SetManager assigns (or replaces) the manager for an employee.
// If a current solid line exists, it is ended first. Cycles are prevented.
func (s *ReorgService) SetManager(ctx context.Context, tenantID uuid.UUID, in SetManagerInput) (*domain.ReportingLine, error) {
	if in.EmployeeID == in.ManagerID {
		return nil, domain.ErrSelfManager
	}
	if !domain.ValidateLineType(in.Type) {
		return nil, domain.NewValidationError(map[string]string{"type": "must be solid or dotted"})
	}
	lineType := domain.LineType(in.Type)

	// Cycle check only applies to solid lines (dotted lines are advisory).
	if lineType == domain.LineSolid {
		active, err := s.reports.GetActiveLines(ctx, tenantID)
		if err != nil {
			return nil, err
		}
		lines := make([]domain.ReportingLine, 0, len(active))
		for _, l := range active {
			lines = append(lines, *l)
		}
		if domain.DetectCycle(lines, in.EmployeeID, in.ManagerID) {
			return nil, domain.ErrManagerCycle
		}
	}

	effFrom := in.EffectiveFrom
	if effFrom.IsZero() {
		effFrom = time.Now().UTC()
	}

	// End any current solid line for the employee when setting a new solid line.
	if lineType == domain.LineSolid {
		if current, err := s.reports.GetCurrentManager(ctx, tenantID, in.EmployeeID); err == nil && current != nil {
			_ = s.reports.EndLine(ctx, tenantID, current.ID, effFrom)
		}
	}

	line := &domain.ReportingLine{
		ID:            uuid.New(),
		TenantID:      tenantID,
		EmployeeID:    in.EmployeeID,
		ManagerID:     in.ManagerID,
		Type:          lineType,
		EffectiveFrom: effFrom.UTC(),
		CreatedAt:     time.Now().UTC(),
	}
	if err := s.reports.Create(ctx, nil, line); err != nil {
		return nil, err
	}
	_ = s.publisher.Publish(ctx, event.TopicReportingChanged, map[string]any{
		"tenant_id":   tenantID,
		"employee_id": in.EmployeeID,
		"manager_id":  in.ManagerID,
		"type":        string(lineType),
		"effective_from": effFrom,
	})
	return line, nil
}

// EndLine ends a specific reporting line.
func (s *ReorgService) EndLine(ctx context.Context, tenantID, lineID uuid.UUID) error {
	return s.reports.EndLine(ctx, tenantID, lineID, time.Now().UTC())
}

// GetCurrentManager returns the current solid manager for an employee.
func (s *ReorgService) GetCurrentManager(ctx context.Context, tenantID, employeeID uuid.UUID) (*domain.ReportingLine, error) {
	return s.reports.GetCurrentManager(ctx, tenantID, employeeID)
}

// GetDirectReports returns the direct reports of a manager.
func (s *ReorgService) GetDirectReports(ctx context.Context, tenantID, managerID uuid.UUID, includeDotted bool) ([]*domain.ReportingLine, error) {
	return s.reports.GetDirectReports(ctx, tenantID, managerID, includeDotted)
}

// GetTeamTree returns the manager's full reporting subtree.
func (s *ReorgService) GetTeamTree(ctx context.Context, tenantID, managerID uuid.UUID) (*OrgChartNode, error) {
	active, err := s.reports.GetActiveLines(ctx, tenantID)
	if err != nil {
		return nil, err
	}
	// Build manager -> [employees] map from solid lines.
	children := map[uuid.UUID][]uuid.UUID{}
	for _, l := range active {
		if l.Type != domain.LineSolid {
			continue
		}
		children[l.ManagerID] = append(children[l.ManagerID], l.EmployeeID)
	}
	return buildOrgNode(managerID, children, map[uuid.UUID]struct{}{}), nil
}

// GetMatrix returns all active dotted-line relationships.
func (s *ReorgService) GetMatrix(ctx context.Context, tenantID uuid.UUID) ([]*domain.ReportingLine, error) {
	active, err := s.reports.GetActiveLines(ctx, tenantID)
	if err != nil {
		return nil, err
	}
	out := make([]*domain.ReportingLine, 0, len(active))
	for _, l := range active {
		if l.Type == domain.LineDotted {
			out = append(out, l)
		}
	}
	return out, nil
}

// GetChainUpward returns the chain of managers above an employee.
func (s *ReorgService) GetChainUpward(ctx context.Context, tenantID, employeeID uuid.UUID) ([]*domain.ReportingLine, error) {
	return s.reports.GetChainUpward(ctx, tenantID, employeeID, 15)
}

func buildOrgNode(id uuid.UUID, children map[uuid.UUID][]uuid.UUID, seen map[uuid.UUID]struct{}) *OrgChartNode {
	if _, ok := seen[id]; ok {
		return &OrgChartNode{EmployeeID: id, Children: []*OrgChartNode{}}
	}
	seen[id] = struct{}{}
	node := &OrgChartNode{EmployeeID: id, Children: []*OrgChartNode{}}
	for _, childID := range children[id] {
		node.Children = append(node.Children, buildOrgNode(childID, children, seen))
	}
	return node
}
