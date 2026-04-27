-- 032_dlq_alerted.down.sql
DROP INDEX IF EXISTS app.idx_event_outbox_dlq_alert;
ALTER TABLE app.event_outbox DROP COLUMN IF EXISTS dlq_alerted_at;
