// Package service implements the business-logic layer of the ATS service.
package service

import (
	"context"
	"strings"
	"time"

	"github.com/google/uuid"
	"github.com/rs/zerolog"

	"github.com/upcore/ats/internal/domain"
	"github.com/upcore/ats/internal/event"
	"github.com/upcore/ats/internal/repository"
)

// CreateRequisitionRequest is the payload accepted by RequisitionService.Create.
type CreateRequisitionRequest struct {
	PositionID      *uuid.UUID `json:"position_id,omitempty"`
	Title           string     `json:"title"`
	Description     string     `json:"description"`
	Requirements    string     `json:"requirements,omitempty"`
	Headcount       int        `json:"headcount"`
	Location        string     `json:"location,omitempty"`
	EmploymentType  string     `json:"employment_type,omitempty"`
	SalaryMin       *float64   `json:"salary_min,omitempty"`
	SalaryMax       *float64   `json:"salary_max,omitempty"`
	HiringManagerID *uuid.UUID `json:"hiring_manager_id,omitempty"`
	RecruiterID     *uuid.UUID `json:"recruiter_id,omitempty"`
}

// UpdateRequisitionRequest carries partial updates.
type UpdateRequisitionRequest struct {
	PositionID      *uuid.UUID `json:"position_id,omitempty"`
	Title           *string    `json:"title,omitempty"`
	Description     *string    `json:"description,omitempty"`
	Requirements    *string    `json:"requirements,omitempty"`
	Headcount       *int       `json:"headcount,omitempty"`
	Location        *string    `json:"location,omitempty"`
	EmploymentType  *string    `json:"employment_type,omitempty"`
	SalaryMin       *float64   `json:"salary_min,omitempty"`
	SalaryMax       *float64   `json:"salary_max,omitempty"`
	HiringManagerID *uuid.UUID `json:"hiring_manager_id,omitempty"`
	RecruiterID     *uuid.UUID `json:"recruiter_id,omitempty"`
}

// CloseRequisitionRequest carries close reason.
type CloseRequisitionRequest struct {
	Reason string `json:"reason,omitempty"`
}

// RequisitionService orchestrates requisition operations.
type RequisitionService struct {
	requisitions repository.RequisitionRepository
	publisher    event.Publisher
	log          zerolog.Logger
}

// NewRequisitionService constructs the service.
func NewRequisitionService(
	requisitions repository.RequisitionRepository,
	publisher event.Publisher,
	log zerolog.Logger,
) *RequisitionService {
	return &RequisitionService{
		requisitions: requisitions,
		publisher:    publisher,
		log:          log,
	}
}

// Create validates and persists a new requisition with status=draft.
func (s *RequisitionService) Create(ctx context.Context, tenantID uuid.UUID, req CreateRequisitionRequest) (*domain.Requisition, error) {
	r := &domain.Requisition{
		TenantID:    tenantID,
		PositionID:  req.PositionID,
		Title:       strings.TrimSpace(req.Title),
		Description: strings.TrimSpace(req.Description),
		Headcount:   req.Headcount,
		SalaryMin:   req.SalaryMin,
		SalaryMax:   req.SalaryMax,
		Status:      domain.ReqStatusDraft,
		HiringManagerID: req.HiringManagerID,
		RecruiterID:     req.RecruiterID,
	}
	if v := strings.TrimSpace(req.Requirements); v != "" {
		r.Requirements = &v
	}
	if v := strings.TrimSpace(req.Location); v != "" {
		r.Location = &v
	}
	if v := strings.TrimSpace(req.EmploymentType); v != "" {
		r.EmploymentType = domain.EmploymentType(v)
	}

	if err := r.Validate(); err != nil {
		return nil, err
	}

	if err := s.requisitions.Create(ctx, r); err != nil {
		return nil, err
	}
	return r, nil
}

// Get fetches a requisition by id.
func (s *RequisitionService) Get(ctx context.Context, tenantID, id uuid.UUID) (*domain.Requisition, error) {
	return s.requisitions.GetByID(ctx, tenantID, id)
}

// Update applies a partial update to a requisition.
func (s *RequisitionService) Update(ctx context.Context, tenantID, id uuid.UUID, req UpdateRequisitionRequest) (*domain.Requisition, error) {
	r, err := s.requisitions.GetByID(ctx, tenantID, id)
	if err != nil {
		return nil, err
	}

	if req.Title != nil {
		r.Title = strings.TrimSpace(*req.Title)
	}
	if req.Description != nil {
		r.Description = strings.TrimSpace(*req.Description)
	}
	if req.Requirements != nil {
		v := strings.TrimSpace(*req.Requirements)
		r.Requirements = &v
	}
	if req.Headcount != nil {
		r.Headcount = *req.Headcount
	}
	if req.Location != nil {
		v := strings.TrimSpace(*req.Location)
		r.Location = &v
	}
	if req.EmploymentType != nil {
		et := domain.EmploymentType(*req.EmploymentType)
		if !et.IsValid() {
			return nil, domain.NewValidationError(map[string]string{"employment_type": "invalid"})
		}
		r.EmploymentType = et
	}
	if req.SalaryMin != nil {
		r.SalaryMin = req.SalaryMin
	}
	if req.SalaryMax != nil {
		r.SalaryMax = req.SalaryMax
	}
	if req.PositionID != nil {
		r.PositionID = req.PositionID
	}
	if req.HiringManagerID != nil {
		r.HiringManagerID = req.HiringManagerID
	}
	if req.RecruiterID != nil {
		r.RecruiterID = req.RecruiterID
	}

	if err := r.Validate(); err != nil {
		return nil, err
	}
	if err := s.requisitions.Update(ctx, r); err != nil {
		return nil, err
	}
	return r, nil
}

// Open transitions a requisition from draft to open. Emits ats.requisition.opened.v1.
func (s *RequisitionService) Open(ctx context.Context, tenantID, id uuid.UUID) (*domain.Requisition, error) {
	r, err := s.requisitions.GetByID(ctx, tenantID, id)
	if err != nil {
		return nil, err
	}
	if !r.CanTransition(domain.ReqStatusOpen) {
		return nil, domain.ErrInvalidReqTransition
	}
	now := time.Now().UTC()
	r.Status = domain.ReqStatusOpen
	r.OpenedAt = &now
	if err := s.requisitions.Update(ctx, r); err != nil {
		return nil, err
	}
	s.publish(ctx, event.TopicRequisitionOpened, map[string]any{
		"requisition_id":   r.ID,
		"tenant_id":        r.TenantID,
		"position_id":      r.PositionID,
		"headcount":        r.Headcount,
		"hiring_manager_id": r.HiringManagerID,
		"opened_at":        now,
	})
	return r, nil
}

// Hold transitions a requisition to on_hold.
func (s *RequisitionService) Hold(ctx context.Context, tenantID, id uuid.UUID) (*domain.Requisition, error) {
	r, err := s.requisitions.GetByID(ctx, tenantID, id)
	if err != nil {
		return nil, err
	}
	if !r.CanTransition(domain.ReqStatusOnHold) {
		return nil, domain.ErrInvalidReqTransition
	}
	r.Status = domain.ReqStatusOnHold
	if err := s.requisitions.Update(ctx, r); err != nil {
		return nil, err
	}
	return r, nil
}

// Close transitions a requisition to closed. Emits ats.requisition.closed.v1.
func (s *RequisitionService) Close(ctx context.Context, tenantID, id uuid.UUID, req CloseRequisitionRequest) (*domain.Requisition, error) {
	r, err := s.requisitions.GetByID(ctx, tenantID, id)
	if err != nil {
		return nil, err
	}
	if !r.CanTransition(domain.ReqStatusClosed) {
		return nil, domain.ErrInvalidReqTransition
	}
	now := time.Now().UTC()
	r.Status = domain.ReqStatusClosed
	r.ClosedAt = &now
	if err := s.requisitions.Update(ctx, r); err != nil {
		return nil, err
	}
	s.publish(ctx, event.TopicRequisitionClosed, map[string]any{
		"requisition_id": r.ID,
		"tenant_id":      r.TenantID,
		"reason":         req.Reason,
		"closed_at":      now,
	})
	return r, nil
}

// List returns a page of requisitions.
func (s *RequisitionService) List(ctx context.Context, f repository.RequisitionFilter) ([]*domain.Requisition, int, error) {
	return s.requisitions.List(ctx, f)
}

func (s *RequisitionService) publish(ctx context.Context, topic string, payload any) {
	if err := s.publisher.Publish(ctx, topic, payload); err != nil {
		s.log.Warn().Err(err).Str("topic", topic).Msg("publish event failed")
	}
}
