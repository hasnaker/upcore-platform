package service

import (
	"context"
	"testing"

	"github.com/rs/zerolog"

	"github.com/upcore/tenant/internal/event"
	"github.com/upcore/tenant/internal/testsupport"
)

func setupUsageService(t *testing.T) (*UsageService, *TenantService, *event.InMemoryPublisher) {
	t.Helper()
	pub := event.NewInMemoryPublisher()
	tenants := testsupport.NewFakeTenantRepo()
	plans := testsupport.NewFakePlanRepo()
	subs := testsupport.NewFakeSubscriptionRepo()
	usage := testsupport.NewFakeUsageRepo()
	log := zerolog.Nop()
	tsvc := NewTenantService(NoopTxRunner{}, tenants, plans, subs, usage, pub, 14, log)
	usvc := NewUsageService(usage, subs, plans, pub, log)
	return usvc, tsvc, pub
}

func TestUsage_IncrementEmployees(t *testing.T) {
	usvc, tsvc, _ := setupUsageService(t)
	ctx := context.Background()
	res, _ := tsvc.Signup(ctx, validSignupReq())

	for i := 0; i < 5; i++ {
		if err := usvc.IncrementEmployees(ctx, res.TenantID, 1); err != nil {
			t.Fatalf("increment: %v", err)
		}
	}
	usage, err := usvc.CurrentUsage(ctx, res.TenantID)
	if err != nil {
		t.Fatalf("current: %v", err)
	}
	if usage["employees"] != 5 {
		t.Fatalf("employees=%d want 5", usage["employees"])
	}
}

func TestUsage_SeatCapEventOnCapReached(t *testing.T) {
	usvc, tsvc, pub := setupUsageService(t)
	ctx := context.Background()
	res, _ := tsvc.Signup(ctx, validSignupReq()) // free: 25 cap

	for i := 0; i < 25; i++ {
		_ = usvc.IncrementEmployees(ctx, res.TenantID, 1)
	}
	// 26th should trigger seat-limit event.
	_ = usvc.IncrementEmployees(ctx, res.TenantID, 1)
	if pub.Count(event.TopicSeatLimitReached) == 0 {
		t.Fatalf("expected seat-limit event")
	}
}

func TestUsage_CheckSeatCap(t *testing.T) {
	usvc, tsvc, _ := setupUsageService(t)
	ctx := context.Background()
	res, _ := tsvc.Signup(ctx, validSignupReq())
	ok, err := usvc.CheckSeatCap(ctx, res.TenantID)
	if err != nil {
		t.Fatalf("check: %v", err)
	}
	if !ok {
		t.Fatal("expected under cap at 0 employees")
	}
}

func TestUsage_IncrementAssessments(t *testing.T) {
	usvc, tsvc, _ := setupUsageService(t)
	ctx := context.Background()
	res, _ := tsvc.Signup(ctx, validSignupReq())
	if err := usvc.IncrementAssessments(ctx, res.TenantID, 3); err != nil {
		t.Fatalf("increment: %v", err)
	}
	usage, _ := usvc.CurrentUsage(ctx, res.TenantID)
	if usage["assessments"] != 3 {
		t.Fatalf("assessments=%d want 3", usage["assessments"])
	}
}
