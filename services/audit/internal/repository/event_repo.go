package repository

import (
	"context"
	"database/sql"
	"fmt"
	"strings"
	"time"

	"github.com/google/uuid"
	"github.com/jmoiron/sqlx"

	"github.com/upcore/audit/internal/domain"
)

// EventRepository abstracts persistence for audit events.
type EventRepository interface {
	Insert(ctx context.Context, e *domain.Event) error
	BulkInsert(ctx context.Context, events []*domain.Event) (int, error)
	GetByID(ctx context.Context, tenantID, id uuid.UUID) (*domain.Event, error)
	Query(ctx context.Context, filter domain.QueryFilter, page, limit int) ([]*domain.Event, int, error)
	CountByAction(ctx context.Context, tenantID uuid.UUID, from, to time.Time) (map[string]int, error)
	CountByService(ctx context.Context, tenantID uuid.UUID, from, to time.Time) (map[string]int, error)
	CountByResult(ctx context.Context, tenantID uuid.UUID, from, to time.Time) (map[string]int, error)
	GetResourceHistory(ctx context.Context, tenantID uuid.UUID, resourceType string, resourceID uuid.UUID) ([]*domain.Event, error)
	GetActorActivity(ctx context.Context, tenantID, actorID uuid.UUID, from, to time.Time) ([]*domain.Event, error)
}

type eventRepo struct {
	db *sqlx.DB
}

// NewEventRepository constructs an EventRepository backed by sqlx.
func NewEventRepository(db *sqlx.DB) EventRepository {
	return &eventRepo{db: db}
}

// Insert stores a single audit event.
func (r *eventRepo) Insert(ctx context.Context, e *domain.Event) error {
	if e.ID == uuid.Nil {
		e.ID = uuid.New()
	}
	if e.CreatedAt.IsZero() {
		e.CreatedAt = time.Now().UTC()
	}

	const q = `
		INSERT INTO audit_events (
			id, tenant_id, occurred_at, event_type, actor_type, actor_id, actor_email,
			resource_type, resource_id, service, action, result, ip_address, user_agent,
			correlation_id, changes, metadata, created_at
		) VALUES (
			$1, $2, $3, $4, $5, $6, $7,
			$8, $9, $10, $11, $12, $13, $14,
			$15, $16, $17, $18
		)`
	_, err := r.db.ExecContext(ctx, q,
		e.ID, e.TenantID, e.OccurredAt, e.EventType, e.ActorType, e.ActorID, e.ActorEmail,
		e.ResourceType, e.ResourceID, e.Service, e.Action, e.Result, e.IPAddress, e.UserAgent,
		e.CorrelationID, e.Changes, e.Metadata, e.CreatedAt,
	)
	if err != nil {
		return fmt.Errorf("insert audit event: %w", err)
	}
	return nil
}

// BulkInsert performs a batched insert of multiple audit events using a
// prepared COPY-style multi-row VALUES clause for high throughput.
func (r *eventRepo) BulkInsert(ctx context.Context, events []*domain.Event) (int, error) {
	if len(events) == 0 {
		return 0, nil
	}

	const baseCols = `INSERT INTO audit_events (
		id, tenant_id, occurred_at, event_type, actor_type, actor_id, actor_email,
		resource_type, resource_id, service, action, result, ip_address, user_agent,
		correlation_id, changes, metadata, created_at
	) VALUES `

	var b strings.Builder
	b.WriteString(baseCols)
	args := make([]any, 0, len(events)*18)

	for i, e := range events {
		if e.ID == uuid.Nil {
			e.ID = uuid.New()
		}
		if e.CreatedAt.IsZero() {
			e.CreatedAt = time.Now().UTC()
		}

		offset := i * 18
		if i > 0 {
			b.WriteString(", ")
		}
		b.WriteString(fmt.Sprintf(
			"($%d,$%d,$%d,$%d,$%d,$%d,$%d,$%d,$%d,$%d,$%d,$%d,$%d,$%d,$%d,$%d,$%d,$%d)",
			offset+1, offset+2, offset+3, offset+4, offset+5, offset+6,
			offset+7, offset+8, offset+9, offset+10, offset+11, offset+12,
			offset+13, offset+14, offset+15, offset+16, offset+17, offset+18,
		))
		args = append(args,
			e.ID, e.TenantID, e.OccurredAt, e.EventType, e.ActorType, e.ActorID, e.ActorEmail,
			e.ResourceType, e.ResourceID, e.Service, e.Action, e.Result, e.IPAddress, e.UserAgent,
			e.CorrelationID, e.Changes, e.Metadata, e.CreatedAt,
		)
	}

	result, err := r.db.ExecContext(ctx, b.String(), args...)
	if err != nil {
		return 0, fmt.Errorf("bulk insert audit events: %w", err)
	}
	n, _ := result.RowsAffected()
	return int(n), nil
}

// GetByID retrieves a single audit event.
func (r *eventRepo) GetByID(ctx context.Context, tenantID, id uuid.UUID) (*domain.Event, error) {
	const q = `SELECT * FROM audit_events WHERE id = $1 AND tenant_id = $2`
	var e domain.Event
	if err := r.db.GetContext(ctx, &e, q, id, tenantID); err != nil {
		if err == sql.ErrNoRows {
			return nil, domain.ErrEventNotFound
		}
		return nil, fmt.Errorf("get audit event: %w", err)
	}
	return &e, nil
}

// Query returns a paginated, filtered list of audit events.
func (r *eventRepo) Query(ctx context.Context, filter domain.QueryFilter, page, limit int) ([]*domain.Event, int, error) {
	if page < 1 {
		page = 1
	}
	if limit <= 0 || limit > 500 {
		limit = 50
	}
	offset := (page - 1) * limit

	where, args := buildWhereClause(filter)

	countQ := fmt.Sprintf(`SELECT COUNT(*) FROM audit_events %s`, where)
	var total int
	if err := r.db.GetContext(ctx, &total, countQ, args...); err != nil {
		return nil, 0, fmt.Errorf("count audit events: %w", err)
	}

	useKeyset := filter.CursorCreatedAt != nil && filter.CursorID != nil
	var dataQ string
	if useKeyset {
		// Append keyset predicate with fresh positional indices.
		idx := len(args) + 1
		whereWithCursor := where
		if whereWithCursor == "" {
			whereWithCursor = fmt.Sprintf("WHERE (occurred_at, id) < ($%d, $%d)", idx, idx+1)
		} else {
			whereWithCursor = fmt.Sprintf("%s AND (occurred_at, id) < ($%d, $%d)", whereWithCursor, idx, idx+1)
		}
		args = append(args, *filter.CursorCreatedAt, *filter.CursorID)
		dataQ = fmt.Sprintf(
			`SELECT * FROM audit_events %s ORDER BY occurred_at DESC, id DESC LIMIT %d`,
			whereWithCursor, limit,
		)
	} else {
		dataQ = fmt.Sprintf(
			`SELECT * FROM audit_events %s ORDER BY occurred_at DESC, id DESC LIMIT %d OFFSET %d`,
			where, limit, offset,
		)
	}
	var events []*domain.Event
	if err := r.db.SelectContext(ctx, &events, dataQ, args...); err != nil {
		return nil, 0, fmt.Errorf("query audit events: %w", err)
	}
	return events, total, nil
}

// CountByAction returns event counts grouped by action within a time range.
func (r *eventRepo) CountByAction(ctx context.Context, tenantID uuid.UUID, from, to time.Time) (map[string]int, error) {
	return r.countGroupBy(ctx, "action", tenantID, from, to)
}

// CountByService returns event counts grouped by service.
func (r *eventRepo) CountByService(ctx context.Context, tenantID uuid.UUID, from, to time.Time) (map[string]int, error) {
	return r.countGroupBy(ctx, "service", tenantID, from, to)
}

// CountByResult returns event counts grouped by result.
func (r *eventRepo) CountByResult(ctx context.Context, tenantID uuid.UUID, from, to time.Time) (map[string]int, error) {
	return r.countGroupBy(ctx, "result", tenantID, from, to)
}

func (r *eventRepo) countGroupBy(ctx context.Context, col string, tenantID uuid.UUID, from, to time.Time) (map[string]int, error) {
	q := fmt.Sprintf(
		`SELECT %s AS key, COUNT(*) AS count FROM audit_events
		 WHERE tenant_id = $1 AND occurred_at >= $2 AND occurred_at <= $3
		 GROUP BY %s`, col, col,
	)
	type row struct {
		Key   string `db:"key"`
		Count int    `db:"count"`
	}
	var rows []row
	if err := r.db.SelectContext(ctx, &rows, q, tenantID, from, to); err != nil {
		return nil, fmt.Errorf("count by %s: %w", col, err)
	}
	m := make(map[string]int, len(rows))
	for _, r := range rows {
		m[r.Key] = r.Count
	}
	return m, nil
}

// GetResourceHistory returns all events for a specific resource.
func (r *eventRepo) GetResourceHistory(ctx context.Context, tenantID uuid.UUID, resourceType string, resourceID uuid.UUID) ([]*domain.Event, error) {
	const q = `
		SELECT * FROM audit_events
		WHERE tenant_id = $1 AND resource_type = $2 AND resource_id = $3
		ORDER BY occurred_at DESC
		LIMIT 500`
	var events []*domain.Event
	if err := r.db.SelectContext(ctx, &events, q, tenantID, resourceType, resourceID); err != nil {
		return nil, fmt.Errorf("get resource history: %w", err)
	}
	return events, nil
}

// GetActorActivity returns events initiated by a specific actor.
func (r *eventRepo) GetActorActivity(ctx context.Context, tenantID, actorID uuid.UUID, from, to time.Time) ([]*domain.Event, error) {
	const q = `
		SELECT * FROM audit_events
		WHERE tenant_id = $1 AND actor_id = $2 AND occurred_at >= $3 AND occurred_at <= $4
		ORDER BY occurred_at DESC
		LIMIT 500`
	var events []*domain.Event
	if err := r.db.SelectContext(ctx, &events, q, tenantID, actorID, from, to); err != nil {
		return nil, fmt.Errorf("get actor activity: %w", err)
	}
	return events, nil
}

// buildWhereClause constructs a WHERE clause with positional parameters.
func buildWhereClause(f domain.QueryFilter) (string, []any) {
	var conds []string
	var args []any
	idx := 1

	addCond := func(col, val string) {
		conds = append(conds, fmt.Sprintf("%s = $%d", col, idx))
		args = append(args, val)
		idx++
	}
	addCondUUID := func(col string, val uuid.UUID) {
		conds = append(conds, fmt.Sprintf("%s = $%d", col, idx))
		args = append(args, val)
		idx++
	}

	if f.TenantID != uuid.Nil {
		addCondUUID("tenant_id", f.TenantID)
	}
	if f.ActorID != nil && *f.ActorID != uuid.Nil {
		addCondUUID("actor_id", *f.ActorID)
	}
	if f.ResourceType != "" {
		addCond("resource_type", f.ResourceType)
	}
	if f.ResourceID != nil && *f.ResourceID != uuid.Nil {
		addCondUUID("resource_id", *f.ResourceID)
	}
	if f.Service != "" {
		addCond("service", f.Service)
	}
	if f.Action != "" {
		addCond("action", f.Action)
	}
	if f.EventType != "" {
		addCond("event_type", f.EventType)
	}
	if f.Result != "" {
		addCond("result", f.Result)
	}
	if !f.From.IsZero() {
		conds = append(conds, fmt.Sprintf("occurred_at >= $%d", idx))
		args = append(args, f.From)
		idx++
	}
	if !f.To.IsZero() {
		conds = append(conds, fmt.Sprintf("occurred_at <= $%d", idx))
		args = append(args, f.To)
		idx++
	}

	if len(conds) == 0 {
		return "", nil
	}
	return "WHERE " + strings.Join(conds, " AND "), args
}
