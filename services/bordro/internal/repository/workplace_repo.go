package repository

import (
	"context"
	"database/sql"
	"errors"
	"fmt"
	"time"

	"github.com/google/uuid"
	"github.com/jmoiron/sqlx"

	"github.com/upcore/bordrosvc/internal/domain"
)

// WorkplaceRepository abstracts app.tenant_sgk_workplaces.
type WorkplaceRepository interface {
	// GetActive returns the single active workplace for the tenant, if any.
	GetActive(ctx context.Context, tenantID uuid.UUID) (*domain.Workplace, error)
	// Upsert creates or replaces the tenant's active workplace row. Old active
	// rows are marked inactive in the same tx.
	Upsert(ctx context.Context, w *domain.Workplace) error
}

type workplaceRepo struct{ db *sqlx.DB }

// NewWorkplaceRepository constructs the repo.
func NewWorkplaceRepository(d *sqlx.DB) WorkplaceRepository { return &workplaceRepo{db: d} }

const workplaceCols = `id, tenant_id, sicil_no, unvan, vergi_dairesi, vergi_no,
	il, ilce, adres, kanun_turu, is_active, ebildirge_kullanici_adi,
	created_at, updated_at`

func (r *workplaceRepo) GetActive(ctx context.Context, tenantID uuid.UUID) (*domain.Workplace, error) {
	tx, err := beginTx(ctx, r.db, tenantID, true)
	if err != nil {
		return nil, err
	}
	defer func() { _ = tx.Rollback() }()
	var w domain.Workplace
	q := `SELECT ` + workplaceCols + ` FROM app.tenant_sgk_workplaces
	      WHERE tenant_id = $1 AND is_active = TRUE
	      LIMIT 1`
	if err := tx.GetContext(ctx, &w, q, tenantID); err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return nil, domain.ErrNotFound
		}
		return nil, fmt.Errorf("select workplace: %w", err)
	}
	return &w, nil
}

func (r *workplaceRepo) Upsert(ctx context.Context, w *domain.Workplace) error {
	w.ApplyDefaults()
	now := time.Now().UTC()
	if w.CreatedAt.IsZero() {
		w.CreatedAt = now
	}
	w.UpdatedAt = now
	tx, err := beginTx(ctx, r.db, w.TenantID, false)
	if err != nil {
		return err
	}
	defer func() { _ = tx.Rollback() }()

	// Mark previous active rows for this tenant as inactive
	// (respects the partial unique index on tenant_id WHERE is_active=TRUE).
	if _, err := tx.ExecContext(ctx,
		`UPDATE app.tenant_sgk_workplaces SET is_active = FALSE, updated_at = NOW()
		 WHERE tenant_id = $1 AND is_active = TRUE AND id <> $2`,
		w.TenantID, w.ID,
	); err != nil {
		return fmt.Errorf("deactivate prior: %w", err)
	}

	// Insert-or-update this row.
	var existingID uuid.UUID
	err = tx.GetContext(ctx, &existingID,
		`SELECT id FROM app.tenant_sgk_workplaces WHERE tenant_id = $1 AND sicil_no = $2`,
		w.TenantID, w.SicilNo)
	if err != nil && !errors.Is(err, sql.ErrNoRows) {
		return fmt.Errorf("lookup: %w", err)
	}
	if existingID != uuid.Nil {
		w.ID = existingID
		if _, err := tx.NamedExecContext(ctx,
			`UPDATE app.tenant_sgk_workplaces SET
				unvan = :unvan, vergi_dairesi = :vergi_dairesi, vergi_no = :vergi_no,
				il = :il, ilce = :ilce, adres = :adres,
				kanun_turu = :kanun_turu, is_active = :is_active,
				ebildirge_kullanici_adi = :ebildirge_kullanici_adi,
				updated_at = :updated_at
			 WHERE id = :id`, w); err != nil {
			return fmt.Errorf("update workplace: %w", err)
		}
	} else {
		w.IsActive = true
		if _, err := tx.NamedExecContext(ctx,
			`INSERT INTO app.tenant_sgk_workplaces (
				id, tenant_id, sicil_no, unvan, vergi_dairesi, vergi_no,
				il, ilce, adres, kanun_turu, is_active,
				ebildirge_kullanici_adi, created_at, updated_at
			) VALUES (
				:id, :tenant_id, :sicil_no, :unvan, :vergi_dairesi, :vergi_no,
				:il, :ilce, :adres, :kanun_turu, :is_active,
				:ebildirge_kullanici_adi, :created_at, :updated_at
			)`, w); err != nil {
			return fmt.Errorf("insert workplace: %w", err)
		}
	}
	return tx.Commit()
}
