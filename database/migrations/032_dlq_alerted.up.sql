-- 032_dlq_alerted.up.sql
-- DLQ watcher (notification service) her dead-letter kaydı için bir kez uyarı
-- gönderir. Idempotency için event_outbox'a `dlq_alerted_at` eklendi.

ALTER TABLE app.event_outbox
    ADD COLUMN IF NOT EXISTS dlq_alerted_at timestamptz;

CREATE INDEX IF NOT EXISTS idx_event_outbox_dlq_alert
    ON app.event_outbox (attempts, dlq_alerted_at)
    WHERE dispatched = FALSE;

COMMENT ON COLUMN app.event_outbox.dlq_alerted_at IS 'DLQ watcher son uyarı gönderim zamanı — aynı kayıt için tekrar notif gönderilmez.';
