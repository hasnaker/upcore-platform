-- =============================================================================
-- 063_optimistic_locking_support.up.sql
-- P0 optimistic locking tamamlayıcı paket.
--
-- Not: Asıl `version INT NOT NULL DEFAULT 1` kolonları 062_security_hardening
-- migration'ında eklendi (succession_candidates, okrs, okr_key_results,
-- intervention_assignments, pip_cases, performance_reviews, internal_rotations).
-- 063 idempotent olarak aynı kolonları yeniden doğrular + aşağıdaki eksikleri
-- kapatır:
--
--   1) 062'de `app.internal_rotations` kullanıldı; repo spec'inde geçen isim
--      `rotation_requests`. Eski tenant'larda yanlış isimle oluşturulmuş tablo
--      varsa version kolonunu oraya da ekleriz (IF EXISTS guard).
--   2) ml_predictions_audit için retracted tahmini filtrelemeyi hızlandıran
--      (tenant_id, prediction_id) WHERE retracted_at IS NULL partial index.
--   3) Optimistic lock ihlali analitiği: app.optimistic_lock_conflicts tablosu.
--      Handler 409 döndüğünde satır atılır, operasyon ekibi patern izler.
--   4) ml_objections outcome uzayına 'retracted' yerine 'upheld' kullanılır —
--      zaten 062'de CHECK tanımlı; 063 sadece NULL->değer geçişinde audit log
--      trigger'ı ekler (forensic).
-- =============================================================================

BEGIN;

SET search_path TO app, public;

-- -----------------------------------------------------------------------------
-- 1) Version column idempotent guard
-- -----------------------------------------------------------------------------
-- 062 aşağıdaki tabloların tümüne version kolonu eklemişti. DEFAULT 1 sayesinde
-- mevcut satırlar otomatik dolar. Burada IF NOT EXISTS tekrarı ile redeploy
-- senaryolarında kontrol ederiz.
DO $$
DECLARE
    tbl text;
    tables text[] := ARRAY[
        'succession_candidates',
        'okrs',
        'okr_key_results',
        'intervention_assignments',
        'pip_cases',
        'performance_reviews',
        'internal_rotations'
    ];
BEGIN
    FOREACH tbl IN ARRAY tables LOOP
        IF EXISTS (
            SELECT 1 FROM information_schema.tables
            WHERE table_schema = 'app' AND table_name = tbl
        ) THEN
            EXECUTE format(
                'ALTER TABLE app.%I ADD COLUMN IF NOT EXISTS version INT NOT NULL DEFAULT 1',
                tbl
            );
        END IF;
    END LOOP;
END$$;

-- Eski tenantlarda 'rotation_requests' ismiyle oluşturulmuş tablo varsa
-- (arşiv / manual ops ihtimali), version kolonu orada da garanti altına alınır.
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.tables
        WHERE table_schema = 'app' AND table_name = 'rotation_requests'
    ) THEN
        ALTER TABLE app.rotation_requests
            ADD COLUMN IF NOT EXISTS version INT NOT NULL DEFAULT 1;
    END IF;
END$$;

-- -----------------------------------------------------------------------------
-- 2) Partial index — retract edilmemiş tahminler
-- -----------------------------------------------------------------------------
-- Günlük "canlı tahmin" sayısı/listesi sorgularında retracted kayıtları dışla.
CREATE INDEX IF NOT EXISTS idx_ml_predictions_active
    ON app.ml_predictions_audit (tenant_id, prediction_id)
    WHERE retracted_at IS NULL;

-- -----------------------------------------------------------------------------
-- 3) Optimistic lock conflict observability
-- -----------------------------------------------------------------------------
-- Her 409 → sinyal. Handler aynı tenant/resource için yüksek oran görürse
-- UI coalescing veya WebSocket push gerekir.
CREATE TABLE IF NOT EXISTS app.optimistic_lock_conflicts (
    id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id      uuid NOT NULL,
    resource_type  varchar(80)  NOT NULL,
    resource_id    uuid NOT NULL,
    expected_ver   int  NOT NULL,
    actual_ver     int,
    actor_user_id  uuid,
    service_name   varchar(64),
    correlation_id text,
    occurred_at    timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_optimistic_lock_conflicts_recent
    ON app.optimistic_lock_conflicts (tenant_id, resource_type, occurred_at DESC);

COMMENT ON TABLE app.optimistic_lock_conflicts IS
    'Compare-and-set UPDATE''te version mismatch ile 0 row affected olan vakalar. '
    'Exponential backoff retry dahi başarısız olursa handler 409 + satır ekler.';

-- -----------------------------------------------------------------------------
-- 4) ml_objections outcome transition audit
-- -----------------------------------------------------------------------------
-- resolution_outcome NULL iken SET edildiğinde forensic kayıt atarız.
CREATE TABLE IF NOT EXISTS app.ml_objection_outcome_history (
    id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    objection_id      uuid NOT NULL REFERENCES app.ml_objections(id) ON DELETE CASCADE,
    tenant_id         uuid NOT NULL,
    old_outcome       varchar(20),
    new_outcome       varchar(20) NOT NULL,
    actor_user_id     uuid,
    actor_ip          inet,
    actor_ua          text,
    changed_at        timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ml_objection_outcome_history_obj
    ON app.ml_objection_outcome_history (objection_id, changed_at DESC);

CREATE OR REPLACE FUNCTION app.log_ml_objection_outcome()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
    IF NEW.resolution_outcome IS DISTINCT FROM OLD.resolution_outcome
       AND NEW.resolution_outcome IS NOT NULL THEN
        INSERT INTO app.ml_objection_outcome_history
            (objection_id, tenant_id, old_outcome, new_outcome,
             actor_user_id, actor_ip, actor_ua)
        VALUES
            (NEW.id, NEW.tenant_id, OLD.resolution_outcome, NEW.resolution_outcome,
             NEW.reviewer_user_id, NEW.reviewer_ip, NEW.reviewer_ua);
    END IF;
    RETURN NEW;
END$$;

DROP TRIGGER IF EXISTS trg_ml_objection_outcome_history ON app.ml_objections;
CREATE TRIGGER trg_ml_objection_outcome_history
    AFTER UPDATE OF resolution_outcome ON app.ml_objections
    FOR EACH ROW EXECUTE FUNCTION app.log_ml_objection_outcome();

COMMIT;
