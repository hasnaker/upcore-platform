package service

import (
	"context"
	"time"

	"github.com/google/uuid"
	"github.com/rs/zerolog"

	"github.com/upcore/tenant/internal/domain"
	"github.com/upcore/tenant/internal/event"
	"github.com/upcore/tenant/internal/repository"
)

// SubscriptionService manages plan changes and cancellations.
type SubscriptionService struct {
	plans     repository.PlanRepository
	subs      repository.SubscriptionRepository
	publisher event.Publisher
	log       zerolog.Logger
}

// NewSubscriptionService constructs a SubscriptionService.
func NewSubscriptionService(
	plans repository.PlanRepository,
	subs repository.SubscriptionRepository,
	publisher event.Publisher,
	log zerolog.Logger,
) *SubscriptionService {
	return &SubscriptionService{plans: plans, subs: subs, publisher: publisher, log: log}
}

// SubscriptionView combines subscription and plan for the API.
type SubscriptionView struct {
	Subscription *domain.Subscription `json:"subscription"`
	Plan         *domain.Plan         `json:"plan"`
}

// GetCurrent returns the subscription and its plan for the tenant.
func (s *SubscriptionService) GetCurrent(ctx context.Context, tenantID uuid.UUID) (*SubscriptionView, error) {
	sub, err := s.subs.GetByTenantID(ctx, tenantID)
	if err != nil {
		return nil, err
	}
	plan, err := s.plans.GetByID(ctx, sub.PlanID)
	if err != nil {
		return nil, err
	}
	return &SubscriptionView{Subscription: sub, Plan: plan}, nil
}

// ChangePlan switches the tenant's subscription to a new plan.
func (s *SubscriptionService) ChangePlan(ctx context.Context, tenantID uuid.UUID, newPlanID string) (*SubscriptionView, error) {
	sub, err := s.subs.GetByTenantID(ctx, tenantID)
	if err != nil {
		return nil, err
	}
	if sub.IsCanceled() {
		return nil, domain.ErrAlreadyCanceled
	}
	newPlan, err := s.plans.GetByID(ctx, newPlanID)
	if err != nil {
		return nil, err
	}
	if !newPlan.IsActive {
		return nil, domain.ErrPlanNotFound
	}
	oldPlanID := sub.PlanID
	sub.PlanID = newPlan.ID
	// When upgrading out of trial, flip to active.
	if sub.Status == domain.SubStatusTrialing {
		sub.Status = domain.SubStatusActive
	}
	if err := s.subs.Update(ctx, sub); err != nil {
		return nil, err
	}
	_ = s.publisher.Publish(ctx, event.TopicTenantUpgraded, map[string]any{
		"tenant_id":   tenantID,
		"old_plan_id": oldPlanID,
		"new_plan_id": newPlan.ID,
		"changed_at":  time.Now().UTC(),
	})
	return &SubscriptionView{Subscription: sub, Plan: newPlan}, nil
}

// Cancel schedules cancellation at period end.
func (s *SubscriptionService) Cancel(ctx context.Context, tenantID uuid.UUID) (*domain.Subscription, error) {
	sub, err := s.subs.GetByTenantID(ctx, tenantID)
	if err != nil {
		return nil, err
	}
	if sub.IsCanceled() {
		return nil, domain.ErrAlreadyCanceled
	}
	cancelAt := sub.CurrentPeriodEnd
	if err := s.subs.Cancel(ctx, sub.ID, cancelAt); err != nil {
		return nil, err
	}
	sub.Status = domain.SubStatusCanceled
	sub.CancelAt = &cancelAt
	_ = s.publisher.Publish(ctx, event.TopicTenantCancelled, map[string]any{
		"tenant_id":     tenantID,
		"subscription_id": sub.ID,
		"cancel_at":     cancelAt,
		"canceled_at":   time.Now().UTC(),
	})
	return sub, nil
}

// Resume reverses a pending cancellation (only when status == canceled and cancel_at in future).
func (s *SubscriptionService) Resume(ctx context.Context, tenantID uuid.UUID) (*domain.Subscription, error) {
	sub, err := s.subs.GetByTenantID(ctx, tenantID)
	if err != nil {
		return nil, err
	}
	if !sub.IsCanceled() || sub.CancelAt == nil || sub.CancelAt.Before(time.Now()) {
		return nil, domain.ErrValidation
	}
	sub.Status = domain.SubStatusActive
	sub.CancelAt = nil
	if err := s.subs.Update(ctx, sub); err != nil {
		return nil, err
	}
	return sub, nil
}

// UpdateSeats updates the subscription seat count, respecting plan cap.
func (s *SubscriptionService) UpdateSeats(ctx context.Context, tenantID uuid.UUID, seats int) (*domain.Subscription, error) {
	if seats < 0 {
		return nil, domain.ErrValidation
	}
	sub, err := s.subs.GetByTenantID(ctx, tenantID)
	if err != nil {
		return nil, err
	}
	plan, err := s.plans.GetByID(ctx, sub.PlanID)
	if err != nil {
		return nil, err
	}
	if !plan.CanAddSeats(seats) {
		return nil, domain.ErrSeatCapReached
	}
	sub.Seats = seats
	if err := s.subs.Update(ctx, sub); err != nil {
		return nil, err
	}
	return sub, nil
}
