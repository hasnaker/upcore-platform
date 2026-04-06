-- 006_immutability_triggers.sql
-- Triggers to enforce append-only behavior on audit tables.
-- UPDATE and DELETE are rejected at the database level.

CREATE OR REPLACE FUNCTION reject_audit_mutation()
RETURNS TRIGGER AS $$
BEGIN
    RAISE EXCEPTION 'audit_events is append-only: % operations are not allowed', TG_OP
        USING ERRCODE = 'restrict_violation';
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Reject UPDATE on audit_events partitions.
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_trigger WHERE tgname = 'trg_audit_events_no_update'
    ) THEN
        CREATE TRIGGER trg_audit_events_no_update
            BEFORE UPDATE ON audit_events
            FOR EACH ROW
            EXECUTE FUNCTION reject_audit_mutation();
    END IF;
END $$;

-- Reject DELETE on audit_events partitions.
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_trigger WHERE tgname = 'trg_audit_events_no_delete'
    ) THEN
        CREATE TRIGGER trg_audit_events_no_delete
            BEFORE DELETE ON audit_events
            FOR EACH ROW
            EXECUTE FUNCTION reject_audit_mutation();
    END IF;
END $$;

-- Reject mutations on kvkk_access_log.
CREATE OR REPLACE FUNCTION reject_kvkk_log_mutation()
RETURNS TRIGGER AS $$
BEGIN
    RAISE EXCEPTION 'kvkk_access_log is append-only: % operations are not allowed', TG_OP
        USING ERRCODE = 'restrict_violation';
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_trigger WHERE tgname = 'trg_kvkk_log_no_update'
    ) THEN
        CREATE TRIGGER trg_kvkk_log_no_update
            BEFORE UPDATE ON kvkk_access_log
            FOR EACH ROW
            EXECUTE FUNCTION reject_kvkk_log_mutation();
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_trigger WHERE tgname = 'trg_kvkk_log_no_delete'
    ) THEN
        CREATE TRIGGER trg_kvkk_log_no_delete
            BEFORE DELETE ON kvkk_access_log
            FOR EACH ROW
            EXECUTE FUNCTION reject_kvkk_log_mutation();
    END IF;
END $$;
