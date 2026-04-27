package service

import (
	"context"
	"crypto/rand"
	"encoding/hex"
	"errors"
	"fmt"
	"strings"
	"time"

	"github.com/google/uuid"
	"github.com/jmoiron/sqlx"
	"github.com/rs/zerolog"
)

// Service is the status page domain service. All methods are safe for
// concurrent use; the SQL layer handles isolation.
type Service struct {
	DB     *sqlx.DB
	Logger zerolog.Logger
}

// New constructs a Service.
func New(db *sqlx.DB, logger zerolog.Logger) *Service {
	return &Service{DB: db, Logger: logger}
}

// --- Components -------------------------------------------------------------

// ListComponents returns every component ordered by category then sort_order.
func (s *Service) ListComponents(ctx context.Context) ([]Component, error) {
	var out []Component
	err := s.DB.SelectContext(ctx, &out,
		`SELECT id, code, name, description, category, sort_order, status,
		        healthcheck_url, prometheus_job, auto_sync_enabled,
		        last_checked_at, created_at, updated_at
		   FROM app.status_components
		  ORDER BY category, sort_order, name`)
	return out, err
}

// GetComponent returns a component by code or UUID.
func (s *Service) GetComponent(ctx context.Context, codeOrID string) (*Component, error) {
	var c Component
	if id, err := uuid.Parse(codeOrID); err == nil {
		err2 := s.DB.GetContext(ctx, &c,
			`SELECT id, code, name, description, category, sort_order, status,
			        healthcheck_url, prometheus_job, auto_sync_enabled,
			        last_checked_at, created_at, updated_at
			   FROM app.status_components WHERE id = $1`, id)
		if err2 != nil {
			return nil, err2
		}
		return &c, nil
	}
	err := s.DB.GetContext(ctx, &c,
		`SELECT id, code, name, description, category, sort_order, status,
		        healthcheck_url, prometheus_job, auto_sync_enabled,
		        last_checked_at, created_at, updated_at
		   FROM app.status_components WHERE code = $1`, codeOrID)
	if err != nil {
		return nil, err
	}
	return &c, nil
}

// SetComponentStatus updates a component's current status and last_checked_at.
// Used both by the sync worker and by admin manual overrides.
func (s *Service) SetComponentStatus(ctx context.Context, id uuid.UUID, status string) error {
	if !isValidComponentStatus(status) {
		return fmt.Errorf("invalid status %q", status)
	}
	_, err := s.DB.ExecContext(ctx,
		`UPDATE app.status_components
		    SET status = $2,
		        last_checked_at = now(),
		        updated_at = now()
		  WHERE id = $1`, id, status)
	return err
}

// DailyRollupRange returns rollup rows for a component for the last `days` days.
func (s *Service) DailyRollupRange(ctx context.Context, componentID uuid.UUID, days int) ([]DailyRollup, error) {
	if days <= 0 || days > 365 {
		days = 90
	}
	var out []DailyRollup
	err := s.DB.SelectContext(ctx, &out,
		`SELECT component_id, day, total_probes, failed_probes, p95_latency_ms, incident_count
		   FROM app.status_component_daily
		  WHERE component_id = $1 AND day >= (current_date - $2::int)
		  ORDER BY day`, componentID, days)
	return out, err
}

// RecordProbe records a single probe result. Bumps the daily rollup row.
func (s *Service) RecordProbe(ctx context.Context, componentID uuid.UUID, ok bool, latencyMs int) error {
	_, err := s.DB.ExecContext(ctx,
		`INSERT INTO app.status_component_daily (component_id, day, total_probes, failed_probes, p95_latency_ms)
		 VALUES ($1, current_date, 1, $2, $3)
		 ON CONFLICT (component_id, day) DO UPDATE
		   SET total_probes  = app.status_component_daily.total_probes + 1,
		       failed_probes = app.status_component_daily.failed_probes + $2,
		       p95_latency_ms = GREATEST(COALESCE(app.status_component_daily.p95_latency_ms, 0), $3)`,
		componentID, failedCount(ok), latencyMs)
	return err
}

func failedCount(ok bool) int {
	if ok {
		return 0
	}
	return 1
}

// --- Incidents --------------------------------------------------------------

// CreateIncidentParams — creation payload (admin UI + webhook adapter).
type CreateIncidentParams struct {
	Title        string
	Impact       string
	ComponentIDs []uuid.UUID
	InitialBody  string
	CreatedBy    string
}

// CreateIncident inserts a new incident in 'investigating' state and a
// matching first update row. Also sets the affected components to
// partial_outage/major_outage depending on impact.
func (s *Service) CreateIncident(ctx context.Context, p CreateIncidentParams) (*Incident, error) {
	if strings.TrimSpace(p.Title) == "" {
		return nil, errors.New("title_required")
	}
	if p.Impact == "" {
		p.Impact = ImpactMinor
	}
	if !isValidImpact(p.Impact) {
		return nil, fmt.Errorf("invalid impact %q", p.Impact)
	}
	tx, err := s.DB.BeginTxx(ctx, nil)
	if err != nil {
		return nil, err
	}
	defer func() { _ = tx.Rollback() }()

	var inc Incident
	err = tx.GetContext(ctx, &inc,
		`INSERT INTO app.status_incidents (title, impact, status, component_ids, created_by)
		 VALUES ($1, $2, 'investigating', $3, $4)
		 RETURNING id, title, impact, status, started_at, resolved_at,
		           postmortem_url, postmortem_summary, component_ids,
		           created_by, created_at, updated_at`,
		p.Title, p.Impact, UUIDArray(p.ComponentIDs), nullable(p.CreatedBy))
	if err != nil {
		return nil, err
	}

	body := p.InitialBody
	if body == "" {
		body = "Sorun araştırılıyor, bileşen durumu izleniyor."
	}
	_, err = tx.ExecContext(ctx,
		`INSERT INTO app.status_incident_updates (incident_id, status, body, author)
		 VALUES ($1, 'investigating', $2, $3)`,
		inc.ID, body, nullable(p.CreatedBy))
	if err != nil {
		return nil, err
	}

	// Downgrade affected components.
	newStatus := StatusPartialOutage
	switch p.Impact {
	case ImpactCritical, ImpactMajor:
		newStatus = StatusMajorOutage
	case ImpactMinor:
		newStatus = StatusDegraded
	case ImpactNone:
		newStatus = StatusOperational
	}
	if len(p.ComponentIDs) > 0 {
		_, err = tx.ExecContext(ctx,
			`UPDATE app.status_components
			    SET status = $2, updated_at = now()
			  WHERE id = ANY($1::uuid[])`,
			UUIDArray(p.ComponentIDs), newStatus)
		if err != nil {
			return nil, err
		}
	}

	if err := tx.Commit(); err != nil {
		return nil, err
	}
	return &inc, nil
}

// AppendIncidentUpdate posts a new update line and mirrors the incident status.
func (s *Service) AppendIncidentUpdate(ctx context.Context, incidentID uuid.UUID, status, body, author string) (*IncidentUpdate, error) {
	if !isValidIncidentStatus(status) {
		return nil, fmt.Errorf("invalid status %q", status)
	}
	if strings.TrimSpace(body) == "" {
		return nil, errors.New("body_required")
	}
	tx, err := s.DB.BeginTxx(ctx, nil)
	if err != nil {
		return nil, err
	}
	defer func() { _ = tx.Rollback() }()

	var upd IncidentUpdate
	err = tx.GetContext(ctx, &upd,
		`INSERT INTO app.status_incident_updates (incident_id, status, body, author)
		 VALUES ($1, $2, $3, $4)
		 RETURNING id, incident_id, status, body, author, created_at`,
		incidentID, status, body, nullable(author))
	if err != nil {
		return nil, err
	}
	_, err = tx.ExecContext(ctx,
		`UPDATE app.status_incidents
		    SET status = $2, updated_at = now(),
		        resolved_at = CASE WHEN $2 IN ('resolved','postmortem') AND resolved_at IS NULL
		                      THEN now() ELSE resolved_at END
		  WHERE id = $1`, incidentID, status)
	if err != nil {
		return nil, err
	}
	if status == IncStatusResolved || status == IncStatusPostmortem {
		// Return affected components to operational unless another active
		// incident references them.
		_, err = tx.ExecContext(ctx,
			`UPDATE app.status_components c
			    SET status = 'operational', updated_at = now()
			  WHERE c.id = ANY(
			    (SELECT component_ids FROM app.status_incidents WHERE id = $1)::uuid[]
			  )
			    AND NOT EXISTS (
			      SELECT 1 FROM app.status_incidents i2
			       WHERE i2.status NOT IN ('resolved','postmortem')
			         AND c.id = ANY(i2.component_ids)
			         AND i2.id <> $1
			    )`,
			incidentID)
		if err != nil {
			return nil, err
		}
	}
	if err := tx.Commit(); err != nil {
		return nil, err
	}
	return &upd, nil
}

// ResolveIncident resolves an incident and requires a post-mortem URL/summary.
func (s *Service) ResolveIncident(ctx context.Context, id uuid.UUID, postmortemURL, postmortemSummary, author string) error {
	if strings.TrimSpace(postmortemURL) == "" && strings.TrimSpace(postmortemSummary) == "" {
		return errors.New("postmortem_required")
	}
	tx, err := s.DB.BeginTxx(ctx, nil)
	if err != nil {
		return err
	}
	defer func() { _ = tx.Rollback() }()
	_, err = tx.ExecContext(ctx,
		`UPDATE app.status_incidents
		    SET status = 'resolved',
		        resolved_at = COALESCE(resolved_at, now()),
		        postmortem_url = NULLIF($2, ''),
		        postmortem_summary = NULLIF($3, ''),
		        updated_at = now()
		  WHERE id = $1`, id, postmortemURL, postmortemSummary)
	if err != nil {
		return err
	}
	_, err = tx.ExecContext(ctx,
		`INSERT INTO app.status_incident_updates (incident_id, status, body, author)
		 VALUES ($1, 'resolved', $2, $3)`,
		id, "Çözüldü. Post-mortem yayımlandı.", nullable(author))
	if err != nil {
		return err
	}
	return tx.Commit()
}

// ListIncidents returns the most recent incidents (inclusive of resolved)
// limited by `days`. If onlyUnresolved is true, only active incidents.
func (s *Service) ListIncidents(ctx context.Context, days int, onlyUnresolved bool) ([]Incident, error) {
	if days <= 0 {
		days = 90
	}
	q := `SELECT id, title, impact, status, started_at, resolved_at,
	             postmortem_url, postmortem_summary, component_ids,
	             created_by, created_at, updated_at
	        FROM app.status_incidents
	       WHERE started_at >= now() - ($1::int || ' days')::interval`
	if onlyUnresolved {
		q += ` AND status <> 'resolved' AND status <> 'postmortem'`
	}
	q += ` ORDER BY started_at DESC LIMIT 500`
	var out []Incident
	err := s.DB.SelectContext(ctx, &out, q, days)
	return out, err
}

// GetIncident returns an incident by ID.
func (s *Service) GetIncident(ctx context.Context, id uuid.UUID) (*Incident, error) {
	var inc Incident
	err := s.DB.GetContext(ctx, &inc,
		`SELECT id, title, impact, status, started_at, resolved_at,
		        postmortem_url, postmortem_summary, component_ids,
		        created_by, created_at, updated_at
		   FROM app.status_incidents WHERE id = $1`, id)
	if err != nil {
		return nil, err
	}
	return &inc, nil
}

// ListIncidentUpdates returns all updates for an incident, oldest first.
func (s *Service) ListIncidentUpdates(ctx context.Context, incidentID uuid.UUID) ([]IncidentUpdate, error) {
	var out []IncidentUpdate
	err := s.DB.SelectContext(ctx, &out,
		`SELECT id, incident_id, status, body, author, created_at
		   FROM app.status_incident_updates
		  WHERE incident_id = $1
		  ORDER BY created_at ASC`, incidentID)
	return out, err
}

// --- Maintenance ------------------------------------------------------------

// CreateMaintenance schedules a new maintenance window.
func (s *Service) CreateMaintenance(ctx context.Context, m MaintenanceWindow) (*MaintenanceWindow, error) {
	if m.ScheduledEnd.Before(m.ScheduledStart) || m.ScheduledEnd.Equal(m.ScheduledStart) {
		return nil, errors.New("end_before_start")
	}
	var createdBy any
	if m.CreatedBy != nil && strings.TrimSpace(*m.CreatedBy) != "" {
		createdBy = *m.CreatedBy
	}
	var out MaintenanceWindow
	err := s.DB.GetContext(ctx, &out,
		`INSERT INTO app.status_maintenance_windows
		    (title, description, scheduled_start, scheduled_end, component_ids, created_by)
		 VALUES ($1, $2, $3, $4, $5, $6)
		 RETURNING id, title, description, scheduled_start, scheduled_end,
		           status, component_ids, created_by, created_at, updated_at`,
		m.Title, m.Description, m.ScheduledStart, m.ScheduledEnd,
		m.ComponentIDs, createdBy)
	if err != nil {
		return nil, err
	}
	return &out, nil
}

// UpcomingMaintenance returns scheduled/in_progress windows (next 30 days).
func (s *Service) UpcomingMaintenance(ctx context.Context) ([]MaintenanceWindow, error) {
	var out []MaintenanceWindow
	err := s.DB.SelectContext(ctx, &out,
		`SELECT id, title, description, scheduled_start, scheduled_end, status,
		        component_ids, created_by, created_at, updated_at
		   FROM app.status_maintenance_windows
		  WHERE status IN ('scheduled', 'in_progress')
		    AND scheduled_end >= now() - interval '1 day'
		  ORDER BY scheduled_start ASC
		  LIMIT 100`)
	return out, err
}

// --- Subscribers ------------------------------------------------------------

// Subscribe inserts a new subscription in 'pending confirmation' state and
// returns the full row (with its confirm_token — only the service layer sees
// it so we can hand it to the mailer).
func (s *Service) Subscribe(ctx context.Context, req SubscribeRequest) (*Subscriber, error) {
	req.Channel = strings.ToLower(strings.TrimSpace(req.Channel))
	req.Target = strings.TrimSpace(req.Target)
	switch req.Channel {
	case "email":
		if !strings.Contains(req.Target, "@") || len(req.Target) > 200 {
			return nil, errors.New("invalid_email")
		}
	case "webhook":
		if !strings.HasPrefix(req.Target, "https://") {
			return nil, errors.New("webhook_must_be_https")
		}
	case "rss":
		// RSS does not require a real target, but we always need something
		// unique — the caller usually passes their subscriber id.
		if req.Target == "" {
			req.Target = uuid.NewString()
		}
	default:
		return nil, fmt.Errorf("invalid channel %q", req.Channel)
	}

	confirmToken := randomToken()
	unsubToken := randomToken()
	var out Subscriber
	err := s.DB.GetContext(ctx, &out,
		`INSERT INTO app.status_subscribers
		    (channel, target, component_ids, confirm_token, unsubscribe_token, confirmed, confirmed_at)
		 VALUES ($1, $2, $3, $4, $5,
		         CASE WHEN $1 = 'rss' THEN TRUE ELSE FALSE END,
		         CASE WHEN $1 = 'rss' THEN now() ELSE NULL END)
		 ON CONFLICT (channel, target) DO UPDATE
		   SET component_ids = EXCLUDED.component_ids,
		       confirm_token = EXCLUDED.confirm_token
		 RETURNING id, channel, target, component_ids, confirmed, confirm_token,
		           unsubscribe_token, created_at, confirmed_at, last_notified_at`,
		req.Channel, req.Target, UUIDArray(req.ComponentIDs), confirmToken, unsubToken)
	if err != nil {
		return nil, err
	}
	return &out, nil
}

// ConfirmSubscription marks a subscriber confirmed if the token matches.
func (s *Service) ConfirmSubscription(ctx context.Context, token string) (bool, error) {
	if strings.TrimSpace(token) == "" {
		return false, errors.New("invalid_token")
	}
	res, err := s.DB.ExecContext(ctx,
		`UPDATE app.status_subscribers
		    SET confirmed = TRUE,
		        confirmed_at = now(),
		        confirm_token = NULL
		  WHERE confirm_token = $1 AND confirmed = FALSE`, token)
	if err != nil {
		return false, err
	}
	n, _ := res.RowsAffected()
	return n > 0, nil
}

// Unsubscribe removes a subscription by unsubscribe_token.
func (s *Service) Unsubscribe(ctx context.Context, token string) (bool, error) {
	if strings.TrimSpace(token) == "" {
		return false, errors.New("invalid_token")
	}
	res, err := s.DB.ExecContext(ctx,
		`DELETE FROM app.status_subscribers WHERE unsubscribe_token = $1`, token)
	if err != nil {
		return false, err
	}
	n, _ := res.RowsAffected()
	return n > 0, nil
}

// ListConfirmedSubscribers returns confirmed subscribers for a given channel.
func (s *Service) ListConfirmedSubscribers(ctx context.Context, channel string) ([]Subscriber, error) {
	var out []Subscriber
	err := s.DB.SelectContext(ctx, &out,
		`SELECT id, channel, target, component_ids, confirmed, confirm_token,
		        unsubscribe_token, created_at, confirmed_at, last_notified_at
		   FROM app.status_subscribers
		  WHERE channel = $1 AND confirmed = TRUE`, channel)
	return out, err
}

// --- helpers ----------------------------------------------------------------

func nullable(s string) any {
	if strings.TrimSpace(s) == "" {
		return nil
	}
	return s
}

func isValidIncidentStatus(s string) bool {
	switch s {
	case IncStatusInvestigating, IncStatusIdentified, IncStatusMonitoring, IncStatusResolved, IncStatusPostmortem:
		return true
	}
	return false
}

func isValidImpact(s string) bool {
	switch s {
	case ImpactNone, ImpactMinor, ImpactMajor, ImpactCritical:
		return true
	}
	return false
}

func isValidComponentStatus(s string) bool {
	switch s {
	case StatusOperational, StatusDegraded, StatusPartialOutage, StatusMajorOutage, StatusMaintenance:
		return true
	}
	return false
}

func randomToken() string {
	b := make([]byte, 24)
	if _, err := rand.Read(b); err != nil {
		// Extremely unlikely — fall back to time-based to avoid crashing.
		return hex.EncodeToString([]byte(time.Now().UTC().Format(time.RFC3339Nano)))
	}
	return hex.EncodeToString(b)
}

// RollupGlobalStatus returns the worst-case status across all components.
// This is used to render the "All Systems Operational" banner.
func (s *Service) RollupGlobalStatus(ctx context.Context) (string, []Component, error) {
	comps, err := s.ListComponents(ctx)
	if err != nil {
		return "", nil, err
	}
	worst := StatusOperational
	rank := func(s string) int {
		switch s {
		case StatusMajorOutage:
			return 4
		case StatusPartialOutage:
			return 3
		case StatusDegraded:
			return 2
		case StatusMaintenance:
			return 1
		default:
			return 0
		}
	}
	for _, c := range comps {
		if rank(c.Status) > rank(worst) {
			worst = c.Status
		}
	}
	return worst, comps, nil
}
