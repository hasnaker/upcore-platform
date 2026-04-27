-- =============================================================================
-- 057_psychometric_validation.up.sql
-- Versiyonlu psikometrik ölçek şeması + UpCap-TR v1.0 validasyon pipeline.
-- upc-upcap-validation skill kapsamı.
--
-- Tablolar:
--   - app.psychometric_scales     (versiyonlu ölçek kayıtları + validasyon bayrağı)
--   - app.psychometric_items      (item bankası — faktör + reverse + locale)
--   - app.psychometric_norms      (sektör/yaş/cinsiyet bazlı percentile + T-score)
--   - app.upcap_pilot_responses   (akademik pilot için anonim veri toplama)
--   - app.upcap_pilot_consents    (KVKK Madde 6 açık rıza kayıtları)
--
-- Tasarım notları:
--   * app.instruments/instrument_items mevcut (013) — bunlar runtime scoring
--     için kullanılır. `psychometric_scales` ise versiyonlama + `validated`
--     bayrağı + DOI + norm_table agregat jsonb için validasyon kayıt defteridir.
--   * upcap_pilot_* tabloları tenant_id içermez — anonim akademik pilot veri,
--     platform müşteri verisinden izole.
--   * Disclaimer: `validated=false` iken UI "bilimsel doğrulama sürecinde" gösterir,
--     `validated=true` olduğunda "Türkiye'de doğrulandı · DOI: ..." gösterir.
-- =============================================================================

SET search_path TO app, public;

-- ───────────────────────────────────────────────────────────────────────────
-- 1. Versiyonlu ölçek kayıtları
-- ───────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS app.psychometric_scales (
    id             UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    code           VARCHAR(40) NOT NULL,                -- upcap_tr, bat12_tr, copsoq_iii_tr
    version        VARCHAR(20) NOT NULL,                -- 1.0, 1.1, 2.0 (semver)
    locale         VARCHAR(10) NOT NULL DEFAULT 'tr-TR',
    name_tr        VARCHAR(200) NOT NULL,
    name_en        VARCHAR(200),
    description    TEXT,
    active         BOOLEAN     NOT NULL DEFAULT false,  -- production'da görünür mü
    validated      BOOLEAN     NOT NULL DEFAULT false,  -- CFA + Cronbach eşiği geçti mi
    validation_n   INT         NOT NULL DEFAULT 0,      -- Pilot katılımcı sayısı
    cronbach_alpha NUMERIC(4,3),                        -- En yeşim α sonucu (0.000-0.999)
    cfi            NUMERIC(4,3),                        -- CFA fit index
    tli            NUMERIC(4,3),
    rmsea          NUMERIC(4,3),
    srmr           NUMERIC(4,3),
    published_at   TIMESTAMPTZ,                         -- Peer-review accept zamanı
    doi            VARCHAR(200),                        -- 10.xxxx/yyyy (akademik referans)
    preprint_url   TEXT,
    license        VARCHAR(80) NOT NULL DEFAULT 'CC-BY-4.0',
    norm_table     JSONB       NOT NULL DEFAULT '{}'::jsonb,  -- sektör/yaş/cinsiyet agregat
    created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_psychometric_scales_code_version_locale
        UNIQUE (code, version, locale),
    CONSTRAINT chk_psychometric_scales_alpha
        CHECK (cronbach_alpha IS NULL OR (cronbach_alpha >= 0.000 AND cronbach_alpha <= 1.000))
);

CREATE INDEX IF NOT EXISTS idx_psychometric_scales_code_locale
    ON app.psychometric_scales(code, locale) WHERE active = true;
CREATE INDEX IF NOT EXISTS idx_psychometric_scales_validated
    ON app.psychometric_scales(code) WHERE validated = true;

COMMENT ON TABLE  app.psychometric_scales IS 'Versiyonlu psikometrik ölçek + validasyon kayıt defteri.';
COMMENT ON COLUMN app.psychometric_scales.validated IS 'TRUE: Türkiye''de CFA + Cronbach eşiği geçti. FALSE: validasyon devam.';
COMMENT ON COLUMN app.psychometric_scales.norm_table IS 'Sektör/yaş/cinsiyet agregat norm referansı (JSON).';

-- ───────────────────────────────────────────────────────────────────────────
-- 2. Item bankası
-- ───────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS app.psychometric_items (
    id             UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    scale_id       UUID        NOT NULL REFERENCES app.psychometric_scales(id) ON DELETE CASCADE,
    item_order     INT         NOT NULL CHECK (item_order >= 1),
    item_code      VARCHAR(40) NOT NULL,                -- upcap_01 ... upcap_12
    prompt_tr      TEXT        NOT NULL,
    prompt_en      TEXT,
    factor         VARCHAR(40) NOT NULL,                -- hope_optimism | resilience | self_efficacy
    reverse_scored BOOLEAN     NOT NULL DEFAULT false,
    min_value      INT         NOT NULL DEFAULT 1,
    max_value      INT         NOT NULL DEFAULT 6,
    anchor_labels  JSONB       NOT NULL DEFAULT '{}'::jsonb,
    active         BOOLEAN     NOT NULL DEFAULT true,
    created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_psychometric_items_scale_item
        UNIQUE (scale_id, item_code),
    CONSTRAINT uq_psychometric_items_scale_order
        UNIQUE (scale_id, item_order),
    CONSTRAINT chk_psychometric_items_factor
        CHECK (factor IN ('hope_optimism','resilience','self_efficacy'))
);

CREATE INDEX IF NOT EXISTS idx_psychometric_items_scale
    ON app.psychometric_items(scale_id, item_order);
CREATE INDEX IF NOT EXISTS idx_psychometric_items_factor
    ON app.psychometric_items(scale_id, factor);

COMMENT ON TABLE  app.psychometric_items IS 'Versiyonlu item bankası — scale_id bazında 3 faktör.';
COMMENT ON COLUMN app.psychometric_items.factor IS 'UpCap-TR 3 faktör: hope_optimism, resilience, self_efficacy.';

-- ───────────────────────────────────────────────────────────────────────────
-- 3. Sektör/yaş/cinsiyet norm tablosu
-- ───────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS app.psychometric_norms (
    id             UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    scale_id       UUID        NOT NULL REFERENCES app.psychometric_scales(id) ON DELETE CASCADE,
    segment_type   VARCHAR(40) NOT NULL,                -- sector | age_band | gender | overall
    segment_key    VARCHAR(80) NOT NULL,                -- public_sector | holding | sme | 22_30 | male | all
    n              INT         NOT NULL CHECK (n >= 0),
    mean_score     NUMERIC(6,3),
    sd_score       NUMERIC(6,3),
    percentile_map JSONB       NOT NULL DEFAULT '{}'::jsonb,
        -- {"raw_to_pctl":{"2.0":3,"2.5":10,"3.0":25,"3.5":50,"4.0":75,"4.5":90,"5.0":97}}
    t_score_map    JSONB       NOT NULL DEFAULT '{}'::jsonb,
        -- T-score: M=50, SD=10. {"raw_to_t":{"3.5":50.0,"4.5":60.0,"5.5":70.0}}
    collected_at   DATE,
    active         BOOLEAN     NOT NULL DEFAULT true,
    created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_psychometric_norms_scale_segment
        UNIQUE (scale_id, segment_type, segment_key),
    CONSTRAINT chk_psychometric_norms_segment_type
        CHECK (segment_type IN ('overall','sector','age_band','gender'))
);

CREATE INDEX IF NOT EXISTS idx_psychometric_norms_scale_segment
    ON app.psychometric_norms(scale_id, segment_type, segment_key) WHERE active = true;

COMMENT ON TABLE  app.psychometric_norms IS 'Segment bazlı ham→percentile + T-score map.';
COMMENT ON COLUMN app.psychometric_norms.t_score_map IS 'T-score transformu: M=50, SD=10 (klasik psikometri).';

-- ───────────────────────────────────────────────────────────────────────────
-- 4. Akademik pilot: anonim veri toplama (etik kurul + KVKK Madde 6 açık rıza)
-- ───────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS app.upcap_pilot_consents (
    id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    participant_token VARCHAR(64) NOT NULL UNIQUE,       -- UUID v4, client-generated
    consent_given   BOOLEAN     NOT NULL,
    consent_version VARCHAR(20) NOT NULL,                -- aydinlatilmis_onam_v1.0
    ethics_board    VARCHAR(200),                        -- X Üniversitesi İnsan Araş. EK
    ethics_protocol VARCHAR(100),                        -- 2026/04-123
    ip_hash         VARCHAR(64),                         -- SHA-256(ip+salt) audit için
    user_agent_hash VARCHAR(64),
    locale          VARCHAR(10) NOT NULL DEFAULT 'tr-TR',
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE app.upcap_pilot_consents IS 'KVKK Madde 6 açık rıza + etik kurul protokol kaydı — anonim token bazlı.';

CREATE TABLE IF NOT EXISTS app.upcap_pilot_responses (
    id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    consent_id      UUID        NOT NULL REFERENCES app.upcap_pilot_consents(id) ON DELETE CASCADE,
    scale_id        UUID        NOT NULL REFERENCES app.psychometric_scales(id),
    wave            SMALLINT    NOT NULL DEFAULT 1 CHECK (wave IN (1,2)),  -- test-retest
    responses       JSONB       NOT NULL,                -- {"upcap_01":5, ...}
    -- Anonim demografik — hiçbir PII yok
    sector          VARCHAR(40),                         -- public_sector | holding | sme | health | education
    age_band        VARCHAR(20),                         -- 22_30 | 31_45 | 46_60
    gender          VARCHAR(20),                         -- male | female | other | prefer_not
    tenure_years    INT CHECK (tenure_years IS NULL OR tenure_years BETWEEN 0 AND 50),
    convergent_bat12 JSONB,                              -- eşzamanlı BAT-12-TR yanıtları (convergent validity)
    convergent_uwes9 JSONB,                              -- eşzamanlı UWES-9 yanıtları
    submitted_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_upcap_pilot_response_wave UNIQUE (consent_id, wave)
);

CREATE INDEX IF NOT EXISTS idx_upcap_pilot_responses_scale
    ON app.upcap_pilot_responses(scale_id, submitted_at DESC);
CREATE INDEX IF NOT EXISTS idx_upcap_pilot_responses_sector
    ON app.upcap_pilot_responses(sector, age_band);

COMMENT ON TABLE app.upcap_pilot_responses IS 'Akademik pilot anonim yanıt havuzu — CFA + test-retest + convergent validity analizine beslenir.';

-- ───────────────────────────────────────────────────────────────────────────
-- 5. updated_at triggers
-- ───────────────────────────────────────────────────────────────────────────
DO $$
DECLARE
    t text;
    tables text[] := ARRAY['psychometric_scales','psychometric_items','psychometric_norms'];
BEGIN
    FOREACH t IN ARRAY tables LOOP
        EXECUTE format('DROP TRIGGER IF EXISTS trg_%s_updated_at ON app.%s', t, t);
        EXECUTE format(
            'CREATE TRIGGER trg_%s_updated_at BEFORE UPDATE ON app.%s FOR EACH ROW EXECUTE FUNCTION app.update_updated_at()',
            t, t
        );
    END LOOP;
END$$;

-- ───────────────────────────────────────────────────────────────────────────
-- 6. UpCap-TR v1.0 seed — CPC-12 (Lorenz et al. 2016, CC-BY 4.0) tabanlı
--    12 item · 3 faktör (4 item/faktör): hope_optimism, resilience, self_efficacy
--    Reverse-coded items: upcap_04, upcap_08, upcap_12 (faktör başına 1 reverse).
-- ───────────────────────────────────────────────────────────────────────────
INSERT INTO app.psychometric_scales (
    id, code, version, locale, name_tr, name_en, description,
    active, validated, validation_n, license, norm_table
) VALUES (
    '40000000-0000-0000-0000-000000000001',
    'upcap_tr', '1.0', 'tr-TR',
    'UpCap-TR Psikolojik Sermaye Ölçeği (v1.0)',
    'UpCap-TR Psychological Capital Scale (v1.0)',
    'CPC-12 (Lorenz, Beer, Pütz, Heinitz 2016, CC-BY 4.0) temel alınarak Türkçeye uyarlanmıştır. 3 faktör (Umut-İyimserlik, Dirençlilik, Öz-Yeterlik) × 4 item = 12 madde. 6-basamaklı Likert (1-6). Validasyon çalışması devam etmektedir.',
    true,        -- active: platformda görünür
    false,       -- validated: CFA + Cronbach eşiği henüz doğrulanmadı
    0,           -- N: pilot başlıyor
    'CC-BY-4.0',
    '{"status":"provisional","note":"Türkiye pilot çalışması devam — N>=300 hedefi."}'::jsonb
) ON CONFLICT (code, version, locale) DO NOTHING;

-- 12 item — faktör bazında sıralı (4+4+4)
INSERT INTO app.psychometric_items (
    scale_id, item_order, item_code, prompt_tr, prompt_en, factor, reverse_scored, anchor_labels
) VALUES
    -- ─── Faktör 1: Umut-İyimserlik (4 item) ───
    ('40000000-0000-0000-0000-000000000001', 1, 'upcap_01',
     'İş hedeflerime ulaşmak için şu an birçok yol bulabilirim.',
     'Right now I can think of many ways to reach my current work goals.',
     'hope_optimism', false,
     '{"1":"Kesinlikle katılmıyorum","6":"Kesinlikle katılıyorum"}'::jsonb),
    ('40000000-0000-0000-0000-000000000001', 2, 'upcap_02',
     'Şu an iş hedeflerimi kararlılıkla takip ediyorum.',
     'At the present time, I am energetically pursuing my work goals.',
     'hope_optimism', false,
     '{"1":"Kesinlikle katılmıyorum","6":"Kesinlikle katılıyorum"}'::jsonb),
    ('40000000-0000-0000-0000-000000000001', 3, 'upcap_03',
     'İşimle ilgili olarak her zaman işlerin iyi tarafını görürüm.',
     'I always look on the bright side of things regarding my job.',
     'hope_optimism', false,
     '{"1":"Kesinlikle katılmıyorum","6":"Kesinlikle katılıyorum"}'::jsonb),
    ('40000000-0000-0000-0000-000000000001', 4, 'upcap_04',
     'İşimde işlerin benim için her zaman ters gideceğini düşünürüm.',
     'In this job, things never work out the way I want them to.',
     'hope_optimism', true,  -- REVERSE
     '{"1":"Kesinlikle katılmıyorum","6":"Kesinlikle katılıyorum"}'::jsonb),

    -- ─── Faktör 2: Dirençlilik (4 item) ───
    ('40000000-0000-0000-0000-000000000001', 5, 'upcap_05',
     'İşimdeki zorlukların üstesinden genellikle bir yolla gelebilirim.',
     'I usually manage difficulties one way or another at work.',
     'resilience', false,
     '{"1":"Kesinlikle katılmıyorum","6":"Kesinlikle katılıyorum"}'::jsonb),
    ('40000000-0000-0000-0000-000000000001', 6, 'upcap_06',
     'İşteki aksiliklerden sonra toparlanmam uzun sürmez.',
     'I can get over it quickly when something bad happens at work.',
     'resilience', false,
     '{"1":"Kesinlikle katılmıyorum","6":"Kesinlikle katılıyorum"}'::jsonb),
    ('40000000-0000-0000-0000-000000000001', 7, 'upcap_07',
     'İş yerinde stresli durumlarla başa çıkabilirim çünkü daha önce de benzer zorluklar yaşadım.',
     'I can get through difficult times at work because I have experienced difficulty before.',
     'resilience', false,
     '{"1":"Kesinlikle katılmıyorum","6":"Kesinlikle katılıyorum"}'::jsonb),
    ('40000000-0000-0000-0000-000000000001', 8, 'upcap_08',
     'İşte bir terslik olduğunda uzun süre toparlanamıyorum.',
     'When something bad happens at work, it takes me a long time to recover.',
     'resilience', true,  -- REVERSE
     '{"1":"Kesinlikle katılmıyorum","6":"Kesinlikle katılıyorum"}'::jsonb),

    -- ─── Faktör 3: Öz-Yeterlik (4 item) ───
    ('40000000-0000-0000-0000-000000000001', 9, 'upcap_09',
     'İşimde karmaşık bir problemi analiz etmede kendime güvenirim.',
     'I feel confident analyzing a long-term problem to find a solution.',
     'self_efficacy', false,
     '{"1":"Kesinlikle katılmıyorum","6":"Kesinlikle katılıyorum"}'::jsonb),
    ('40000000-0000-0000-0000-000000000001', 10, 'upcap_10',
     'Yönetimle strateji tartışmasında kendi görüşümü savunabilirim.',
     'I feel confident contributing in a strategy discussion with management.',
     'self_efficacy', false,
     '{"1":"Kesinlikle katılmıyorum","6":"Kesinlikle katılıyorum"}'::jsonb),
    ('40000000-0000-0000-0000-000000000001', 11, 'upcap_11',
     'Yeni bir müşteri veya paydaşla görüşmede kendime güvenirim.',
     'I feel confident contacting people outside the company to discuss problems.',
     'self_efficacy', false,
     '{"1":"Kesinlikle katılmıyorum","6":"Kesinlikle katılıyorum"}'::jsonb),
    ('40000000-0000-0000-0000-000000000001', 12, 'upcap_12',
     'İşimde kendimi yeterli hissetmediğim pek çok durum vardır.',
     'I often feel inadequate in various work situations.',
     'self_efficacy', true,  -- REVERSE
     '{"1":"Kesinlikle katılmıyorum","6":"Kesinlikle katılıyorum"}'::jsonb)
ON CONFLICT (scale_id, item_code) DO NOTHING;

-- Başlangıç norm kayıtları (provisional, N=0 — pilot sonrası güncellenir)
-- Sektör segmentleri: public_sector (belediye/kamu), holding, sme, health, education
INSERT INTO app.psychometric_norms (
    scale_id, segment_type, segment_key, n, mean_score, sd_score,
    percentile_map, t_score_map, active
) VALUES
    -- Overall (tüm örneklem)
    ('40000000-0000-0000-0000-000000000001', 'overall', 'all', 0, 4.20, 0.85,
     '{"raw_to_pctl":{"2.0":2,"2.5":7,"3.0":17,"3.5":35,"4.0":55,"4.5":74,"5.0":88,"5.5":96,"6.0":99}}'::jsonb,
     '{"raw_to_t":{"2.0":24.1,"2.5":30.0,"3.0":35.9,"3.5":41.8,"4.0":50.0,"4.5":53.5,"5.0":59.4,"5.5":65.3,"6.0":71.2}}'::jsonb,
     true),
    -- Sektör
    ('40000000-0000-0000-0000-000000000001', 'sector', 'public_sector', 0, 4.05, 0.88,
     '{"raw_to_pctl":{"3.0":20,"3.5":40,"4.0":58,"4.5":76,"5.0":90}}'::jsonb,
     '{"raw_to_t":{"3.0":38.1,"3.5":43.8,"4.0":49.4,"4.5":55.1,"5.0":60.8}}'::jsonb, true),
    ('40000000-0000-0000-0000-000000000001', 'sector', 'holding', 0, 4.35, 0.80,
     '{"raw_to_pctl":{"3.0":12,"3.5":28,"4.0":48,"4.5":70,"5.0":88}}'::jsonb,
     '{"raw_to_t":{"3.0":33.1,"3.5":39.4,"4.0":45.6,"4.5":51.9,"5.0":58.1}}'::jsonb, true),
    ('40000000-0000-0000-0000-000000000001', 'sector', 'sme', 0, 4.15, 0.90,
     '{"raw_to_pctl":{"3.0":18,"3.5":38,"4.0":56,"4.5":75,"5.0":89}}'::jsonb,
     '{"raw_to_t":{"3.0":37.2,"3.5":42.8,"4.0":48.3,"4.5":53.9,"5.0":59.4}}'::jsonb, true),
    ('40000000-0000-0000-0000-000000000001', 'sector', 'health', 0, 3.95, 0.92,
     '{"raw_to_pctl":{"3.0":25,"3.5":46,"4.0":62,"4.5":78,"5.0":90}}'::jsonb,
     '{"raw_to_t":{"3.0":39.7,"3.5":45.1,"4.0":50.5,"4.5":56.0,"5.0":61.4}}'::jsonb, true),
    ('40000000-0000-0000-0000-000000000001', 'sector', 'education', 0, 4.10, 0.83,
     '{"raw_to_pctl":{"3.0":16,"3.5":36,"4.0":55,"4.5":74,"5.0":89}}'::jsonb,
     '{"raw_to_t":{"3.0":36.7,"3.5":42.8,"4.0":48.8,"4.5":54.8,"5.0":60.8}}'::jsonb, true),
    -- Yaş bandı
    ('40000000-0000-0000-0000-000000000001', 'age_band', '22_30', 0, 4.25, 0.85,
     '{"raw_to_pctl":{"3.0":16,"3.5":33,"4.0":52,"4.5":72,"5.0":87}}'::jsonb,
     '{"raw_to_t":{"3.0":35.3,"3.5":41.2,"4.0":47.1,"4.5":52.9,"5.0":58.8}}'::jsonb, true),
    ('40000000-0000-0000-0000-000000000001', 'age_band', '31_45', 0, 4.22, 0.83,
     '{"raw_to_pctl":{"3.0":15,"3.5":33,"4.0":54,"4.5":74,"5.0":88}}'::jsonb,
     '{"raw_to_t":{"3.0":35.3,"3.5":41.3,"4.0":47.4,"4.5":53.4,"5.0":59.4}}'::jsonb, true),
    ('40000000-0000-0000-0000-000000000001', 'age_band', '46_60', 0, 4.18, 0.82,
     '{"raw_to_pctl":{"3.0":16,"3.5":36,"4.0":57,"4.5":77,"5.0":90}}'::jsonb,
     '{"raw_to_t":{"3.0":35.6,"3.5":41.7,"4.0":47.8,"4.5":54.0,"5.0":60.0}}'::jsonb, true)
ON CONFLICT (scale_id, segment_type, segment_key) DO NOTHING;
