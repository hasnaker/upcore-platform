-- =============================================================================
-- 052_consent_history.up.sql — KVKK rıza değişimi append-only audit trail
--
-- `app.consent_history` — `app.data_consents` üzerindeki her INSERT/UPDATE
-- için bir satır. İmmutable: UPDATE/DELETE engellenir (app.immutable_row).
--
-- KVKK 28. madde (7 yıl saklama) + ispat yükümlülüğü: çalışan bir rızayı
-- ne zaman verdi / geri çekti, hangi IP / user-agent ile → bu tablodan okunur.
-- =============================================================================

BEGIN;

CREATE TABLE IF NOT EXISTS app.consent_history (
    id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id           uuid NOT NULL REFERENCES app.tenants(id) ON DELETE CASCADE,
    consent_id          uuid NOT NULL REFERENCES app.data_consents(id) ON DELETE CASCADE,
    user_id             uuid NOT NULL REFERENCES app.users(id) ON DELETE CASCADE,
    consent_type        text NOT NULL,
    version             integer NOT NULL,
    previous_status     text
                        CHECK (previous_status IS NULL OR previous_status IN ('granted','declined','revoked')),
    new_status          text NOT NULL
                        CHECK (new_status IN ('granted','declined','revoked')),
    change_reason       text NOT NULL DEFAULT 'user_action'
                        CHECK (change_reason IN (
                            'user_action',
                            'version_upgrade',
                            'admin_override',
                            'system_reset'
                        )),
    ip_addr             inet,
    user_agent          text,
    metadata            jsonb NOT NULL DEFAULT '{}'::jsonb,
    changed_at          timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_consent_history_user_type
    ON app.consent_history (tenant_id, user_id, consent_type, changed_at DESC);

CREATE INDEX IF NOT EXISTS idx_consent_history_consent
    ON app.consent_history (consent_id, changed_at DESC);

-- RLS — aynı tenant izolasyonu.
ALTER TABLE app.consent_history ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS consent_history_tenant_iso ON app.consent_history;
CREATE POLICY consent_history_tenant_iso ON app.consent_history
    USING (tenant_id = current_setting('app.tenant_id', true)::uuid)
    WITH CHECK (tenant_id = current_setting('app.tenant_id', true)::uuid);

-- Immutable (append-only): UPDATE / DELETE engellenir.
-- (app.immutable_row() migration 001'de tanımlı.)
DROP TRIGGER IF EXISTS trg_consent_history_no_update ON app.consent_history;
CREATE TRIGGER trg_consent_history_no_update
    BEFORE UPDATE ON app.consent_history
    FOR EACH ROW EXECUTE FUNCTION app.immutable_row();

DROP TRIGGER IF EXISTS trg_consent_history_no_delete ON app.consent_history;
CREATE TRIGGER trg_consent_history_no_delete
    BEFORE DELETE ON app.consent_history
    FOR EACH ROW EXECUTE FUNCTION app.immutable_row();

-- Otomatik history kaydı: data_consents INSERT veya status UPDATE olduğunda.
CREATE OR REPLACE FUNCTION app.data_consents_write_history()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
    v_prev text;
    v_reason text;
BEGIN
    IF TG_OP = 'INSERT' THEN
        v_prev := NULL;
        v_reason := 'user_action';

    ELSIF TG_OP = 'UPDATE' THEN
        -- Sadece status değiştiyse tarihsel satır üret.
        IF NEW.status IS NOT DISTINCT FROM OLD.status
           AND NEW.version = OLD.version THEN
            RETURN NEW;
        END IF;

        v_prev := OLD.status;
        IF NEW.version > OLD.version THEN
            v_reason := 'version_upgrade';
        ELSE
            v_reason := COALESCE(
                NULLIF(NEW.metadata->>'change_reason', ''),
                'user_action'
            );
        END IF;
    ELSE
        RETURN NEW;
    END IF;

    INSERT INTO app.consent_history (
        tenant_id, consent_id, user_id, consent_type, version,
        previous_status, new_status, change_reason,
        ip_addr, user_agent, metadata, changed_at
    ) VALUES (
        NEW.tenant_id, NEW.id, NEW.user_id, NEW.consent_type, NEW.version,
        v_prev, NEW.status, v_reason,
        NEW.ip_addr, NEW.user_agent, NEW.metadata, now()
    );

    RETURN NEW;
END$$;

DROP TRIGGER IF EXISTS trg_data_consents_history_insert ON app.data_consents;
CREATE TRIGGER trg_data_consents_history_insert
    AFTER INSERT ON app.data_consents
    FOR EACH ROW EXECUTE FUNCTION app.data_consents_write_history();

DROP TRIGGER IF EXISTS trg_data_consents_history_update ON app.data_consents;
CREATE TRIGGER trg_data_consents_history_update
    AFTER UPDATE ON app.data_consents
    FOR EACH ROW EXECUTE FUNCTION app.data_consents_write_history();

COMMENT ON TABLE app.consent_history IS
    'KVKK rıza değişimi append-only audit trail — data_consents üzerindeki INSERT/UPDATE trigger yazar.';
COMMENT ON FUNCTION app.data_consents_write_history() IS
    'Trigger: app.data_consents INSERT/UPDATE → app.consent_history satırı üretir.';

COMMIT;
