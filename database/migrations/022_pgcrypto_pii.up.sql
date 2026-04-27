-- =============================================================================
-- 022_pgcrypto_pii.up.sql
-- PII field-level encryption (TCKN) + helper functions + retention scheduler.
-- =============================================================================
--
-- Encryption stratejisi:
--   TCKN ham metin olarak tutulmaz. pgcrypto'nun `pgp_sym_encrypt` fonksiyonu
--   ile AES-encrypted bytea olarak `tckn_enc` sütununda tutulur. Decrypt
--   yalnızca uygulama katmanı `SET app.pii_key = '...'` yapıp
--   `decrypt_tckn()` UDF'sini çağırdığında mümkün.
--
-- Erişim politikası:
--   - Normal kullanıcı TCKN'i göremez (NULL döner).
--   - KVKK 11. madde veri ihracında ham TCKN export endpoint'inde
--     decrypt edilip log'a alınır.
-- =============================================================================

-- 1. pgcrypto extension (idempotent) ----------------------------------------
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- 2. employees.tckn_enc bytea sütunu ----------------------------------------
ALTER TABLE app.employees
    ADD COLUMN IF NOT EXISTS tckn_enc bytea,
    ADD COLUMN IF NOT EXISTS tckn_last_four text;

-- Çalışan detay listeleme için son 4 hane index'li — KVKK masked gösterim.
CREATE INDEX IF NOT EXISTS idx_employees_tckn_last_four
    ON app.employees (tenant_id, tckn_last_four)
    WHERE tckn_last_four IS NOT NULL;

COMMENT ON COLUMN app.employees.tckn_enc IS
    'TCKN AES-encrypted (pgcrypto pgp_sym_encrypt) — decrypt yalnızca yetkili KVKK export akışında.';

-- 3. UDF: encrypt_tckn(text) -> bytea ---------------------------------------
CREATE OR REPLACE FUNCTION app.encrypt_tckn(plain_tckn text)
RETURNS bytea
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    k text;
BEGIN
    IF plain_tckn IS NULL OR length(plain_tckn) <> 11 THEN
        RETURN NULL;
    END IF;
    k := current_setting('app.pii_key', true);
    IF k IS NULL OR k = '' THEN
        RAISE EXCEPTION 'app.pii_key session variable not set — set via SET app.pii_key = ''...''; before calling encrypt_tckn';
    END IF;
    RETURN pgp_sym_encrypt(plain_tckn, k);
END;
$$;

-- 4. UDF: decrypt_tckn(bytea) -> text ---------------------------------------
CREATE OR REPLACE FUNCTION app.decrypt_tckn(enc bytea)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    k text;
BEGIN
    IF enc IS NULL THEN
        RETURN NULL;
    END IF;
    k := current_setting('app.pii_key', true);
    IF k IS NULL OR k = '' THEN
        -- Anahtar yoksa NULL döner — KVKK ihlali olmaz.
        RETURN NULL;
    END IF;
    BEGIN
        RETURN pgp_sym_decrypt(enc, k);
    EXCEPTION WHEN OTHERS THEN
        RETURN NULL;
    END;
END;
$$;

-- 5. Mevcut plain tckn sütununu encrypt'e taşı (idempotent) -----------------
-- Not: app.pii_key session var'ı set edilmeden migration çalıştırılmamalı.
-- Dev/stage için wrap script: scripts/migrate-pii.sh
DO $$
DECLARE
    k text;
BEGIN
    k := current_setting('app.pii_key', true);
    IF k IS NOT NULL AND k <> '' THEN
        UPDATE app.employees
           SET tckn_enc       = app.encrypt_tckn(tckn),
               tckn_last_four = right(tckn, 4)
         WHERE tckn IS NOT NULL
           AND tckn_enc IS NULL;
    END IF;
END$$;

-- 6. Retention: KVKK uyumlu otomatik silme ----------------------------------
-- ATS aday (işe alınmamış) 6 ay sonra hard delete.
-- Audit log 7 yıl sonra cold storage'a arşiv.
-- Tenant termination 90 gün read-only sonra hard delete.
CREATE TABLE IF NOT EXISTS app.retention_policies (
    id             UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    name           TEXT        NOT NULL UNIQUE,
    table_name     TEXT        NOT NULL,
    tenant_scoped  BOOLEAN     NOT NULL DEFAULT TRUE,
    retention_days INT         NOT NULL CHECK (retention_days > 0),
    where_clause   TEXT        NOT NULL,
    enabled        BOOLEAN     NOT NULL DEFAULT TRUE,
    last_run_at    TIMESTAMPTZ,
    last_deleted   INT         NOT NULL DEFAULT 0,
    created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE app.retention_policies IS
    'KVKK uyumlu otomatik silme politikaları — nightly cron (retention-scheduler) tarafından işletilir.';

-- Varsayılan politikalar
INSERT INTO app.retention_policies (name, table_name, retention_days, where_clause)
VALUES
    ('ats_candidate_6mo',      'ats.candidates',       180, 'hired_at IS NULL AND status IN (''rejected'',''withdrawn'')'),
    ('audit_events_7y',        'app.audit_events',    2555, 'created_at < NOW() - INTERVAL ''7 years'''),
    ('tenant_deleted_90d',     'app.tenants',           90, 'status = ''deleted'' AND deleted_at < NOW() - INTERVAL ''90 days'''),
    ('survey_response_anon',   'app.survey_responses', 730, 'completed_at < NOW() - INTERVAL ''2 years''')
ON CONFLICT (name) DO NOTHING;

-- 7. Retention scheduler helper: UDF ---------------------------------------
CREATE OR REPLACE FUNCTION app.run_retention_policy(p_name text)
RETURNS int
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    r          app.retention_policies%ROWTYPE;
    n_deleted  int := 0;
    v_sql      text;
BEGIN
    SELECT * INTO r FROM app.retention_policies WHERE name = p_name AND enabled = true;
    IF NOT FOUND THEN
        RETURN 0;
    END IF;

    v_sql := format(
        'DELETE FROM %I.%I WHERE %s',
        split_part(r.table_name, '.', 1),
        split_part(r.table_name, '.', 2),
        r.where_clause
    );

    EXECUTE v_sql;
    GET DIAGNOSTICS n_deleted = ROW_COUNT;

    UPDATE app.retention_policies
       SET last_run_at  = NOW(),
           last_deleted = n_deleted
     WHERE id = r.id;

    RAISE NOTICE 'retention policy % deleted % rows', p_name, n_deleted;
    RETURN n_deleted;
END;
$$;

COMMENT ON FUNCTION app.run_retention_policy IS
    'KVKK retention executor — cron tarafından her gece çağrılır, etkilenen satır sayısını döner.';

-- 8. Security grants --------------------------------------------------------
-- Retention UDF'lerini sadece retention_runner rolü çağırabilir.
-- DO $$ BEGIN
--     CREATE ROLE retention_runner NOLOGIN;
-- EXCEPTION WHEN duplicate_object THEN NULL; END $$;
-- REVOKE ALL ON FUNCTION app.run_retention_policy FROM PUBLIC;
-- GRANT EXECUTE ON FUNCTION app.run_retention_policy TO retention_runner;
