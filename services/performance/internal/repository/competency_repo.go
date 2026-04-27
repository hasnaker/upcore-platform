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

	"github.com/upcore/performance/internal/domain"
)

// CompetencyRepository abstracts app.competencies.
type CompetencyRepository interface {
	List(ctx context.Context, tenantID uuid.UUID, category string, activeOnly bool) ([]*domain.Competency, error)
	GetByCode(ctx context.Context, tenantID uuid.UUID, code string) (*domain.Competency, error)
	Upsert(ctx context.Context, c *domain.Competency) error
}

type competencyRepo struct{ db *sqlx.DB }

// NewCompetencyRepository constructs the repo.
func NewCompetencyRepository(d *sqlx.DB) CompetencyRepository { return &competencyRepo{db: d} }

const competencyCols = `id, tenant_id, code, name_tr, name_en, description_tr,
	category, applies_to, anchors, is_active, created_at, updated_at`

// List returns global competencies + any tenant-level overrides (tenant wins
// when the same code exists in both).
func (r *competencyRepo) List(ctx context.Context, tenantID uuid.UUID, category string, activeOnly bool) ([]*domain.Competency, error) {
	tx, err := beginTenantTx(ctx, r.db, tenantID, true)
	if err != nil {
		return nil, err
	}
	defer func() { _ = tx.Rollback() }()

	conds := "(tenant_id IS NULL OR tenant_id = $1)"
	args := []any{tenantID}
	i := 2
	if activeOnly {
		conds += " AND is_active = TRUE"
	}
	if strings.TrimSpace(category) != "" {
		conds += fmt.Sprintf(" AND category = $%d", i)
		args = append(args, category)
		i++
	}
	// DISTINCT ON (code) ORDER BY code, tenant_id NULLS LAST — tenant override wins.
	q := fmt.Sprintf(
		`SELECT DISTINCT ON (code) %s FROM app.competencies
		 WHERE %s
		 ORDER BY code, tenant_id NULLS LAST`,
		competencyCols, conds,
	)
	_ = i
	out := []*domain.Competency{}
	if err := tx.SelectContext(ctx, &out, q, args...); err != nil {
		return nil, fmt.Errorf("list competencies: %w", err)
	}
	return out, nil
}

func (r *competencyRepo) GetByCode(ctx context.Context, tenantID uuid.UUID, code string) (*domain.Competency, error) {
	tx, err := beginTenantTx(ctx, r.db, tenantID, true)
	if err != nil {
		return nil, err
	}
	defer func() { _ = tx.Rollback() }()
	var c domain.Competency
	q := `SELECT ` + competencyCols + ` FROM app.competencies
	      WHERE code = $1 AND (tenant_id IS NULL OR tenant_id = $2)
	      ORDER BY tenant_id NULLS LAST LIMIT 1`
	if err := tx.GetContext(ctx, &c, q, code, tenantID); err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return nil, domain.ErrNotFound
		}
		return nil, fmt.Errorf("get competency: %w", err)
	}
	return &c, nil
}

func (r *competencyRepo) Upsert(ctx context.Context, c *domain.Competency) error {
	c.ApplyDefaults()
	now := time.Now().UTC()
	if c.CreatedAt.IsZero() {
		c.CreatedAt = now
	}
	c.UpdatedAt = now
	// Tenant-level override: ensure tenant_id is set.
	tenantID := uuid.Nil
	if c.TenantID != nil {
		tenantID = *c.TenantID
	}
	if tenantID == uuid.Nil {
		return errors.New("tenant_id required for upsert (global seed UI'dan değişmez)")
	}
	tx, err := beginTenantTx(ctx, r.db, tenantID, false)
	if err != nil {
		return err
	}
	defer func() { _ = tx.Rollback() }()

	var existingID uuid.UUID
	err = tx.GetContext(ctx, &existingID,
		`SELECT id FROM app.competencies WHERE tenant_id = $1 AND code = $2`,
		tenantID, c.Code)
	if err != nil && !errors.Is(err, sql.ErrNoRows) {
		return fmt.Errorf("lookup: %w", err)
	}
	if existingID != uuid.Nil {
		c.ID = existingID
		if _, err := tx.NamedExecContext(ctx,
			`UPDATE app.competencies SET
				name_tr = :name_tr, name_en = :name_en, description_tr = :description_tr,
				category = :category, applies_to = :applies_to, anchors = :anchors,
				is_active = :is_active, updated_at = :updated_at
			 WHERE id = :id`, c); err != nil {
			return fmt.Errorf("update: %w", err)
		}
	} else {
		if _, err := tx.NamedExecContext(ctx,
			`INSERT INTO app.competencies (
				id, tenant_id, code, name_tr, name_en, description_tr,
				category, applies_to, anchors, is_active, created_at, updated_at
			) VALUES (
				:id, :tenant_id, :code, :name_tr, :name_en, :description_tr,
				:category, :applies_to, :anchors, :is_active, :created_at, :updated_at
			)`, c); err != nil {
			return fmt.Errorf("insert: %w", err)
		}
	}
	return tx.Commit()
}
