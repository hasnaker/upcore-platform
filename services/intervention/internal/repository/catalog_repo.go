package repository

import (
	"context"
	"database/sql"
	"errors"
	"fmt"
	"strings"
	"time"

	"github.com/google/uuid"
	"github.com/jmoiron/sqlx"

	"github.com/upcore/intervention/internal/domain"
)

// CatalogRepository abstracts persistence for intervention catalog entries.
type CatalogRepository interface {
	Create(ctx context.Context, i *domain.Intervention) error
	GetByID(ctx context.Context, id uuid.UUID) (*domain.Intervention, error)
	GetByCode(ctx context.Context, tenantID uuid.UUID, code string) (*domain.Intervention, error)
	Update(ctx context.Context, i *domain.Intervention) error
	List(ctx context.Context, f domain.CatalogFilter) ([]*domain.Intervention, int, error)
	ListByCategory(ctx context.Context, tenantID uuid.UUID, cat domain.Category) ([]*domain.Intervention, error)
	ListByDimension(ctx context.Context, tenantID uuid.UUID, driver string) ([]*domain.Intervention, error)
	ListActive(ctx context.Context, tenantID uuid.UUID) ([]*domain.Intervention, error)
	Search(ctx context.Context, tenantID uuid.UUID, q string, limit int) ([]*domain.Intervention, error)
}

type catalogRepo struct {
	db *sqlx.DB
}

// NewCatalogRepository constructs a CatalogRepository backed by sqlx.
func NewCatalogRepository(db *sqlx.DB) CatalogRepository {
	return &catalogRepo{db: db}
}

func (r *catalogRepo) Create(ctx context.Context, i *domain.Intervention) error {
	if i.ID == uuid.Nil {
		i.ID = uuid.New()
	}
	now := time.Now().UTC()
	i.CreatedAt = now
	i.UpdatedAt = now

	q := `INSERT INTO app.interventions (
		id, tenant_id, code, title_tr, title_en, description_tr, description_en,
		category, evidence_tier, target_drivers, target_burnout_band,
		delivery_mode, expected_effect_size, time_to_effect_weeks,
		duration_weeks, cost_tier, citations, active, created_at, updated_at
	) VALUES (
		:id, :tenant_id, :code, :title_tr, :title_en, :description_tr, :description_en,
		:category, :evidence_tier, :target_drivers, :target_burnout_band,
		:delivery_mode, :expected_effect_size, :time_to_effect_weeks,
		:duration_weeks, :cost_tier, :citations, :active, :created_at, :updated_at
	)`
	_, err := r.db.NamedExecContext(ctx, q, i)
	if err != nil {
		if strings.Contains(err.Error(), "23505") {
			return domain.ErrCodeTaken
		}
		return fmt.Errorf("insert intervention: %w", err)
	}
	return nil
}

func (r *catalogRepo) GetByID(ctx context.Context, id uuid.UUID) (*domain.Intervention, error) {
	var i domain.Intervention
	q := `SELECT * FROM app.interventions WHERE id = $1`
	if err := r.db.GetContext(ctx, &i, q, id); err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return nil, domain.ErrInterventionNotFound
		}
		return nil, fmt.Errorf("select intervention: %w", err)
	}
	return &i, nil
}

func (r *catalogRepo) GetByCode(ctx context.Context, tenantID uuid.UUID, code string) (*domain.Intervention, error) {
	var i domain.Intervention
	q := `SELECT * FROM app.interventions
		WHERE code = $1 AND (tenant_id = $2 OR tenant_id IS NULL)
		LIMIT 1`
	if err := r.db.GetContext(ctx, &i, q, code, tenantID); err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return nil, domain.ErrInterventionNotFound
		}
		return nil, fmt.Errorf("select intervention by code: %w", err)
	}
	return &i, nil
}

func (r *catalogRepo) Update(ctx context.Context, i *domain.Intervention) error {
	i.UpdatedAt = time.Now().UTC()
	q := `UPDATE app.interventions SET
		title_tr = :title_tr, title_en = :title_en,
		description_tr = :description_tr, description_en = :description_en,
		category = :category, evidence_tier = :evidence_tier,
		target_drivers = :target_drivers, target_burnout_band = :target_burnout_band,
		delivery_mode = :delivery_mode, expected_effect_size = :expected_effect_size,
		time_to_effect_weeks = :time_to_effect_weeks, duration_weeks = :duration_weeks,
		cost_tier = :cost_tier, active = :active, updated_at = :updated_at
	WHERE id = :id`
	res, err := r.db.NamedExecContext(ctx, q, i)
	if err != nil {
		return fmt.Errorf("update intervention: %w", err)
	}
	n, _ := res.RowsAffected()
	if n == 0 {
		return domain.ErrInterventionNotFound
	}
	return nil
}

func (r *catalogRepo) List(ctx context.Context, f domain.CatalogFilter) ([]*domain.Intervention, int, error) {
	if f.Limit <= 0 || f.Limit > 100 {
		f.Limit = 50
	}
	if f.Offset < 0 {
		f.Offset = 0
	}

	where := []string{"1=1"}
	args := []any{}
	idx := 1

	if f.Category != nil {
		where = append(where, fmt.Sprintf("category = $%d", idx))
		args = append(args, string(*f.Category))
		idx++
	}
	if f.EvidenceTier != nil {
		where = append(where, fmt.Sprintf("evidence_tier = $%d", idx))
		args = append(args, string(*f.EvidenceTier))
		idx++
	}
	if f.DeliveryMode != nil {
		where = append(where, fmt.Sprintf("delivery_mode = $%d", idx))
		args = append(args, string(*f.DeliveryMode))
		idx++
	}
	if f.ActiveOnly {
		where = append(where, "active = true")
	}
	if f.Search != "" {
		where = append(where, fmt.Sprintf("(title_tr ILIKE $%d OR description_tr ILIKE $%d OR code ILIKE $%d)", idx, idx, idx))
		args = append(args, "%"+f.Search+"%")
		idx++
	}
	if f.TargetDriver != nil {
		where = append(where, fmt.Sprintf("$%d = ANY(target_drivers)", idx))
		args = append(args, *f.TargetDriver)
		idx++
	}

	clause := strings.Join(where, " AND ")

	var total int
	if err := r.db.GetContext(ctx, &total, "SELECT COUNT(*) FROM app.interventions WHERE "+clause, args...); err != nil {
		return nil, 0, fmt.Errorf("count interventions: %w", err)
	}

	q := fmt.Sprintf("SELECT * FROM app.interventions WHERE %s ORDER BY evidence_tier, title_tr LIMIT $%d OFFSET $%d",
		clause, idx, idx+1)
	args = append(args, f.Limit, f.Offset)

	var rows []*domain.Intervention
	if err := r.db.SelectContext(ctx, &rows, q, args...); err != nil {
		return nil, 0, fmt.Errorf("list interventions: %w", err)
	}
	return rows, total, nil
}

func (r *catalogRepo) ListByCategory(ctx context.Context, tenantID uuid.UUID, cat domain.Category) ([]*domain.Intervention, error) {
	var rows []*domain.Intervention
	q := `SELECT * FROM app.interventions
		WHERE category = $1 AND (tenant_id = $2 OR tenant_id IS NULL) AND active = true
		ORDER BY evidence_tier, title_tr`
	if err := r.db.SelectContext(ctx, &rows, q, string(cat), tenantID); err != nil {
		return nil, fmt.Errorf("list by category: %w", err)
	}
	return rows, nil
}

func (r *catalogRepo) ListByDimension(ctx context.Context, tenantID uuid.UUID, driver string) ([]*domain.Intervention, error) {
	var rows []*domain.Intervention
	q := `SELECT * FROM app.interventions
		WHERE $1 = ANY(target_drivers) AND (tenant_id = $2 OR tenant_id IS NULL) AND active = true
		ORDER BY evidence_tier, title_tr`
	if err := r.db.SelectContext(ctx, &rows, q, driver, tenantID); err != nil {
		return nil, fmt.Errorf("list by dimension: %w", err)
	}
	return rows, nil
}

func (r *catalogRepo) ListActive(ctx context.Context, tenantID uuid.UUID) ([]*domain.Intervention, error) {
	var rows []*domain.Intervention
	q := `SELECT * FROM app.interventions
		WHERE (tenant_id = $1 OR tenant_id IS NULL) AND active = true
		ORDER BY evidence_tier, title_tr`
	if err := r.db.SelectContext(ctx, &rows, q, tenantID); err != nil {
		return nil, fmt.Errorf("list active: %w", err)
	}
	return rows, nil
}

func (r *catalogRepo) Search(ctx context.Context, tenantID uuid.UUID, q string, limit int) ([]*domain.Intervention, error) {
	if limit <= 0 || limit > 100 {
		limit = 20
	}
	var rows []*domain.Intervention
	query := `SELECT * FROM app.interventions
		WHERE (tenant_id = $1 OR tenant_id IS NULL)
		  AND (title_tr ILIKE '%' || $2 || '%' OR description_tr ILIKE '%' || $2 || '%' OR code ILIKE '%' || $2 || '%')
		ORDER BY evidence_tier, title_tr
		LIMIT $3`
	if err := r.db.SelectContext(ctx, &rows, query, tenantID, q, limit); err != nil {
		return nil, fmt.Errorf("search interventions: %w", err)
	}
	return rows, nil
}
