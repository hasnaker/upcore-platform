package domain

import (
	"testing"
	"time"
)

func TestSubscriptionIsActive(t *testing.T) {
	s := &Subscription{Status: SubStatusActive}
	if !s.IsActive() {
		t.Fatal("active should be active")
	}
	s.Status = SubStatusTrialing
	if !s.IsActive() {
		t.Fatal("trialing should be active")
	}
	s.Status = SubStatusCanceled
	if s.IsActive() {
		t.Fatal("canceled should not be active")
	}
}

func TestSubscriptionIsTrialing(t *testing.T) {
	future := time.Now().Add(24 * time.Hour)
	past := time.Now().Add(-24 * time.Hour)
	s := &Subscription{Status: SubStatusTrialing, TrialEndsAt: &future}
	if !s.IsTrialing() {
		t.Fatal("expected trialing")
	}
	s.TrialEndsAt = &past
	if s.IsTrialing() {
		t.Fatal("expired trial should not be trialing")
	}
}

func TestSubscriptionDaysUntilRenewal(t *testing.T) {
	s := &Subscription{CurrentPeriodEnd: time.Now().Add(5 * 24 * time.Hour)}
	if d := s.DaysUntilRenewal(); d < 4 || d > 5 {
		t.Fatalf("days=%d want 4-5", d)
	}
	s.CurrentPeriodEnd = time.Now().Add(-time.Hour)
	if d := s.DaysUntilRenewal(); d != 0 {
		t.Fatalf("past period should return 0, got %d", d)
	}
}
