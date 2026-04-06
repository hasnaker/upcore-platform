-- 001_templates.sql
-- Notification templates with per-tenant override and i18n support.

CREATE TABLE IF NOT EXISTS notification_templates (
    id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id    UUID,       -- NULL = system-wide template
    template_key TEXT        NOT NULL,
    channel      TEXT        NOT NULL CHECK (channel IN ('email','sms','push','in_app','slack','teams','webhook')),
    locale       TEXT        NOT NULL DEFAULT 'tr-TR',
    subject      TEXT,       -- required for email
    body         TEXT        NOT NULL,
    variables    JSONB       NOT NULL DEFAULT '[]',
    active       BOOLEAN     NOT NULL DEFAULT true,
    created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (tenant_id, template_key, channel, locale)
);

-- System templates have NULL tenant_id; unique constraint handles this
-- via partial unique index for system templates.
CREATE UNIQUE INDEX IF NOT EXISTS idx_tmpl_system_unique
    ON notification_templates (template_key, channel, locale)
    WHERE tenant_id IS NULL;

CREATE INDEX IF NOT EXISTS idx_tmpl_tenant_key
    ON notification_templates (tenant_id, template_key, locale);

COMMENT ON TABLE notification_templates IS 'Renderable notification templates with TR/EN localization';
