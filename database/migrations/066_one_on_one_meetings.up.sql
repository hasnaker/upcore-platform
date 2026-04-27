-- =============================================================================
-- 066_one_on_one_meetings.up.sql
-- 1-1 görüşme kayıt ve not yönetimi — UpCore güç-bazlı şablon ile.
-- Yıl boyu sürüm kayıt (time-series).
-- =============================================================================

SET search_path TO app, public;

CREATE TABLE IF NOT EXISTS app.one_on_one_meetings (
    id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id       UUID        NOT NULL REFERENCES app.tenants(id) ON DELETE CASCADE,
    employee_id     UUID        NOT NULL REFERENCES app.employees(id) ON DELETE CASCADE,
    manager_id      UUID        NOT NULL REFERENCES app.employees(id) ON DELETE CASCADE,
    scheduled_at    TIMESTAMPTZ NOT NULL,
    completed_at    TIMESTAMPTZ,
    duration_min    INTEGER     NOT NULL DEFAULT 30,
    template_code   TEXT        NOT NULL DEFAULT 'upcore_strengths', -- upcore şablon
    status          TEXT        NOT NULL CHECK (status IN
                      ('scheduled','completed','cancelled','no_show')) DEFAULT 'scheduled',
    meeting_url     TEXT,
    cancelled_reason TEXT,
    created_by      UUID        NOT NULL REFERENCES app.users(id),
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_one_on_one_meetings_tenant      ON app.one_on_one_meetings (tenant_id);
CREATE INDEX IF NOT EXISTS idx_one_on_one_meetings_employee    ON app.one_on_one_meetings (tenant_id, employee_id, scheduled_at DESC);
CREATE INDEX IF NOT EXISTS idx_one_on_one_meetings_manager     ON app.one_on_one_meetings (tenant_id, manager_id, scheduled_at DESC);
CREATE INDEX IF NOT EXISTS idx_one_on_one_meetings_status      ON app.one_on_one_meetings (status) WHERE status = 'scheduled';

ALTER TABLE app.one_on_one_meetings ENABLE ROW LEVEL SECURITY;
CREATE POLICY one_on_one_meetings_tenant ON app.one_on_one_meetings
    USING (tenant_id::text = current_setting('app.tenant_id', true))
    WITH CHECK (tenant_id::text = current_setting('app.tenant_id', true));

DROP TRIGGER IF EXISTS trg_one_on_one_meetings_updated_at ON app.one_on_one_meetings;
CREATE TRIGGER trg_one_on_one_meetings_updated_at
    BEFORE UPDATE ON app.one_on_one_meetings
    FOR EACH ROW EXECUTE FUNCTION touch_updated_at();

-- ───────────────────────────────────────────────────────────────────────────
-- one_on_one_notes — notlar hem employee hem manager perspektifinden.
-- Görünürlük: 'shared' (iki taraf görür) | 'manager_only' | 'employee_only'.
-- ───────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS app.one_on_one_notes (
    id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id       UUID        NOT NULL REFERENCES app.tenants(id) ON DELETE CASCADE,
    meeting_id      UUID        NOT NULL REFERENCES app.one_on_one_meetings(id) ON DELETE CASCADE,
    author_id       UUID        NOT NULL REFERENCES app.users(id),
    author_role     TEXT        NOT NULL CHECK (author_role IN ('employee','manager')),
    section         TEXT        NOT NULL, -- 'wins','challenges','strengths_used','next_goals','general'
    body_md         TEXT        NOT NULL,
    visibility      TEXT        NOT NULL CHECK (visibility IN ('shared','manager_only','employee_only')) DEFAULT 'shared',
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_one_on_one_notes_meeting ON app.one_on_one_notes (meeting_id);
CREATE INDEX IF NOT EXISTS idx_one_on_one_notes_tenant  ON app.one_on_one_notes (tenant_id);

ALTER TABLE app.one_on_one_notes ENABLE ROW LEVEL SECURITY;
CREATE POLICY one_on_one_notes_tenant ON app.one_on_one_notes
    USING (tenant_id::text = current_setting('app.tenant_id', true))
    WITH CHECK (tenant_id::text = current_setting('app.tenant_id', true));

DROP TRIGGER IF EXISTS trg_one_on_one_notes_updated_at ON app.one_on_one_notes;
CREATE TRIGGER trg_one_on_one_notes_updated_at
    BEFORE UPDATE ON app.one_on_one_notes
    FOR EACH ROW EXECUTE FUNCTION touch_updated_at();

COMMENT ON TABLE app.one_on_one_meetings IS '1-1 görüşme takvim kayıtları (UpCore güç-bazlı şablon).';
COMMENT ON TABLE app.one_on_one_notes    IS '1-1 notları — bölüm bazlı (wins/challenges/strengths/next).';
