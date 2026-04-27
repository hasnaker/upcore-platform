-- 045_webhooks_apikeys.up.sql
-- Customer-defined webhook subscriptions + public API key management.

-- Müşteri kendi sistemine UpCore event'i almak için webhook tanımlar.
CREATE TABLE IF NOT EXISTS app.webhook_subscriptions (
    id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id         uuid NOT NULL,
    name              varchar(100) NOT NULL,
    target_url        varchar(500) NOT NULL,
    event_types       text[] NOT NULL,   -- ['employee.*', 'offer.accepted.v1']
    secret            text NOT NULL,     -- HMAC-SHA256 signing key
    active            boolean NOT NULL DEFAULT TRUE,
    last_success_at   timestamptz,
    last_failure_at   timestamptz,
    failure_count     integer NOT NULL DEFAULT 0,
    max_failures      integer NOT NULL DEFAULT 10,
    created_by        uuid,
    created_at        timestamptz NOT NULL DEFAULT now(),
    updated_at        timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_webhook_subs_active
    ON app.webhook_subscriptions (tenant_id, active);

ALTER TABLE app.webhook_subscriptions ENABLE ROW LEVEL SECURITY;
CREATE POLICY webhook_subs_rls ON app.webhook_subscriptions
    USING (tenant_id = current_setting('app.tenant_id')::uuid)
    WITH CHECK (tenant_id = current_setting('app.tenant_id')::uuid);

-- Her webhook delivery denemesi loglanır (idempotent + debug için).
CREATE TABLE IF NOT EXISTS app.webhook_deliveries (
    id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    subscription_id   uuid NOT NULL REFERENCES app.webhook_subscriptions(id) ON DELETE CASCADE,
    tenant_id         uuid NOT NULL,
    event_id          uuid,
    event_type        varchar(100) NOT NULL,
    payload           jsonb NOT NULL,
    status_code       integer,
    response_body     text,
    duration_ms       integer,
    attempts          integer NOT NULL DEFAULT 1,
    next_retry_at     timestamptz,
    delivered_at      timestamptz,
    failed_at         timestamptz,
    created_at        timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_webhook_deliveries_sub
    ON app.webhook_deliveries (subscription_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_webhook_deliveries_pending
    ON app.webhook_deliveries (next_retry_at)
    WHERE delivered_at IS NULL AND failed_at IS NULL;

-- Public API key'ler: müşteri kendi entegrasyonu için.
CREATE TABLE IF NOT EXISTS app.api_keys (
    id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id         uuid NOT NULL,
    label             varchar(100) NOT NULL,
    key_prefix        varchar(16) NOT NULL,       -- "upc_live_ab1234" — görünür kısım
    key_hash          bytea NOT NULL,             -- bcrypt hash of full key
    scopes            text[] NOT NULL DEFAULT '{}', -- ['read:employees', 'write:leave']
    rate_limit_per_minute integer NOT NULL DEFAULT 60,
    last_used_at      timestamptz,
    revoked_at        timestamptz,
    expires_at        timestamptz,
    created_by        uuid,
    created_at        timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_api_keys_prefix ON app.api_keys (key_prefix);

ALTER TABLE app.api_keys ENABLE ROW LEVEL SECURITY;
CREATE POLICY api_keys_rls ON app.api_keys
    USING (tenant_id = current_setting('app.tenant_id')::uuid)
    WITH CHECK (tenant_id = current_setting('app.tenant_id')::uuid);

COMMENT ON TABLE app.webhook_subscriptions IS 'Müşteri-tanımlı webhook endpoint''leri; HMAC-SHA256 imzalanır';
COMMENT ON TABLE app.webhook_deliveries IS 'Her delivery denemesi — exponential backoff retry ile 10 kez';
COMMENT ON TABLE app.api_keys IS 'Public API token — key_prefix görünür, tam key sadece bir kez';
