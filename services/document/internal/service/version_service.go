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

// VersionUploadRequest captures a new version upload.
type VersionUploadRequest struct {
	TenantID   uuid.UUID
	DocumentID uuid.UUID
	UploaderID uuid.UUID
	MimeType   string
	Filename   string
	Notes      *string
	Body       io.Reader
}

// VersionService manages revisions for an existing document.
type VersionService struct {
	docs        repository.DocumentRepository
	versions    repository.VersionRepository
	blob        storage.BlobClient
	publisher   event.Publisher
	container   string
	maxBytes    int64
	sasReadTTL  time.Duration
	log         zerolog.Logger
}

// NewVersionService constructs a VersionService.
func NewVersionService(d Deps) *VersionService {
	if d.Container == "" {
		d.Container = "documents"
	}
	if d.MaxBytes <= 0 {
		d.MaxBytes = 50 * 1024 * 1024
	}
	if d.SASReadTTL <= 0 {
		d.SASReadTTL = 15 * time.Minute
	}
	return &VersionService{
		docs:       d.Docs,
		versions:   d.Versions,
		blob:       d.Blob,
		publisher:  d.Publisher,
		container:  d.Container,
		maxBytes:   d.MaxBytes,
		sasReadTTL: d.SASReadTTL,
		log:        d.Log,
	}
}

// CreateVersion streams the body into blob storage and creates a new version
// row. The parent document's current_version pointer is advanced.
func (s *VersionService) CreateVersion(ctx context.Context, req VersionUploadRequest) (*domain.DocumentVersion, error) {
	if req.Body == nil {
		return nil, domain.ErrEmptyFile
	}
	if !IsMimeAllowed(req.MimeType) {
		return nil, domain.ErrUnsupportedMimeType
	}
	// Ensure parent exists.
	doc, err := s.docs.GetByID(ctx, req.TenantID, req.DocumentID)
	if err != nil {
		return nil, err
	}
	next, err := s.versions.NextVersion(ctx, req.TenantID, req.DocumentID)
	if err != nil {
		return nil, err
	}
	suffix := SafeBlobSuffix(req.Filename)
	blobKey := domain.BlobPath(req.TenantID, req.DocumentID, next, suffix)

	hashing := storage.NewLimitedHashingReader(req.Body, s.maxBytes)
	if err := s.blob.Upload(ctx, s.container, blobKey, hashing, req.MimeType); err != nil {
		if errors.Is(err, storage.ErrSizeExceeded) {
			return nil, domain.ErrFileTooLarge
		}
		return nil, fmt.Errorf("blob upload: %w", err)
	}
	if hashing.BytesRead() == 0 {
		_ = s.blob.Delete(ctx, s.container, blobKey)
		return nil, domain.ErrEmptyFile
	}
	checksum := hashing.Sum()
	cs := checksum
	up := req.UploaderID
	ver := &domain.DocumentVersion{
		TenantID:         req.TenantID,
		DocumentID:       req.DocumentID,
		Version:          next,
		StorageProvider:  "azure_blob",
		StorageContainer: s.container,
		StorageKey:       blobKey,
		MimeType:         req.MimeType,
		SizeBytes:        hashing.BytesRead(),
		ChecksumSHA256:   &cs,
		UploadedBy:       &up,
		Notes:            req.Notes,
	}
	if err := ver.Validate(); err != nil {
		_ = s.blob.Delete(ctx, s.container, blobKey)
		return nil, err
	}
	if err := s.versions.Create(ctx, ver); err != nil {
		_ = s.blob.Delete(ctx, s.container, blobKey)
		return nil, fmt.Errorf("create version: %w", err)
	}
	if err := s.docs.UpdateCurrentVersion(ctx, req.TenantID, req.DocumentID, next); err != nil {
		return nil, err
	}
	_ = doc // doc context kept for future audit fields
	_ = s.publisher.Publish(ctx, event.TopicDocumentVersionCreated, map[string]any{
		"document_id": req.DocumentID,
		"tenant_id":   req.TenantID,
		"version_id":  ver.ID,
		"version":     next,
		"uploaded_by": req.UploaderID,
	})
	return ver, nil
}

// ListVersions returns all revisions for a document, newest first.
func (s *VersionService) ListVersions(ctx context.Context, tenantID, docID uuid.UUID) ([]*domain.DocumentVersion, error) {
	if _, err := s.docs.GetByID(ctx, tenantID, docID); err != nil {
		return nil, err
	}
	return s.versions.ListByDocument(ctx, tenantID, docID)
}

// DownloadVersion returns a SAS URL for a specific version.
func (s *VersionService) DownloadVersion(ctx context.Context, tenantID, docID uuid.UUID, version int, viewerID uuid.UUID) (string, error) {
	doc, err := s.docs.GetByID(ctx, tenantID, docID)
	if err != nil {
		return "", err
	}
	ver, err := s.versions.GetByVersion(ctx, tenantID, docID, version)
	if err != nil {
		return "", err
	}
	filename := fmt.Sprintf("%s-v%d%s", safeTitle(doc.Title), ver.Version, ExtensionForMime(ver.MimeType))
	url, err := s.blob.SignedReadURL(ctx, ver.StorageContainer, ver.StorageKey, filename, s.sasReadTTL)
	if err != nil {
		return "", fmt.Errorf("signed url: %w", err)
	}
	_ = s.publisher.Publish(ctx, event.TopicDocumentDownloaded, map[string]any{
		"document_id": docID,
		"tenant_id":   tenantID,
		"version":     version,
		"viewer_id":   viewerID,
		"at":          time.Now().UTC(),
	})
	return url, nil
}

// RestoreVersion promotes an older revision by creating a new version whose
// storage key points at the same blob.
func (s *VersionService) RestoreVersion(ctx context.Context, tenantID, docID uuid.UUID, version int, by uuid.UUID) (*domain.DocumentVersion, error) {
	old, err := s.versions.GetByVersion(ctx, tenantID, docID, version)
	if err != nil {
		return nil, err
	}
	next, err := s.versions.NextVersion(ctx, tenantID, docID)
	if err != nil {
		return nil, err
	}
	up := by
	notes := fmt.Sprintf("restored from v%d", version)
	ver := &domain.DocumentVersion{
		TenantID:         tenantID,
		DocumentID:       docID,
		Version:          next,
		StorageProvider:  old.StorageProvider,
		StorageContainer: old.StorageContainer,
		StorageKey:       old.StorageKey,
		MimeType:         old.MimeType,
		SizeBytes:        old.SizeBytes,
		ChecksumSHA256:   old.ChecksumSHA256,
		UploadedBy:       &up,
		Notes:            &notes,
	}
	if err := s.versions.Create(ctx, ver); err != nil {
		return nil, err
	}
	if err := s.docs.UpdateCurrentVersion(ctx, tenantID, docID, next); err != nil {
		return nil, err
	}
	_ = s.publisher.Publish(ctx, event.TopicDocumentVersionCreated, map[string]any{
		"document_id": docID,
		"tenant_id":   tenantID,
		"version_id":  ver.ID,
		"version":     next,
		"restored":    true,
	})
	return ver, nil
}
