package repository

import (
	"context"
	"fmt"

	"github.com/google/uuid"
	"github.com/jmoiron/sqlx"

	"github.com/upcore/mobility/internal/domain"
)

// CareerPathRepo persists career_paths + career_path_steps.
type CareerPathRepo struct{ db *sqlx.DB }

func NewCareerPathRepo(db *sqlx.DB) *CareerPathRepo { return &CareerPathRepo{db: db} }

// Create inserts a new career path (without steps).
func (r *CareerPathRepo) Create(ctx context.Context, p *domain.CareerPath) (*domain.CareerPath, error) {
	const q = `
		INSERT INTO app.career_paths (tenant_id, name_tr, description_tr, discipline, is_active)
		VALUES (:tenant_id, :name_tr, :description_tr, :discipline, :is_active)
		RETURNING id, created_at, updated_at;
	`
	rows, err := r.db.NamedQueryContext(ctx, q, p)
	if err != nil {
		return nil, fmt.Errorf("career_path insert: %w", err)
	}
	defer rows.Close()
	if rows.Next() {
		if err := rows.StructScan(p); err != nil {
			return nil, fmt.Errorf("career_path scan: %w", err)
		}
	}
	return p, nil
}

// ListActive returns active paths for a tenant, optionally filtered by discipline.
func (r *CareerPathRepo) ListActive(ctx context.Context, tenantID uuid.UUID, discipline string) ([]domain.CareerPath, error) {
	var (
		rows []domain.CareerPath
		err  error
	)
	if discipline == "" {
		err = r.db.SelectContext(ctx, &rows,
			`SELECT * FROM app.career_paths WHERE tenant_id=$1 AND is_active=true ORDER BY name_tr;`,
			tenantID)
	} else {
		err = r.db.SelectContext(ctx, &rows,
			`SELECT * FROM app.career_paths WHERE tenant_id=$1 AND is_active=true AND discipline=$2 ORDER BY name_tr;`,
			tenantID, discipline)
	}
	if err != nil {
		return nil, fmt.Errorf("career_path list: %w", err)
	}
	return rows, nil
}

// GetWithSteps loads a path and its ordered steps.
func (r *CareerPathRepo) GetWithSteps(ctx context.Context, tenantID, pathID uuid.UUID) (*domain.CareerPath, []domain.CareerPathStep, error) {
	var p domain.CareerPath
	if err := r.db.GetContext(ctx, &p,
		`SELECT * FROM app.career_paths WHERE tenant_id=$1 AND id=$2;`, tenantID, pathID); err != nil {
		return nil, nil, mapSQLErr(err)
	}

	var steps []domain.CareerPathStep
	if err := r.db.SelectContext(ctx, &steps,
		`SELECT * FROM app.career_path_steps WHERE path_id=$1 ORDER BY step_order ASC;`, pathID); err != nil {
		return nil, nil, fmt.Errorf("career_path steps: %w", err)
	}
	return &p, steps, nil
}

// AddStep appends a step (order must not collide within same path).
func (r *CareerPathRepo) AddStep(ctx context.Context, s *domain.CareerPathStep) (*domain.CareerPathStep, error) {
	const q = `
		INSERT INTO app.career_path_steps (path_id, step_order, position_id, title_tr, min_tenure_months, criteria_tr)
		VALUES (:path_id, :step_order, :position_id, :title_tr, :min_tenure_months, :criteria_tr)
		RETURNING id, created_at;
	`
	rows, err := r.db.NamedQueryContext(ctx, q, s)
	if err != nil {
		return nil, fmt.Errorf("career_path_step insert: %w", err)
	}
	defer rows.Close()
	if rows.Next() {
		if err := rows.StructScan(s); err != nil {
			return nil, fmt.Errorf("career_path_step scan: %w", err)
		}
	}
	return s, nil
}
