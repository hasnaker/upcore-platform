package repository

import (
	"context"
	"sort"
	"strings"
	"sync"
	"time"

	"github.com/google/uuid"

	"github.com/upcore/document/internal/domain"
)

// FakeDocumentRepo is an in-memory DocumentRepository for tests.
type FakeDocumentRepo struct {
	mu   sync.Mutex
	data map[uuid.UUID]*domain.Document
}

// NewFakeDocumentRepo constructs an empty fake.
func NewFakeDocumentRepo() *FakeDocumentRepo {
	return &FakeDocumentRepo{data: map[uuid.UUID]*domain.Document{}}
}

// Create stores a deep copy of d.
func (f *FakeDocumentRepo) Create(_ context.Context, d *domain.Document) error {
	f.mu.Lock()
	defer f.mu.Unlock()
	if d.ID == uuid.Nil {
		d.ID = uuid.New()
	}
	if d.CreatedAt.IsZero() {
		d.CreatedAt = time.Now().UTC()
	}
	d.UpdatedAt = d.CreatedAt
	cp := *d
	f.data[d.ID] = &cp
	return nil
}

// GetByID returns a copy or ErrDocumentNotFound.
func (f *FakeDocumentRepo) GetByID(_ context.Context, tenantID, id uuid.UUID) (*domain.Document, error) {
	f.mu.Lock()
	defer f.mu.Unlock()
	d, ok := f.data[id]
	if !ok || d.TenantID != tenantID || d.DeletedAt != nil {
		return nil, domain.ErrDocumentNotFound
	}
	cp := *d
	return &cp, nil
}

// List applies simple filters.
func (f *FakeDocumentRepo) List(_ context.Context, tenantID uuid.UUID, fl ListFilters) ([]*domain.Document, int, error) {
	f.mu.Lock()
	defer f.mu.Unlock()
	var out []*domain.Document
	for _, d := range f.data {
		if d.TenantID != tenantID {
			continue
		}
		if !fl.IncludeDeleted && d.DeletedAt != nil {
			continue
		}
		if fl.OwnerEmployeeID != nil && (d.OwnerEmployeeID == nil || *d.OwnerEmployeeID != *fl.OwnerEmployeeID) {
			continue
		}
		if fl.Category != nil && d.Category != *fl.Category {
			continue
		}
		if fl.IsSigned != nil {
			if *fl.IsSigned && d.SignedAt == nil {
				continue
			}
			if !*fl.IsSigned && d.SignedAt != nil {
				continue
			}
		}
		if fl.ExpiringWithinDays != nil {
			if !d.IsExpiringSoon(*fl.ExpiringWithinDays) {
				continue
			}
		}
		if strings.TrimSpace(fl.Search) != "" && !strings.Contains(strings.ToLower(d.Title), strings.ToLower(fl.Search)) {
			continue
		}
		cp := *d
		out = append(out, &cp)
	}
	sort.Slice(out, func(i, j int) bool { return out[i].CreatedAt.After(out[j].CreatedAt) })
	total := len(out)

	page := fl.Page
	if page < 1 {
		page = 1
	}
	limit := fl.Limit
	if limit <= 0 {
		limit = 50
	}
	start := (page - 1) * limit
	if start > len(out) {
		start = len(out)
	}
	end := start + limit
	if end > len(out) {
		end = len(out)
	}
	return out[start:end], total, nil
}

// Update applies mutable fields.
func (f *FakeDocumentRepo) Update(_ context.Context, d *domain.Document) error {
	f.mu.Lock()
	defer f.mu.Unlock()
	cur, ok := f.data[d.ID]
	if !ok || cur.TenantID != d.TenantID || cur.DeletedAt != nil {
		return domain.ErrDocumentNotFound
	}
	cur.Title = d.Title
	cur.Description = d.Description
	cur.Tags = d.Tags
	cur.IsConfidential = d.IsConfidential
	cur.RetentionUntil = d.RetentionUntil
	cur.Metadata = d.Metadata
	cur.UpdatedAt = time.Now().UTC()
	d.UpdatedAt = cur.UpdatedAt
	return nil
}

// UpdateCurrentVersion bumps the pointer.
func (f *FakeDocumentRepo) UpdateCurrentVersion(_ context.Context, tenantID, id uuid.UUID, version int) error {
	f.mu.Lock()
	defer f.mu.Unlock()
	d, ok := f.data[id]
	if !ok || d.TenantID != tenantID || d.DeletedAt != nil {
		return domain.ErrDocumentNotFound
	}
	d.CurrentVersion = version
	d.UpdatedAt = time.Now().UTC()
	return nil
}

// UpdateSignature marks signed.
func (f *FakeDocumentRepo) UpdateSignature(_ context.Context, tenantID, id, signedBy uuid.UUID, signedAt time.Time) error {
	f.mu.Lock()
	defer f.mu.Unlock()
	d, ok := f.data[id]
	if !ok || d.TenantID != tenantID || d.DeletedAt != nil {
		return domain.ErrDocumentNotFound
	}
	d.SignedAt = &signedAt
	sb := signedBy
	d.SignedBy = &sb
	d.UpdatedAt = time.Now().UTC()
	return nil
}

// SoftDelete sets DeletedAt.
func (f *FakeDocumentRepo) SoftDelete(_ context.Context, tenantID, id, _ uuid.UUID) error {
	f.mu.Lock()
	defer f.mu.Unlock()
	d, ok := f.data[id]
	if !ok || d.TenantID != tenantID || d.DeletedAt != nil {
		return domain.ErrDocumentNotFound
	}
	now := time.Now().UTC()
	d.DeletedAt = &now
	d.UpdatedAt = now
	return nil
}

// HardDelete removes the record.
func (f *FakeDocumentRepo) HardDelete(_ context.Context, tenantID, id uuid.UUID) error {
	f.mu.Lock()
	defer f.mu.Unlock()
	d, ok := f.data[id]
	if !ok || d.TenantID != tenantID {
		return nil
	}
	delete(f.data, id)
	return nil
}

// ListExpiring returns documents whose retention_until is <= today+within.
func (f *FakeDocumentRepo) ListExpiring(_ context.Context, within int) ([]*domain.Document, error) {
	f.mu.Lock()
	defer f.mu.Unlock()
	var out []*domain.Document
	for _, d := range f.data {
		if d.DeletedAt != nil || d.RetentionUntil == nil {
			continue
		}
		if d.IsExpiringSoon(within) || d.IsExpired() {
			cp := *d
			out = append(out, &cp)
		}
	}
	sort.Slice(out, func(i, j int) bool { return out[i].RetentionUntil.Before(*out[j].RetentionUntil) })
	return out, nil
}

// ListExpiredForPurge returns documents past retention.
func (f *FakeDocumentRepo) ListExpiredForPurge(_ context.Context) ([]*domain.Document, error) {
	f.mu.Lock()
	defer f.mu.Unlock()
	var out []*domain.Document
	for _, d := range f.data {
		if d.RetentionUntil != nil && d.IsExpired() {
			cp := *d
			out = append(out, &cp)
		}
	}
	return out, nil
}

// --------- FakeVersionRepo ---------

// FakeVersionRepo is an in-memory VersionRepository for tests.
type FakeVersionRepo struct {
	mu   sync.Mutex
	data map[uuid.UUID]*domain.DocumentVersion
}

// NewFakeVersionRepo constructs an empty fake.
func NewFakeVersionRepo() *FakeVersionRepo {
	return &FakeVersionRepo{data: map[uuid.UUID]*domain.DocumentVersion{}}
}

// Create stores a version.
func (f *FakeVersionRepo) Create(_ context.Context, v *domain.DocumentVersion) error {
	f.mu.Lock()
	defer f.mu.Unlock()
	if v.ID == uuid.Nil {
		v.ID = uuid.New()
	}
	if v.UploadedAt.IsZero() {
		v.UploadedAt = time.Now().UTC()
	}
	if v.StorageProvider == "" {
		v.StorageProvider = "azure_blob"
	}
	cp := *v
	f.data[v.ID] = &cp
	return nil
}

// ListByDocument returns versions (newest first).
func (f *FakeVersionRepo) ListByDocument(_ context.Context, tenantID, docID uuid.UUID) ([]*domain.DocumentVersion, error) {
	f.mu.Lock()
	defer f.mu.Unlock()
	var out []*domain.DocumentVersion
	for _, v := range f.data {
		if v.TenantID == tenantID && v.DocumentID == docID {
			cp := *v
			out = append(out, &cp)
		}
	}
	sort.Slice(out, func(i, j int) bool { return out[i].Version > out[j].Version })
	return out, nil
}

// GetLatest returns the max-versioned row.
func (f *FakeVersionRepo) GetLatest(ctx context.Context, tenantID, docID uuid.UUID) (*domain.DocumentVersion, error) {
	list, _ := f.ListByDocument(ctx, tenantID, docID)
	if len(list) == 0 {
		return nil, domain.ErrVersionNotFound
	}
	return list[0], nil
}

// GetByVersion returns a specific revision.
func (f *FakeVersionRepo) GetByVersion(_ context.Context, tenantID, docID uuid.UUID, version int) (*domain.DocumentVersion, error) {
	f.mu.Lock()
	defer f.mu.Unlock()
	for _, v := range f.data {
		if v.TenantID == tenantID && v.DocumentID == docID && v.Version == version {
			cp := *v
			return &cp, nil
		}
	}
	return nil, domain.ErrVersionNotFound
}

// GetByID returns a single version.
func (f *FakeVersionRepo) GetByID(_ context.Context, tenantID, id uuid.UUID) (*domain.DocumentVersion, error) {
	f.mu.Lock()
	defer f.mu.Unlock()
	v, ok := f.data[id]
	if !ok || v.TenantID != tenantID {
		return nil, domain.ErrVersionNotFound
	}
	cp := *v
	return &cp, nil
}

// NextVersion computes max+1.
func (f *FakeVersionRepo) NextVersion(ctx context.Context, tenantID, docID uuid.UUID) (int, error) {
	list, err := f.ListByDocument(ctx, tenantID, docID)
	if err != nil {
		return 0, err
	}
	if len(list) == 0 {
		return 1, nil
	}
	return list[0].Version + 1, nil
}

// DeleteByDocument clears all versions for a document.
func (f *FakeVersionRepo) DeleteByDocument(_ context.Context, tenantID, docID uuid.UUID) error {
	f.mu.Lock()
	defer f.mu.Unlock()
	for id, v := range f.data {
		if v.TenantID == tenantID && v.DocumentID == docID {
			delete(f.data, id)
		}
	}
	return nil
}
