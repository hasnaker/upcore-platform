package repository

import (
	"context"
	"database/sql"
	"errors"
	"fmt"
	"time"

	"github.com/google/uuid"
	"github.com/jmoiron/sqlx"

	"github.com/upcore/document/internal/domain"
)

// VersionRepository persists document versions.
type VersionRepository interface {
	Create(ctx context.Context, v *domain.DocumentVersion) error
	ListByDocument(ctx context.Context, tenantID, docID uuid.UUID) ([]*domain.DocumentVersion, error)
	GetLatest(ctx context.Context, tenantID, docID uuid.UUID) (*domain.DocumentVersion, error)
	GetByVersion(ctx context.Context, tenantID, docID uuid.UUID, version int) (*domain.DocumentVersion, error)
	GetByID(ctx context.Context, tenantID, id uuid.UUID) (*domain.DocumentVersion, error)
	NextVersion(ctx context.Context, tenantID, docID uuid.UUID) (int, error)
	DeleteByDocument(ctx context.Context, tenantID, docID uuid.UUID) error
}

type versionRepo struct{ db *sqlx.DB }

// NewVersionRepository constructs a VersionRepository.
func NewVersionRepository(db *sqlx.DB) VersionRepository {
	return &versionRepo{db: db}
}

const qInsertVersion = `
INSERT INTO app.document_versions
  (id, tenant_id, document_id, version, storage_provider, storage_container,
   storage_key, mime_type, size_bytes, checksum_sha256, uploaded_by, uploaded_at, notes)
VALUES
  (:id, :tenant_id, :document_id, :version, :storage_provider, :storage_container,
   :storage_key, :mime_type, :size_bytes, :checksum_sha256, :uploaded_by, :uploaded_at, :notes)`

const qListVersions = `
SELECT id, tenant_id, document_id, version, storage_provider, storage_container,
       storage_key, mime_type, size_bytes, checksum_sha256, uploaded_by, uploaded_at, notes
FROM app.document_versions
WHERE tenant_id = $1 AND document_id = $2
ORDER BY version DESC`

const qGetLatestVersion = `
SELECT id, tenant_id, document_id, version, storage_provider, storage_container,
       storage_key, mime_type, size_bytes, checksum_sha256, uploaded_by, uploaded_at, notes
FROM app.document_versions
WHERE tenant_id = $1 AND document_id = $2
ORDER BY version DESC
LIMIT 1`

const qGetByVersionNumber = `
SELECT id, tenant_id, document_id, version, storage_provider, storage_container,
       storage_key, mime_type, size_bytes, checksum_sha256, uploaded_by, uploaded_at, notes
FROM app.document_versions
WHERE tenant_id = $1 AND document_id = $2 AND version = $3`

const qGetVersionByID = `
SELECT id, tenant_id, document_id, version, storage_provider, storage_container,
       storage_key, mime_type, size_bytes, checksum_sha256, uploaded_by, uploaded_at, notes
FROM app.document_versions
WHERE tenant_id = $1 AND id = $2`

const qNextVersion = `
SELECT COALESCE(MAX(version), 0) + 1
FROM app.document_versions
WHERE tenant_id = $1 AND document_id = $2`

const qDeleteVersionsByDoc = `DELETE FROM app.document_versions WHERE tenant_id = $1 AND document_id = $2`

// Create inserts a new version row.
func (r *versionRepo) Create(ctx context.Context, v *domain.DocumentVersion) error {
	if v.ID == uuid.Nil {
		v.ID = uuid.New()
	}
	if v.UploadedAt.IsZero() {
		v.UploadedAt = time.Now().UTC()
	}
	if v.StorageProvider == "" {
		v.StorageProvider = "azure_blob"
	}
	if _, err := r.db.NamedExecContext(ctx, qInsertVersion, v); err != nil {
		return fmt.Errorf("insert version: %w", err)
	}
	return nil
}

// ListByDocument returns all versions for a document, newest first.
func (r *versionRepo) ListByDocument(ctx context.Context, tenantID, docID uuid.UUID) ([]*domain.DocumentVersion, error) {
	var out []*domain.DocumentVersion
	if err := r.db.SelectContext(ctx, &out, qListVersions, tenantID, docID); err != nil {
		return nil, fmt.Errorf("list versions: %w", err)
	}
	return out, nil
}

// GetLatest returns the highest-numbered version.
func (r *versionRepo) GetLatest(ctx context.Context, tenantID, docID uuid.UUID) (*domain.DocumentVersion, error) {
	var v domain.DocumentVersion
	if err := r.db.GetContext(ctx, &v, qGetLatestVersion, tenantID, docID); err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return nil, domain.ErrVersionNotFound
		}
		return nil, fmt.Errorf("get latest version: %w", err)
	}
	return &v, nil
}

// GetByVersion returns a specific revision.
func (r *versionRepo) GetByVersion(ctx context.Context, tenantID, docID uuid.UUID, version int) (*domain.DocumentVersion, error) {
	var v domain.DocumentVersion
	if err := r.db.GetContext(ctx, &v, qGetByVersionNumber, tenantID, docID, version); err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return nil, domain.ErrVersionNotFound
		}
		return nil, fmt.Errorf("get version: %w", err)
	}
	return &v, nil
}

// GetByID fetches a version by its own id.
func (r *versionRepo) GetByID(ctx context.Context, tenantID, id uuid.UUID) (*domain.DocumentVersion, error) {
	var v domain.DocumentVersion
	if err := r.db.GetContext(ctx, &v, qGetVersionByID, tenantID, id); err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return nil, domain.ErrVersionNotFound
		}
		return nil, fmt.Errorf("get version by id: %w", err)
	}
	return &v, nil
}

// NextVersion computes the next sequential version number.
func (r *versionRepo) NextVersion(ctx context.Context, tenantID, docID uuid.UUID) (int, error) {
	var n int
	if err := r.db.GetContext(ctx, &n, qNextVersion, tenantID, docID); err != nil {
		return 0, fmt.Errorf("next version: %w", err)
	}
	return n, nil
}

// DeleteByDocument removes all versions for a document (hard delete).
func (r *versionRepo) DeleteByDocument(ctx context.Context, tenantID, docID uuid.UUID) error {
	if _, err := r.db.ExecContext(ctx, qDeleteVersionsByDoc, tenantID, docID); err != nil {
		return fmt.Errorf("delete versions: %w", err)
	}
	return nil
}
