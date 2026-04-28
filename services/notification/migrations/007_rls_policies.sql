-- 007_rls_policies.sql
-- Row-level security policies for tenant isolation.
--
-- PostgreSQL `CREATE POLICY IF NOT EXISTS` her PG sürümünde desteklenmiyor
-- (Azure Flexible Server 16'da bile reject ediliyor); idempotent olması için
-- önce DROP POLICY IF EXISTS, sonra CREATE POLICY pattern'ı kullanıyoruz.

-- Enable RLS on tenant-scoped tables.
ALTER TABLE notification_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_inapp ENABLE ROW LEVEL SECURITY;

-- Templates: system templates (NULL tenant_id) are visible to all;
-- tenant-specific templates only visible to their tenant.
DROP POLICY IF EXISTS tenant_isolation_templates ON notification_templates;
CREATE POLICY tenant_isolation_templates
    ON notification_templates
    USING (
        tenant_id IS NULL
        OR tenant_id = current_setting('app.tenant_id', true)::UUID
    );

-- Notifications: tenant isolation.
DROP POLICY IF EXISTS tenant_isolation_notifications ON notifications;
CREATE POLICY tenant_isolation_notifications
    ON notifications
    USING (tenant_id = current_setting('app.tenant_id', true)::UUID);

-- Preferences: tenant isolation.
DROP POLICY IF EXISTS tenant_isolation_preferences ON notification_preferences;
CREATE POLICY tenant_isolation_preferences
    ON notification_preferences
    USING (tenant_id = current_setting('app.tenant_id', true)::UUID);

-- In-app: tenant isolation.
DROP POLICY IF EXISTS tenant_isolation_inapp ON notification_inapp;
CREATE POLICY tenant_isolation_inapp
    ON notification_inapp
    USING (tenant_id = current_setting('app.tenant_id', true)::UUID);

-- email_suppression is global (no tenant_id) -- no RLS needed.
