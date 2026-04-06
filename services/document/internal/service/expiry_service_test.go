package service

import (
	"context"
	"testing"
	"time"

	"github.com/google/uuid"
	"github.com/rs/zerolog"

	"github.com/upcore/document/internal/domain"
	"github.com/upcore/document/internal/event"
	"github.com/upcore/document/internal/repository"
)

func TestExpiryService_ScanAndNotify(t *testing.T) {
	t.Parallel()
	ctx := context.Background()
	docs := repository.NewFakeDocumentRepo()
	pub := event.NewInMemoryPublisher()
	svc := NewExpiryService(docs, pub, 30, zerolog.Nop())

	tenant := uuid.New()
	// Add 1-hour buffer so the daysUntilExpiry computation floors to the
	// intended threshold rather than threshold-1 due to elapsed ns.
	buffered := func(days int) *time.Time {
		t := time.Now().UTC().Add(time.Duration(days)*24*time.Hour + time.Hour)
		return &t
	}

	// One at 7 days (alert threshold), one at 12 days (not on any threshold),
	// one expired (-2d).
	_ = docs.Create(ctx, &domain.Document{TenantID: tenant, Title: "7d", Category: domain.DocTypeContract, CurrentVersion: 1, RetentionUntil: buffered(7)})
	_ = docs.Create(ctx, &domain.Document{TenantID: tenant, Title: "12d", Category: domain.DocTypeContract, CurrentVersion: 1, RetentionUntil: buffered(12)})
	_ = docs.Create(ctx, &domain.Document{TenantID: tenant, Title: "expired", Category: domain.DocTypeContract, CurrentVersion: 1, RetentionUntil: buffered(-2)})

	emitted, err := svc.ScanAndNotify(ctx)
	if err != nil {
		t.Fatalf("scan: %v", err)
	}
	if emitted != 1 {
		t.Fatalf("want 1 emitted, got %d", emitted)
	}
	if pub.Count(event.TopicDocumentExpiring) != 1 {
		t.Fatalf("expected 1 expiring event")
	}
}

func TestExpiryService_ListExpiring(t *testing.T) {
	t.Parallel()
	ctx := context.Background()
	docs := repository.NewFakeDocumentRepo()
	svc := NewExpiryService(docs, event.NewInMemoryPublisher(), 30, zerolog.Nop())

	tenant := uuid.New()
	d := time.Now().UTC().AddDate(0, 0, 5)
	_ = docs.Create(ctx, &domain.Document{TenantID: tenant, Title: "5d", Category: domain.DocTypeContract, CurrentVersion: 1, RetentionUntil: &d})
	items, err := svc.ListExpiring(ctx, 10)
	if err != nil {
		t.Fatalf("list: %v", err)
	}
	if len(items) != 1 || items[0].DaysRemaining < 4 || items[0].DaysRemaining > 5 {
		t.Fatalf("bad items: %+v", items)
	}
}
