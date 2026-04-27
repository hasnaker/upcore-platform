package domain

import (
	"errors"
	"testing"
	"time"

	"github.com/google/uuid"
)

// NOTE: These tests exercise the pure helpers on domain types. They do not
// require database access and run under `go test ./internal/domain/...`.

func baseEvent() *Event {
	return &Event{
		ID:           uuid.New(),
		TenantID:     uuid.New(),
		OccurredAt:   time.Now().UTC(),
		EventType:    "audit.read",
		ActorType:    ActorTypeUser,
		ActorID:      uuid.New(),
		ResourceType: "employee",
		ResourceID:   uuid.New(),
		Service:      "audit",
		Action:       ActionRead,
		Result:       ResultSuccess,
	}
}

func TestEventValidate_HappyPath(t *testing.T) {
	ev := baseEvent()
	if err := ev.Validate(); err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
}

func TestEventValidate_RequiresTenant(t *testing.T) {
	ev := baseEvent()
	ev.TenantID = uuid.Nil
	err := ev.Validate()
	if err == nil || !errors.Is(err, ErrInvalidInput) {
		t.Fatalf("expected ErrInvalidInput, got %v", err)
	}
}

func TestEventValidate_RequiresOccurredAt(t *testing.T) {
	ev := baseEvent()
	ev.OccurredAt = time.Time{}
	if err := ev.Validate(); err == nil {
		t.Fatal("expected error for zero occurred_at")
	}
}

func TestEventValidate_RequiresEventType(t *testing.T) {
	ev := baseEvent()
	ev.EventType = ""
	if err := ev.Validate(); err == nil {
		t.Fatal("expected error for empty event_type")
	}
}

func TestEventValidate_RequiresAction(t *testing.T) {
	ev := baseEvent()
	ev.Action = ""
	if err := ev.Validate(); err == nil {
		t.Fatal("expected error for empty action")
	}
}

func TestEventValidate_RequiresService(t *testing.T) {
	ev := baseEvent()
	ev.Service = ""
	if err := ev.Validate(); err == nil {
		t.Fatal("expected error for empty service")
	}
}

func TestEventValidate_DefaultsActorType(t *testing.T) {
	ev := baseEvent()
	ev.ActorType = ""
	if err := ev.Validate(); err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if ev.ActorType != ActorTypeSystem {
		t.Fatalf("expected default actor_type=system, got %q", ev.ActorType)
	}
}

func TestEventValidate_DefaultsResult(t *testing.T) {
	ev := baseEvent()
	ev.Result = ""
	if err := ev.Validate(); err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if ev.Result != ResultSuccess {
		t.Fatalf("expected default result=success, got %q", ev.Result)
	}
}

func TestEventValidate_RejectsUnknownActorType(t *testing.T) {
	ev := baseEvent()
	ev.ActorType = ActorType("alien")
	if err := ev.Validate(); err == nil {
		t.Fatal("expected error for unknown actor_type")
	}
}

func TestEventRedact_StripsPII(t *testing.T) {
	ev := baseEvent()
	ev.ActorEmail = "kurucu@upcore.io"
	ev.IPAddress = "192.0.2.1"
	ev.UserAgent = "Mozilla/5.0"
	r := ev.Redact()
	if r.ActorEmail != "" || r.IPAddress != "" || r.UserAgent != "" {
		t.Fatalf("PII not redacted: %+v", r)
	}
	// The original must stay intact for in-memory access patterns.
	if ev.ActorEmail == "" {
		t.Fatal("Redact mutated the original event")
	}
}
