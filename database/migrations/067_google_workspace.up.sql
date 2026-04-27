-- 051_google_workspace.up.sql
-- Google Workspace per-tenant installation + delta-sync bookmarks.

CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS google_workspace_installations (
    id                    UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id             UUID        NOT NULL,
    workspace_domain      TEXT        NOT NULL,         -- "acme.com"
    workspace_customer_id TEXT,                          -- "my_customer" or Cxxxxxxx
    authed_user_email     TEXT        NOT NULL,
    refresh_token_encrypted BYTEA     NOT NULL,         -- pgp_sym_encrypt(refresh_token, key)
    scope                 TEXT        NOT NULL,
    directory_sync_enabled BOOLEAN    NOT NULL DEFAULT TRUE,
    calendar_enabled      BOOLEAN     NOT NULL DEFAULT TRUE,
    drive_enabled         BOOLEAN     NOT NULL DEFAULT FALSE,
    installed_by          UUID        NOT NULL,
    installed_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    revoked_at            TIMESTAMPTZ,
    created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (tenant_id, workspace_domain)
);

CREATE INDEX IF NOT EXISTS idx_gw_inst_tenant
    ON google_workspace_installations (tenant_id) WHERE revoked_at IS NULL;

-- Per-run directory sync bookmark.
CREATE TABLE IF NOT EXISTS google_directory_sync_state (
    tenant_id        UUID        PRIMARY KEY,
    last_sync_at     TIMESTAMPTZ,
    last_page_token  TEXT,
    total_users      INTEGER     NOT NULL DEFAULT 0,
    last_error       TEXT,
    updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Calendar event mappings for intervention check-ins (idempotent re-sync).
CREATE TABLE IF NOT EXISTS google_calendar_events (
    id                  UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id           UUID        NOT NULL,
    intervention_id     UUID        NOT NULL,
    calendar_id         TEXT        NOT NULL,
    google_event_id     TEXT        NOT NULL,
    start_at            TIMESTAMPTZ NOT NULL,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (tenant_id, intervention_id, google_event_id)
);

ALTER TABLE google_workspace_installations ENABLE ROW LEVEL SECURITY;
ALTER TABLE google_directory_sync_state    ENABLE ROW LEVEL SECURITY;
ALTER TABLE google_calendar_events         ENABLE ROW LEVEL SECURITY;

CREATE POLICY IF NOT EXISTS tenant_iso_gw_installations
    ON google_workspace_installations
    USING (tenant_id = current_setting('app.tenant_id', true)::UUID);

CREATE POLICY IF NOT EXISTS tenant_iso_gw_sync
    ON google_directory_sync_state
    USING (tenant_id = current_setting('app.tenant_id', true)::UUID);

CREATE POLICY IF NOT EXISTS tenant_iso_gw_cal
    ON google_calendar_events
    USING (tenant_id = current_setting('app.tenant_id', true)::UUID);

CREATE OR REPLACE FUNCTION gw_touch_updated_at()
    RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_gw_installations_upd ON google_workspace_installations;
CREATE TRIGGER trg_gw_installations_upd
    BEFORE UPDATE ON google_workspace_installations
    FOR EACH ROW EXECUTE FUNCTION gw_touch_updated_at();
