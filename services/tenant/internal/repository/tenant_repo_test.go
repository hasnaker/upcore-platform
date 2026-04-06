package repository_test

import (
	"context"
	"testing"
	"time"

	"github.com/google/uuid"

	"github.com/upcore/tenant/internal/domain"
	"github.com/upcore/tenant/internal/testsupport"
)

func nowUTC() time.Time { return time.Now().UTC() }

func TestFakeTenantRepoLifecycle(t *testing.T) {
	repo := testsupport.NewFakeTenantRepo()
	ctx := context.Background()

	tr := &domain.Tenant{Name: "Acme", Slug: "acme", Country: "TR", Locale: "tr-TR", Status: domain.TenantStatusTrial}
	if err := repo.Create(ctx, nil, tr); err != nil {
		t.Fatalf("create: %v", err)
	}
	if tr.ID == uuid.Nil {
		t.Fatal("ID should be assigned")
	}

	got, err := repo.GetByID(ctx, tr.ID)
	if err != nil {
		t.Fatalf("get: %v", err)
	}
	if got.Name != "Acme" {
		t.Fatalf("name=%q", got.Name)
	}

	gotBySlug, err := repo.GetBySlug(ctx, "acme")
	if err != nil {
		t.Fatalf("get by slug: %v", err)
	}
	if gotBySlug.ID != tr.ID {
		t.Fatal("slug mismatch")
	}

	// Duplicate slug => conflict.
	dup := &domain.Tenant{Name: "X", Slug: "acme"}
	if err := repo.Create(ctx, nil, dup); err != domain.ErrSlugTaken {
		t.Fatalf("expected ErrSlugTaken, got %v", err)
	}

	// Soft delete hides from queries.
	if err := repo.SoftDelete(ctx, tr.ID, nowUTC()); err != nil {
		t.Fatalf("soft delete: %v", err)
	}
	if _, err := repo.GetByID(ctx, tr.ID); err != domain.ErrTenantNotFound {
		t.Fatalf("expected not found after delete, got %v", err)
	}
}

func TestFakePlanRepo(t *testing.T) {
	repo := testsupport.NewFakePlanRepo()
	ctx := context.Background()
	plans, err := repo.ListActive(ctx)
	if err != nil {
		t.Fatalf("list: %v", err)
	}
	if len(plans) == 0 {
		t.Fatal("expected seeded plans")
	}
	p, err := repo.GetByID(ctx, "free")
	if err != nil {
		t.Fatalf("get free: %v", err)
	}
	if p.Tier != domain.PlanTierFree {
		t.Fatalf("tier=%s", p.Tier)
	}
	if _, err := repo.GetByID(ctx, "nope"); err != domain.ErrPlanNotFound {
		t.Fatalf("expected ErrPlanNotFound, got %v", err)
	}
}

func TestFakeSubscriptionRepo(t *testing.T) {
	repo := testsupport.NewFakeSubscriptionRepo()
	ctx := context.Background()
	tid := uuid.New()
	s := &domain.Subscription{TenantID: tid, PlanID: "free", Status: domain.SubStatusTrialing}
	if err := repo.Create(ctx, nil, s); err != nil {
		t.Fatalf("create: %v", err)
	}
	got, err := repo.GetByTenantID(ctx, tid)
	if err != nil {
		t.Fatalf("get: %v", err)
	}
	if got.PlanID != "free" {
		t.Fatalf("plan=%s", got.PlanID)
	}
	got.PlanID = "starter"
	if err := repo.Update(ctx, got); err != nil {
		t.Fatalf("update: %v", err)
	}
	got2, _ := repo.GetByTenantID(ctx, tid)
	if got2.PlanID != "starter" {
		t.Fatalf("expected updated plan, got %s", got2.PlanID)
	}
	if err := repo.Cancel(ctx, got.ID, nowUTC()); err != nil {
		t.Fatalf("cancel: %v", err)
	}
	got3, _ := repo.GetByTenantID(ctx, tid)
	if got3.Status != domain.SubStatusCanceled {
		t.Fatalf("expected canceled, got %s", got3.Status)
	}
}

func TestFakeUsageRepo(t *testing.T) {
	repo := testsupport.NewFakeUsageRepo()
	ctx := context.Background()
	tid := uuid.New()
	now := nowUTC()
	if err := repo.Increment(ctx, tid, domain.MetricEmployees, 3, now); err != nil {
		t.Fatalf("increment: %v", err)
	}
	if err := repo.Increment(ctx, tid, domain.MetricEmployees, 2, now); err != nil {
		t.Fatalf("increment: %v", err)
	}
	c, err := repo.Get(ctx, tid, domain.MetricEmployees, now)
	if err != nil {
		t.Fatalf("get: %v", err)
	}
	if c.Value != 5 {
		t.Fatalf("value=%d want 5", c.Value)
	}
	list, err := repo.ListByTenant(ctx, tid, now)
	if err != nil {
		t.Fatalf("list: %v", err)
	}
	if len(list) != 1 {
		t.Fatalf("len=%d want 1", len(list))
	}
}
