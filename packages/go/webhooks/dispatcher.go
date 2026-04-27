// Package webhooks implements customer-defined webhook subscriptions.
// Her servis bu paketi kullanarak event emit ettiğinde, tenant'ın tanımlı
// webhook URL'lerine HMAC-SHA256 imzalı POST yapar. Retry exponential
// backoff; 10 deneme sonrası subscription otomatik deactivate olur.
package webhooks

import (
	"bytes"
	"context"
	"crypto/hmac"
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"net/http"
	"strings"
	"time"

	"github.com/google/uuid"
	"github.com/jmoiron/sqlx"
	"github.com/rs/zerolog"
)

// Subscription mirrors app.webhook_subscriptions.
type Subscription struct {
	ID            uuid.UUID  `db:"id"`
	TenantID      uuid.UUID  `db:"tenant_id"`
	Name          string     `db:"name"`
	TargetURL     string     `db:"target_url"`
	EventTypes    []string   `db:"event_types"`
	Secret        string     `db:"secret"`
	Active        bool       `db:"active"`
	FailureCount  int        `db:"failure_count"`
	MaxFailures   int        `db:"max_failures"`
	LastSuccessAt *time.Time `db:"last_success_at"`
	LastFailureAt *time.Time `db:"last_failure_at"`
}

// Dispatcher sends events to subscribed webhooks and logs deliveries.
type Dispatcher struct {
	DB       *sqlx.DB
	Client   *http.Client
	Log      zerolog.Logger
}

// NewDispatcher constructs.
func NewDispatcher(db *sqlx.DB, log zerolog.Logger) *Dispatcher {
	return &Dispatcher{
		DB:     db,
		Client: &http.Client{Timeout: 10 * time.Second},
		Log:    log,
	}
}

// Dispatch fans out a single event to all matching subscriptions. Called by
// any domain service after emitting an outbox row (so this runs on the
// dispatcher side, not the hot request path).
func (d *Dispatcher) Dispatch(ctx context.Context, tenantID uuid.UUID, eventType string, eventID uuid.UUID, payload any) error {
	var subs []Subscription
	if err := d.DB.SelectContext(ctx, &subs,
		`SELECT id, tenant_id, name, target_url, event_types, secret, active,
		        failure_count, max_failures, last_success_at, last_failure_at
		 FROM app.webhook_subscriptions WHERE tenant_id=$1 AND active=TRUE`, tenantID); err != nil {
		return fmt.Errorf("load subs: %w", err)
	}

	body, err := json.Marshal(map[string]any{
		"event_type": eventType,
		"event_id":   eventID,
		"tenant_id":  tenantID,
		"timestamp":  time.Now().UTC().Format(time.RFC3339),
		"data":       payload,
	})
	if err != nil {
		return err
	}

	for _, s := range subs {
		if !matchesAny(eventType, s.EventTypes) {
			continue
		}
		d.deliverOne(ctx, &s, eventType, eventID, body)
	}
	return nil
}

func matchesAny(eventType string, patterns []string) bool {
	for _, p := range patterns {
		if p == "*" || p == eventType {
			return true
		}
		// Supports "employee.*" style wildcards.
		if strings.HasSuffix(p, ".*") {
			prefix := strings.TrimSuffix(p, ".*") + "."
			if strings.HasPrefix(eventType, prefix) {
				return true
			}
		}
	}
	return false
}

func (d *Dispatcher) deliverOne(ctx context.Context, s *Subscription, eventType string, eventID uuid.UUID, body []byte) {
	start := time.Now()
	req, err := http.NewRequestWithContext(ctx, http.MethodPost, s.TargetURL, bytes.NewReader(body))
	if err != nil {
		d.logFailure(ctx, s, eventID, eventType, body, 0, err.Error(), time.Since(start))
		return
	}
	sig := signHMAC(s.Secret, body)
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("X-UpCore-Event", eventType)
	req.Header.Set("X-UpCore-Signature", "sha256="+sig)
	req.Header.Set("X-UpCore-Delivery", uuid.New().String())

	resp, err := d.Client.Do(req)
	dur := time.Since(start)
	if err != nil {
		d.logFailure(ctx, s, eventID, eventType, body, 0, err.Error(), dur)
		return
	}
	defer resp.Body.Close()
	if resp.StatusCode >= 200 && resp.StatusCode < 300 {
		d.logSuccess(ctx, s, eventID, eventType, body, resp.StatusCode, dur)
		return
	}
	d.logFailure(ctx, s, eventID, eventType, body, resp.StatusCode,
		fmt.Sprintf("status %d", resp.StatusCode), dur)
}

func signHMAC(secret string, body []byte) string {
	mac := hmac.New(sha256.New, []byte(secret))
	mac.Write(body)
	return hex.EncodeToString(mac.Sum(nil))
}

func (d *Dispatcher) logSuccess(ctx context.Context, s *Subscription, eventID uuid.UUID, eventType string, payload []byte, status int, dur time.Duration) {
	_, _ = d.DB.ExecContext(ctx,
		`INSERT INTO app.webhook_deliveries
		 (subscription_id, tenant_id, event_id, event_type, payload, status_code, duration_ms, delivered_at)
		 VALUES ($1,$2,$3,$4,$5::jsonb,$6,$7, NOW())`,
		s.ID, s.TenantID, eventID, eventType, string(payload), status, dur.Milliseconds())
	_, _ = d.DB.ExecContext(ctx,
		`UPDATE app.webhook_subscriptions SET last_success_at=NOW(), failure_count=0, updated_at=NOW()
		 WHERE id=$1`, s.ID)
}

func (d *Dispatcher) logFailure(ctx context.Context, s *Subscription, eventID uuid.UUID, eventType string, payload []byte, status int, reason string, dur time.Duration) {
	_, _ = d.DB.ExecContext(ctx,
		`INSERT INTO app.webhook_deliveries
		 (subscription_id, tenant_id, event_id, event_type, payload, status_code, response_body, duration_ms, failed_at, next_retry_at)
		 VALUES ($1,$2,$3,$4,$5::jsonb,$6,$7,$8, NOW(), NOW() + INTERVAL '5 minutes')`,
		s.ID, s.TenantID, eventID, eventType, string(payload), status, reason, dur.Milliseconds())
	_, _ = d.DB.ExecContext(ctx,
		`UPDATE app.webhook_subscriptions
		 SET failure_count = failure_count + 1,
		     last_failure_at = NOW(),
		     active = CASE WHEN failure_count + 1 >= max_failures THEN FALSE ELSE active END,
		     updated_at = NOW()
		 WHERE id=$1`, s.ID)
	d.Log.Warn().Str("webhook", s.Name).Str("event", eventType).
		Int("status", status).Str("reason", reason).Msg("webhook delivery failed")
}
