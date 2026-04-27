package event_test

import (
	"context"
	"encoding/json"
	"testing"

	"github.com/google/uuid"
	"github.com/rs/zerolog"

	"github.com/upcore/notification/internal/domain"
	"github.com/upcore/notification/internal/event"
)

type captured struct {
	tenantID     uuid.UUID
	templateKey  string
	recipientID  *uuid.UUID
	recipientEML string
	vars         map[string]any
	category     domain.Category
}

type fakeDispatcher struct {
	calls []captured
}

func (f *fakeDispatcher) SendFromEvent(_ context.Context, tenantID uuid.UUID, tmpl string, _ domain.NotifChannel, recipientID *uuid.UUID, recipientEML string, vars map[string]any, cat domain.Category) error {
	f.calls = append(f.calls, captured{
		tenantID:     tenantID,
		templateKey:  tmpl,
		recipientID:  recipientID,
		recipientEML: recipientEML,
		vars:         vars,
		category:     cat,
	})
	return nil
}

func wrapEnvelope(t *testing.T, topic string, payload map[string]any) []byte {
	t.Helper()
	rawPayload, err := json.Marshal(payload)
	if err != nil {
		t.Fatalf("marshal payload: %v", err)
	}
	env := map[string]any{
		"event_id":     uuid.NewString(),
		"event_type":   topic,
		"service_name": "intervention",
		"payload":      json.RawMessage(rawPayload),
	}
	raw, err := json.Marshal(env)
	if err != nil {
		t.Fatalf("marshal envelope: %v", err)
	}
	return raw
}

func TestHandleInterventionAssigned_BuildsConsentLinkWhenMissing(t *testing.T) {
	dispatcher := &fakeDispatcher{}
	sub := event.NewSubscriber(dispatcher, zerolog.Nop()).WithAppBaseURL("https://app.example.com")

	tid := uuid.New()
	emp := uuid.New()
	assignment := uuid.New()
	raw := wrapEnvelope(t, event.TopicInterventionAssigned, map[string]any{
		"tenant_id":            tid.String(),
		"employee_id":          emp.String(),
		"assignment_id":        assignment.String(),
		"intervention":         "COACH_01",
		"intervention_type":    "Bireysel Koçluk",
		"description":          "4 haftalık 1-on-1 koçluk",
		"evidence_tier":        "A",
		"expected_effect_size": "0.62",
		"duration_weeks":       4,
		"time_to_effect_weeks": 6,
	})

	if err := sub.HandleInterventionAssigned(context.Background(), raw); err != nil {
		t.Fatalf("handle: %v", err)
	}
	if len(dispatcher.calls) != 1 {
		t.Fatalf("expected 1 dispatch, got %d", len(dispatcher.calls))
	}
	got := dispatcher.calls[0]
	if got.templateKey != "intervention_consent_request" {
		t.Errorf("template: %s", got.templateKey)
	}
	if got.recipientID == nil || *got.recipientID != emp {
		t.Errorf("recipient id mismatch: %+v", got.recipientID)
	}
	expectedLink := "https://app.example.com/portal/muhadale/" + assignment.String()
	if got.vars["consent_link"] != expectedLink {
		t.Errorf("consent_link expected %q, got %v", expectedLink, got.vars["consent_link"])
	}
	if got.vars["intervention_type"] != "Bireysel Koçluk" {
		t.Errorf("title fallback")
	}
	if got.vars["evidence_tier"] != "A" {
		t.Errorf("tier missing")
	}
}

func TestHandleInterventionAssigned_UsesExistingLink(t *testing.T) {
	dispatcher := &fakeDispatcher{}
	sub := event.NewSubscriber(dispatcher, zerolog.Nop())

	raw := wrapEnvelope(t, event.TopicInterventionAssigned, map[string]any{
		"tenant_id":     uuid.New().String(),
		"employee_id":   uuid.New().String(),
		"assignment_id": uuid.New().String(),
		"consent_link":  "https://custom.example/consent/abc",
	})
	if err := sub.HandleInterventionAssigned(context.Background(), raw); err != nil {
		t.Fatalf("handle: %v", err)
	}
	if dispatcher.calls[0].vars["consent_link"] != "https://custom.example/consent/abc" {
		t.Errorf("override lost: %v", dispatcher.calls[0].vars["consent_link"])
	}
}

func TestHandleInterventionAssigned_FallbackTitleFromCode(t *testing.T) {
	dispatcher := &fakeDispatcher{}
	sub := event.NewSubscriber(dispatcher, zerolog.Nop()).WithAppBaseURL("https://app.x/")

	raw := wrapEnvelope(t, event.TopicInterventionAssigned, map[string]any{
		"tenant_id":     uuid.New().String(),
		"employee_id":   uuid.New().String(),
		"assignment_id": uuid.New().String(),
		"intervention":  "WORKLOAD_01",
	})
	if err := sub.HandleInterventionAssigned(context.Background(), raw); err != nil {
		t.Fatalf("handle: %v", err)
	}
	if dispatcher.calls[0].vars["intervention_type"] != "WORKLOAD_01" {
		t.Errorf("fallback title: %v", dispatcher.calls[0].vars["intervention_type"])
	}
}
