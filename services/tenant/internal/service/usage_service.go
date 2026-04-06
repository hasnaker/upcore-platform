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

// UsageService tracks per-tenant usage counters.
type UsageService struct {
	usage     repository.UsageRepository
	subs      repository.SubscriptionRepository
	plans     repository.PlanRepository
	publisher event.Publisher
	log       zerolog.Logger
}

// NewUsageService constructs a UsageService.
func NewUsageService(
	usage repository.UsageRepository,
	subs repository.SubscriptionRepository,
	plans repository.PlanRepository,
	publisher event.Publisher,
	log zerolog.Logger,
) *UsageService {
	return &UsageService{usage: usage, subs: subs, plans: plans, publisher: publisher, log: log}
}

// IncrementEmployees adjusts the employees counter (delta may be negative).
func (u *UsageService) IncrementEmployees(ctx context.Context, tenantID uuid.UUID, delta int64) error {
	if err := u.usage.Increment(ctx, tenantID, domain.MetricEmployees, delta, time.Now().UTC()); err != nil {
		return err
	}
	if delta > 0 {
		u.checkSeatCap(ctx, tenantID)
	}
	return nil
}

// IncrementAssessments increments the assessments counter.
func (u *UsageService) IncrementAssessments(ctx context.Context, tenantID uuid.UUID, delta int64) error {
	return u.usage.Increment(ctx, tenantID, domain.MetricAssessments, delta, time.Now().UTC())
}

// IncrementStorage increments the storage_mb counter.
func (u *UsageService) IncrementStorage(ctx context.Context, tenantID uuid.UUID, deltaMB int64) error {
	return u.usage.Increment(ctx, tenantID, domain.MetricStorageMB, deltaMB, time.Now().UTC())
}

// CurrentUsage returns the map of metric -> value for the current period.
func (u *UsageService) CurrentUsage(ctx context.Context, tenantID uuid.UUID) (map[string]int64, error) {
	counters, err := u.usage.ListByTenant(ctx, tenantID, time.Now().UTC())
	if err != nil {
		return nil, err
	}
	out := make(map[string]int64, 4)
	for _, c := range counters {
		out[string(c.Metric)] = c.Value
	}
	return out, nil
}

// CheckSeatCap reports whether current employees is under plan cap.
func (u *UsageService) CheckSeatCap(ctx context.Context, tenantID uuid.UUID) (bool, error) {
	sub, err := u.subs.GetByTenantID(ctx, tenantID)
	if err != nil {
		return false, err
	}
	plan, err := u.plans.GetByID(ctx, sub.PlanID)
	if err != nil {
		return false, err
	}
	cap := int64(plan.SeatCap())
	if cap <= 0 {
		return true, nil
	}
	counter, err := u.usage.Get(ctx, tenantID, domain.MetricEmployees, time.Now().UTC())
	if err != nil {
		return false, err
	}
	return counter.Value < cap, nil
}

func (u *UsageService) checkSeatCap(ctx context.Context, tenantID uuid.UUID) {
	ok, err := u.CheckSeatCap(ctx, tenantID)
	if err != nil {
		u.log.Warn().Err(err).Str("tenant_id", tenantID.String()).Msg("check seat cap failed")
		return
	}
	if ok {
		return
	}
	sub, err := u.subs.GetByTenantID(ctx, tenantID)
	if err != nil {
		return
	}
	plan, err := u.plans.GetByID(ctx, sub.PlanID)
	if err != nil {
		return
	}
	_ = u.publisher.Publish(ctx, event.TopicSeatLimitReached, map[string]any{
		"tenant_id": tenantID,
		"plan_id":   plan.ID,
		"seat_cap":  plan.SeatCap(),
	})
}
