-- 003_preferences.sql
-- Per-user per-channel per-category notification preferences.

CREATE TABLE IF NOT EXISTS notification_preferences (
    id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id    UUID        NOT NULL,
    user_id      UUID        NOT NULL,
    category     TEXT        NOT NULL,
    channel      TEXT        NOT NULL CHECK (channel IN ('email','sms','push','in_app','slack','teams','webhook')),
    opt_in       BOOLEAN     NOT NULL DEFAULT true,
    quiet_hours  JSONB       NOT NULL DEFAULT '{}',
    created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (tenant_id, user_id, channel, category)
);

CREATE INDEX IF NOT EXISTS idx_pref_user
    ON notification_preferences (tenant_id, user_id);

COMMENT ON TABLE notification_preferences IS 'User opt-in/opt-out and quiet hours preferences';
