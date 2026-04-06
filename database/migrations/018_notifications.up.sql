-- =============================================================================
-- 018_notifications.up.sql
-- Notifications + templates + channels + preferences
-- =============================================================================

CREATE TABLE app.notification_templates (
    id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id      uuid REFERENCES app.tenants(id) ON DELETE CASCADE,  -- NULL = global
    template_key   varchar(120) NOT NULL,
    channel        varchar(20) NOT NULL
                   CHECK (channel IN ('email','sms','push','in_app','slack','teams','webhook')),
    locale         varchar(10) NOT NULL DEFAULT 'tr-TR',
    subject        text,
    body           text NOT NULL,
    variables      jsonb NOT NULL DEFAULT '[]'::jsonb,
    active         boolean NOT NULL DEFAULT true,
    created_at     timestamptz NOT NULL DEFAULT now(),
    updated_at     timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT uq_notification_templates UNIQUE (tenant_id, template_key, channel, locale)
);

CREATE INDEX idx_notification_templates_key ON app.notification_templates(template_key, channel, locale) WHERE active = true;

CREATE TRIGGER trg_notification_templates_updated_at
    BEFORE UPDATE ON app.notification_templates
    FOR EACH ROW EXECUTE FUNCTION app.update_updated_at();

-- ===== Notification channels config ==========================================
CREATE TABLE app.notification_channels (
    id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id      uuid NOT NULL REFERENCES app.tenants(id) ON DELETE CASCADE,
    channel        varchar(20) NOT NULL
                   CHECK (channel IN ('email','sms','push','in_app','slack','teams','webhook')),
    provider       varchar(40) NOT NULL,                 -- sendgrid, twilio, fcm, ...
    config         jsonb NOT NULL DEFAULT '{}'::jsonb,
    secret_ref     varchar(200),
    status         varchar(20) NOT NULL DEFAULT 'active'
                   CHECK (status IN ('active','paused','disabled','error')),
    last_health_check_at timestamptz,
    created_at     timestamptz NOT NULL DEFAULT now(),
    updated_at     timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT uq_notification_channels UNIQUE (tenant_id, channel, provider)
);

CREATE INDEX idx_notification_channels_tenant ON app.notification_channels(tenant_id);

CREATE TRIGGER trg_notification_channels_updated_at
    BEFORE UPDATE ON app.notification_channels
    FOR EACH ROW EXECUTE FUNCTION app.update_updated_at();

-- ===== Notifications (outbound) ==============================================
CREATE TABLE app.notifications (
    id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id      uuid NOT NULL REFERENCES app.tenants(id) ON DELETE CASCADE,
    user_id        uuid REFERENCES app.users(id) ON DELETE CASCADE,
    employee_id    uuid REFERENCES app.employees(id) ON DELETE CASCADE,
    channel        varchar(20) NOT NULL
                   CHECK (channel IN ('email','sms','push','in_app','slack','teams','webhook')),
    template_key   varchar(120),
    subject        text,
    body           text,
    payload        jsonb NOT NULL DEFAULT '{}'::jsonb,
    priority       varchar(10) NOT NULL DEFAULT 'normal'
                   CHECK (priority IN ('low','normal','high','urgent')),
    status         varchar(20) NOT NULL DEFAULT 'pending'
                   CHECK (status IN ('pending','queued','sending','sent','delivered','failed','bounced','read')),
    scheduled_at   timestamptz,
    sent_at        timestamptz,
    delivered_at   timestamptz,
    read_at        timestamptz,
    failed_at      timestamptz,
    error_message  text,
    retry_count    int NOT NULL DEFAULT 0 CHECK (retry_count >= 0),
    provider_ref   varchar(200),
    created_at     timestamptz NOT NULL DEFAULT now(),
    updated_at     timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_notifications_tenant    ON app.notifications(tenant_id);
CREATE INDEX idx_notifications_user      ON app.notifications(user_id, created_at DESC);
CREATE INDEX idx_notifications_employee  ON app.notifications(employee_id, created_at DESC);
CREATE INDEX idx_notifications_status    ON app.notifications(status, scheduled_at) WHERE status IN ('pending','queued','sending');
CREATE INDEX idx_notifications_channel   ON app.notifications(tenant_id, channel, created_at DESC);

CREATE TRIGGER trg_notifications_updated_at
    BEFORE UPDATE ON app.notifications
    FOR EACH ROW EXECUTE FUNCTION app.update_updated_at();

-- ===== Notification preferences ==============================================
CREATE TABLE app.notification_preferences (
    id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id      uuid NOT NULL REFERENCES app.tenants(id) ON DELETE CASCADE,
    user_id        uuid NOT NULL REFERENCES app.users(id) ON DELETE CASCADE,
    category       varchar(60) NOT NULL,                -- burnout_alert, survey_invite, ...
    channel        varchar(20) NOT NULL
                   CHECK (channel IN ('email','sms','push','in_app','slack','teams')),
    opt_in         boolean NOT NULL DEFAULT true,
    quiet_hours    jsonb NOT NULL DEFAULT '{}'::jsonb,  -- {"start":"22:00","end":"08:00","tz":"Europe/Istanbul"}
    created_at     timestamptz NOT NULL DEFAULT now(),
    updated_at     timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT uq_notification_preferences UNIQUE (user_id, category, channel)
);

CREATE INDEX idx_notification_preferences_tenant ON app.notification_preferences(tenant_id);
CREATE INDEX idx_notification_preferences_user   ON app.notification_preferences(user_id);

CREATE TRIGGER trg_notification_preferences_updated_at
    BEFORE UPDATE ON app.notification_preferences
    FOR EACH ROW EXECUTE FUNCTION app.update_updated_at();

COMMENT ON TABLE app.notification_templates IS 'Bildirim şablonları (TR/EN, kanal bazlı).';
COMMENT ON TABLE app.notifications IS 'Gönderilen/bekleyen bildirimler (outbound queue).';
COMMENT ON TABLE app.notification_preferences IS 'Kullanıcı bildirim tercihleri + sessiz saatler.';
