-- =============================================================================
-- 051_data_consents.up.sql — KVKK çalışan rıza yönetimi (P1)
--
-- `app.data_consents` — her çalışanın her rıza tipi için en güncel karar.
-- Çalışan her toggle attığında aynı satır UPDATE edilir; tarihsel değişimler
-- `app.consent_history` tablosunda (migration 052) trigger ile tutulur.
--
-- 5 rıza tipi (versiyon 1):
--   - data_processing          (KVKK md.5 — açık rıza; zorunlu temel işleme)
--   - performance_evaluation   (Performans değerlendirmelerde kullanım)
--   - burnout_monitoring       (BAT-TR tükenmişlik pulse takibi)
--   - analytics                (Anonimleştirilmiş analitik)
--   - ai_recommendations       (KVKK md.22 — otomatik karar itiraz hakkı)
--
-- Status:
--   - granted  — rıza verildi, aktif
--   - declined — ilk defa reddedildi (hiç granted olmamış)
--   - revoked  — önce granted idi, sonra geri çekildi
-- =============================================================================

BEGIN;

CREATE TABLE IF NOT EXISTS app.data_consents (
    id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id       uuid NOT NULL REFERENCES app.tenants(id) ON DELETE CASCADE,
    user_id         uuid NOT NULL REFERENCES app.users(id) ON DELETE CASCADE,
    consent_type    text NOT NULL
                    CHECK (consent_type IN (
                        'data_processing',
                        'performance_evaluation',
                        'burnout_monitoring',
                        'analytics',
                        'ai_recommendations'
                    )),
    version         integer NOT NULL DEFAULT 1
                    CHECK (version >= 1),
    status          text NOT NULL
                    CHECK (status IN ('granted', 'declined', 'revoked')),
    accepted_at     timestamptz,
    ip_addr         inet,
    user_agent      text,
    metadata        jsonb NOT NULL DEFAULT '{}'::jsonb,
    created_at      timestamptz NOT NULL DEFAULT now(),
    updated_at      timestamptz NOT NULL DEFAULT now(),

    -- Bir çalışanın aynı rıza tipinin aynı versiyonu için tek satır olur.
    UNIQUE (tenant_id, user_id, consent_type, version),

    -- granted ise accepted_at zorunlu.
    CONSTRAINT data_consents_granted_requires_accepted
        CHECK (status <> 'granted' OR accepted_at IS NOT NULL)
);

CREATE INDEX IF NOT EXISTS idx_data_consents_tenant_user
    ON app.data_consents (tenant_id, user_id);

CREATE INDEX IF NOT EXISTS idx_data_consents_lookup
    ON app.data_consents (tenant_id, user_id, consent_type, version);

CREATE INDEX IF NOT EXISTS idx_data_consents_status
    ON app.data_consents (tenant_id, consent_type, status);

-- Row-level security: tenant isolation.
ALTER TABLE app.data_consents ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS data_consents_tenant_iso ON app.data_consents;
CREATE POLICY data_consents_tenant_iso ON app.data_consents
    USING (tenant_id = current_setting('app.tenant_id', true)::uuid)
    WITH CHECK (tenant_id = current_setting('app.tenant_id', true)::uuid);

-- updated_at trigger (app.update_updated_at() migration 001'de tanımlı).
DROP TRIGGER IF EXISTS trg_data_consents_updated_at ON app.data_consents;
CREATE TRIGGER trg_data_consents_updated_at
    BEFORE UPDATE ON app.data_consents
    FOR EACH ROW EXECUTE FUNCTION app.update_updated_at();

COMMENT ON TABLE app.data_consents IS
    'KVKK çalışan rıza kaydı — her (user, consent_type, version) için en güncel karar.';
COMMENT ON COLUMN app.data_consents.status IS
    'granted | declined (hiç onaylanmamış) | revoked (önce granted, sonra geri çekildi)';
COMMENT ON COLUMN app.data_consents.accepted_at IS
    'Son granted olduğu an — declined/revoked olsa bile geçmiş referans.';
COMMENT ON COLUMN app.data_consents.ip_addr IS
    'KVKK ispat için rızayı işaretleyen isteğin IP adresi.';
COMMENT ON COLUMN app.data_consents.user_agent IS
    'KVKK ispat için rızayı işaretleyen isteğin tarayıcı bilgisi.';
COMMENT ON COLUMN app.data_consents.version IS
    'Rıza metni versiyonu — yeni metin çıktığında tekrar toplanır.';

COMMIT;
