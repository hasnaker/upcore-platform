-- 038_performance_extensions.up.sql
-- Calibration session + development plan + peer nomination tabloları.

-- Calibration session: yöneticilerin aynı döngüde 9-box + review ratinglerini
-- toplu sessionda tartışıp kalibre etmesi için.
CREATE TABLE IF NOT EXISTS app.calibration_sessions (
    id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id      uuid NOT NULL,
    cycle_id       uuid NOT NULL REFERENCES app.performance_cycles(id) ON DELETE CASCADE,
    facilitator_id uuid NOT NULL,
    scope          varchar(60) NOT NULL DEFAULT 'department',  -- department|team|company
    department_id  uuid,
    status         varchar(20) NOT NULL DEFAULT 'scheduled'
        CHECK (status IN ('scheduled','in_progress','completed','cancelled')),
    scheduled_at   timestamptz NOT NULL,
    started_at     timestamptz,
    ended_at       timestamptz,
    notes          text,
    metadata       jsonb NOT NULL DEFAULT '{}'::jsonb,
    created_at     timestamptz NOT NULL DEFAULT now(),
    updated_at     timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_calibration_sessions_cycle
    ON app.calibration_sessions (tenant_id, cycle_id, status);

-- Calibration session içinde değişen 9-box veya rating kararları.
CREATE TABLE IF NOT EXISTS app.calibration_adjustments (
    id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id        uuid NOT NULL REFERENCES app.calibration_sessions(id) ON DELETE CASCADE,
    tenant_id         uuid NOT NULL,
    employee_id       uuid NOT NULL,
    field             varchar(40) NOT NULL,  -- performance_band|potential_band|overall_rating
    old_value         text,
    new_value         text NOT NULL,
    justification     text,
    decided_by        uuid NOT NULL,
    created_at        timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE app.calibration_sessions ENABLE ROW LEVEL SECURITY;
CREATE POLICY calibration_sessions_rls ON app.calibration_sessions
    USING (tenant_id = current_setting('app.tenant_id')::uuid)
    WITH CHECK (tenant_id = current_setting('app.tenant_id')::uuid);

ALTER TABLE app.calibration_adjustments ENABLE ROW LEVEL SECURITY;
CREATE POLICY calibration_adjustments_rls ON app.calibration_adjustments
    USING (tenant_id = current_setting('app.tenant_id')::uuid)
    WITH CHECK (tenant_id = current_setting('app.tenant_id')::uuid);

-- Development plan: çalışan için gelişim hedefleri + action tracking.
CREATE TABLE IF NOT EXISTS app.development_plans (
    id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id       uuid NOT NULL,
    employee_id     uuid NOT NULL,
    cycle_id        uuid,  -- bağlantılı cycle (varsa)
    title_tr        varchar(200) NOT NULL,
    description     text,
    target_date     date,
    status          varchar(20) NOT NULL DEFAULT 'active'
        CHECK (status IN ('active','completed','cancelled','on_hold')),
    progress_pct    integer NOT NULL DEFAULT 0 CHECK (progress_pct BETWEEN 0 AND 100),
    created_at      timestamptz NOT NULL DEFAULT now(),
    updated_at      timestamptz NOT NULL DEFAULT now()
);

-- Her development plan'da tek tek action'lar (kompetans, eğitim, coach, vs.)
CREATE TABLE IF NOT EXISTS app.development_actions (
    id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id         uuid NOT NULL,
    plan_id           uuid NOT NULL REFERENCES app.development_plans(id) ON DELETE CASCADE,
    kind              varchar(40) NOT NULL,  -- training|coaching|mentor|reading|project|certification
    description       text NOT NULL,
    owner_employee_id uuid,
    due_date          date,
    completed_at      timestamptz,
    metadata          jsonb NOT NULL DEFAULT '{}'::jsonb,
    created_at        timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE app.development_plans ENABLE ROW LEVEL SECURITY;
CREATE POLICY development_plans_rls ON app.development_plans
    USING (tenant_id = current_setting('app.tenant_id')::uuid)
    WITH CHECK (tenant_id = current_setting('app.tenant_id')::uuid);

ALTER TABLE app.development_actions ENABLE ROW LEVEL SECURITY;
CREATE POLICY development_actions_rls ON app.development_actions
    USING (tenant_id = current_setting('app.tenant_id')::uuid)
    WITH CHECK (tenant_id = current_setting('app.tenant_id')::uuid);

-- Peer nomination: çalışan kendisine değerlendirme yapacak peer'ları önerir.
CREATE TABLE IF NOT EXISTS app.peer_nominations (
    id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id         uuid NOT NULL,
    cycle_id          uuid NOT NULL,
    subject_id        uuid NOT NULL,  -- değerlendirilecek kişi
    nominee_id        uuid NOT NULL,  -- değerlendirmeyi yapacak peer
    relationship      varchar(40) NOT NULL,  -- peer|manager|direct_report|cross_functional
    status            varchar(20) NOT NULL DEFAULT 'pending'
        CHECK (status IN ('pending','approved','rejected','completed')),
    invited_at        timestamptz,
    completed_at      timestamptz,
    created_at        timestamptz NOT NULL DEFAULT now(),
    UNIQUE (tenant_id, cycle_id, subject_id, nominee_id)
);

ALTER TABLE app.peer_nominations ENABLE ROW LEVEL SECURITY;
CREATE POLICY peer_nominations_rls ON app.peer_nominations
    USING (tenant_id = current_setting('app.tenant_id')::uuid)
    WITH CHECK (tenant_id = current_setting('app.tenant_id')::uuid);

COMMENT ON TABLE app.calibration_sessions IS 'Performans review kalibrasyon oturumları — yöneticiler ortak karar verir';
COMMENT ON TABLE app.development_plans IS 'Çalışan gelişim planları — kompetans gap + action tracking';
COMMENT ON TABLE app.peer_nominations IS '360 review için peer nomination — subject kendi peer''larını seçer, manager onaylar';
