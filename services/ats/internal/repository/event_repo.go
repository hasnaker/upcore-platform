package repository

import (
	"context"
	"encoding/json"
	"fmt"
	"time"

	"github.com/google/uuid"
	"github.com/jmoiron/sqlx"

	"github.com/upcore/ats/internal/db"
	"github.com/upcore/ats/internal/domain"
)

// EventRepository abstracts persistence for application events.
type EventRepository interface {
	Append(ctx context.Context, evt *domain.ApplicationEvent) error
	ListByApplication(ctx context.Context, applicationID uuid.UUID) ([]*domain.ApplicationEvent, error)
}

type eventRepo struct {
	db *sqlx.DB
}

// NewEventRepository constructs an EventRepository backed by sqlx.
func NewEventRepository(d *sqlx.DB) EventRepository {
	return &eventRepo{db: d}
}

// Append inserts an application event (append-only).
func (r *eventRepo) Append(ctx context.Context, evt *domain.ApplicationEvent) error {
	if evt.ID == uuid.Nil {
		evt.ID = uuid.New()
	}
	if evt.CreatedAt.IsZero() {
		evt.CreatedAt = time.Now().UTC()
	}
	if len(evt.Payload) == 0 {
		evt.Payload = domain.JSONB("{}")
	}

	_, err := r.db.NamedExecContext(ctx, db.QInsertAppEvent, evt)
	if err != nil {
		return fmt.Errorf("insert app event: %w", err)
	}
	return nil
}

// ListByApplication returns all events for an application in chronological order.
func (r *eventRepo) ListByApplication(ctx context.Context, applicationID uuid.UUID) ([]*domain.ApplicationEvent, error) {
	rows := []*domain.ApplicationEvent{}
	if err := r.db.SelectContext(ctx, &rows, db.QSelectEventsByApplication, applicationID); err != nil {
		return nil, fmt.Errorf("list events: %w", err)
	}
	return rows, nil
}

// BuildNotePayload creates a JSON payload for a note event.
func BuildNotePayload(note string) domain.JSONB {
	b, _ := json.Marshal(map[string]string{"note": note})
	return domain.JSONB(b)
}

// BuildScorePayload creates a JSON payload for a score update event.
func BuildScorePayload(score float64) domain.JSONB {
	b, _ := json.Marshal(map[string]float64{"score": score})
	return domain.JSONB(b)
}
