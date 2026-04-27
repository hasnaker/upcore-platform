-- =============================================================================
-- 064_ml_retraction_support.up.sql
-- P0-5 KVKK Madde 22 reversal workflow — downstream destekleri.
--
-- Kapsam:
--   1) intervention_assignments.metadata içinden source_prediction_id
--      lookup'u için expression index (ML prediction retract edildiğinde
--      türetilmiş atamaları hızla bul).
--   2) intervention_assignments.recommendation_active boolean kolonu —
--      iptal yerine yumuşak geri alma isteyen akışlar için (future flag).
--   3) ml_predictions_audit → ml_objections JOIN performansı için
--      (prediction_id) üzerinde yardımcı index.
--   4) ml_objections.status CHECK'ine 'retracted' pseudo-terminal değeri
--      EKLENMEZ: uphold zaten status='completed' + resolution_outcome='upheld'
--      kombinasyonu ile temsil ediliyor. Ek durum eklemek mevcut frontend
--      filter matrisini bozar.
-- =============================================================================

BEGIN;

SET search_path TO app, public;

-- -----------------------------------------------------------------------------
-- 1) Expression index: metadata ->> 'source_prediction_id'
-- -----------------------------------------------------------------------------
-- assignment_service.RetractFromPrediction sorgusu:
--   WHERE tenant_id = $1 AND metadata ->> 'source_prediction_id' = $2::text
-- B-tree expression index sıralı lookup için yeterli; GIN @? daha genel ama
-- sadece tek key sorduğumuz için overkill.
CREATE INDEX IF NOT EXISTS idx_intervention_assignments_source_prediction
    ON app.intervention_assignments (
        tenant_id,
        (metadata ->> 'source_prediction_id')
    )
    WHERE metadata ? 'source_prediction_id';

COMMENT ON INDEX app.idx_intervention_assignments_source_prediction IS
    'Hızlı lookup: ml.prediction.retracted.v1 geldiğinde o tahminden türetilmiş atamaları bul.';

-- -----------------------------------------------------------------------------
-- 2) recommendation_active soft-retract flag
-- -----------------------------------------------------------------------------
-- Not: Mevcut akış "iptal et" (status='cancelled') kullanıyor. Bu kolon bir
-- sonraki dalga için rezerve: UI, retracted öneriyi "gri" göstermek isteyebilir.
-- IF NOT EXISTS guard idempotent redeploy için.
ALTER TABLE app.intervention_assignments
    ADD COLUMN IF NOT EXISTS recommendation_active boolean NOT NULL DEFAULT true;

COMMENT ON COLUMN app.intervention_assignments.recommendation_active IS
    'Retract edilmiş tahminden türetilen öneriler için false. UI listelerde filtre.';

-- -----------------------------------------------------------------------------
-- 3) ml_predictions_audit prediction_id yardımcı index
-- -----------------------------------------------------------------------------
-- Uphold akışı: SELECT ... FOR UPDATE WHERE id = $1 AND tenant_id = $2.
-- Primary key (id) zaten index'li; ek (tenant_id, id) composite gereksiz —
-- ancak ml_predictions_audit.prediction_id bazen FK gibi ALIAS kullanılıyor
-- (retraction_objection_id → ml_objections.id). Bu yönde lookup için:
CREATE INDEX IF NOT EXISTS idx_ml_predictions_audit_retraction_objection
    ON app.ml_predictions_audit (retraction_objection_id)
    WHERE retraction_objection_id IS NOT NULL;

-- -----------------------------------------------------------------------------
-- 4) optimistic_lock_conflicts retention (rolling 90 gün)
-- -----------------------------------------------------------------------------
-- 063'te tablo oluşturulmuştu. Retention trigger: 90 günden eski conflict
-- kayıtları temizle (her ay cron tarafından çağrılacak UDF).
CREATE OR REPLACE FUNCTION app.prune_optimistic_lock_conflicts(older_than interval DEFAULT interval '90 days')
RETURNS bigint
LANGUAGE plpgsql
AS $$
DECLARE
    deleted bigint;
BEGIN
    DELETE FROM app.optimistic_lock_conflicts
     WHERE occurred_at < now() - older_than;
    GET DIAGNOSTICS deleted = ROW_COUNT;
    RETURN deleted;
END$$;

COMMENT ON FUNCTION app.prune_optimistic_lock_conflicts(interval) IS
    'Optimistic lock conflict kayıtlarını 90 gün sonra temizler. pg_cron: @monthly.';

COMMIT;
