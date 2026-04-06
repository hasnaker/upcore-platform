package service

import (
	"context"
	"strings"
	"time"

	"github.com/google/uuid"
	"github.com/rs/zerolog"

	"github.com/upcore/organization/internal/domain"
	"github.com/upcore/organization/internal/event"
	"github.com/upcore/organization/internal/repository"
)

// TeamService manages teams and team membership.
type TeamService struct {
	teams     repository.TeamRepository
	publisher event.Publisher
	log       zerolog.Logger
}

// NewTeamService creates a TeamService.
func NewTeamService(teams repository.TeamRepository, publisher event.Publisher, log zerolog.Logger) *TeamService {
	return &TeamService{teams: teams, publisher: publisher, log: log}
}

// CreateTeamInput captures POST /teams fields.
type CreateTeamInput struct {
	Name           string     `json:"name" validate:"required,min=1,max=120"`
	DepartmentID   *uuid.UUID `json:"department_id,omitempty"`
	LeadEmployeeID *uuid.UUID `json:"lead_employee_id,omitempty"`
	Description    *string    `json:"description,omitempty"`
}

// UpdateTeamInput captures patchable fields.
type UpdateTeamInput struct {
	Name           *string    `json:"name,omitempty" validate:"omitempty,min=1,max=120"`
	DepartmentID   *uuid.UUID `json:"department_id,omitempty"`
	LeadEmployeeID *uuid.UUID `json:"lead_employee_id,omitempty"`
	Description    *string    `json:"description,omitempty"`
	Active         *bool      `json:"active,omitempty"`
}

// AddMemberInput captures POST /teams/{id}/members.
type AddMemberInput struct {
	EmployeeID uuid.UUID `json:"employee_id" validate:"required"`
	Role       string    `json:"role" validate:"required,oneof=member lead"`
}

// Create persists a new team.
func (s *TeamService) Create(ctx context.Context, tenantID uuid.UUID, in CreateTeamInput) (*domain.Team, error) {
	name := strings.TrimSpace(in.Name)
	if name == "" {
		return nil, domain.NewValidationError(map[string]string{"name": "required"})
	}
	now := time.Now().UTC()
	t := &domain.Team{
		ID:             uuid.New(),
		TenantID:       tenantID,
		Name:           name,
		DepartmentID:   in.DepartmentID,
		LeadEmployeeID: in.LeadEmployeeID,
		Description:    in.Description,
		Active:         true,
		CreatedAt:      now,
		UpdatedAt:      now,
	}
	if err := t.Validate(); err != nil {
		return nil, err
	}
	if err := s.teams.Create(ctx, nil, t); err != nil {
		return nil, err
	}
	_ = s.publisher.Publish(ctx, event.TopicTeamCreated, map[string]any{
		"team_id":       t.ID,
		"tenant_id":     t.TenantID,
		"name":          t.Name,
		"department_id": t.DepartmentID,
	})
	return t, nil
}

// Get fetches a team by ID.
func (s *TeamService) Get(ctx context.Context, tenantID, id uuid.UUID) (*domain.Team, error) {
	return s.teams.GetByID(ctx, tenantID, id)
}

// List returns all teams for a tenant.
func (s *TeamService) List(ctx context.Context, tenantID uuid.UUID, includeArchived bool) ([]*domain.Team, error) {
	return s.teams.List(ctx, tenantID, includeArchived)
}

// Update applies partial updates.
func (s *TeamService) Update(ctx context.Context, tenantID, id uuid.UUID, in UpdateTeamInput) (*domain.Team, error) {
	t, err := s.teams.GetByID(ctx, tenantID, id)
	if err != nil {
		return nil, err
	}
	if in.Name != nil {
		name := strings.TrimSpace(*in.Name)
		if name == "" {
			return nil, domain.NewValidationError(map[string]string{"name": "required"})
		}
		t.Name = name
	}
	if in.DepartmentID != nil {
		t.DepartmentID = in.DepartmentID
	}
	if in.LeadEmployeeID != nil {
		t.LeadEmployeeID = in.LeadEmployeeID
	}
	if in.Description != nil {
		t.Description = in.Description
	}
	if in.Active != nil {
		t.Active = *in.Active
	}
	if err := s.teams.Update(ctx, nil, t); err != nil {
		return nil, err
	}
	_ = s.publisher.Publish(ctx, event.TopicTeamUpdated, map[string]any{
		"team_id":    t.ID,
		"tenant_id":  t.TenantID,
		"updated_at": t.UpdatedAt,
	})
	return t, nil
}

// Archive soft-deletes a team.
func (s *TeamService) Archive(ctx context.Context, tenantID, id uuid.UUID) error {
	return s.teams.Archive(ctx, tenantID, id)
}

// AddMember inserts or updates a team member.
func (s *TeamService) AddMember(ctx context.Context, tenantID, teamID uuid.UUID, in AddMemberInput) (*domain.TeamMember, error) {
	if _, err := s.teams.GetByID(ctx, tenantID, teamID); err != nil {
		return nil, err
	}
	if !domain.ValidRole(in.Role) {
		return nil, domain.NewValidationError(map[string]string{"role": "invalid"})
	}
	m := &domain.TeamMember{
		TeamID:     teamID,
		EmployeeID: in.EmployeeID,
		TenantID:   tenantID,
		Role:       domain.TeamRole(in.Role),
		JoinedAt:   time.Now().UTC(),
	}
	if err := s.teams.AddMember(ctx, nil, m); err != nil {
		return nil, err
	}
	_ = s.publisher.Publish(ctx, event.TopicTeamMemberAdded, map[string]any{
		"team_id":     teamID,
		"tenant_id":   tenantID,
		"employee_id": in.EmployeeID,
		"role":        in.Role,
	})
	return m, nil
}

// RemoveMember removes an employee from a team.
func (s *TeamService) RemoveMember(ctx context.Context, tenantID, teamID, employeeID uuid.UUID) error {
	if err := s.teams.RemoveMember(ctx, tenantID, teamID, employeeID); err != nil {
		return err
	}
	_ = s.publisher.Publish(ctx, event.TopicTeamMemberRemoved, map[string]any{
		"team_id":     teamID,
		"tenant_id":   tenantID,
		"employee_id": employeeID,
	})
	return nil
}

// ListMembers returns all members of a team.
func (s *TeamService) ListMembers(ctx context.Context, tenantID, teamID uuid.UUID) ([]*domain.TeamMember, error) {
	if _, err := s.teams.GetByID(ctx, tenantID, teamID); err != nil {
		return nil, err
	}
	return s.teams.ListMembers(ctx, tenantID, teamID)
}
