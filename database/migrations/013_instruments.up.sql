-- =============================================================================
-- 013_instruments.up.sql
-- Psychometric instruments registry + items + norm tables
-- Supports: BAT-12-TR, COPSOQ-III-TR, UpCap-TR
-- =============================================================================

CREATE TABLE app.instruments (
    id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    code            varchar(40) NOT NULL,        -- bat12, copsoq, upcap, jdr, strengths
    version         varchar(20) NOT NULL,
    locale          varchar(10) NOT NULL DEFAULT 'tr-TR',
    name_tr         varchar(200) NOT NULL,
    name_en         varchar(200),
    description_tr  text,
    license         varchar(80),                 -- CC-BY 4.0, academic, ...
    author_org      varchar(200),
    citations       jsonb NOT NULL DEFAULT '[]'::jsonb,
    item_count      int NOT NULL CHECK (item_count >= 1),
    scale_min       int NOT NULL DEFAULT 1,
    scale_max       int NOT NULL DEFAULT 5,
    response_format varchar(40) NOT NULL DEFAULT 'likert_5'
                    CHECK (response_format IN ('likert_5','likert_6','likert_7','frequency_5','binary','multiple_choice','numeric','text')),
    active          boolean NOT NULL DEFAULT true,
    published_at    date,
    created_at      timestamptz NOT NULL DEFAULT now(),
    updated_at      timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT uq_instruments_code_version_locale UNIQUE (code, version, locale)
);

CREATE INDEX idx_instruments_code_locale ON app.instruments(code, locale) WHERE active = true;

CREATE TRIGGER trg_instruments_updated_at
    BEFORE UPDATE ON app.instruments
    FOR EACH ROW EXECUTE FUNCTION app.update_updated_at();

-- ===== Instrument items =======================================================
CREATE TABLE app.instrument_items (
    id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    instrument_id    uuid NOT NULL REFERENCES app.instruments(id) ON DELETE CASCADE,
    item_code        varchar(40) NOT NULL,         -- bat12_1, copsoq_q01, upcap_02, ...
    seq              int NOT NULL CHECK (seq >= 1),
    subscale         varchar(80),                  -- exhaustion, cognitive_impairment, self_efficacy, ...
    text_tr          text NOT NULL,
    text_en          text,
    reverse_coded    boolean NOT NULL DEFAULT false,
    min_value        int NOT NULL DEFAULT 1,
    max_value        int NOT NULL DEFAULT 5,
    anchor_labels    jsonb NOT NULL DEFAULT '{}'::jsonb,   -- {"1":"Hiç","2":"Nadiren",...}
    required         boolean NOT NULL DEFAULT true,
    active           boolean NOT NULL DEFAULT true,
    created_at       timestamptz NOT NULL DEFAULT now(),
    updated_at       timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT uq_instrument_items UNIQUE (instrument_id, item_code)
);

CREATE INDEX idx_instrument_items_instrument ON app.instrument_items(instrument_id, seq);
CREATE INDEX idx_instrument_items_subscale   ON app.instrument_items(instrument_id, subscale);

CREATE TRIGGER trg_instrument_items_updated_at
    BEFORE UPDATE ON app.instrument_items
    FOR EACH ROW EXECUTE FUNCTION app.update_updated_at();

-- ===== Norm tables ============================================================
CREATE TABLE app.norm_tables (
    id                     uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    instrument_id          uuid NOT NULL REFERENCES app.instruments(id) ON DELETE CASCADE,
    version                varchar(20) NOT NULL,
    population             varchar(120) NOT NULL DEFAULT 'tr_working_adult',
    n                      int NOT NULL CHECK (n > 0),
    subscale_means         jsonb NOT NULL DEFAULT '{}'::jsonb,
    subscale_sds           jsonb NOT NULL DEFAULT '{}'::jsonb,
    percentile_distributions jsonb NOT NULL DEFAULT '{}'::jsonb,
    cutoffs                jsonb NOT NULL DEFAULT '{}'::jsonb,
    collected_at           date,
    source_citation        text,
    active                 boolean NOT NULL DEFAULT true,
    created_at             timestamptz NOT NULL DEFAULT now(),
    updated_at             timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT uq_norm_tables UNIQUE (instrument_id, version, population)
);

CREATE INDEX idx_norm_tables_instrument ON app.norm_tables(instrument_id) WHERE active = true;

CREATE TRIGGER trg_norm_tables_updated_at
    BEFORE UPDATE ON app.norm_tables
    FOR EACH ROW EXECUTE FUNCTION app.update_updated_at();

COMMENT ON TABLE app.instruments IS 'Psikometrik ölçüm araçları (BAT-12-TR, COPSOQ-III-TR, UpCap-TR, vb.).';
COMMENT ON TABLE app.instrument_items IS 'Envanter maddeleri (soru/item metni + skorlama meta).';
COMMENT ON TABLE app.norm_tables IS 'Normatif referans verileri (ortalama, SS, yüzdelikler).';
