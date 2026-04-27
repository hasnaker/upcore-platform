package domain

import (
	"testing"

	"github.com/google/uuid"
)

func validObjection() *MLObjection {
	return &MLObjection{
		TenantID:     uuid.New(),
		UserID:       uuid.New(),
		PredictionID: uuid.New(),
		Reason:       "Bu tahmin benim durumumu yansıtmıyor.",
		Status:       MLObjectionStatusReceived,
	}
}

func TestMLObjection_Validate(t *testing.T) {
	if err := validObjection().Validate(); err != nil {
		t.Fatalf("unexpected validation error: %v", err)
	}

	cases := []struct {
		name string
		mut  func(*MLObjection)
	}{
		{"missing tenant", func(o *MLObjection) { o.TenantID = uuid.Nil }},
		{"missing user", func(o *MLObjection) { o.UserID = uuid.Nil }},
		{"missing prediction", func(o *MLObjection) { o.PredictionID = uuid.Nil }},
		{"short reason", func(o *MLObjection) { o.Reason = "x" }},
	}
	for _, c := range cases {
		t.Run(c.name, func(t *testing.T) {
			o := validObjection()
			c.mut(o)
			if err := o.Validate(); err == nil {
				t.Fatalf("expected validation error for case %s", c.name)
			}
		})
	}
}

func TestMLObjection_TransitionHappyPath(t *testing.T) {
	o := validObjection()
	actor := uuid.New()
	if err := o.Transition(MLObjectionStatusVerifying, actor); err != nil {
		t.Fatalf("received→verifying failed: %v", err)
	}
	if err := o.Transition(MLObjectionStatusInProgress, actor); err != nil {
		t.Fatalf("verifying→in_progress failed: %v", err)
	}
	if err := o.Transition(MLObjectionStatusCompleted, actor); err != nil {
		t.Fatalf("in_progress→completed failed: %v", err)
	}
	if o.CompletedAt == nil {
		t.Fatalf("completed_at should be set after completion")
	}
}

func TestMLObjection_TransitionInvalid(t *testing.T) {
	o := validObjection()
	if err := o.Transition(MLObjectionStatusCompleted, uuid.New()); err == nil {
		t.Fatal("received→completed should be invalid")
	}

	// Already finalised cannot transition again.
	o.Status = MLObjectionStatusRejected
	if err := o.Transition(MLObjectionStatusInProgress, uuid.New()); err == nil {
		t.Fatal("rejected→in_progress should be invalid")
	}
}

func TestMLObjection_OverdueAfter30Days(t *testing.T) {
	o := validObjection()
	o.ObjectedAt = o.ObjectedAt.AddDate(0, 0, -40)
	if !o.IsOverdue() {
		t.Fatal("objection older than 30 days should be overdue")
	}
	// Completed is never overdue.
	o.Status = MLObjectionStatusCompleted
	if o.IsOverdue() {
		t.Fatal("completed objection should never be overdue")
	}
}
