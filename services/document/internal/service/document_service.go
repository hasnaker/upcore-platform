package service

import (
	"context"
	"errors"
	"fmt"
	"io"
	"time"

	"github.com/google/uuid"
	"github.com/rs/zerolog"

	"github.com/upcore/document/internal/domain"
	"github.com/upcore/document/internal/event"
	"github.com/upcore/document/internal/repository"
	"github.com/upcore/document/internal/storage"
)

// UploadRequest captures all fields required to create a new document.
type UploadRequest struct {
	TenantID        uuid.UUID
	UploaderID      uuid.UUID
	OwnerEmployeeID *uuid.UUID
	Category        domain.DocType
	Title           string
	Description     *string
	Tags            []string
	IsConfidential  bool
	RetentionUntil  *time.Time
	MimeType        string
	Filename        string
	Body            io.Reader
	ContentLength   int64 // informational only
}

// UpdateRequest lists the metadata fields that can be PATCHed.
type UpdateRequest struct {
	Title          *string
	Description    *string
	Tags           []string
	IsConfidential *bool
	RetentionUntil *time.Time
}

// DocumentService orchestrates blob + database operations.
type DocumentService struct {
	docs        repository.DocumentRepository
	versions    repository.VersionRepository
	blob        storage.BlobClient
	publisher   event.Publisher
	scanner     VirusScanner
	container   string
	maxBytes    int64
	sasReadTTL  time.Duration
	sasWriteTTL time.Duration
	log         zerolog.Logger
}

// Deps bundles dependencies for DocumentService construction.
type Deps struct {
	Docs        repository.DocumentRepository
	Versions    repository.VersionRepository
	Blob        storage.BlobClient
	Publisher   event.Publisher
	Scanner     VirusScanner
	Container   string
	MaxBytes    int64
	SASReadTTL  time.Duration
	SASWriteTTL time.Duration
	Log         zerolog.Logger
}

// NewDocumentService constructs a DocumentService.
func NewDocumentService(d Deps) *DocumentService {
	if d.Scanner == nil {
		d.Scanner = NopScanner{}
	}
	if d.SASReadTTL <= 0 {
		d.SASReadTTL = 15 * time.Minute
	}
	if d.SASWriteTTL <= 0 {
		d.SASWriteTTL = 15 * time.Minute
	}
	if d.Container == "" {
		d.Container = "documents"
	}
	if d.MaxBytes <= 0 {
		d.MaxBytes = 50 * 1024 * 1024
	}
	return &DocumentService{
		docs:        d.Docs,
		versions:    d.Versions,
		blob:        d.Blob,
		publisher:   d.Publisher,
		scanner:     d.Scanner,
		container:   d.Container,
		maxBytes:    d.MaxBytes,
		sasReadTTL:  d.SASReadTTL,
		sasWriteTTL: d.SASWriteTTL,
		log:         d.Log,
	}
}

// Upload streams the body to blob storage, computes a SHA-256 checksum, creates
// a Document row and its first version, then emits `document.uploaded.v1`.
func (s *DocumentService) Upload(ctx context.Context, req UploadRequest) (*domain.Document, *domain.DocumentVersion, error) {
	if req.TenantID == uuid.Nil {
		return nil, nil, domain.ErrValidation
	}
	if req.Body == nil {
		return nil, nil, domain.ErrEmptyFile
	}
	if !req.Category.IsValid() {
		return nil, nil, domain.ErrInvalidDocumentType
	}
	if !IsMimeAllowed(req.MimeType) {
		return nil, nil, domain.ErrUnsupportedMimeType
	}
	if req.ContentLength > 0 && req.ContentLength > s.maxBytes {
		return nil, nil, domain.ErrFileTooLarge
	}
	if req.Title == "" {
		return nil, nil, domain.ErrValidation
	}

	// Compute a blob path up-front; we fix version at 1 for initial upload.
	docID := uuid.New()
	suffix := SafeBlobSuffix(req.Filename)
	blobKey := domain.BlobPath(req.TenantID, docID, 1, suffix)

	// Stream body through a limited hashing reader (hard size cap).
	hashing := storage.NewLimitedHashingReader(req.Body, s.maxBytes)
	if err := s.blob.Upload(ctx, s.container, blobKey, hashing, req.MimeType); err != nil {
		if errors.Is(err, storage.ErrSizeExceeded) {
			return nil, nil, domain.ErrFileTooLarge
		}
		return nil, nil, fmt.Errorf("blob upload: %w", err)
	}
	size := hashing.BytesRead()
	if size == 0 {
		_ = s.blob.Delete(ctx, s.container, blobKey)
		return nil, nil, domain.ErrEmptyFile
	}
	checksum := hashing.Sum()

	// Compute retention date if not provided.
	retention := req.RetentionUntil
	if retention == nil {
		d := time.Now().UTC().AddDate(0, 0, req.Category.DefaultRetentionDays())
		retention = &d
	}

	doc := &domain.Document{
		ID:              docID,
		TenantID:        req.TenantID,
		OwnerEmployeeID: req.OwnerEmployeeID,
		Category:        req.Category,
		Title:           req.Title,
		Description:     req.Description,
		CurrentVersion:  1,
		Tags:            domain.StringArr(req.Tags),
		IsConfidential:  req.IsConfidential,
		RetentionUntil:  retention,
		Metadata:        domain.JSONMap{"uploader_id": req.UploaderID.String()},
	}
	if err := doc.Validate(); err != nil {
		_ = s.blob.Delete(ctx, s.container, blobKey)
		return nil, nil, err
	}
	if err := s.docs.Create(ctx, doc); err != nil {
		_ = s.blob.Delete(ctx, s.container, blobKey)
		return nil, nil, fmt.Errorf("create document: %w", err)
	}

	uploader := req.UploaderID
	cs := checksum
	ver := &domain.DocumentVersion{
		TenantID:         req.TenantID,
		DocumentID:       doc.ID,
		Version:          1,
		StorageProvider:  "azure_blob",
		StorageContainer: s.container,
		StorageKey:       blobKey,
		MimeType:         req.MimeType,
		SizeBytes:        size,
		ChecksumSHA256:   &cs,
		UploadedBy:       &uploader,
	}
	if err := s.versions.Create(ctx, ver); err != nil {
		_ = s.blob.Delete(ctx, s.container, blobKey)
		_ = s.docs.HardDelete(ctx, req.TenantID, doc.ID)
		return nil, nil, fmt.Errorf("create version: %w", err)
	}

	_ = s.publisher.Publish(ctx, event.TopicDocumentUploaded, map[string]any{
		"document_id":       doc.ID,
		"tenant_id":         doc.TenantID,
		"owner_employee_id": doc.OwnerEmployeeID,
		"category":          string(doc.Category),
		"size_bytes":        size,
		"version":           1,
		"uploaded_by":       req.UploaderID,
		"uploaded_at":       ver.UploadedAt,
	})
	return doc, ver, nil
}

// Get returns metadata for a single document.
func (s *DocumentService) Get(ctx context.Context, tenantID, id uuid.UUID) (*domain.Document, error) {
	return s.docs.GetByID(ctx, tenantID, id)
}

// List returns a page of documents.
func (s *DocumentService) List(ctx context.Context, tenantID uuid.UUID, f repository.ListFilters) ([]*domain.Document, int, error) {
	return s.docs.List(ctx, tenantID, f)
}

// UpdateMetadata patches mutable fields.
func (s *DocumentService) UpdateMetadata(ctx context.Context, tenantID, id uuid.UUID, req UpdateRequest) (*domain.Document, error) {
	d, err := s.docs.GetByID(ctx, tenantID, id)
	if err != nil {
		return nil, err
	}
	if req.Title != nil {
		d.Title = *req.Title
	}
	if req.Description != nil {
		d.Description = req.Description
	}
	if req.Tags != nil {
		d.Tags = domain.StringArr(req.Tags)
	}
	if req.IsConfidential != nil {
		d.IsConfidential = *req.IsConfidential
	}
	if req.RetentionUntil != nil {
		d.RetentionUntil = req.RetentionUntil
	}
	if err := d.Validate(); err != nil {
		return nil, err
	}
	if err := s.docs.Update(ctx, d); err != nil {
		return nil, err
	}
	return d, nil
}

// Download returns a SAS URL for the current version and emits an audit event.
func (s *DocumentService) Download(ctx context.Context, tenantID, id, viewerID uuid.UUID) (string, error) {
	d, err := s.docs.GetByID(ctx, tenantID, id)
	if err != nil {
		return "", err
	}
	ver, err := s.versions.GetByVersion(ctx, tenantID, d.ID, d.CurrentVersion)
	if err != nil {
		return "", err
	}
	filename := fmt.Sprintf("%s-v%d%s", safeTitle(d.Title), ver.Version, ExtensionForMime(ver.MimeType))
	url, err := s.blob.SignedReadURL(ctx, ver.StorageContainer, ver.StorageKey, filename, s.sasReadTTL)
	if err != nil {
		return "", fmt.Errorf("signed url: %w", err)
	}
	_ = s.publisher.Publish(ctx, event.TopicDocumentDownloaded, map[string]any{
		"document_id": d.ID,
		"tenant_id":   tenantID,
		"version":     ver.Version,
		"viewer_id":   viewerID,
		"at":          time.Now().UTC(),
	})
	return url, nil
}

// GetWithContent returns the document metadata + current-version bytes. Used
// by the BulkZipHandler to bundle multiple documents into a single archive.
// Returns (doc, bytes, error). Falls back to empty bytes when the blob
// backend is not configured (dev).
func (s *DocumentService) GetWithContent(ctx context.Context, tenantID, id uuid.UUID) (*struct {
	FileName string
}, []byte, error) {
	d, err := s.docs.GetByID(ctx, tenantID, id)
	if err != nil {
		return nil, nil, err
	}
	ver, err := s.versions.GetByVersion(ctx, tenantID, d.ID, d.CurrentVersion)
	if err != nil {
		return nil, nil, err
	}
	filename := fmt.Sprintf("%s-v%d%s", safeTitle(d.Title), ver.Version, ExtensionForMime(ver.MimeType))
	rc, err := s.blob.Download(ctx, ver.StorageContainer, ver.StorageKey)
	if err != nil || rc == nil {
		return &struct{ FileName string }{FileName: filename}, nil, nil
	}
	defer rc.Close()
	body, err := io.ReadAll(rc)
	if err != nil {
		return &struct{ FileName string }{FileName: filename}, nil, nil
	}
	return &struct{ FileName string }{FileName: filename}, body, nil
}

// Delete soft-deletes a document.
func (s *DocumentService) Delete(ctx context.Context, tenantID, id, deletedBy uuid.UUID) error {
	d, err := s.docs.GetByID(ctx, tenantID, id)
	if err != nil {
		return err
	}
	if !d.CanDelete() {
		return domain.ErrAlreadyDeleted
	}
	if err := s.docs.SoftDelete(ctx, tenantID, id, deletedBy); err != nil {
		return err
	}
	_ = s.publisher.Publish(ctx, event.TopicDocumentDeleted, map[string]any{
		"document_id": id,
		"tenant_id":   tenantID,
		"deleted_by":  deletedBy,
		"deleted_at":  time.Now().UTC(),
	})
	return nil
}

// safeTitle builds a short URL/filename-safe slug from a title.
func safeTitle(title string) string {
	const max = 60
	out := make([]byte, 0, len(title))
	for _, r := range title {
		switch {
		case r == ' ' || r == '_':
			out = append(out, '-')
		case r == '-' || (r >= 'a' && r <= 'z') || (r >= 'A' && r <= 'Z') || (r >= '0' && r <= '9'):
			out = append(out, byte(r))
		}
		if len(out) >= max {
			break
		}
	}
	if len(out) == 0 {
		return "document"
	}
	return string(out)
}
