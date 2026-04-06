package repository

import (
	"context"
	"testing"
	"time"

	"github.com/google/uuid"

	"github.com/upcore/document/internal/domain"
)

func TestFakeDocumentRepo_CRUDAndFilters(t *testing.T) {
	t.Parallel()
	ctx := context.Background()
	repo := NewFakeDocumentRepo()
	tenant := uuid.New()
	emp := uuid.New()
	retention := time.Now().AddDate(0, 0, 10)

	d := &domain.Document{
		TenantID:        tenant,
		OwnerEmployeeID: &emp,
		Category:        domain.DocTypeContract,
		Title:           "İş Sözleşmesi",
		CurrentVersion:  1,
		RetentionUntil:  &retention,
		Metadata:        domain.JSONMap{},
		Tags:            domain.StringArr{"contract"},
	}
	if err := repo.Create(ctx, d); err != nil {
		t.Fatalf("create: %v", err)
	}

	got, err := repo.GetByID(ctx, tenant, d.ID)
	if err != nil || got.Title != "İş Sözleşmesi" {
		t.Fatalf("get: %v %+v", err, got)
	}

	cat := domain.DocTypeContract
	items, total, err := repo.List(ctx, tenant, ListFilters{Category: &cat, Page: 1, Limit: 10})
	if err != nil || total != 1 || len(items) != 1 {
		t.Fatalf("list by category: total=%d err=%v", total, err)
	}

	within := 30
	items, _, _ = repo.List(ctx, tenant, ListFilters{ExpiringWithinDays: &within})
	if len(items) != 1 {
		t.Fatalf("expiring within: got %d", len(items))
	}

	// Cross-tenant isolation.
	if _, err := repo.GetByID(ctx, uuid.New(), d.ID); err != domain.ErrDocumentNotFound {
		t.Fatalf("tenant isolation: got %v", err)
	}

	// Update metadata.
	d.Title = "Güncellenmiş"
	if err := repo.Update(ctx, d); err != nil {
		t.Fatalf("update: %v", err)
	}
	got, _ = repo.GetByID(ctx, tenant, d.ID)
	if got.Title != "Güncellenmiş" {
		t.Fatalf("update not applied: %q", got.Title)
	}

	// Soft delete.
	if err := repo.SoftDelete(ctx, tenant, d.ID, uuid.New()); err != nil {
		t.Fatalf("delete: %v", err)
	}
	if _, err := repo.GetByID(ctx, tenant, d.ID); err != domain.ErrDocumentNotFound {
		t.Fatalf("after delete: %v", err)
	}
}

func TestFakeVersionRepo_NextVersion(t *testing.T) {
	t.Parallel()
	ctx := context.Background()
	repo := NewFakeVersionRepo()
	tenant := uuid.New()
	doc := uuid.New()

	next, _ := repo.NextVersion(ctx, tenant, doc)
	if next != 1 {
		t.Fatalf("want 1, got %d", next)
	}
	_ = repo.Create(ctx, &domain.DocumentVersion{TenantID: tenant, DocumentID: doc, Version: 1, StorageKey: "k1", MimeType: "application/pdf"})
	next, _ = repo.NextVersion(ctx, tenant, doc)
	if next != 2 {
		t.Fatalf("want 2, got %d", next)
	}
	_ = repo.Create(ctx, &domain.DocumentVersion{TenantID: tenant, DocumentID: doc, Version: 2, StorageKey: "k2", MimeType: "application/pdf"})
	latest, err := repo.GetLatest(ctx, tenant, doc)
	if err != nil || latest.Version != 2 {
		t.Fatalf("latest: %v %+v", err, latest)
	}
}
