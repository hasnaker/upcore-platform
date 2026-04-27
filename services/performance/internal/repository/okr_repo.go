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

// OKRListFilter is the keyset filter for OKR paginated lists.
type OKRListFilter struct {
	TenantID        uuid.UUID
	CycleID         uuid.UUID
	OwnerType       string
	OwnerID         uuid.UUID
	CursorCreatedAt *time.Time
	CursorID        *uuid.UUID
	Limit           int
}

// OKRRepository abstracts app.okrs + okr_key_results.
type OKRRepository interface {
	Create(ctx context.Context, o *domain.OKR, krs []domain.OKRKeyResult) error
	UpdateOKR(ctx context.Context, o *domain.OKR) error
	GetByID(ctx context.Context, tenantID, id uuid.UUID) (*domain.OKR, error)
	List(ctx context.Context, tenantID, cycleID uuid.UUID, ownerType string, ownerID uuid.UUID) ([]*domain.OKR, error)
	ListPaged(ctx context.Context, f OKRListFilter) ([]*domain.OKR, error)
	UpsertKR(ctx context.Context, tenantID uuid.UUID, kr *domain.OKRKeyResult) error
}

type okrRepo struct{ db *sqlx.DB }

// NewOKRRepository constructs the repository.
func NewOKRRepository(d *sqlx.DB) OKRRepository { return &okrRepo{db: d} }

const okrCols = `id, tenant_id, cycle_id, owner_type, owner_id, parent_okr_id,
	objective_tr, description, quarter_label, confidence_score, status, progress_pct,
	created_by, created_at, updated_at`

const krCols = `id, okr_id, title_tr, metric_type, start_value, target_value, current_value,
	unit, owner_id, progress_pct, confidence_score, status, order_index, created_at, updated_at`

const qInsertKR = `INSERT INTO app.okr_key_results (
	id, okr_id, title_tr, metric_type, start_value, target_value, current_value,
	unit, owner_id, progress_pct, confidence_score, status, order_index, created_at, updated_at
) VALUES (
	:id, :okr_id, :title_tr, :metric_type, :start_value, :target_value, :current_value,
	:unit, :owner_id, :progress_pct, :confidence_score, :status, :order_index, :created_at, :updated_at
)`

func (r *okrRepo) Create(ctx context.Context, o *domain.OKR, krs []domain.OKRKeyResult) error {
	o.ApplyDefaults()
	now := time.Now().UTC()
	if o.CreatedAt.IsZero() {
		o.CreatedAt = now
	}
	o.UpdatedAt = now
	tx, err := beginTenantTx(ctx, r.db, o.TenantID, false)
	if err != nil {
		return err
	}
	defer func() { _ = tx.Rollback() }()
	q := `INSERT INTO app.okrs (
		id, tenant_id, cycle_id, owner_type, owner_id, parent_okr_id,
		objective_tr, description, quarter_label, confidence_score, status, progress_pct,
		created_by, created_at, updated_at
	) VALUES (
		:id, :tenant_id, :cycle_id, :owner_type, :owner_id, :parent_okr_id,
		:objective_tr, :description, :quarter_label, :confidence_score, :status, :progress_pct,
		:created_by, :created_at, :updated_at
	)`
	if _, err := tx.NamedExecContext(ctx, q, o); err != nil {
		return fmt.Errorf("insert okr: %w", err)
	}
	for i := range krs {
		krs[i].OKRID = o.ID
		krs[i].ApplyDefaults()
		if krs[i].CreatedAt.IsZero() {
			krs[i].CreatedAt = now
		}
		krs[i].UpdatedAt = now
		if _, err := tx.NamedExecContext(ctx, qInsertKR, krs[i]); err != nil {
			return fmt.Errorf("insert kr: %w", err)
		}
	}
	if err := tx.Commit(); err != nil {
		return err
	}
	o.KeyResults = krs
	return nil
}

func (r *okrRepo) UpdateOKR(ctx context.Context, o *domain.OKR) error {
	o.UpdatedAt = time.Now().UTC()
	tx, err := beginTenantTx(ctx, r.db, o.TenantID, false)
	if err != nil {
		return err
	}
	defer func() { _ = tx.Rollback() }()
	res, err := tx.NamedExecContext(ctx,
		`UPDATE app.okrs SET
			objective_tr = :objective_tr, description = :description,
			quarter_label = :quarter_label, confidence_score = :confidence_score,
			status = :status, progress_pct = :progress_pct,
			updated_at = :updated_at
		 WHERE tenant_id = :tenant_id AND id = :id`, o)
	if err != nil {
		return fmt.Errorf("update okr: %w", err)
	}
	n, _ := res.RowsAffected()
	if n == 0 {
		return domain.ErrNotFound
	}
	return tx.Commit()
}

func (r *okrRepo) GetByID(ctx context.Context, tenantID, id uuid.UUID) (*domain.OKR, error) {
	tx, err := beginTenantTx(ctx, r.db, tenantID, true)
	if err != nil {
		return nil, err
	}
	defer func() { _ = tx.Rollback() }()
	var o domain.OKR
	q := `SELECT ` + okrCols + ` FROM app.okrs WHERE tenant_id = $1 AND id = $2`
	if err := tx.GetContext(ctx, &o, q, tenantID, id); err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return nil, domain.ErrNotFound
		}
		return nil, fmt.Errorf("select okr: %w", err)
	}
	krs := []domain.OKRKeyResult{}
	if err := tx.SelectContext(ctx, &krs,
		`SELECT `+krCols+` FROM app.okr_key_results WHERE okr_id = $1 ORDER BY order_index`,
		id); err != nil {
		return nil, fmt.Errorf("select krs: %w", err)
	}
	o.KeyResults = krs
	return &o, nil
}

func (r *okrRepo) List(ctx context.Context, tenantID, cycleID uuid.UUID, ownerType string, ownerID uuid.UUID) ([]*domain.OKR, error) {
	tx, err := beginTenantTx(ctx, r.db, tenantID, true)
	if err != nil {
		return nil, err
	}
	defer func() { _ = tx.Rollback() }()
	conds := []string{"tenant_id = $1"}
	args := []any{tenantID}
	i := 2
	if cycleID != uuid.Nil {
		conds = append(conds, fmt.Sprintf("cycle_id = $%d", i))
		args = append(args, cycleID)
		i++
	}
	if s := strings.TrimSpace(ownerType); s != "" {
		conds = append(conds, fmt.Sprintf("owner_type = $%d", i))
		args = append(args, s)
		i++
	}
	if ownerID != uuid.Nil {
		conds = append(conds, fmt.Sprintf("owner_id = $%d", i))
		args = append(args, ownerID)
		i++
	}
	q := fmt.Sprintf("SELECT %s FROM app.okrs WHERE %s ORDER BY created_at DESC",
		okrCols, strings.Join(conds, " AND "))
	out := []*domain.OKR{}
	if err := tx.SelectContext(ctx, &out, q, args...); err != nil {
		return nil, fmt.Errorf("list okrs: %w", err)
	}
	return out, nil
}

// ListPaged is the keyset variant of List. Ordering: (created_at DESC, id DESC).
func (r *okrRepo) ListPaged(ctx context.Context, f OKRListFilter) ([]*domain.OKR, error) {
	limit := f.Limit
	if limit <= 0 || limit > 200 {
		limit = 50
	}
	tx, err := beginTenantTx(ctx, r.db, f.TenantID, true)
	if err != nil {
		return nil, err
	}
	defer func() { _ = tx.Rollback() }()
	conds := []string{"tenant_id = $1"}
	args := []any{f.TenantID}
	i := 2
	if f.CycleID != uuid.Nil {
		conds = append(conds, fmt.Sprintf("cycle_id = $%d", i))
		args = append(args, f.CycleID)
		i++
	}
	if s := strings.TrimSpace(f.OwnerType); s != "" {
		conds = append(conds, fmt.Sprintf("owner_type = $%d", i))
		args = append(args, s)
		i++
	}
	if f.OwnerID != uuid.Nil {
		conds = append(conds, fmt.Sprintf("owner_id = $%d", i))
		args = append(args, f.OwnerID)
		i++
	}
	if f.CursorCreatedAt != nil && f.CursorID != nil {
		conds = append(conds, fmt.Sprintf("(created_at, id) < ($%d, $%d)", i, i+1))
		args = append(args, *f.CursorCreatedAt, *f.CursorID)
		i += 2
	}
	q := fmt.Sprintf(
		"SELECT %s FROM app.okrs WHERE %s ORDER BY created_at DESC, id DESC LIMIT $%d",
		okrCols, strings.Join(conds, " AND "), i,
	)
	args = append(args, limit)
	out := []*domain.OKR{}
	if err := tx.SelectContext(ctx, &out, q, args...); err != nil {
		return nil, fmt.Errorf("list okrs: %w", err)
	}
	return out, nil
}

func (r *okrRepo) UpsertKR(ctx context.Context, tenantID uuid.UUID, kr *domain.OKRKeyResult) error {
	kr.ApplyDefaults()
	now := time.Now().UTC()
	if kr.CreatedAt.IsZero() {
		kr.CreatedAt = now
	}
	kr.UpdatedAt = now
	tx, err := beginTenantTx(ctx, r.db, tenantID, false)
	if err != nil {
		return err
	}
	defer func() { _ = tx.Rollback() }()
	// If the KR exists, update; else insert.
	var existing uuid.UUID
	_ = tx.GetContext(ctx, &existing, `SELECT id FROM app.okr_key_results WHERE id = $1`, kr.ID)
	if existing == uuid.Nil {
		if _, err := tx.NamedExecContext(ctx, qInsertKR, kr); err != nil {
			return fmt.Errorf("insert kr: %w", err)
		}
	} else {
		if _, err := tx.NamedExecContext(ctx,
			`UPDATE app.okr_key_results SET
				title_tr = :title_tr, metric_type = :metric_type,
				start_value = :start_value, target_value = :target_value, current_value = :current_value,
				unit = :unit, owner_id = :owner_id,
				progress_pct = :progress_pct, confidence_score = :confidence_score,
				status = :status, order_index = :order_index, updated_at = :updated_at
			 WHERE id = :id`, kr); err != nil {
			return fmt.Errorf("update kr: %w", err)
		}
	}
	return tx.Commit()
}
