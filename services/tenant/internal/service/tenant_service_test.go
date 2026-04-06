package service

import (
	"context"
	"errors"
	"testing"

	"github.com/rs/zerolog"

	"github.com/upcore/tenant/internal/domain"
	"github.com/upcore/tenant/internal/event"
	"github.com/upcore/tenant/internal/testsupport"
)

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
