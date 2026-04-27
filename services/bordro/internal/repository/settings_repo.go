package repository

import (
	"context"
	"database/sql"
	"errors"
	"fmt"
	"time"

	"github.com/google/uuid"
	"github.com/jmoiron/sqlx"

	"github.com/upcore/bordrosvc/internal/domain"
)

// SettingsRepository abstracts app.tenant_bordro_settings (singleton per tenant).
type SettingsRepository interface {
	// GetOrDefault returns the tenant's settings; if none exist, returns a
	// *transient* defaults object (not persisted).
	GetOrDefault(ctx context.Context, tenantID uuid.UUID) (*domain.BordroSettings, error)
	// Upsert creates or updates the singleton row.
	Upsert(ctx context.Context, s *domain.BordroSettings) error
}

type settingsRepo struct{ db *sqlx.DB }

// NewSettingsRepository constructs the repo.
func NewSettingsRepository(d *sqlx.DB) SettingsRepository { return &settingsRepo{db: d} }

const settingsCols = `id, tenant_id, hours_per_month,
	meal_daily_gross, meal_exempt_daily,
	transport_daily_gross, transport_exempt_daily,
	kidem_yearly_cap, apply_min_wage_exemption, overtime_ytd_reset_month,
	created_at, updated_at`

func (r *settingsRepo) GetOrDefault(ctx context.Context, tenantID uuid.UUID) (*domain.BordroSettings, error) {
	tx, err := beginTx(ctx, r.db, tenantID, true)
	if err != nil {
		return nil, err
	}
	defer func() { _ = tx.Rollback() }()
	var s domain.BordroSettings
	q := `SELECT ` + settingsCols + ` FROM app.tenant_bordro_settings WHERE tenant_id = $1`
	if err := tx.GetContext(ctx, &s, q, tenantID); err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			d := &domain.BordroSettings{TenantID: tenantID, ApplyMinWageExemption: true}
			d.ApplyDefaults()
			return d, nil
		}
		return nil, fmt.Errorf("select settings: %w", err)
	}
	return &s, nil
}

func (r *settingsRepo) Upsert(ctx context.Context, s *domain.BordroSettings) error {
	s.ApplyDefaults()
	now := time.Now().UTC()
	if s.CreatedAt.IsZero() {
		s.CreatedAt = now
	}
	s.UpdatedAt = now
	tx, err := beginTx(ctx, r.db, s.TenantID, false)
	if err != nil {
		return err
	}
	defer func() { _ = tx.Rollback() }()
	q := `INSERT INTO app.tenant_bordro_settings (
		id, tenant_id, hours_per_month,
		meal_daily_gross, meal_exempt_daily,
		transport_daily_gross, transport_exempt_daily,
		kidem_yearly_cap, apply_min_wage_exemption, overtime_ytd_reset_month,
		created_at, updated_at
	) VALUES (
		:id, :tenant_id, :hours_per_month,
		:meal_daily_gross, :meal_exempt_daily,
		:transport_daily_gross, :transport_exempt_daily,
		:kidem_yearly_cap, :apply_min_wage_exemption, :overtime_ytd_reset_month,
		:created_at, :updated_at
	) ON CONFLICT (tenant_id) DO UPDATE SET
		hours_per_month = EXCLUDED.hours_per_month,
		meal_daily_gross = EXCLUDED.meal_daily_gross,
		meal_exempt_daily = EXCLUDED.meal_exempt_daily,
		transport_daily_gross = EXCLUDED.transport_daily_gross,
		transport_exempt_daily = EXCLUDED.transport_exempt_daily,
		kidem_yearly_cap = EXCLUDED.kidem_yearly_cap,
		apply_min_wage_exemption = EXCLUDED.apply_min_wage_exemption,
		overtime_ytd_reset_month = EXCLUDED.overtime_ytd_reset_month,
		updated_at = EXCLUDED.updated_at`
	if _, err := tx.NamedExecContext(ctx, q, s); err != nil {
		return fmt.Errorf("upsert settings: %w", err)
	}
	return tx.Commit()
}
