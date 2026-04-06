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

// StageRepository abstracts persistence for pipeline stages.
type StageRepository interface {
	Create(ctx context.Context, s *domain.PipelineStage) error
	GetByID(ctx context.Context, tenantID, id uuid.UUID) (*domain.PipelineStage, error)
	Update(ctx context.Context, s *domain.PipelineStage) error
	ListByTenant(ctx context.Context, tenantID uuid.UUID) ([]*domain.PipelineStage, error)
	Reorder(ctx context.Context, tenantID uuid.UUID, order []uuid.UUID) error
	SeedDefaults(ctx context.Context, tenantID uuid.UUID) error
}

type stageRepo struct {
	db *sqlx.DB
}

// NewStageRepository constructs a StageRepository backed by sqlx.
func NewStageRepository(d *sqlx.DB) StageRepository {
	return &stageRepo{db: d}
}

// Create inserts a pipeline stage.
func (r *stageRepo) Create(ctx context.Context, s *domain.PipelineStage) error {
	if s.ID == uuid.Nil {
		s.ID = uuid.New()
	}
	_, err := r.db.NamedExecContext(ctx, db.QInsertPipelineStage, s)
	if err != nil {
		return mapPqError(err)
	}
	return nil
}

// GetByID fetches a pipeline stage by ID, scoped to tenant.
func (r *stageRepo) GetByID(ctx context.Context, tenantID, id uuid.UUID) (*domain.PipelineStage, error) {
	var s domain.PipelineStage
	if err := r.db.GetContext(ctx, &s, db.QSelectPipelineStageByID, id); err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return nil, domain.ErrStageNotFound
		}
		return nil, fmt.Errorf("select stage: %w", err)
	}
	if s.TenantID != tenantID {
		return nil, domain.ErrStageNotFound
	}
	return &s, nil
}

// Update persists changes to a pipeline stage (only non-system stages).
func (r *stageRepo) Update(ctx context.Context, s *domain.PipelineStage) error {
	res, err := r.db.NamedExecContext(ctx, db.QUpdatePipelineStage, s)
	if err != nil {
		return mapPqError(err)
	}
	n, _ := res.RowsAffected()
	if n == 0 {
		return domain.ErrStageNotFound
	}
	return nil
}

// ListByTenant returns all pipeline stages for a tenant, ordered by order_index.
func (r *stageRepo) ListByTenant(ctx context.Context, tenantID uuid.UUID) ([]*domain.PipelineStage, error) {
	rows := []*domain.PipelineStage{}
	if err := r.db.SelectContext(ctx, &rows, db.QSelectPipelineStagesByTenant, tenantID); err != nil {
		return nil, fmt.Errorf("list stages: %w", err)
	}
	return rows, nil
}

// Reorder updates the order_index of each stage by its position in the order slice.
func (r *stageRepo) Reorder(ctx context.Context, tenantID uuid.UUID, order []uuid.UUID) error {
	tx, err := r.db.BeginTxx(ctx, nil)
	if err != nil {
		return fmt.Errorf("begin tx: %w", err)
	}
	defer func() { _ = tx.Rollback() }()

	q := `UPDATE app.pipeline_stages SET order_index = $1 WHERE id = $2 AND tenant_id = $3`
	for i, id := range order {
		if _, err := tx.ExecContext(ctx, q, i, id, tenantID); err != nil {
			return fmt.Errorf("reorder stage %s: %w", id, err)
		}
	}
	return tx.Commit()
}

// SeedDefaults creates the system stages for a new tenant.
func (r *stageRepo) SeedDefaults(ctx context.Context, tenantID uuid.UUID) error {
	// Check if stages already exist.
	var count int
	if err := r.db.GetContext(ctx, &count,
		`SELECT COUNT(*) FROM app.pipeline_stages WHERE tenant_id = $1`, tenantID); err != nil {
		return fmt.Errorf("check existing stages: %w", err)
	}
	if count > 0 {
		return nil
	}

	now := time.Now().UTC()
	_ = now
	for _, ss := range domain.SystemStages {
		s := &domain.PipelineStage{
			ID:         uuid.New(),
			TenantID:   tenantID,
			Name:       ss.Name,
			OrderIndex: ss.Order,
			IsSystem:   true,
			IsTerminal: ss.IsTerminal,
		}
		if err := r.Create(ctx, s); err != nil {
			return fmt.Errorf("seed stage %s: %w", ss.Name, err)
		}
	}
	return nil
}
