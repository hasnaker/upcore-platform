package repository

import (
	"context"
	"database/sql"
	"errors"
	"fmt"
	"time"

	"github.com/google/uuid"
	"github.com/jmoiron/sqlx"

	"github.com/upcore/tenant/internal/db"
	"github.com/upcore/tenant/internal/domain"
)

// SubscriptionRepository persists subscription records.
type SubscriptionRepository interface {
	Create(ctx context.Context, tx Querier, s *domain.Subscription) error
	GetByTenantID(ctx context.Context, tenantID uuid.UUID) (*domain.Subscription, error)
	GetByStripeID(ctx context.Context, stripeID string) (*domain.Subscription, error)
	Update(ctx context.Context, s *domain.Subscription) error
	Cancel(ctx context.Context, id uuid.UUID, at time.Time) error
}

type subscriptionRepo struct {
	db *sqlx.DB
}

// NewSubscriptionRepository creates a new subscription repository.
func NewSubscriptionRepository(d *sqlx.DB) SubscriptionRepository {
	return &subscriptionRepo{db: d}
}

func (r *subscriptionRepo) Create(ctx context.Context, tx Querier, s *domain.Subscription) error {
	if tx == nil {
		tx = r.db
	}
	if s.ID == uuid.Nil {
		s.ID = uuid.New()
	}
	now := time.Now().UTC()
	if s.CreatedAt.IsZero() {
		s.CreatedAt = now
	}
	s.UpdatedAt = now
	if _, err := tx.NamedExecContext(ctx, db.QInsertSubscription, s); err != nil {
		return fmt.Errorf("insert subscription: %w", err)
	}
	return nil
}

func (r *subscriptionRepo) GetByTenantID(ctx context.Context, tenantID uuid.UUID) (*domain.Subscription, error) {
	var s domain.Subscription
	if err := r.db.GetContext(ctx, &s, db.QSelectSubscriptionByTenant, tenantID); err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return nil, domain.ErrSubscriptionNotFound
		}
		return nil, fmt.Errorf("select subscription: %w", err)
	}
	return &s, nil
}

func (r *subscriptionRepo) GetByStripeID(ctx context.Context, stripeID string) (*domain.Subscription, error) {
	q := `
		SELECT id, tenant_id, plan_id, status, current_period_start, current_period_end,
			cancel_at, stripe_subscription_id, iyzico_subscription_id, seats, trial_ends_at,
			created_at, updated_at
		FROM subscriptions WHERE stripe_subscription_id = $1 LIMIT 1`
	var s domain.Subscription
	if err := r.db.GetContext(ctx, &s, q, stripeID); err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return nil, domain.ErrSubscriptionNotFound
		}
		return nil, fmt.Errorf("select subscription by stripe id: %w", err)
	}
	return &s, nil
}

func (r *subscriptionRepo) Update(ctx context.Context, s *domain.Subscription) error {
	s.UpdatedAt = time.Now().UTC()
	res, err := r.db.NamedExecContext(ctx, db.QUpdateSubscription, s)
	if err != nil {
		return fmt.Errorf("update subscription: %w", err)
	}
	n, _ := res.RowsAffected()
	if n == 0 {
		return domain.ErrSubscriptionNotFound
	}
	return nil
}

func (r *subscriptionRepo) Cancel(ctx context.Context, id uuid.UUID, at time.Time) error {
	res, err := r.db.ExecContext(ctx, db.QCancelSubscription, id, at.UTC())
	if err != nil {
		return fmt.Errorf("cancel subscription: %w", err)
	}
	n, _ := res.RowsAffected()
	if n == 0 {
		return domain.ErrSubscriptionNotFound
	}
	return nil
}
