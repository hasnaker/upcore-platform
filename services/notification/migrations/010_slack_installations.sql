-- 010_slack_installations.sql
-- Slack workspace OAuth installations + per-tenant policy flags.
--
-- Bot tokens are stored encrypted via pgcrypto (PGP symmetric). The
-- symmetric key MUST be provided to the DB via SET LOCAL app.slack_kek =
-- '<hex>'; before any SELECT/INSERT that needs the plaintext. Application
-- code wraps this in a transaction.

CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS slack_installations (
    id                 UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id          UUID        NOT NULL,
    team_id            TEXT        NOT NULL,
    team_name          TEXT        NOT NULL,
    enterprise_id      TEXT,
    app_id             TEXT        NOT NULL,
    bot_user_id        TEXT        NOT NULL,
    authed_user_id     TEXT        NOT NULL,
    scope              TEXT        NOT NULL,
    incoming_webhook_url BYTEA,    -- pgp_sym_encrypt(text, key)
    incoming_webhook_channel      TEXT,
    incoming_webhook_channel_id   TEXT,
    default_channel_id TEXT,
    bot_token_encrypted BYTEA     NOT NULL,   -- pgp_sym_encrypt(xoxb-..., key)
    key_vault_ref      TEXT,                   -- Azure Key Vault secret ID, when available
    allow_dm_interventions BOOLEAN NOT NULL DEFAULT FALSE,  -- KVKK opt-in for intervention DMs
    installed_by       UUID        NOT NULL,
    installed_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    revoked_at         TIMESTAMPTZ,
    created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (tenant_id, team_id)
);

CREATE INDEX IF NOT EXISTS idx_slack_inst_tenant
    ON slack_installations (tenant_id) WHERE revoked_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_slack_inst_team
    ON slack_installations (team_id) WHERE revoked_at IS NULL;

-- Pending OAuth flows: CSRF state value, short-lived (10 min).
CREATE TABLE IF NOT EXISTS slack_oauth_states (
    state       TEXT        PRIMARY KEY,
    tenant_id   UUID        NOT NULL,
    user_id     UUID        NOT NULL,
    redirect_to TEXT,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    expires_at  TIMESTAMPTZ NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_slack_oauth_states_expiry
    ON slack_oauth_states (expires_at);

-- Per-user Slack mapping: resolve internal user_id → slack_user_id for DM delivery.
CREATE TABLE IF NOT EXISTS slack_user_map (
    tenant_id     UUID        NOT NULL,
    user_id       UUID        NOT NULL,
    team_id       TEXT        NOT NULL,
    slack_user_id TEXT        NOT NULL,
    email         TEXT,
    created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (tenant_id, user_id, team_id)
);

CREATE INDEX IF NOT EXISTS idx_slack_user_map_slack
    ON slack_user_map (team_id, slack_user_id);

-- RLS
ALTER TABLE slack_installations ENABLE ROW LEVEL SECURITY;
ALTER TABLE slack_oauth_states ENABLE ROW LEVEL SECURITY;
ALTER TABLE slack_user_map ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS tenant_isolation_slack_installations ON slack_installations;
CREATE POLICY tenant_isolation_slack_installations
    ON slack_installations
    USING (tenant_id = current_setting('app.tenant_id', true)::UUID);

DROP POLICY IF EXISTS tenant_isolation_slack_oauth_states ON slack_oauth_states;
CREATE POLICY tenant_isolation_slack_oauth_states
    ON slack_oauth_states
    USING (tenant_id = current_setting('app.tenant_id', true)::UUID);

DROP POLICY IF EXISTS tenant_isolation_slack_user_map ON slack_user_map;
CREATE POLICY tenant_isolation_slack_user_map
    ON slack_user_map
    USING (tenant_id = current_setting('app.tenant_id', true)::UUID);

-- updated_at trigger
CREATE OR REPLACE FUNCTION slack_touch_updated_at()
    RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_slack_installations_updated ON slack_installations;
CREATE TRIGGER trg_slack_installations_updated
    BEFORE UPDATE ON slack_installations
    FOR EACH ROW EXECUTE FUNCTION slack_touch_updated_at();

DROP TRIGGER IF EXISTS trg_slack_user_map_updated ON slack_user_map;
CREATE TRIGGER trg_slack_user_map_updated
    BEFORE UPDATE ON slack_user_map
    FOR EACH ROW EXECUTE FUNCTION slack_touch_updated_at();

COMMENT ON TABLE slack_installations IS 'Slack workspace OAuth installs per tenant (bot token encrypted at rest)';
COMMENT ON TABLE slack_oauth_states IS 'Short-lived CSRF state for Slack OAuth v2 authorize step';
COMMENT ON TABLE slack_user_map IS 'Internal user → Slack user ID mapping for DM delivery';
