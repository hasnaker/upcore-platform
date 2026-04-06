-- Subscriptions: tenant plan + billing lifecycle.
CREATE TABLE IF NOT EXISTS subscriptions (
    id                       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id                UUID        NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    plan_id                  VARCHAR(40) NOT NULL REFERENCES plans(id),
    status                   VARCHAR(20) NOT NULL DEFAULT 'trialing'
        CHECK (status IN ('trialing','active','past_due','canceled')),
    current_period_start     TIMESTAMPTZ NOT NULL,
    current_period_end       TIMESTAMPTZ NOT NULL,
    cancel_at                TIMESTAMPTZ,
    stripe_subscription_id   VARCHAR(120),
    iyzico_subscription_id   VARCHAR(120),
    seats                    INTEGER     NOT NULL DEFAULT 0,
    trial_ends_at            TIMESTAMPTZ,
    created_at               TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at               TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_subs_tenant     ON subscriptions(tenant_id);
CREATE INDEX IF NOT EXISTS idx_subs_stripe     ON subscriptions(stripe_subscription_id) WHERE stripe_subscription_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_subs_iyzico     ON subscriptions(iyzico_subscription_id) WHERE iyzico_subscription_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_subs_status     ON subscriptions(status);
