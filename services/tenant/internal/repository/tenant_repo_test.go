package repository_test

import (
	"context"
	"testing"
	"time"

	"github.com/google/uuid"

	"github.com/upcore/tenant/internal/domain"
	"github.com/upcore/tenant/internal/repository"
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

func TestFakeTenantRepo_ListAdmin_FiltersAndPagination(t *testing.T) {
	ctx := context.Background()
	subs := testsupport.NewFakeSubscriptionRepo()
	usage := testsupport.NewFakeUsageRepo()
	repo := testsupport.NewFakeTenantRepo().WithSubs(subs).WithUsage(usage)

	// seed 4 tenants with different statuses/plans
	seed := func(slug, plan string, status domain.TenantStatus) uuid.UUID {
		t.Helper()
		tid := uuid.New()
		tn := &domain.Tenant{ID: tid, Name: slug, Slug: slug, Status: status, CreatedAt: time.Now().UTC()}
		if err := repo.Create(ctx, nil, tn); err != nil {
			t.Fatalf("create %s: %v", slug, err)
		}
		sub := &domain.Subscription{TenantID: tid, PlanID: plan, Status: domain.SubStatusActive, Seats: 10}
		_ = subs.Create(ctx, nil, sub)
		_ = usage.Increment(ctx, tid, domain.MetricEmployees, 7, time.Now().UTC())
		return tid
	}

	_ = seed("alpha", "free", domain.TenantStatusActive)
	_ = seed("beta", "starter", domain.TenantStatusTrial)
	suspID := seed("gamma", "growth", domain.TenantStatusSuspended)
	_ = seed("delta", "free", domain.TenantStatusActive)

	// total default
	rows, total, err := repo.ListAdmin(ctx, repository.TenantListFilter{})
	if err != nil {
		t.Fatalf("list: %v", err)
	}
	if total != 4 {
		t.Fatalf("total=%d want 4", total)
	}
	if len(rows) != 4 {
		t.Fatalf("rows=%d", len(rows))
	}
	// employee count wired via usage
	for _, row := range rows {
		if row.EmployeeCount != 7 {
			t.Fatalf("expected 7 employees, got %d", row.EmployeeCount)
		}
		if row.PlanID == nil {
			t.Fatalf("plan not joined for %s", row.Slug)
		}
	}

	// status filter = suspended
	rows, total, err = repo.ListAdmin(ctx, repository.TenantListFilter{Status: "suspended"})
	if err != nil {
		t.Fatalf("list suspended: %v", err)
	}
	if total != 1 || rows[0].ID != suspID {
		t.Fatalf("suspended filter failed: total=%d", total)
	}

	// plan filter
	_, total, err = repo.ListAdmin(ctx, repository.TenantListFilter{PlanID: "free"})
	if err != nil {
		t.Fatalf("list plan: %v", err)
	}
	if total != 2 {
		t.Fatalf("expected 2 free plans, got %d", total)
	}

	// search
	_, total, err = repo.ListAdmin(ctx, repository.TenantListFilter{Search: "amm"})
	if err != nil {
		t.Fatalf("list search: %v", err)
	}
	if total != 1 {
		t.Fatalf("expected 1 'gamma' match, got %d", total)
	}

	// pagination
	rows, total, err = repo.ListAdmin(ctx, repository.TenantListFilter{PageSize: 2, Page: 1})
	if err != nil {
		t.Fatalf("list paginated: %v", err)
	}
	if len(rows) != 2 || total != 4 {
		t.Fatalf("page 1: rows=%d total=%d", len(rows), total)
	}
	rows, _, _ = repo.ListAdmin(ctx, repository.TenantListFilter{PageSize: 2, Page: 2})
	if len(rows) != 2 {
		t.Fatalf("page 2 len=%d", len(rows))
	}

	// invalid status
	_, _, err = repo.ListAdmin(ctx, repository.TenantListFilter{Status: "banana"})
	if err == nil {
		t.Fatalf("expected validation error")
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
