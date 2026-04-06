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

	"github.com/upcore/document/internal/domain"
)

// ListFilters narrows document list queries.
type ListFilters struct {
	OwnerEmployeeID    *uuid.UUID
	Category           *domain.DocType
	IsSigned           *bool
	Search             string
	ExpiringWithinDays *int
	IncludeDeleted     bool
	Page               int
	Limit              int
}

// DocumentRepository persists documents.
type DocumentRepository interface {
	Create(ctx context.Context, d *domain.Document) error
	GetByID(ctx context.Context, tenantID, id uuid.UUID) (*domain.Document, error)
	List(ctx context.Context, tenantID uuid.UUID, f ListFilters) ([]*domain.Document, int, error)
	Update(ctx context.Context, d *domain.Document) error
	UpdateCurrentVersion(ctx context.Context, tenantID, id uuid.UUID, version int) error
	UpdateSignature(ctx context.Context, tenantID, id, signedBy uuid.UUID, signedAt time.Time) error
	SoftDelete(ctx context.Context, tenantID, id, deletedBy uuid.UUID) error
	HardDelete(ctx context.Context, tenantID, id uuid.UUID) error
	ListExpiring(ctx context.Context, within int) ([]*domain.Document, error)
	ListExpiredForPurge(ctx context.Context) ([]*domain.Document, error)
}

type documentRepo struct {
	db *sqlx.DB
}

// NewDocumentRepository constructs a DocumentRepository.
func NewDocumentRepository(db *sqlx.DB) DocumentRepository {
	return &documentRepo{db: db}
}

const qInsertDocument = `
INSERT INTO app.documents
  (id, tenant_id, owner_employee_id, owner_user_id, category, title, description,
   current_version, tags, is_confidential, retention_until, signed_at, signed_by,
   metadata, created_at, updated_at)
VALUES
  (:id, :tenant_id, :owner_employee_id, :owner_user_id, :category, :title, :description,
   :current_version, :tags, :is_confidential, :retention_until, :signed_at, :signed_by,
   :metadata, :created_at, :updated_at)`

const qSelectDocumentByID = `
SELECT id, tenant_id, owner_employee_id, owner_user_id, category, title, description,
       current_version, tags, is_confidential, retention_until, signed_at, signed_by,
       metadata, created_at, updated_at, deleted_at
FROM app.documents
WHERE tenant_id = $1 AND id = $2 AND deleted_at IS NULL`

const qUpdateDocumentMeta = `
UPDATE app.documents
SET title = :title,
    description = :description,
    tags = :tags,
    is_confidential = :is_confidential,
    retention_until = :retention_until,
    metadata = :metadata,
    updated_at = :updated_at
WHERE tenant_id = :tenant_id AND id = :id AND deleted_at IS NULL`

const qUpdateCurrentVersion = `
UPDATE app.documents
SET current_version = $3, updated_at = now()
WHERE tenant_id = $1 AND id = $2 AND deleted_at IS NULL`

const qSoftDeleteDocument = `
UPDATE app.documents
SET deleted_at = now(), updated_at = now()
WHERE tenant_id = $1 AND id = $2 AND deleted_at IS NULL`

const qHardDeleteDocument = `
DELETE FROM app.documents
WHERE tenant_id = $1 AND id = $2`

const qSetSigned = `
UPDATE app.documents
SET signed_at = $3, signed_by = $4, updated_at = now()
WHERE tenant_id = $1 AND id = $2 AND deleted_at IS NULL`

const qListExpiring = `
SELECT id, tenant_id, owner_employee_id, owner_user_id, category, title, description,
       current_version, tags, is_confidential, retention_until, signed_at, signed_by,
       metadata, created_at, updated_at, deleted_at
FROM app.documents
WHERE deleted_at IS NULL
  AND retention_until IS NOT NULL
  AND retention_until >= CURRENT_DATE
  AND retention_until <= (CURRENT_DATE + ($1 || ' days')::interval)::date
ORDER BY retention_until ASC`

const qListExpiredForPurge = `
SELECT id, tenant_id, owner_employee_id, owner_user_id, category, title, description,
       current_version, tags, is_confidential, retention_until, signed_at, signed_by,
       metadata, created_at, updated_at, deleted_at
FROM app.documents
WHERE retention_until IS NOT NULL
  AND retention_until < CURRENT_DATE
ORDER BY retention_until ASC
LIMIT 500`

// Create inserts a new document row.
func (r *documentRepo) Create(ctx context.Context, d *domain.Document) error {
	if d.ID == uuid.Nil {
		d.ID = uuid.New()
	}
	now := time.Now().UTC()
	if d.CreatedAt.IsZero() {
		d.CreatedAt = now
	}
	d.UpdatedAt = now
	if d.CurrentVersion <= 0 {
		d.CurrentVersion = 1
	}
	if d.Metadata == nil {
		d.Metadata = domain.JSONMap{}
	}
	if d.Tags == nil {
		d.Tags = domain.StringArr{}
	}
	if _, err := r.db.NamedExecContext(ctx, qInsertDocument, d); err != nil {
		return fmt.Errorf("insert document: %w", err)
	}
	return nil
}

// GetByID fetches a single document scoped to a tenant.
func (r *documentRepo) GetByID(ctx context.Context, tenantID, id uuid.UUID) (*domain.Document, error) {
	var d domain.Document
	err := r.db.GetContext(ctx, &d, qSelectDocumentByID, tenantID, id)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return nil, domain.ErrDocumentNotFound
		}
		return nil, fmt.Errorf("select document: %w", err)
	}
	return &d, nil
}

// List returns documents for a tenant honoring filters. Returns items + total.
func (r *documentRepo) List(ctx context.Context, tenantID uuid.UUID, f ListFilters) ([]*domain.Document, int, error) {
	if f.Page < 1 {
		f.Page = 1
	}
	if f.Limit <= 0 || f.Limit > 200 {
		f.Limit = 50
	}
	offset := (f.Page - 1) * f.Limit

	var (
		clauses []string
		args    []any
		i       = 1
	)
	clauses = append(clauses, fmt.Sprintf("tenant_id = $%d", i))
	args = append(args, tenantID)
	i++
	if !f.IncludeDeleted {
		clauses = append(clauses, "deleted_at IS NULL")
	}
	if f.OwnerEmployeeID != nil {
		clauses = append(clauses, fmt.Sprintf("owner_employee_id = $%d", i))
		args = append(args, *f.OwnerEmployeeID)
		i++
	}
	if f.Category != nil {
		clauses = append(clauses, fmt.Sprintf("category = $%d", i))
		args = append(args, string(*f.Category))
		i++
	}
	if f.IsSigned != nil {
		if *f.IsSigned {
			clauses = append(clauses, "signed_at IS NOT NULL")
		} else {
			clauses = append(clauses, "signed_at IS NULL")
		}
	}
	if f.ExpiringWithinDays != nil {
		clauses = append(clauses, fmt.Sprintf("retention_until IS NOT NULL AND retention_until >= CURRENT_DATE AND retention_until <= (CURRENT_DATE + ($%d || ' days')::interval)::date", i))
		args = append(args, fmt.Sprintf("%d", *f.ExpiringWithinDays))
		i++
	}
	if strings.TrimSpace(f.Search) != "" {
		clauses = append(clauses, fmt.Sprintf("title ILIKE $%d", i))
		args = append(args, "%"+strings.TrimSpace(f.Search)+"%")
		i++
	}

	where := strings.Join(clauses, " AND ")
	countQ := "SELECT COUNT(*) FROM app.documents WHERE " + where
	var total int
	if err := r.db.GetContext(ctx, &total, countQ, args...); err != nil {
		return nil, 0, fmt.Errorf("count documents: %w", err)
	}

	listQ := `
SELECT id, tenant_id, owner_employee_id, owner_user_id, category, title, description,
       current_version, tags, is_confidential, retention_until, signed_at, signed_by,
       metadata, created_at, updated_at, deleted_at
FROM app.documents
WHERE ` + where + fmt.Sprintf(" ORDER BY created_at DESC LIMIT $%d OFFSET $%d", i, i+1)
	args = append(args, f.Limit, offset)

	var items []*domain.Document
	if err := r.db.SelectContext(ctx, &items, listQ, args...); err != nil {
		return nil, 0, fmt.Errorf("list documents: %w", err)
	}
	return items, total, nil
}

// Update updates mutable metadata fields.
func (r *documentRepo) Update(ctx context.Context, d *domain.Document) error {
	d.UpdatedAt = time.Now().UTC()
	if d.Metadata == nil {
		d.Metadata = domain.JSONMap{}
	}
	if d.Tags == nil {
		d.Tags = domain.StringArr{}
	}
	res, err := r.db.NamedExecContext(ctx, qUpdateDocumentMeta, d)
	if err != nil {
		return fmt.Errorf("update document: %w", err)
	}
	n, _ := res.RowsAffected()
	if n == 0 {
		return domain.ErrDocumentNotFound
	}
	return nil
}

// UpdateCurrentVersion bumps the pointer to the latest version.
func (r *documentRepo) UpdateCurrentVersion(ctx context.Context, tenantID, id uuid.UUID, version int) error {
	res, err := r.db.ExecContext(ctx, qUpdateCurrentVersion, tenantID, id, version)
	if err != nil {
		return fmt.Errorf("update current version: %w", err)
	}
	n, _ := res.RowsAffected()
	if n == 0 {
		return domain.ErrDocumentNotFound
	}
	return nil
}

// UpdateSignature marks a document as signed.
func (r *documentRepo) UpdateSignature(ctx context.Context, tenantID, id, signedBy uuid.UUID, signedAt time.Time) error {
	res, err := r.db.ExecContext(ctx, qSetSigned, tenantID, id, signedAt, signedBy)
	if err != nil {
		return fmt.Errorf("update signature: %w", err)
	}
	n, _ := res.RowsAffected()
	if n == 0 {
		return domain.ErrDocumentNotFound
	}
	return nil
}

// SoftDelete marks the document deleted_at.
func (r *documentRepo) SoftDelete(ctx context.Context, tenantID, id, deletedBy uuid.UUID) error {
	_ = deletedBy // captured via audit log
	res, err := r.db.ExecContext(ctx, qSoftDeleteDocument, tenantID, id)
	if err != nil {
		return fmt.Errorf("soft delete: %w", err)
	}
	n, _ := res.RowsAffected()
	if n == 0 {
		return domain.ErrDocumentNotFound
	}
	return nil
}

// HardDelete permanently removes the document row.
func (r *documentRepo) HardDelete(ctx context.Context, tenantID, id uuid.UUID) error {
	_, err := r.db.ExecContext(ctx, qHardDeleteDocument, tenantID, id)
	if err != nil {
		return fmt.Errorf("hard delete: %w", err)
	}
	return nil
}

// ListExpiring returns docs retention_until is within [today, today+within days].
func (r *documentRepo) ListExpiring(ctx context.Context, within int) ([]*domain.Document, error) {
	var items []*domain.Document
	if err := r.db.SelectContext(ctx, &items, qListExpiring, fmt.Sprintf("%d", within)); err != nil {
		return nil, fmt.Errorf("list expiring: %w", err)
	}
	return items, nil
}

// ListExpiredForPurge returns documents whose retention has passed.
func (r *documentRepo) ListExpiredForPurge(ctx context.Context) ([]*domain.Document, error) {
	var items []*domain.Document
	if err := r.db.SelectContext(ctx, &items, qListExpiredForPurge); err != nil {
		return nil, fmt.Errorf("list expired: %w", err)
	}
	return items, nil
}
