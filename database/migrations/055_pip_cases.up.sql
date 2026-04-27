-- =============================================================================
-- 055_pip_cases.up.sql
-- PIP (Performans İyileştirme Planı) iş akışı — İş Kanunu 25/2 prosedürüyle
-- uyumlu mahkeme delil niteliğinde kayıtlar.
--
--   app.pip_cases        — ana case
--   app.pip_goals        — hedef listesi
--   app.pip_checkins     — haftalık takip
--   app.pip_outcome      — sonuç (1:1)
--
-- İş Kanunu dava zamanaşımı 10 yıl olduğundan retention policy 10 yıl.
-- Çalışan acknowledge IP + UA + timestamp zorunlu kayıt (mahkeme delil).
-- =============================================================================

SET search_path TO app, public;

-- ---------------------------------------------------------------------------
-- 1. pip_cases — ana case
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS app.pip_cases (
    id                uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id         uuid        NOT NULL,
    employee_id       uuid        NOT NULL,
    initiated_by      uuid        NOT NULL,                   -- yönetici
    hr_reviewer_id    uuid,                                   -- İK sorumlusu
    legal_reviewer_id uuid,                                   -- hukuk onaylayan
    legal_reviewed    boolean     NOT NULL DEFAULT false,
    reason_category   varchar(30) NOT NULL
        CHECK (reason_category IN ('performance','attendance','conduct','competency')),
    reason_summary    text        NOT NULL,                   -- olgusal özet
    start_date        date        NOT NULL,
    duration_days     int         NOT NULL CHECK (duration_days IN (30,60,90)),
    status            varchar(20) NOT NULL DEFAULT 'draft'
        CHECK (status IN ('draft','pending_legal','active','extended','passed','terminated')),
    legal_file_url    text,                                   -- hukuk dosyası (document svc)
    outcome_reason    text,                                   -- passed/terminated gerekçe
    created_at        timestamptz NOT NULL DEFAULT NOW(),
    updated_at        timestamptz NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_pip_cases_tenant_employee
    ON app.pip_cases (tenant_id, employee_id, status);
CREATE INDEX IF NOT EXISTS idx_pip_cases_tenant_manager
    ON app.pip_cases (tenant_id, initiated_by, status);
CREATE INDEX IF NOT EXISTS idx_pip_cases_tenant_status
    ON app.pip_cases (tenant_id, status, start_date);

-- ---------------------------------------------------------------------------
-- 2. pip_goals — SMART hedefler
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS app.pip_goals (
    id                uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id         uuid        NOT NULL,
    case_id           uuid        NOT NULL
        REFERENCES app.pip_cases(id) ON DELETE CASCADE,
    description       text        NOT NULL,
    measurable_target text        NOT NULL,                   -- ölçülebilir hedef
    deadline          date        NOT NULL,
    priority          varchar(10) NOT NULL DEFAULT 'medium'
        CHECK (priority IN ('low','medium','high')),
    created_at        timestamptz NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_pip_goals_case ON app.pip_goals (tenant_id, case_id);

-- ---------------------------------------------------------------------------
-- 3. pip_checkins — haftalık takip
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS app.pip_checkins (
    id                        uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id                 uuid        NOT NULL,
    case_id                   uuid        NOT NULL
        REFERENCES app.pip_cases(id) ON DELETE CASCADE,
    week_number               int         NOT NULL CHECK (week_number >= 1 AND week_number <= 52),
    on_track                  varchar(20) NOT NULL
        CHECK (on_track IN ('on_track','off_track')),
    manager_notes             text,
    employee_notes            text,
    acknowledged_by_employee  timestamptz,
    acknowledge_ip            inet,
    acknowledge_user_agent    text,
    created_by                uuid        NOT NULL,
    created_at                timestamptz NOT NULL DEFAULT NOW(),
    UNIQUE (tenant_id, case_id, week_number)
);

CREATE INDEX IF NOT EXISTS idx_pip_checkins_case ON app.pip_checkins (tenant_id, case_id, week_number);

-- ---------------------------------------------------------------------------
-- 4. pip_outcome — sonuç (1:1 with case)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS app.pip_outcome (
    id             uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id      uuid        NOT NULL,
    case_id        uuid        NOT NULL UNIQUE
        REFERENCES app.pip_cases(id) ON DELETE CASCADE,
    result         varchar(20) NOT NULL
        CHECK (result IN ('passed','extended','terminated')),
    legal_file_url text,                                      -- terminated ise zorunlu
    outcome_notes  text,
    closed_at      timestamptz NOT NULL DEFAULT NOW(),
    closed_by      uuid        NOT NULL,
    created_at     timestamptz NOT NULL DEFAULT NOW(),
    CONSTRAINT pip_outcome_terminated_requires_file
        CHECK (result <> 'terminated' OR (legal_file_url IS NOT NULL AND length(legal_file_url) > 0))
);

CREATE INDEX IF NOT EXISTS idx_pip_outcome_case ON app.pip_outcome (tenant_id, case_id);

-- ---------------------------------------------------------------------------
-- 5. updated_at trigger (cases only — diğerleri append-only)
-- ---------------------------------------------------------------------------
DROP TRIGGER IF EXISTS trg_pip_cases_updated_at ON app.pip_cases;
CREATE TRIGGER trg_pip_cases_updated_at
    BEFORE UPDATE ON app.pip_cases
    FOR EACH ROW EXECUTE FUNCTION touch_updated_at();

-- ---------------------------------------------------------------------------
-- 6. Audit triggers (mahkeme delil niteliğinde trail)
-- ---------------------------------------------------------------------------
DROP TRIGGER IF EXISTS trg_audit_change ON app.pip_cases;
CREATE TRIGGER trg_audit_change
    AFTER INSERT OR UPDATE OR DELETE ON app.pip_cases
    FOR EACH ROW EXECUTE FUNCTION audit.log_row_change();

DROP TRIGGER IF EXISTS trg_audit_change ON app.pip_checkins;
CREATE TRIGGER trg_audit_change
    AFTER INSERT OR UPDATE OR DELETE ON app.pip_checkins
    FOR EACH ROW EXECUTE FUNCTION audit.log_row_change();

DROP TRIGGER IF EXISTS trg_audit_change ON app.pip_outcome;
CREATE TRIGGER trg_audit_change
    AFTER INSERT OR UPDATE OR DELETE ON app.pip_outcome
    FOR EACH ROW EXECUTE FUNCTION audit.log_row_change();

-- ---------------------------------------------------------------------------
-- 7. RLS
-- ---------------------------------------------------------------------------
ALTER TABLE app.pip_cases    ENABLE ROW LEVEL SECURITY;
ALTER TABLE app.pip_goals    ENABLE ROW LEVEL SECURITY;
ALTER TABLE app.pip_checkins ENABLE ROW LEVEL SECURITY;
ALTER TABLE app.pip_outcome  ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS pip_cases_rls    ON app.pip_cases;
DROP POLICY IF EXISTS pip_goals_rls    ON app.pip_goals;
DROP POLICY IF EXISTS pip_checkins_rls ON app.pip_checkins;
DROP POLICY IF EXISTS pip_outcome_rls  ON app.pip_outcome;

CREATE POLICY pip_cases_rls ON app.pip_cases
    USING (tenant_id = current_setting('app.tenant_id')::uuid)
    WITH CHECK (tenant_id = current_setting('app.tenant_id')::uuid);

CREATE POLICY pip_goals_rls ON app.pip_goals
    USING (tenant_id = current_setting('app.tenant_id')::uuid)
    WITH CHECK (tenant_id = current_setting('app.tenant_id')::uuid);

CREATE POLICY pip_checkins_rls ON app.pip_checkins
    USING (tenant_id = current_setting('app.tenant_id')::uuid)
    WITH CHECK (tenant_id = current_setting('app.tenant_id')::uuid);

CREATE POLICY pip_outcome_rls ON app.pip_outcome
    USING (tenant_id = current_setting('app.tenant_id')::uuid)
    WITH CHECK (tenant_id = current_setting('app.tenant_id')::uuid);

-- ---------------------------------------------------------------------------
-- 8. Retention policy — İş Kanunu dava zamanaşımı 10 yıl
-- ---------------------------------------------------------------------------
INSERT INTO app.retention_policies (name, table_name, retention_days, where_clause)
VALUES
    ('pip_cases_closed_10y', 'app.pip_cases', 3650,
        'status IN (''passed'',''terminated'') AND updated_at < NOW() - INTERVAL ''10 years''')
ON CONFLICT (name) DO NOTHING;

-- ---------------------------------------------------------------------------
-- 9. Comments
-- ---------------------------------------------------------------------------
COMMENT ON TABLE  app.pip_cases IS
    'PIP (Performans İyileştirme Planı) — İş Kanunu 25/2 ile uyumlu işten çıkarma öncesi iyileştirme süreci.';
COMMENT ON COLUMN app.pip_cases.legal_reviewed IS
    'Legal review zorunlu — false iken active statüsüne geçiş engellenir (service layer).';
COMMENT ON COLUMN app.pip_cases.duration_days IS
    'Sadece 30/60/90 izin verilir — Türkiye pratik uygulaması.';
COMMENT ON TABLE  app.pip_outcome IS
    'PIP sonucu — terminated ise legal_file_url zorunlu (mahkeme delili için).';
COMMENT ON TABLE  app.pip_checkins IS
    'Haftalık takip — acknowledge_by_employee IP+UA+timestamp ile mahkeme delili.';
