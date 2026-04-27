package slack

import (
	"context"
	"encoding/json"
	"fmt"

	"github.com/google/uuid"
	"github.com/jmoiron/sqlx"
	"github.com/rs/zerolog"
)

// OutboxFeedbackPoster publishes a performance.feedback.given.slack.v1 event
// via the shared app.event_outbox so the performance service can consume and
// persist the feedback record using its own domain rules (anonymity,
// retention, etc.).
type OutboxFeedbackPoster struct {
	db  *sqlx.DB
	log zerolog.Logger
}

// NewOutboxFeedbackPoster constructs a poster.
func NewOutboxFeedbackPoster(db *sqlx.DB, log zerolog.Logger) *OutboxFeedbackPoster {
	return &OutboxFeedbackPoster{db: db, log: log}
}

// PostFeedback implements the FeedbackPoster interface used by the slash
// command handler. Writes to app.event_outbox when the table exists; if not,
// falls back to a warning log (development environments).
func (p *OutboxFeedbackPoster) PostFeedback(ctx context.Context, tenantID uuid.UUID, fromSlackUserID, toSlackUserID, message, teamID string) error {
	payload := map[string]any{
		"source":              "slack_slash_command",
		"from_slack_user_id":  fromSlackUserID,
		"to_slack_user_id":    toSlackUserID,
		"team_id":             teamID,
		"message":             message,
	}
	body, err := json.Marshal(payload)
	if err != nil {
		return fmt.Errorf("marshal feedback payload: %w", err)
	}

	// Fire-and-forget INSERT. If app.event_outbox doesn't exist yet (rare in
	// prod; possible in minimal dev DBs), the error is returned so the caller
	// can surface a failure to the Slack user.
	_, err = p.db.ExecContext(ctx, `
INSERT INTO app.event_outbox (id, tenant_id, service_name, event_type, aggregate_id, payload)
VALUES (gen_random_uuid(), $1, $2, $3, gen_random_uuid(), $4)
`, tenantID, "notification", "performance.feedback.given.slack.v1", body)
	if err != nil {
		p.log.Error().Err(err).Msg("insert feedback into outbox failed")
		return err
	}
	return nil
}
