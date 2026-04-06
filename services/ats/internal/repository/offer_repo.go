package repository

import (
	"context"
	"database/sql"
	"errors"
	"fmt"
	"time"

	"github.com/google/uuid"
	"github.com/jmoiron/sqlx"

	"github.com/upcore/ats/internal/db"
	"github.com/upcore/ats/internal/domain"
)

// OfferRepository abstracts persistence for offers.
type OfferRepository interface {
	Create(ctx context.Context, o *domain.Offer) error
	GetByID(ctx context.Context, tenantID, id uuid.UUID) (*domain.Offer, error)
	Update(ctx context.Context, o *domain.Offer) error
	ListByApplication(ctx context.Context, applicationID uuid.UUID) ([]*domain.Offer, error)
	ExpireOverdue(ctx context.Context) (int, error)
}

type offerRepo struct {
	db *sqlx.DB
}

// NewOfferRepository constructs an OfferRepository backed by sqlx.
func NewOfferRepository(d *sqlx.DB) OfferRepository {
	return &offerRepo{db: d}
}

// Create inserts an offer.
func (r *offerRepo) Create(ctx context.Context, o *domain.Offer) error {
	if o.ID == uuid.Nil {
		o.ID = uuid.New()
	}
	if o.CreatedAt.IsZero() {
		o.CreatedAt = time.Now().UTC()
	}
	o.ApplyDefaults()

	_, err := r.db.NamedExecContext(ctx, db.QInsertOffer, o)
	if err != nil {
		return mapPqError(err)
	}
	return nil
}

// GetByID fetches an offer by ID, scoped to tenant.
func (r *offerRepo) GetByID(ctx context.Context, tenantID, id uuid.UUID) (*domain.Offer, error) {
	var o domain.Offer
	if err := r.db.GetContext(ctx, &o, db.QSelectOfferByID, id); err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return nil, domain.ErrOfferNotFound
		}
		return nil, fmt.Errorf("select offer: %w", err)
	}
	if o.TenantID != tenantID {
		return nil, domain.ErrOfferNotFound
	}
	return &o, nil
}

// Update persists changes to an offer.
func (r *offerRepo) Update(ctx context.Context, o *domain.Offer) error {
	res, err := r.db.NamedExecContext(ctx, db.QUpdateOffer, o)
	if err != nil {
		return mapPqError(err)
	}
	n, _ := res.RowsAffected()
	if n == 0 {
		return domain.ErrOfferNotFound
	}
	return nil
}

// ListByApplication returns offers for an application.
func (r *offerRepo) ListByApplication(ctx context.Context, applicationID uuid.UUID) ([]*domain.Offer, error) {
	rows := []*domain.Offer{}
	if err := r.db.SelectContext(ctx, &rows, db.QSelectOffersByApplication, applicationID); err != nil {
		return nil, fmt.Errorf("list offers: %w", err)
	}
	return rows, nil
}

// ExpireOverdue marks sent offers past their expiry date as expired.
func (r *offerRepo) ExpireOverdue(ctx context.Context) (int, error) {
	q := `UPDATE app.offers SET status = 'expired', responded_at = $1
		WHERE status = 'sent' AND expiry_date < $1`
	now := time.Now().UTC()
	res, err := r.db.ExecContext(ctx, q, now)
	if err != nil {
		return 0, fmt.Errorf("expire overdue: %w", err)
	}
	n, _ := res.RowsAffected()
	return int(n), nil
}
