-- =============================================================================
-- 026_sgk_workplace.up.sql
-- SGK İşyeri konfigürasyonu — her tenant için 1 workplace (multi-site ileride).
-- Bordro servisi SGK bildirgelerini üretirken bu tabloyu JOIN eder.
-- =============================================================================

SET search_path TO app, public;

CREATE TABLE IF NOT EXISTS app.tenant_sgk_workplaces (
    id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id       UUID        NOT NULL REFERENCES app.tenants(id) ON DELETE CASCADE,
    -- Kimlik
    sicil_no        TEXT        NOT NULL,
    unvan           TEXT        NOT NULL,
    vergi_dairesi   TEXT,
    vergi_no        TEXT        NOT NULL,
    -- Adres
    il              TEXT,
    ilce            TEXT,
    adres           TEXT,
    -- SGK teknik
    kanun_turu      TEXT        NOT NULL DEFAULT '09100',
    is_active       BOOLEAN     NOT NULL DEFAULT TRUE,
    -- SGK e-Bildirge credentials (şimdilik null; ileride pgcrypto ile şifreli saklanacak)
    ebildirge_kullanici_adi TEXT,
    ebildirge_sifre_enc     BYTEA,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (tenant_id, sicil_no)
);

CREATE INDEX IF NOT EXISTS idx_tenant_sgk_workplace_tenant ON app.tenant_sgk_workplaces (tenant_id);

ALTER TABLE app.tenant_sgk_workplaces ENABLE ROW LEVEL SECURITY;
CREATE POLICY sgk_workplace_tenant_isolation ON app.tenant_sgk_workplaces
    USING (tenant_id::text = current_setting('app.tenant_id', true))
    WITH CHECK (tenant_id::text = current_setting('app.tenant_id', true));

-- Default primary workplace helper: tenant başına tek aktif workplace varsayımı.
-- Partial unique index ile garanti:
CREATE UNIQUE INDEX IF NOT EXISTS ux_tenant_sgk_workplace_primary
    ON app.tenant_sgk_workplaces (tenant_id)
    WHERE is_active = TRUE;

-- updated_at trigger
DROP TRIGGER IF EXISTS trg_tenant_sgk_workplaces_updated_at ON app.tenant_sgk_workplaces;
CREATE TRIGGER trg_tenant_sgk_workplaces_updated_at
    BEFORE UPDATE ON app.tenant_sgk_workplaces
    FOR EACH ROW EXECUTE FUNCTION touch_updated_at();

COMMENT ON TABLE app.tenant_sgk_workplaces IS
    'Tenant başına SGK işyeri bilgisi (sicil_no, unvan, vergi_no). APB/İGB/İAB bildirgelerinde JOIN edilir. Aktif workplace tenant başına tektir (partial unique index).';

-- ───────────────────────────────────────────────────────────────────────────
-- SGK-relevant employee fields — app.employees zaten TCKN tutuyor; meslek_kodu
-- ve baba_adi mevcut spec'te yok. Ekleyelim (null'a izin var — eski kayıtlar
-- boş kalabilir, İGB/APB'den önce UI'dan doldurulur).
-- ───────────────────────────────────────────────────────────────────────────
ALTER TABLE app.employees
    ADD COLUMN IF NOT EXISTS meslek_kodu TEXT,
    ADD COLUMN IF NOT EXISTS baba_adi    TEXT,
    ADD COLUMN IF NOT EXISTS sgk_ise_giris_tarihi DATE;

COMMENT ON COLUMN app.employees.meslek_kodu IS 'SGK meslek kodu (ISCO-08 bazlı). APB/İGB için zorunlu.';
COMMENT ON COLUMN app.employees.baba_adi    IS 'İGB için SGK zorunlu alanı.';
COMMENT ON COLUMN app.employees.sgk_ise_giris_tarihi IS 'SGK bildirgesinde kullanılan resmi başlama tarihi — hire_date''ten farklı olabilir (backdate/forward-date).';
