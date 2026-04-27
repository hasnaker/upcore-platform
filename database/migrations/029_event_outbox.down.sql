SET search_path TO app, public;

DELETE FROM app.retention_policies WHERE name = 'event_outbox_dispatched_30d';

DROP TRIGGER IF EXISTS trg_event_outbox_updated_at ON app.event_outbox;
DROP TABLE IF EXISTS app.event_outbox CASCADE;
