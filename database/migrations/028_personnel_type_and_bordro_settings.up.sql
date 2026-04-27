-- =============================================================================
-- 028_personnel_type_and_bordro_settings.up.sql
-- Türk kamu sektörü + bordro konfigürasyonu.
--   - app.employees: personnel_type (657/4B/4857/stajyer/geçici) +
--     kadro_derece / kademe / hizmet_sinifi / hizmet_puani (657 kamu)
--   - app.tenant_bordro_settings: yemek/yol exempt tavanları, kıdem tavanı,
--     hoursPerMonth, default run_type
-- =============================================================================

SET search_path TO app, public;

-- ───────────────────────────────────────────────────────────────────────────
-- 1. Personnel type + kadro alanları (app.employees)
-- ───────────────────────────────────────────────────────────────────────────
-- PersonnelType enum: 657=Kamu kadrolu, 4B=Sözleşmeli, 4857=Özel sektör
--                     4C=Geçici personel, stajyer=Üniversite stajyeri
ALTER TABLE app.employees
    ADD COLUMN IF NOT EXISTS personnel_type TEXT
        CHECK (personnel_type IN ('657','4B','4C','4857','stajyer','emekli_sozlesmeli'))
        DEFAULT '4857',
    -- 657 kamu personeli için:
    ADD COLUMN IF NOT EXISTS kadro_unvani   TEXT,     -- kadro unvanı
    ADD COLUMN IF NOT EXISTS kadro_derece   SMALLINT CHECK (kadro_derece BETWEEN 1 AND 15),
    ADD COLUMN IF NOT EXISTS kademe         SMALLINT CHECK (kademe BETWEEN 1 AND 9),
    ADD COLUMN IF NOT EXISTS hizmet_sinifi  TEXT,     -- GIH/TH/SH/YH/MİT vs
    ADD COLUMN IF NOT EXISTS hizmet_puani   INT,      -- kümülatif hizmet puanı (657)
    -- Kamu bordrosu için özel rakamlar:
    ADD COLUMN IF NOT EXISTS gosterge       INT,      -- ek gösterge
    ADD COLUMN IF NOT EXISTS ek_gosterge    INT;

COMMENT ON COLUMN app.employees.personnel_type IS
    'Türk istihdam türü: 657 Kamu kadrolu, 4B sözleşmeli, 4C geçici, 4857 özel sektör, stajyer, emekli_sozlesmeli.';
COMMENT ON COLUMN app.employees.kadro_derece IS '657 kamu: kadro derece (1-15).';
COMMENT ON COLUMN app.employees.kademe IS '657 kamu: derece içi kademe (1-9).';
COMMENT ON COLUMN app.employees.hizmet_sinifi IS 'GIH (Genel İdare Hizmetleri), TH (Teknik), SH (Sağlık), YH (Yardımcı), AH (Avukatlık) vb.';

CREATE INDEX IF NOT EXISTS idx_employees_tenant_personnel_type
    ON app.employees (tenant_id, personnel_type);

-- ───────────────────────────────────────────────────────────────────────────
-- 2. Tenant bordro ayarları (AGİ kaldırıldı 2022; istisna tavanları günceldir)
-- ───────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS app.tenant_bordro_settings (
    id                        UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id                 UUID        NOT NULL UNIQUE REFERENCES app.tenants(id) ON DELETE CASCADE,
    -- Çalışma varsayımları
    hours_per_month           NUMERIC(6,2) NOT NULL DEFAULT 225.00, -- saatlik ücret hesabı için (4857/32)
    -- Yemek yardımı
    meal_daily_gross          NUMERIC(10,2) NOT NULL DEFAULT 0, -- günlük yemek brüt tutarı
    meal_exempt_daily         NUMERIC(10,2) NOT NULL DEFAULT 240.00, -- 2026 tahmini yemek istisna tavanı (GVK Mük.67)
    -- Yol yardımı
    transport_daily_gross     NUMERIC(10,2) NOT NULL DEFAULT 0,
    transport_exempt_daily    NUMERIC(10,2) NOT NULL DEFAULT 126.00, -- 2026 tahmini yol istisna tavanı
    -- Kıdem tazminatı yıllık tavan (Maliye Bakanlığı yayınlar)
    kidem_yearly_cap          NUMERIC(14,2),
    -- Apply min wage exemption (yasal zorunluluk; flag tenant için false yapılabilir test amaçlı)
    apply_min_wage_exemption  BOOLEAN     NOT NULL DEFAULT TRUE,
    -- Fazla mesai YTD reset ayı (genelde 1 = Ocak)
    overtime_ytd_reset_month  SMALLINT    NOT NULL DEFAULT 1 CHECK (overtime_ytd_reset_month BETWEEN 1 AND 12),
    created_at                TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at                TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE app.tenant_bordro_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY bordro_settings_tenant_isolation ON app.tenant_bordro_settings
    USING (tenant_id::text = current_setting('app.tenant_id', true))
    WITH CHECK (tenant_id::text = current_setting('app.tenant_id', true));

DROP TRIGGER IF EXISTS trg_tenant_bordro_settings_updated_at ON app.tenant_bordro_settings;
CREATE TRIGGER trg_tenant_bordro_settings_updated_at
    BEFORE UPDATE ON app.tenant_bordro_settings
    FOR EACH ROW EXECUTE FUNCTION touch_updated_at();

COMMENT ON TABLE app.tenant_bordro_settings IS
    'Tenant-level bordro parametreleri: yemek/yol günlük tavanları (GVK Mük.67 + 61/f), kıdem tavanı, saatlik ücret hesabı, min wage flag.';
