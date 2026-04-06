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

func setupSubServiceWithTenant(t *testing.T) (*SubscriptionService, *TenantService, *event.InMemoryPublisher, *testsupport.FakeSubscriptionRepo) {
	t.Helper()
	pub := event.NewInMemoryPublisher()
	tenants := testsupport.NewFakeTenantRepo()
	plans := testsupport.NewFakePlanRepo()
	subs := testsupport.NewFakeSubscriptionRepo()
	usage := testsupport.NewFakeUsageRepo()
	log := zerolog.Nop()
	tsvc := NewTenantService(NoopTxRunner{}, tenants, plans, subs, usage, pub, 14, log)
	ssvc := NewSubscriptionService(plans, subs, pub, log)
	return ssvc, tsvc, pub, subs
}

func TestChangePlan_Success(t *testing.T) {
	ssvc, tsvc, pub, _ := setupSubServiceWithTenant(t)
	ctx := context.Background()
	res, _ := tsvc.Signup(ctx, validSignupReq())

	view, err := ssvc.ChangePlan(ctx, res.TenantID, "starter")
	if err != nil {
		t.Fatalf("change plan: %v", err)
	}
	if view.Plan.ID != "starter" {
		t.Fatalf("plan=%s", view.Plan.ID)
	}
	if view.Subscription.Status != domain.SubStatusActive {
		t.Fatalf("expected active after upgrade, got %s", view.Subscription.Status)
	}
	if pub.Count(event.TopicTenantUpgraded) != 1 {
		t.Fatalf("expected upgraded event")
	}
}

func TestChangePlan_InvalidPlan(t *testing.T) {
	ssvc, tsvc, _, _ := setupSubServiceWithTenant(t)
	ctx := context.Background()
	res, _ := tsvc.Signup(ctx, validSignupReq())
	_, err := ssvc.ChangePlan(ctx, res.TenantID, "doesnotexist")
	if !errors.Is(err, domain.ErrPlanNotFound) {
		t.Fatalf("expected plan not found, got %v", err)
	}
}

func TestCancel_Success(t *testing.T) {
	ssvc, tsvc, pub, subs := setupSubServiceWithTenant(t)
	ctx := context.Background()
	res, _ := tsvc.Signup(ctx, validSignupReq())

	sub, err := ssvc.Cancel(ctx, res.TenantID)
	if err != nil {
		t.Fatalf("cancel: %v", err)
	}
	if sub.Status != domain.SubStatusCanceled {
		t.Fatalf("status=%s", sub.Status)
	}
	if pub.Count(event.TopicTenantCancelled) != 1 {
		t.Fatalf("expected cancelled event")
	}
	stored, _ := subs.GetByTenantID(ctx, res.TenantID)
	if stored.CancelAt == nil {
		t.Fatal("cancel_at should be set")
	}
}

func TestCancel_AlreadyCanceled(t *testing.T) {
	ssvc, tsvc, _, _ := setupSubServiceWithTenant(t)
	ctx := context.Background()
	res, _ := tsvc.Signup(ctx, validSignupReq())
	_, _ = ssvc.Cancel(ctx, res.TenantID)
	_, err := ssvc.Cancel(ctx, res.TenantID)
	if !errors.Is(err, domain.ErrAlreadyCanceled) {
		t.Fatalf("expected ErrAlreadyCanceled, got %v", err)
	}
}

func TestUpdateSeats_EnforcesCap(t *testing.T) {
	ssvc, tsvc, _, _ := setupSubServiceWithTenant(t)
	ctx := context.Background()
	res, _ := tsvc.Signup(ctx, validSignupReq()) // free plan, cap 25

	if _, err := ssvc.UpdateSeats(ctx, res.TenantID, 25); err != nil {
		t.Fatalf("25 seats should fit free plan: %v", err)
	}
	if _, err := ssvc.UpdateSeats(ctx, res.TenantID, 26); !errors.Is(err, domain.ErrSeatCapReached) {
		t.Fatalf("expected seat cap reached, got %v", err)
	}
}

func TestUpdateSeats_UnlimitedPlan(t *testing.T) {
	ssvc, tsvc, _, _ := setupSubServiceWithTenant(t)
	ctx := context.Background()
	res, _ := tsvc.Signup(ctx, validSignupReq())
	if _, err := ssvc.ChangePlan(ctx, res.TenantID, "enterprise"); err != nil {
		t.Fatalf("change to enterprise: %v", err)
	}
	if _, err := ssvc.UpdateSeats(ctx, res.TenantID, 99999); err != nil {
		t.Fatalf("enterprise should allow any seats: %v", err)
	}
}

func TestGetCurrent(t *testing.T) {
	ssvc, tsvc, _, _ := setupSubServiceWithTenant(t)
	ctx := context.Background()
	res, _ := tsvc.Signup(ctx, validSignupReq())
	view, err := ssvc.GetCurrent(ctx, res.TenantID)
	if err != nil {
		t.Fatalf("get current: %v", err)
	}
	if view.Plan.ID != "free" {
		t.Fatalf("plan=%s", view.Plan.ID)
	}
	if view.Subscription.Status != domain.SubStatusTrialing {
		t.Fatalf("status=%s", view.Subscription.Status)
	}
}
