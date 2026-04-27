-- =============================================================================
-- 065_referral_network.up.sql
-- Enterprise referral network — anonim psikolog/koç rezervasyon.
-- Çalışan anonimdir (referral_bookings.employee_id tenant tarafından görülemez);
-- şirket faturalandırması provider-level invoice üzerinden yürütülür.
-- =============================================================================

SET search_path TO app, public;

-- ───────────────────────────────────────────────────────────────────────────
-- Providers: platform-wide havuz (tenant_id NULL = global) ya da tenant-specific.
-- ───────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS app.referral_providers (
    id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id       UUID        REFERENCES app.tenants(id) ON DELETE CASCADE, -- NULL = global
    full_name       TEXT        NOT NULL,
    title           TEXT        NOT NULL,                        -- ör: "Klinik Psikolog"
    specialties     TEXT[]      NOT NULL DEFAULT ARRAY[]::TEXT[],-- ör: ['burnout','anxiety','leadership-coach']
    bio_tr          TEXT,
    photo_url       TEXT,
    languages       TEXT[]      NOT NULL DEFAULT ARRAY['tr']::TEXT[],
    session_type    TEXT        NOT NULL CHECK (session_type IN ('video','phone','in_person','hybrid')),
    session_fee_try NUMERIC(10,2) NOT NULL DEFAULT 0,
    license_no      TEXT,                                        -- Türk Psikologlar Derneği üye no
    is_active       BOOLEAN     NOT NULL DEFAULT TRUE,
    avg_rating      NUMERIC(3,2),                                -- 0..5
    session_count   INTEGER     NOT NULL DEFAULT 0,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_referral_providers_tenant   ON app.referral_providers (tenant_id);
CREATE INDEX IF NOT EXISTS idx_referral_providers_active   ON app.referral_providers (is_active) WHERE is_active = TRUE;
CREATE INDEX IF NOT EXISTS idx_referral_providers_specs    ON app.referral_providers USING GIN (specialties);

ALTER TABLE app.referral_providers ENABLE ROW LEVEL SECURITY;
CREATE POLICY referral_providers_visibility ON app.referral_providers
    USING (tenant_id IS NULL OR tenant_id::text = current_setting('app.tenant_id', true))
    WITH CHECK (tenant_id IS NOT NULL AND tenant_id::text = current_setting('app.tenant_id', true));

DROP TRIGGER IF EXISTS trg_referral_providers_updated_at ON app.referral_providers;
CREATE TRIGGER trg_referral_providers_updated_at
    BEFORE UPDATE ON app.referral_providers
    FOR EACH ROW EXECUTE FUNCTION touch_updated_at();

-- ───────────────────────────────────────────────────────────────────────────
-- Bookings: ANONİM. tenant_id hangi şirketin ödeyeceğini belirler.
-- employee_id encrypt edilir; yalnızca employee kendi kaydını + provider görür.
-- HR/admin SADECE aggregate metrikler görür (bkz. v_referral_usage view).
-- ───────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS app.referral_bookings (
    id                UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id         UUID        NOT NULL REFERENCES app.tenants(id) ON DELETE CASCADE,
    provider_id       UUID        NOT NULL REFERENCES app.referral_providers(id) ON DELETE RESTRICT,
    -- Encrypted employee identity; yalnızca çalışanın kendi portalı çözebilir.
    employee_pseudo   TEXT        NOT NULL,                         -- hash(tenant_id || employee_id || tenant_salt)
    slot_start_at     TIMESTAMPTZ NOT NULL,
    slot_end_at       TIMESTAMPTZ NOT NULL,
    status            TEXT        NOT NULL CHECK (status IN
                        ('requested','confirmed','completed','cancelled','no_show')) DEFAULT 'requested',
    session_notes_enc BYTEA,                                        -- pgcrypto — yalnızca provider çözebilir
    billable_cents    BIGINT      NOT NULL DEFAULT 0,               -- şirket faturalandırması
    invoice_id        UUID,                                          -- billing.invoices bağlantısı (opsiyonel)
    cancelled_reason  TEXT,
    created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT chk_slot_range CHECK (slot_end_at > slot_start_at)
);

CREATE INDEX IF NOT EXISTS idx_referral_bookings_tenant       ON app.referral_bookings (tenant_id);
CREATE INDEX IF NOT EXISTS idx_referral_bookings_provider     ON app.referral_bookings (provider_id);
CREATE INDEX IF NOT EXISTS idx_referral_bookings_slot         ON app.referral_bookings (slot_start_at);
CREATE INDEX IF NOT EXISTS idx_referral_bookings_status       ON app.referral_bookings (status) WHERE status != 'completed';
CREATE INDEX IF NOT EXISTS idx_referral_bookings_pseudo       ON app.referral_bookings (tenant_id, employee_pseudo);

ALTER TABLE app.referral_bookings ENABLE ROW LEVEL SECURITY;
CREATE POLICY referral_bookings_tenant ON app.referral_bookings
    USING (tenant_id::text = current_setting('app.tenant_id', true))
    WITH CHECK (tenant_id::text = current_setting('app.tenant_id', true));

DROP TRIGGER IF EXISTS trg_referral_bookings_updated_at ON app.referral_bookings;
CREATE TRIGGER trg_referral_bookings_updated_at
    BEFORE UPDATE ON app.referral_bookings
    FOR EACH ROW EXECUTE FUNCTION touch_updated_at();

-- ───────────────────────────────────────────────────────────────────────────
-- HR/admin kullanımı için aggregate view (çalışan kimliğini dışa vermez).
-- ───────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE VIEW app.v_referral_usage AS
SELECT
    tenant_id,
    DATE_TRUNC('month', slot_start_at)::DATE AS month,
    COUNT(*)                                   AS session_count,
    COUNT(*) FILTER (WHERE status='completed') AS completed_count,
    COUNT(DISTINCT employee_pseudo)            AS unique_employee_count,
    COALESCE(SUM(billable_cents),0)            AS billable_total_cents
FROM app.referral_bookings
GROUP BY tenant_id, DATE_TRUNC('month', slot_start_at);

COMMENT ON TABLE  app.referral_providers IS 'Enterprise referral network — anonim psikolog/koç havuzu.';
COMMENT ON TABLE  app.referral_bookings  IS 'Çalışan anonim (pseudo), şirket faturalandırma — bkz. referral_service.go';
