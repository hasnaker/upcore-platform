package db

// SQL queries shared across repositories. Grouped by entity for discoverability.

const (
	// Tenant queries
	QInsertTenant = `
		INSERT INTO tenants
			(id, name, slug, vkn, tckn, country, locale, status, trial_ends_at, created_at, updated_at)
		VALUES
			(:id, :name, :slug, :vkn, :tckn, :country, :locale, :status, :trial_ends_at, :created_at, :updated_at)`

	QSelectTenantByID = `
		SELECT id, name, slug, vkn, tckn, country, locale, status,
			trial_ends_at, deleted_at, created_at, updated_at
		FROM tenants WHERE id = $1 AND deleted_at IS NULL`

	QSelectTenantBySlug = `
		SELECT id, name, slug, vkn, tckn, country, locale, status,
			trial_ends_at, deleted_at, created_at, updated_at
		FROM tenants WHERE slug = $1 AND deleted_at IS NULL`

	QUpdateTenant = `
		UPDATE tenants SET
			name = :name,
			locale = :locale,
			status = :status,
			trial_ends_at = :trial_ends_at,
			updated_at = :updated_at
		WHERE id = :id AND deleted_at IS NULL`

	QSoftDeleteTenant = `UPDATE tenants SET deleted_at = $2, status = 'deleted', updated_at = $2 WHERE id = $1`
	QHardDeleteTenant = `DELETE FROM tenants WHERE id = $1`

	// Plan queries
	QSelectPlanByID = `
		SELECT id, name, tier, price_monthly, features, is_active, created_at, updated_at
		FROM plans WHERE id = $1`

	QListActivePlans = `
		SELECT id, name, tier, price_monthly, features, is_active, created_at, updated_at
		FROM plans WHERE is_active = true ORDER BY price_monthly ASC NULLS LAST`

	// Subscription queries
	QInsertSubscription = `
		INSERT INTO subscriptions
			(id, tenant_id, plan_id, status, current_period_start, current_period_end,
			 cancel_at, stripe_subscription_id, iyzico_subscription_id, seats, trial_ends_at,
			 created_at, updated_at)
		VALUES
			(:id, :tenant_id, :plan_id, :status, :current_period_start, :current_period_end,
			 :cancel_at, :stripe_subscription_id, :iyzico_subscription_id, :seats, :trial_ends_at,
			 :created_at, :updated_at)`

	QSelectSubscriptionByTenant = `
		SELECT id, tenant_id, plan_id, status, current_period_start, current_period_end,
			cancel_at, stripe_subscription_id, iyzico_subscription_id, seats, trial_ends_at,
			created_at, updated_at
		FROM subscriptions WHERE tenant_id = $1 ORDER BY created_at DESC LIMIT 1`

	QUpdateSubscription = `
		UPDATE subscriptions SET
			plan_id = :plan_id,
			status = :status,
			current_period_start = :current_period_start,
			current_period_end = :current_period_end,
			cancel_at = :cancel_at,
			seats = :seats,
			updated_at = :updated_at
		WHERE id = :id`

	QCancelSubscription = `
		UPDATE subscriptions SET status = 'canceled', cancel_at = $2, updated_at = $2 WHERE id = $1`

	// Usage queries
	QUpsertUsage = `
		INSERT INTO usage_counters (tenant_id, metric, value, period_start, period_end, updated_at)
		VALUES ($1, $2, $3, $4, $5, $6)
		ON CONFLICT (tenant_id, metric, period_start) DO UPDATE SET
			value = usage_counters.value + EXCLUDED.value,
			updated_at = EXCLUDED.updated_at`

	QGetUsage = `
		SELECT tenant_id, metric, value, period_start, period_end, updated_at
		FROM usage_counters
		WHERE tenant_id = $1 AND metric = $2 AND period_start = $3`

	QListUsageByTenant = `
		SELECT tenant_id, metric, value, period_start, period_end, updated_at
		FROM usage_counters
		WHERE tenant_id = $1 AND period_start = $2`
)
