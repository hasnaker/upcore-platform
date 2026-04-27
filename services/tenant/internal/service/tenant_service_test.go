package service

import (
	"context"
	"errors"
	"testing"

	"github.com/google/uuid"
	"github.com/rs/zerolog"

	"github.com/upcore/tenant/internal/domain"
	"github.com/upcore/tenant/internal/event"
	"github.com/upcore/tenant/internal/testsupport"
)

func uuidNew() uuid.UUID { return uuid.New() }

func newTestService(t *testing.T) (*TenantService, *event.InMemoryPublisher, *testsupport.FakeTenantRepo, *testsupport.FakeSubscriptionRepo) {
	t.Helper()
	pub := event.NewInMemoryPublisher()
	tenants := testsupport.NewFakeTenantRepo()
	plans := testsupport.NewFakePlanRepo()
	subs := testsupport.NewFakeSubscriptionRepo()
	usage := testsupport.NewFakeUsageRepo()
	log := zerolog.Nop()
	svc := NewTenantService(NoopTxRunner{}, tenants, plans, subs, usage, pub, 14, log)
	return svc, pub, tenants, subs
}

func validSignupReq() SignupRequest {
	return SignupRequest{
		CompanyName:    "Acme A.Ş.",
		CompanySlug:    "acme",
		AdminEmail:     "founder@acme.com",
		AdminFirstName: "Mehmet",
		AdminLastName:  "Yılmaz",
		PlanID:         "free",
		Country:        "TR",
		Locale:         "tr-TR",
	}
}

func TestSignup_Success(t *testing.T) {
	svc, pub, tenants, subs := newTestService(t)
	ctx := context.Background()

	res, err := svc.Signup(ctx, validSignupReq())
	if err != nil {
		t.Fatalf("signup failed: %v", err)
	}
	if res.TenantID == (res.SubscriptionID) {
		t.Fatal("ids should differ")
	}
	if res.Slug != "acme" {
		t.Fatalf("slug=%q", res.Slug)
	}
	if res.SignupToken == "" {
		t.Fatal("expected signup token")
	}
	if res.TrialEndsAt == nil {
		t.Fatal("expected trial end")
	}

	// Tenant and subscription persisted.
	got, err := tenants.GetByID(ctx, res.TenantID)
	if err != nil {
		t.Fatalf("get tenant: %v", err)
	}
	if got.Status != domain.TenantStatusTrial {
		t.Fatalf("status=%s", got.Status)
	}
	sub, err := subs.GetByTenantID(ctx, res.TenantID)
	if err != nil {
		t.Fatalf("get sub: %v", err)
	}
	if sub.PlanID != "free" {
		t.Fatalf("plan=%s", sub.PlanID)
	}

	// Events published.
	if pub.Count(event.TopicTenantCreated) != 1 {
		t.Fatalf("expected 1 tenant.created event, got %d", pub.Count(event.TopicTenantCreated))
	}
	if pub.Count(event.TopicTenantAdminInvited) != 1 {
		t.Fatalf("expected 1 admin invited event, got %d", pub.Count(event.TopicTenantAdminInvited))
	}
}

func TestSignup_DuplicateSlug(t *testing.T) {
	svc, _, _, _ := newTestService(t)
	ctx := context.Background()
	if _, err := svc.Signup(ctx, validSignupReq()); err != nil {
		t.Fatalf("first signup: %v", err)
	}
	_, err := svc.Signup(ctx, validSignupReq())
	if !errors.Is(err, domain.ErrSlugTaken) {
		t.Fatalf("expected ErrSlugTaken, got %v", err)
	}
}

func TestSignup_InvalidEmail(t *testing.T) {
	svc, _, _, _ := newTestService(t)
	ctx := context.Background()
	req := validSignupReq()
	req.AdminEmail = "not-an-email"
	_, err := svc.Signup(ctx, req)
	if !errors.Is(err, domain.ErrInvalidEmail) {
		t.Fatalf("expected ErrInvalidEmail, got %v", err)
	}
}

func TestSignup_InvalidSlug(t *testing.T) {
	svc, _, _, _ := newTestService(t)
	ctx := context.Background()
	req := validSignupReq()
	req.CompanySlug = "ab" // too short
	_, err := svc.Signup(ctx, req)
	if !errors.Is(err, domain.ErrInvalidSlug) {
		t.Fatalf("expected ErrInvalidSlug, got %v", err)
	}
}

func TestSignup_PlanNotFound(t *testing.T) {
	svc, _, _, _ := newTestService(t)
	ctx := context.Background()
	req := validSignupReq()
	req.PlanID = "doesnotexist"
	_, err := svc.Signup(ctx, req)
	if !errors.Is(err, domain.ErrPlanNotFound) {
		t.Fatalf("expected ErrPlanNotFound, got %v", err)
	}
}

func TestSignup_MissingRequiredFields(t *testing.T) {
	svc, _, _, _ := newTestService(t)
	ctx := context.Background()
	req := validSignupReq()
	req.CompanyName = ""
	_, err := svc.Signup(ctx, req)
	if !IsValidationError(err) {
		t.Fatalf("expected validation error, got %v", err)
	}
}

func TestSignup_NormalizesSlug(t *testing.T) {
	svc, _, tenants, _ := newTestService(t)
	ctx := context.Background()
	req := validSignupReq()
	req.CompanySlug = "  ACME-CORP  "
	res, err := svc.Signup(ctx, req)
	if err != nil {
		t.Fatalf("signup: %v", err)
	}
	got, _ := tenants.GetByID(ctx, res.TenantID)
	if got.Slug != "acme-corp" {
		t.Fatalf("slug=%q", got.Slug)
	}
}

func TestUpdate_Success(t *testing.T) {
	svc, _, _, _ := newTestService(t)
	ctx := context.Background()
	res, _ := svc.Signup(ctx, validSignupReq())
	newName := "Acme Updated"
	updated, err := svc.Update(ctx, res.TenantID, UpdateTenantInput{Name: &newName})
	if err != nil {
		t.Fatalf("update: %v", err)
	}
	if updated.Name != "Acme Updated" {
		t.Fatalf("name=%q", updated.Name)
	}
}

func TestDelete_SoftDeletes(t *testing.T) {
	svc, pub, tenants, _ := newTestService(t)
	ctx := context.Background()
	res, _ := svc.Signup(ctx, validSignupReq())
	if err := svc.Delete(ctx, res.TenantID); err != nil {
		t.Fatalf("delete: %v", err)
	}
	if _, err := tenants.GetByID(ctx, res.TenantID); !errors.Is(err, domain.ErrTenantNotFound) {
		t.Fatalf("expected not found after soft delete, got %v", err)
	}
	if pub.Count(event.TopicTenantDeleted) != 1 {
		t.Fatalf("expected deleted event, got %d", pub.Count(event.TopicTenantDeleted))
	}
}

func TestChangeStatus_SuspendAndActivate(t *testing.T) {
	svc, pub, _, _ := newTestService(t)
	ctx := context.Background()
	res, _ := svc.Signup(ctx, validSignupReq())

	// trial → suspended (requires reason).
	if _, err := svc.ChangeStatus(ctx, res.TenantID, domain.TenantStatusSuspended, ""); !IsValidationError(err) {
		t.Fatalf("expected validation (missing reason), got %v", err)
	}
	if _, err := svc.ChangeStatus(ctx, res.TenantID, domain.TenantStatusSuspended, "non-payment"); err != nil {
		t.Fatalf("suspend: %v", err)
	}
	if pub.Count(event.TopicTenantSuspended) != 1 {
		t.Fatalf("expected suspended event")
	}
	// suspended → active
	if _, err := svc.ChangeStatus(ctx, res.TenantID, domain.TenantStatusActive, "paid"); err != nil {
		t.Fatalf("activate: %v", err)
	}
	if pub.Count(event.TopicTenantActivated) != 1 {
		t.Fatalf("expected activated event")
	}
	// active → active = no-op ⇒ 422
	if _, err := svc.ChangeStatus(ctx, res.TenantID, domain.TenantStatusActive, ""); !IsValidationError(err) {
		t.Fatalf("expected noop validation, got %v", err)
	}
	// invalid next status
	if _, err := svc.ChangeStatus(ctx, res.TenantID, domain.TenantStatusDeleted, ""); !IsValidationError(err) {
		t.Fatalf("expected validation for deleted transition, got %v", err)
	}
}

func TestListAdmin_FiltersAndPagination(t *testing.T) {
	svc, _, _, _ := newTestService(t)
	ctx := context.Background()

	for i := 0; i < 3; i++ {
		req := validSignupReq()
		req.CompanySlug = "tenant-" + string(rune('a'+i))
		req.AdminEmail = "a" + string(rune('a'+i)) + "@acme.com"
		if _, err := svc.Signup(ctx, req); err != nil {
			t.Fatalf("seed: %v", err)
		}
	}

	res, err := svc.ListAdmin(ctx, AdminListFilter{Page: 1, PageSize: 2})
	if err != nil {
		t.Fatalf("list: %v", err)
	}
	if res.Total != 3 {
		t.Fatalf("total=%d want 3", res.Total)
	}
	if len(res.Items) != 2 {
		t.Fatalf("items=%d want 2", len(res.Items))
	}
	if !res.HasMore {
		t.Fatalf("expected has_more")
	}

	// search
	res2, err := svc.ListAdmin(ctx, AdminListFilter{Search: "tenant-a"})
	if err != nil {
		t.Fatalf("search: %v", err)
	}
	if res2.Total != 1 {
		t.Fatalf("expected 1 match, got %d", res2.Total)
	}
}

func TestGetAdminDetail_ReturnsSubscriptionAndPlan(t *testing.T) {
	svc, _, _, _ := newTestService(t)
	ctx := context.Background()
	res, _ := svc.Signup(ctx, validSignupReq())

	d, err := svc.GetAdminDetail(ctx, res.TenantID)
	if err != nil {
		t.Fatalf("detail: %v", err)
	}
	if d.Tenant == nil || d.Tenant.ID != res.TenantID {
		t.Fatalf("tenant missing")
	}
	if d.Subscription == nil || d.Subscription.PlanID != "free" {
		t.Fatalf("subscription missing")
	}
	if d.Plan == nil || d.Plan.ID != "free" {
		t.Fatalf("plan missing")
	}
}

func TestGetAdminDetail_NotFound(t *testing.T) {
	svc, _, _, _ := newTestService(t)
	ctx := context.Background()
	if _, err := svc.GetAdminDetail(ctx, uuidNew()); !errors.Is(err, domain.ErrTenantNotFound) {
		t.Fatalf("expected not found, got %v", err)
	}
}

func TestSuspendActivate(t *testing.T) {
	svc, pub, _, _ := newTestService(t)
	ctx := context.Background()
	res, _ := svc.Signup(ctx, validSignupReq())
	if err := svc.Suspend(ctx, res.TenantID, "nonpayment"); err != nil {
		t.Fatalf("suspend: %v", err)
	}
	if pub.Count(event.TopicTenantSuspended) != 1 {
		t.Fatalf("expected suspended event")
	}
	if err := svc.Activate(ctx, res.TenantID); err != nil {
		t.Fatalf("activate: %v", err)
	}
	if pub.Count(event.TopicTenantActivated) != 1 {
		t.Fatalf("expected activated event")
	}
}
