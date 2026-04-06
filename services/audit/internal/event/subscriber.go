package event

import (
	"context"
	"encoding/json"
	"time"

	"github.com/google/uuid"
	"github.com/rs/zerolog"

	"github.com/upcore/audit/internal/domain"
)

// Topics consumed by the audit service.
const (
	TopicRawEvent         = "audit.event.raw.v1"
	TopicSessionRevoked   = "auth.session.revoked.v1"
	TopicUserCreated      = "auth.user.created.v1"
	TopicEmployeeDeleted  = "employee.deleted.v1"
	TopicTenantDeleted    = "tenant.deleted.v1"
)

// EventIngester receives events and enqueues them for batch processing.
type EventIngester interface {
	Enqueue(e *domain.Event) error
}

// DSRTrigger handles events that should trigger DSR processing.
type DSRTrigger interface {
	TriggerErasure(ctx context.Context, tenantID uuid.UUID, email string) error
}

// Subscriber listens to cross-service events and routes them to the
// ingestion worker or DSR handler.
type Subscriber struct {
	ingester EventIngester
	dsr      DSRTrigger
	log      zerolog.Logger
}

// NewSubscriber constructs a Subscriber.
func NewSubscriber(ingester EventIngester, dsr DSRTrigger, log zerolog.Logger) *Subscriber {
	return &Subscriber{
		ingester: ingester,
		dsr:      dsr,
		log:      log,
	}
}

// Start begins listening to all subscribed topics. In production this
// connects to Azure Service Bus; this implementation processes via
// an in-memory dispatch for local dev.
func (s *Subscriber) Start(ctx context.Context) error {
	s.log.Info().Msg("event subscriber started (waiting for Service Bus connection)")
	// In production, this would open Service Bus subscriptions and
	// route messages to the appropriate handler.
	<-ctx.Done()
	return ctx.Err()
}

// HandleRawEvent processes a catch-all audit event from any service.
func (s *Subscriber) HandleRawEvent(ctx context.Context, data []byte) error {
	var env Envelope
	if err := json.Unmarshal(data, &env); err != nil {
		s.log.Error().Err(err).Msg("unmarshal raw audit event")
		return err
	}

	var payload map[string]any
	if err := json.Unmarshal(env.Payload, &payload); err != nil {
		s.log.Error().Err(err).Msg("unmarshal raw event payload")
		return err
	}

	e := &domain.Event{
		ID:        uuid.New(),
		EventType: env.EventType,
		Service:   env.ServiceName,
		OccurredAt: env.OccurredAt,
		Action:    stringFromMap(payload, "action", "unknown"),
		ActorType: domain.ActorType(stringFromMap(payload, "actor_type", "service")),
		Result:    domain.ResultSuccess,
		CreatedAt: time.Now().UTC(),
	}

	if tid, err := uuid.Parse(stringFromMap(payload, "tenant_id", "")); err == nil {
		e.TenantID = tid
	}
	if aid, err := uuid.Parse(stringFromMap(payload, "actor_id", "")); err == nil {
		e.ActorID = aid
	}
	if rid, err := uuid.Parse(stringFromMap(payload, "resource_id", "")); err == nil {
		e.ResourceID = rid
	}
	e.ResourceType = stringFromMap(payload, "resource_type", "")
	e.Metadata = env.Payload

	return s.ingester.Enqueue(e)
}

// HandleSessionRevoked processes auth.session.revoked.v1 events.
func (s *Subscriber) HandleSessionRevoked(ctx context.Context, data []byte) error {
	return s.logServiceEvent(data, "auth", "session_revoked")
}

// HandleUserCreated processes auth.user.created.v1 events.
func (s *Subscriber) HandleUserCreated(ctx context.Context, data []byte) error {
	return s.logServiceEvent(data, "auth", "user_created")
}

// HandleEmployeeDeleted processes employee.deleted.v1 events and may trigger
// KVKK erasure processing.
func (s *Subscriber) HandleEmployeeDeleted(ctx context.Context, data []byte) error {
	if err := s.logServiceEvent(data, "employee", "employee_deleted"); err != nil {
		s.log.Error().Err(err).Msg("log employee deleted event")
	}

	var env Envelope
	if err := json.Unmarshal(data, &env); err != nil {
		return err
	}
	var payload map[string]any
	if err := json.Unmarshal(env.Payload, &payload); err != nil {
		return err
	}

	email := stringFromMap(payload, "email", "")
	tidStr := stringFromMap(payload, "tenant_id", "")
	if email != "" && tidStr != "" {
		if tid, err := uuid.Parse(tidStr); err == nil && s.dsr != nil {
			return s.dsr.TriggerErasure(ctx, tid, email)
		}
	}
	return nil
}

// HandleTenantDeleted processes tenant.deleted.v1 events.
func (s *Subscriber) HandleTenantDeleted(ctx context.Context, data []byte) error {
	return s.logServiceEvent(data, "tenant", "tenant_deleted")
}

// logServiceEvent is a helper that converts an event envelope into an audit event.
func (s *Subscriber) logServiceEvent(data []byte, svc, action string) error {
	var env Envelope
	if err := json.Unmarshal(data, &env); err != nil {
		s.log.Error().Err(err).Str("service", svc).Msg("unmarshal event")
		return err
	}

	var payload map[string]any
	if err := json.Unmarshal(env.Payload, &payload); err != nil {
		return err
	}

	e := &domain.Event{
		ID:        uuid.New(),
		EventType: env.EventType,
		Service:   svc,
		Action:    action,
		ActorType: domain.ActorTypeService,
		Result:    domain.ResultSuccess,
		OccurredAt: env.OccurredAt,
		Metadata:  env.Payload,
		CreatedAt: time.Now().UTC(),
	}

	if tid, err := uuid.Parse(stringFromMap(payload, "tenant_id", "")); err == nil {
		e.TenantID = tid
	}
	if aid, err := uuid.Parse(stringFromMap(payload, "actor_id", "")); err == nil {
		e.ActorID = aid
	}
	if rid, err := uuid.Parse(stringFromMap(payload, "resource_id", "")); err == nil {
		e.ResourceID = rid
	}
	e.ResourceType = stringFromMap(payload, "resource_type", "")

	return s.ingester.Enqueue(e)
}

func stringFromMap(m map[string]any, key, def string) string {
	if v, ok := m[key]; ok {
		if s, ok := v.(string); ok {
			return s
		}
	}
	return def
}
