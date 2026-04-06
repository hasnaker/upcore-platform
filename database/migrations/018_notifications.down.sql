-- =============================================================================
-- 018_notifications.down.sql
-- =============================================================================
DROP TRIGGER IF EXISTS trg_notification_preferences_updated_at ON app.notification_preferences;
DROP TABLE IF EXISTS app.notification_preferences CASCADE;
DROP TRIGGER IF EXISTS trg_notifications_updated_at ON app.notifications;
DROP TABLE IF EXISTS app.notifications CASCADE;
DROP TRIGGER IF EXISTS trg_notification_channels_updated_at ON app.notification_channels;
DROP TABLE IF EXISTS app.notification_channels CASCADE;
DROP TRIGGER IF EXISTS trg_notification_templates_updated_at ON app.notification_templates;
DROP TABLE IF EXISTS app.notification_templates CASCADE;
