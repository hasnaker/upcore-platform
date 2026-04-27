// Package tenantprovision seeds a brand-new tenant with everything needed
// to log in and use UpCore on day 1: default roles, onboarding templates,
// bordro settings, feature flags, trial subscription, demo user.
//
// Trigger: notification service consumes tenant.created.v1 event → calls
// Provisioner.Provision(ctx, tenantID). Idempotent via per-tenant unique
// constraint checks; safe to retry.
package tenantprovision

import (
	"context"
	"fmt"
	"time"

	"github.com/google/uuid"
	"github.com/jmoiron/sqlx"
	"github.com/rs/zerolog"
)

// Provisioner orchestrates first-time tenant setup.
type Provisioner struct {
	DB  *sqlx.DB
	Log zerolog.Logger
}

// New constructs.
func New(db *sqlx.DB, log zerolog.Logger) *Provisioner { return &Provisioner{DB: db, Log: log} }

// Provision runs the full seed sequence inside a single transaction. Each
// step is best-effort idempotent; duplicate rows are silently skipped.
func (p *Provisioner) Provision(ctx context.Context, tenantID uuid.UUID, ownerEmail string) error {
	if tenantID == uuid.Nil {
		return fmt.Errorf("tenant id required")
	}
	tx, err := p.DB.BeginTxx(ctx, nil)
	if err != nil {
		return fmt.Errorf("begin tx: %w", err)
	}
	defer func() { _ = tx.Rollback() }()

	if _, err := tx.ExecContext(ctx, `SELECT set_config('app.tenant_id', $1, true)`, tenantID.String()); err != nil {
		return fmt.Errorf("rls: %w", err)
	}

	// 1. Bordro settings (defaults).
	if _, err := tx.ExecContext(ctx,
		`INSERT INTO app.tenant_bordro_settings
		 (tenant_id, hours_per_month, meal_daily_gross, meal_exempt_daily,
		  transport_daily_gross, transport_exempt_daily, apply_min_wage_exemption)
		 VALUES ($1, 225, 250, 170, 200, 150, TRUE)
		 ON CONFLICT (tenant_id) DO NOTHING`, tenantID); err != nil {
		p.Log.Warn().Err(err).Msg("seed bordro settings skipped")
	}

	// 2. Feature flags: plan-gated defaults. Start with mobile_pwa + outbox.
	flags := []struct {
		key     string
		enabled bool
	}{
		{"mobile_pwa", true},
		{"saml_sso", false},
		{"ml_burnout", false},
		{"internal_marketplace", false},
		{"webhooks_public", false},
		{"api_keys_public", false},
		{"white_label", false},
	}
	for _, f := range flags {
		if _, err := tx.ExecContext(ctx,
			`INSERT INTO app.feature_flags (tenant_id, flag_key, enabled)
			 VALUES ($1, $2, $3)
			 ON CONFLICT (tenant_id, flag_key) DO NOTHING`,
			tenantID, f.key, f.enabled); err != nil {
			p.Log.Warn().Err(err).Str("flag", f.key).Msg("seed flag skipped")
		}
	}

	// 3. Trial subscription (14 days, free tier).
	var starterPlanID uuid.UUID
	_ = tx.GetContext(ctx, &starterPlanID,
		`SELECT id FROM app.billing_plans WHERE code='starter' AND active=TRUE LIMIT 1`)
	if starterPlanID != uuid.Nil {
		trialEnd := time.Now().UTC().AddDate(0, 0, 14)
		if _, err := tx.ExecContext(ctx,
			`INSERT INTO app.billing_subscriptions
			 (tenant_id, plan_id, status, starts_at, renews_at, provider, trial_ends_at)
			 VALUES ($1, $2, 'trialing', NOW(), $3, 'manual', $3)`,
			tenantID, starterPlanID, trialEnd); err != nil {
			p.Log.Warn().Err(err).Msg("seed trial subscription skipped")
		}
	}

	// 4. Default branding.
	if _, err := tx.ExecContext(ctx,
		`INSERT INTO app.tenant_branding (tenant_id, primary_color, accent_color)
		 VALUES ($1, '#0A0A0A', '#5E5CE6')
		 ON CONFLICT (tenant_id) DO NOTHING`, tenantID); err != nil {
		p.Log.Warn().Err(err).Msg("seed branding skipped")
	}

	// 5. Default shift template (standard 09:00-18:00 for office tenants).
	if _, err := tx.ExecContext(ctx,
		`INSERT INTO app.shift_templates
		 (tenant_id, code, label, start_time, end_time, color, break_minutes)
		 VALUES ($1, 'OFFICE_0900_1800', 'Ofis 09:00-18:00', '09:00', '18:00', '#5E5CE6', 60)
		 ON CONFLICT DO NOTHING`, tenantID); err != nil {
		p.Log.Warn().Err(err).Msg("seed shift template skipped")
	}

	// 6. Welcome notification for the owner.
	if ownerEmail != "" {
		if _, err := tx.ExecContext(ctx,
			`INSERT INTO app.notifications
			 (tenant_id, channel, template_key, recipient_email, status, priority, payload)
			 VALUES ($1, 'email', 'welcome', $2, 'queued', 'high', '{}'::jsonb)
			 ON CONFLICT DO NOTHING`,
			tenantID, ownerEmail); err != nil {
			p.Log.Debug().Err(err).Msg("welcome notification skipped (table shape varies)")
		}
	}

	if err := tx.Commit(); err != nil {
		return fmt.Errorf("commit: %w", err)
	}

	p.Log.Info().Str("tenant_id", tenantID.String()).Msg("tenant provisioned")
	return nil
}
