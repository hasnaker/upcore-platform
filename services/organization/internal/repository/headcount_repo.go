package repository

import (
	"context"
	"fmt"
	"time"

	"github.com/google/uuid"
	"github.com/jmoiron/sqlx"

	"github.com/upcore/organization/internal/domain"
)

// HeadcountRepository persists headcount snapshots.
type HeadcountRepository interface {
	UpsertSnapshot(ctx context.Context, tx Querier, s *domain.HeadcountSnapshot) error
	GetByDate(ctx context.Context, tenantID uuid.UUID, snapshotDate time.Time) ([]*domain.HeadcountSnapshot, error)
	GetLatestByTenant(ctx context.Context, tenantID uuid.UUID) ([]*domain.HeadcountSnapshot, error)
	GetTrend(ctx context.Context, tenantID uuid.UUID, departmentID *uuid.UUID, months int) ([]*domain.HeadcountSnapshot, error)
}

type headcountRepo struct{ db *sqlx.DB }

// NewHeadcountRepository creates a HeadcountRepository.
func NewHeadcountRepository(d *sqlx.DB) HeadcountRepository {
	return &headcountRepo{db: d}
}

const qUpsertSnapshot = `
	INSERT INTO app.headcount_snapshots (tenant_id, department_id, snapshot_date, total_count, active_count, terminated_count, created_at)
	VALUES (:tenant_id, :department_id, :snapshot_date, :total_count, :active_count, :terminated_count, :created_at)
	ON CONFLICT (tenant_id, department_id, snapshot_date) DO UPDATE SET
	  total_count = EXCLUDED.total_count,
	  active_count = EXCLUDED.active_count,
	  terminated_count = EXCLUDED.terminated_count`

func (r *headcountRepo) UpsertSnapshot(ctx context.Context, tx Querier, s *domain.HeadcountSnapshot) error {
	q := r.qr(tx)
	if _, err := q.NamedExecContext(ctx, qUpsertSnapshot, s); err != nil {
		return fmt.Errorf("upsert snapshot: %w", err)
	}
	return nil
}

func (r *headcountRepo) GetByDate(ctx context.Context, tenantID uuid.UUID, snapshotDate time.Time) ([]*domain.HeadcountSnapshot, error) {
	q := `SELECT tenant_id, department_id, snapshot_date, total_count, active_count, terminated_count, created_at
	      FROM app.headcount_snapshots WHERE tenant_id = $1 AND snapshot_date = $2`
	var out []*domain.HeadcountSnapshot
	if err := r.db.SelectContext(ctx, &out, q, tenantID, snapshotDate); err != nil {
		return nil, fmt.Errorf("get snapshots: %w", err)
	}
	return out, nil
}

func (r *headcountRepo) GetLatestByTenant(ctx context.Context, tenantID uuid.UUID) ([]*domain.HeadcountSnapshot, error) {
	q := `
		SELECT tenant_id, department_id, snapshot_date, total_count, active_count, terminated_count, created_at
		FROM app.headcount_snapshots
		WHERE tenant_id = $1
		  AND snapshot_date = (SELECT max(snapshot_date) FROM app.headcount_snapshots WHERE tenant_id = $1)`
	var out []*domain.HeadcountSnapshot
	if err := r.db.SelectContext(ctx, &out, q, tenantID); err != nil {
		return nil, fmt.Errorf("get latest snapshots: %w", err)
	}
	return out, nil
}

func (r *headcountRepo) GetTrend(ctx context.Context, tenantID uuid.UUID, departmentID *uuid.UUID, months int) ([]*domain.HeadcountSnapshot, error) {
	if months <= 0 {
		months = 12
	}
	cutoff := time.Now().AddDate(0, -months, 0)
	q := `
		SELECT tenant_id, department_id, snapshot_date, total_count, active_count, terminated_count, created_at
		FROM app.headcount_snapshots
		WHERE tenant_id = $1 AND snapshot_date >= $2`
	args := []any{tenantID, cutoff}
	if departmentID != nil {
		q += ` AND department_id = $3`
		args = append(args, *departmentID)
	}
	q += ` ORDER BY snapshot_date`
	var out []*domain.HeadcountSnapshot
	if err := r.db.SelectContext(ctx, &out, q, args...); err != nil {
		return nil, fmt.Errorf("get trend: %w", err)
	}
	return out, nil
}

func (r *headcountRepo) qr(tx Querier) Querier {
	if tx != nil {
		return tx
	}
	return r.db
}
