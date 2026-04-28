-- 012_teams_installations.sql
-- Microsoft Teams bot installations per UpCore tenant.
--
-- Tokens: We prefer storing just the AAD tenant id + service URL and
-- re-acquiring bot tokens via client-credentials at runtime (cached in
-- memory). For environments where we *do* persist a token (e.g. delegated
-- Graph tokens to read presence), pgcrypto encryption is used via
-- `bot_token_encrypted` + `app.teams_kek` session key.

CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS teams_installations (
    id                 UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id          UUID        NOT NULL,
    aad_tenant_id      TEXT        NOT NULL,      -- directory (tenant) id (MS tid claim)
    team_id            TEXT,                      -- optional: Teams "team" (channel root)
    service_url        TEXT        NOT NULL,      -- https://smba.trafficmanager.net/emea/
    bot_user_id        TEXT        NOT NULL,
    bot_token_encrypted BYTEA,                    -- optional encrypted token (short-lived)
    key_vault_ref      TEXT,
    installed_by       UUID        NOT NULL,
    installed_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    revoked_at         TIMESTAMPTZ,
    created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (tenant_id, aad_tenant_id)
);

CREATE INDEX IF NOT EXISTS idx_teams_inst_tenant
    ON teams_installations (tenant_id) WHERE revoked_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_teams_inst_aad
    ON teams_installations (aad_tenant_id) WHERE revoked_at IS NULL;

-- Short-lived OAuth state for the MSAL flow.
CREATE TABLE IF NOT EXISTS teams_oauth_states (
    state       TEXT        PRIMARY KEY,
    tenant_id   UUID        NOT NULL,
    user_id     UUID        NOT NULL,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    expires_at  TIMESTAMPTZ NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_teams_oauth_states_expiry
    ON teams_oauth_states (expires_at);

-- Internal user ↔ AAD user mapping (for DM delivery).
CREATE TABLE IF NOT EXISTS teams_user_map (
    tenant_id      UUID         NOT NULL,
    user_id        UUID         NOT NULL,
    aad_tenant_id  TEXT         NOT NULL,
    aad_user_id    TEXT         NOT NULL,
    conversation_id TEXT,                     -- cached DM conversation
    upn            TEXT,                      -- user principal name
    created_at     TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at     TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    PRIMARY KEY (tenant_id, user_id, aad_tenant_id)
);

ALTER TABLE teams_installations ENABLE ROW LEVEL SECURITY;
ALTER TABLE teams_oauth_states  ENABLE ROW LEVEL SECURITY;
ALTER TABLE teams_user_map      ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS tenant_iso_teams_installations ON teams_installations;
CREATE POLICY tenant_iso_teams_installations
    ON teams_installations
    USING (tenant_id = current_setting('app.tenant_id', true)::UUID);

DROP POLICY IF EXISTS tenant_iso_teams_oauth_states ON teams_oauth_states;
CREATE POLICY tenant_iso_teams_oauth_states
    ON teams_oauth_states
    USING (tenant_id = current_setting('app.tenant_id', true)::UUID);

DROP POLICY IF EXISTS tenant_iso_teams_user_map ON teams_user_map;
CREATE POLICY tenant_iso_teams_user_map
    ON teams_user_map
    USING (tenant_id = current_setting('app.tenant_id', true)::UUID);

CREATE OR REPLACE FUNCTION teams_touch_updated_at()
    RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_teams_installations_upd ON teams_installations;
CREATE TRIGGER trg_teams_installations_upd
    BEFORE UPDATE ON teams_installations
    FOR EACH ROW EXECUTE FUNCTION teams_touch_updated_at();

DROP TRIGGER IF EXISTS trg_teams_user_map_upd ON teams_user_map;
CREATE TRIGGER trg_teams_user_map_upd
    BEFORE UPDATE ON teams_user_map
    FOR EACH ROW EXECUTE FUNCTION teams_touch_updated_at();

COMMENT ON TABLE teams_installations IS 'MS Teams bot installs per UpCore tenant';
COMMENT ON TABLE teams_oauth_states  IS 'Short-lived CSRF state for MSAL OAuth code flow';
COMMENT ON TABLE teams_user_map      IS 'Internal user → AAD object id (+ DM conversation id)';
