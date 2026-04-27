package domain

import (
	"context"
	"testing"

	"github.com/google/uuid"
)

func TestRotationStatus_Values(t *testing.T) {
	allowed := map[RotationStatus]bool{
		RotationProposed:  true,
		RotationApproved:  true,
		RotationRejected:  true,
		RotationActive:    true,
		RotationCompleted: true,
		RotationCancelled: true,
	}
	if len(allowed) != 6 {
		t.Errorf("expected 6 rotation statuses, got %d", len(allowed))
	}
	for s, ok := range allowed {
		if !ok {
			continue
		}
		if string(s) == "" {
			t.Errorf("empty status in set")
		}
	}
}

func TestSentinelErrors_Distinct(t *testing.T) {
	errs := []error{
		ErrNotFound,
		ErrEmployeeIneligible,
		ErrPositionNotOpen,
		ErrCooldownActive,
		ErrValidation,
		ErrUnauthorized,
		ErrSuccessionPoolFull,
		ErrCareerStepConflict,
	}
	seen := map[string]bool{}
	for _, e := range errs {
		if e == nil {
			t.Errorf("nil sentinel error")
		}
		if seen[e.Error()] {
			t.Errorf("duplicate sentinel message: %s", e.Error())
		}
		seen[e.Error()] = true
	}
}

func TestCtxKeys_CanStoreAndRead(t *testing.T) {
	tid := uuid.New()
	uid := uuid.New()
	ctx := context.Background()
	ctx = context.WithValue(ctx, CtxTenantID, tid)
	ctx = context.WithValue(ctx, CtxUserID, uid)
	ctx = context.WithValue(ctx, CtxRole, "hr_admin")

	if got, _ := ctx.Value(CtxTenantID).(uuid.UUID); got != tid {
		t.Errorf("tenant roundtrip failed")
	}
	if got, _ := ctx.Value(CtxUserID).(uuid.UUID); got != uid {
		t.Errorf("user roundtrip failed")
	}
	if got, _ := ctx.Value(CtxRole).(string); got != "hr_admin" {
		t.Errorf("role roundtrip failed")
	}
}
