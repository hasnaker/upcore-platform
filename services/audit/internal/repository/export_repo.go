package repository

import (
	"context"
	"database/sql"
	"fmt"
	"time"

	"github.com/google/uuid"
	"github.com/jmoiron/sqlx"

	"github.com/upcore/audit/internal/domain"
)

// ExportRepository abstracts persistence for audit export requests.
type ExportRepository interface {
	Create(ctx context.Context, e *domain.Export) error
	GetByID(ctx context.Context, tenantID, id uuid.UUID) (*domain.Export, error)
	Update(ctx context.Context, e *domain.Export) error
	List(ctx context.Context, tenantID uuid.UUID, page, limit int) ([]*domain.Export, int, error)
}

type exportRepo struct {
	db *sqlx.DB
}

// NewExportRepository constructs an ExportRepository backed by sqlx.
func NewExportRepository(db *sqlx.DB) ExportRepository {
	return &exportRepo{db: db}
}

// Create inserts a new export request.
func (r *exportRepo) Create(ctx context.Context, e *domain.Export) error {
	if e.ID == uuid.Nil {
		e.ID = uuid.New()
	}
	if e.RequestedAt.IsZero() {
		e.RequestedAt = time.Now().UTC()
	}
	if e.Status == "" {
		e.Status = domain.ExportStatusPending
	}

	const q = `
		INSERT INTO audit_exports (
			id, tenant_id, requested_by, format, filter, status,
			row_count, file_url, requested_at, completed_at
		) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`
	_, err := r.db.ExecContext(ctx, q,
		e.ID, e.TenantID, e.RequestedBy, e.Format, e.Filter, e.Status,
		e.RowCount, e.FileURL, e.RequestedAt, e.CompletedAt,
	)
	if err != nil {
		return fmt.Errorf("insert export: %w", err)
	}
	return nil
}

// GetByID retrieves a single export.
func (r *exportRepo) GetByID(ctx context.Context, tenantID, id uuid.UUID) (*domain.Export, error) {
	const q = `SELECT * FROM audit_exports WHERE id = $1 AND tenant_id = $2`
	var e domain.Export
	if err := r.db.GetContext(ctx, &e, q, id, tenantID); err != nil {
		if err == sql.ErrNoRows {
			return nil, domain.ErrExportNotFound
		}
		return nil, fmt.Errorf("get export: %w", err)
	}
	return &e, nil
}

// Update persists changes to an export record.
func (r *exportRepo) Update(ctx context.Context, e *domain.Export) error {
	const q = `
		UPDATE audit_exports SET
			status = $1, row_count = $2, file_url = $3, completed_at = $4
		WHERE id = $5 AND tenant_id = $6`
	result, err := r.db.ExecContext(ctx, q,
		e.Status, e.RowCount, e.FileURL, e.CompletedAt,
		e.ID, e.TenantID,
	)
	if err != nil {
		return fmt.Errorf("update export: %w", err)
	}
	n, _ := result.RowsAffected()
	if n == 0 {
		return domain.ErrExportNotFound
	}
	return nil
}

// List returns a paginated list of exports for a tenant.
func (r *exportRepo) List(ctx context.Context, tenantID uuid.UUID, page, limit int) ([]*domain.Export, int, error) {
	if page < 1 {
		page = 1
	}
	if limit <= 0 || limit > 100 {
		limit = 20
	}
	offset := (page - 1) * limit

	var total int
	if err := r.db.GetContext(ctx, &total,
		`SELECT COUNT(*) FROM audit_exports WHERE tenant_id = $1`, tenantID); err != nil {
		return nil, 0, fmt.Errorf("count exports: %w", err)
	}

	var items []*domain.Export
	if err := r.db.SelectContext(ctx, &items,
		`SELECT * FROM audit_exports WHERE tenant_id = $1 ORDER BY requested_at DESC LIMIT $2 OFFSET $3`,
		tenantID, limit, offset); err != nil {
		return nil, 0, fmt.Errorf("list exports: %w", err)
	}
	return items, total, nil
}
