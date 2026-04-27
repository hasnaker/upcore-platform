package service

import (
	"context"
	"database/sql"
	"fmt"
	"time"

	"github.com/google/uuid"
	"github.com/jmoiron/sqlx"
	"github.com/rs/zerolog"

	"github.com/upcore/notification/internal/channels"
	"github.com/upcore/notification/internal/domain"
	"github.com/upcore/notification/internal/repository"
)

// DLQWatcher polls app.event_outbox across all services for newly-arrived
// dead-letter rows (attempts >= max_retries AND !dispatched) and notifies
// hr_admin / admin users per tenant. Idempotent: each row is notified once
// (tracked via app.event_outbox_dlq_alerted column). Otomatik replay yoktur —
// operatörün ele alması için sadece uyarı.
type DLQWatcher struct {
	DB         *sqlx.DB
	InApp      *InAppService
	Email      *channels.SendGridChannel // optional — email notif when configured
	MaxRetries int
	Interval   time.Duration
	Log        zerolog.Logger
}

// NewDLQWatcher constructs a watcher with sane defaults (5m poll, 10 retries).
// Email channel is optional; when nil, only in-app notifications are sent.
func NewDLQWatcher(
	db *sqlx.DB,
	inapp *InAppService,
	email *channels.SendGridChannel,
	maxRetries int,
	log zerolog.Logger,
) *DLQWatcher {
	return &DLQWatcher{
		DB: db, InApp: inapp, Email: email,
		MaxRetries: maxRetries, Interval: 5 * time.Minute,
		Log: log,
	}
}

// Run blocks until ctx is cancelled. Meant to be launched as a goroutine.
func (w *DLQWatcher) Run(ctx context.Context) {
	if w.Interval <= 0 {
		w.Interval = 5 * time.Minute
	}
	t := time.NewTicker(w.Interval)
	defer t.Stop()
	for {
		select {
		case <-ctx.Done():
			w.Log.Info().Msg("dlq watcher stopped")
			return
		case <-t.C:
			if err := w.tick(ctx); err != nil {
				w.Log.Error().Err(err).Msg("dlq watcher tick failed")
			}
		}
	}
}

// dlqRow is a thin view over app.event_outbox for alerting.
type dlqRow struct {
	ID          uuid.UUID `db:"id"`
	TenantID    uuid.UUID `db:"tenant_id"`
	ServiceName string    `db:"service_name"`
	EventType   string    `db:"event_type"`
	Attempts    int       `db:"attempts"`
	LastError   *string   `db:"last_error"`
	UpdatedAt   time.Time `db:"updated_at"`
}

func (w *DLQWatcher) tick(ctx context.Context) error {
	// Find rows that are dead-letter AND have not yet been alerted.
	// event_outbox_dlq_alerted column is added by migration 032.
	q := `
	SELECT id, tenant_id, service_name, event_type, attempts, last_error, updated_at
	FROM app.event_outbox
	WHERE dispatched = FALSE
	  AND attempts >= $1
	  AND (dlq_alerted_at IS NULL OR dlq_alerted_at < updated_at)
	ORDER BY updated_at DESC
	LIMIT 100`

	rows := []dlqRow{}
	if err := w.DB.SelectContext(ctx, &rows, q, w.MaxRetries); err != nil {
		return fmt.Errorf("dlq select: %w", err)
	}
	if len(rows) == 0 {
		return nil
	}
	w.Log.Info().Int("count", len(rows)).Msg("dlq watcher: found un-alerted dead-letter rows")

	for _, r := range rows {
		if err := w.alertTenantAdmins(ctx, r); err != nil {
			w.Log.Warn().Err(err).
				Str("outbox_id", r.ID.String()).
				Msg("dlq alert failed (will retry next tick)")
			continue
		}
		if _, err := w.DB.ExecContext(ctx,
			`UPDATE app.event_outbox SET dlq_alerted_at = NOW() WHERE id = $1`, r.ID); err != nil {
			w.Log.Warn().Err(err).Msg("dlq mark alerted failed")
		}
	}
	return nil
}

func (w *DLQWatcher) alertTenantAdmins(ctx context.Context, r dlqRow) error {
	// Find hr_admin / admin user IDs for this tenant. We query auth.users
	// via roles array column — schema is shared across services. We set RLS
	// on the transaction so policy applies.
	tx, err := w.DB.BeginTxx(ctx, &sql.TxOptions{ReadOnly: true})
	if err != nil {
		return fmt.Errorf("begin: %w", err)
	}
	defer func() { _ = tx.Rollback() }()
	if _, err := tx.ExecContext(ctx,
		"SELECT set_config('app.tenant_id', $1, true)", r.TenantID.String()); err != nil {
		return fmt.Errorf("rls: %w", err)
	}

	type adminUser struct {
		ID    uuid.UUID `db:"id"`
		Email string    `db:"email"`
	}
	var admins []adminUser
	if err := tx.SelectContext(ctx, &admins,
		`SELECT id, COALESCE(email, '') AS email FROM auth.users
		 WHERE tenant_id = $1 AND roles && ARRAY['hr_admin','admin','cxo']
		 AND deleted_at IS NULL`, r.TenantID); err != nil {
		// auth schema or column might differ in dev — fail gracefully.
		w.Log.Debug().Err(err).Msg("dlq: auth.users lookup skipped")
		return nil
	}
	if len(admins) == 0 {
		return nil
	}

	lastErr := "-"
	if r.LastError != nil {
		lastErr = *r.LastError
		if len(lastErr) > 200 {
			lastErr = lastErr[:200] + "…"
		}
	}
	title := fmt.Sprintf("DLQ: %s / %s", r.ServiceName, r.EventType)
	body := fmt.Sprintf(
		"Servis %q event'i %q için %d deneme başarısız. Son hata: %s",
		r.ServiceName, r.EventType, r.Attempts, lastErr,
	)
	emailBody := fmt.Sprintf(`<p>UpCore DLQ uyarısı:</p>
<ul>
<li><strong>Servis:</strong> %s</li>
<li><strong>Event:</strong> %s</li>
<li><strong>Deneme:</strong> %d</li>
<li><strong>Son Hata:</strong> <code>%s</code></li>
</ul>
<p><a href="https://upcore.app/ayarlar/dlq">DLQ paneline git → Replay veya incele</a></p>`,
		r.ServiceName, r.EventType, r.Attempts, lastErr,
	)

	for _, u := range admins {
		// In-app (always)
		n := &domain.InAppNotification{
			TenantID: r.TenantID,
			UserID:   u.ID,
			Title:    title,
			Body:     body,
			LinkURL:  "/ayarlar/dlq",
			Category: domain.CategoryHRAdmin,
		}
		if err := w.InApp.Create(ctx, n); err != nil {
			w.Log.Warn().Err(err).Str("user_id", u.ID.String()).Msg("inapp create failed")
		}

		// Email (when SendGrid configured + user has email)
		if w.Email != nil && u.Email != "" {
			emailNotif := &domain.Notification{
				ID:             uuid.New(),
				TenantID:       r.TenantID,
				RecipientEmail: u.Email,
				Subject:        &title,
				Body:           &emailBody,
			}
			if _, err := w.Email.Send(ctx, emailNotif); err != nil {
				w.Log.Warn().Err(err).Str("email", u.Email).
					Msg("dlq email send failed (non-blocking)")
			}
		}
	}
	return nil
}

// Compile-time assertion that the required repository + service types are
// reachable (keeps imports honest when tested in isolation).
var _ = repository.InAppRepository(nil)
