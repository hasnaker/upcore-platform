package clerk

import (
	"context"
	"encoding/json"
	"fmt"

	"github.com/google/uuid"
	"github.com/rs/zerolog/log"

	"github.com/upcore/auth/internal/domain"
)

// UserSink is the minimal contract the clerk webhook dispatcher needs to
// propagate user lifecycle changes. Implemented by service.AuthService.
type UserSink interface {
	UpsertFromClerk(ctx context.Context, clerkID string, tenantID uuid.UUID, email, firstName, lastName, locale string, metadata json.RawMessage) (*domain.User, error)
	DeleteByClerkID(ctx context.Context, clerkID string) error
	HandleSessionRevoked(ctx context.Context, clerkSessionID, clerkUserID string) error
}

// Dispatcher routes verified Clerk events to the user sink.
type Dispatcher struct {
	sink UserSink
}

// NewDispatcher constructs a dispatcher.
func NewDispatcher(sink UserSink) *Dispatcher {
	return &Dispatcher{sink: sink}
}

// Dispatch routes one event by type. Unknown types return nil (ignored).
func (d *Dispatcher) Dispatch(ctx context.Context, evt Event) error {
	log.Info().Str("event", evt.Type).Msg("dispatching clerk webhook")
	switch evt.Type {
	case EventUserCreated, EventUserUpdated:
		return d.handleUserUpsert(ctx, evt)
	case EventUserDeleted:
		return d.handleUserDeleted(ctx, evt)
	case EventSessionRevoked, EventSessionEnded:
		return d.handleSessionRevoked(ctx, evt)
	case EventSessionCreated:
		// We don't persist Clerk session rows directly; JWT is our surface.
		return nil
	default:
		log.Warn().Str("event", evt.Type).Msg("unknown clerk event")
		return nil
	}
}

func (d *Dispatcher) handleUserUpsert(ctx context.Context, evt Event) error {
	var u UserData
	if err := json.Unmarshal(evt.Data, &u); err != nil {
		return fmt.Errorf("decode user data: %w", err)
	}

	tenantID, err := extractTenantID(u)
	if err != nil {
		return fmt.Errorf("extract tenant id: %w", err)
	}
	locale := "tr-TR"
	if v, ok := u.PublicMetadata["locale"].(string); ok && v != "" {
		locale = v
	}

	metaBytes, _ := json.Marshal(u.PublicMetadata)

	_, err = d.sink.UpsertFromClerk(
		ctx, u.ID, tenantID, u.PrimaryEmail(), u.FirstName, u.LastName, locale, metaBytes,
	)
	return err
}

func (d *Dispatcher) handleUserDeleted(ctx context.Context, evt Event) error {
	var u UserData
	if err := json.Unmarshal(evt.Data, &u); err != nil {
		return fmt.Errorf("decode user data: %w", err)
	}
	return d.sink.DeleteByClerkID(ctx, u.ID)
}

func (d *Dispatcher) handleSessionRevoked(ctx context.Context, evt Event) error {
	var s SessionData
	if err := json.Unmarshal(evt.Data, &s); err != nil {
		return fmt.Errorf("decode session data: %w", err)
	}
	return d.sink.HandleSessionRevoked(ctx, s.ID, s.UserID)
}

// extractTenantID pulls tenant_id from Clerk's public_metadata; required.
func extractTenantID(u UserData) (uuid.UUID, error) {
	raw, ok := u.PublicMetadata["tenant_id"]
	if !ok {
		return uuid.Nil, fmt.Errorf("tenant_id missing from public_metadata")
	}
	s, ok := raw.(string)
	if !ok {
		return uuid.Nil, fmt.Errorf("tenant_id must be a string")
	}
	id, err := uuid.Parse(s)
	if err != nil {
		return uuid.Nil, fmt.Errorf("tenant_id is not a uuid: %w", err)
	}
	return id, nil
}
