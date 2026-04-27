-- =============================================================================
-- 023_employee_lifecycle.up.sql
-- V3 Dalga 1.1: Çalışan full lifecycle tabloları
--   - offer_letters          (teklif + kabul/ret akışı)
--   - onboarding_checklists + onboarding_tasks
--   - career_events          (terfi, transfer, rol değişimi, performans)
--   - compensation_records   (maaş tarihçesi, gizli)
--   - related_contacts       (acil durum, aile, referans)
--   - employee_positions     (çoklu pozisyon / part-time)
--   - offboarding_events + exit_interviews
-- =============================================================================

SET search_path TO app, public;

-- ───────────────────────────────────────────────────────────────────────────
-- 1. Offer Letters
-- ───────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS app.offer_letters (
    id               UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id        UUID        NOT NULL REFERENCES app.tenants(id) ON DELETE CASCADE,
    candidate_id     UUID,
    requisition_id   UUID,
    employee_id      UUID        REFERENCES app.employees(id) ON DELETE SET NULL,
    -- Teklif içeriği
    ad_soyad         TEXT        NOT NULL,
    email            TEXT        NOT NULL,
    position_title   TEXT        NOT NULL,
    department_id    UUID        REFERENCES app.departments(id),
    position_id      UUID        REFERENCES app.position_definitions(id),
    -- Maaş + yan haklar (şifreli değil ama role-gated erişim)
    salary_brut      NUMERIC(12,2),
    salary_currency  CHAR(3)     NOT NULL DEFAULT 'TRY',
    bonus_annual     NUMERIC(12,2),
    stock_options    TEXT,
    benefits         JSONB       NOT NULL DEFAULT '{}'::jsonb,
    -- Tarih + durum
    start_date       DATE        NOT NULL,
    expires_at       TIMESTAMPTZ NOT NULL,
    status           TEXT        NOT NULL DEFAULT 'draft'
                                 CHECK (status IN ('draft','sent','viewed','accepted','declined','expired','revoked')),
    -- İmza / aksiyon
    sent_at          TIMESTAMPTZ,
    viewed_at        TIMESTAMPTZ,
    decided_at       TIMESTAMPTZ,
    decline_reason   TEXT,
    sent_by          UUID,
    -- Template + PDF
    template_id      UUID,
    pdf_url          TEXT,
    payload          JSONB       NOT NULL DEFAULT '{}'::jsonb,
    created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_offer_letters_tenant_status ON app.offer_letters (tenant_id, status);
CREATE INDEX IF NOT EXISTS idx_offer_letters_tenant_requisition ON app.offer_letters (tenant_id, requisition_id);
CREATE INDEX IF NOT EXISTS idx_offer_letters_tenant_candidate ON app.offer_letters (tenant_id, candidate_id);

ALTER TABLE app.offer_letters ENABLE ROW LEVEL SECURITY;
CREATE POLICY offer_letters_tenant_isolation ON app.offer_letters
    USING (tenant_id::text = current_setting('app.tenant_id', true))
    WITH CHECK (tenant_id::text = current_setting('app.tenant_id', true));

COMMENT ON TABLE app.offer_letters IS 'İş teklif yazıları — ATS candidate → employee dönüşüm akışı.';

-- ───────────────────────────────────────────────────────────────────────────
-- 2. Onboarding Checklists + Tasks
-- ───────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS app.onboarding_checklists (
    id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id       UUID        NOT NULL REFERENCES app.tenants(id) ON DELETE CASCADE,
    employee_id     UUID        NOT NULL REFERENCES app.employees(id) ON DELETE CASCADE,
    template_name   TEXT        NOT NULL DEFAULT 'standard',
    start_date      DATE        NOT NULL,
    status          TEXT        NOT NULL DEFAULT 'active'
                                CHECK (status IN ('active','completed','cancelled')),
    completion_pct  INT         NOT NULL DEFAULT 0 CHECK (completion_pct BETWEEN 0 AND 100),
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (tenant_id, employee_id)
);

CREATE INDEX IF NOT EXISTS idx_onboarding_checklists_tenant_status ON app.onboarding_checklists (tenant_id, status);

ALTER TABLE app.onboarding_checklists ENABLE ROW LEVEL SECURITY;
CREATE POLICY onboarding_checklists_tenant_isolation ON app.onboarding_checklists
    USING (tenant_id::text = current_setting('app.tenant_id', true))
    WITH CHECK (tenant_id::text = current_setting('app.tenant_id', true));

CREATE TABLE IF NOT EXISTS app.onboarding_tasks (
    id                UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    checklist_id      UUID        NOT NULL REFERENCES app.onboarding_checklists(id) ON DELETE CASCADE,
    task_code         TEXT        NOT NULL,
    task_title_tr     TEXT        NOT NULL,
    task_description  TEXT,
    owner_role        TEXT        NOT NULL
                                  CHECK (owner_role IN ('employee','manager','hr','it','finance','other')),
    owner_user_id     UUID,
    due_at            DATE        NOT NULL,
    due_days_offset   INT         NOT NULL DEFAULT 0,
    status            TEXT        NOT NULL DEFAULT 'pending'
                                  CHECK (status IN ('pending','in_progress','completed','blocked','cancelled')),
    completed_at      TIMESTAMPTZ,
    notes             TEXT,
    order_index       INT         NOT NULL DEFAULT 0,
    created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_onboarding_tasks_checklist_status ON app.onboarding_tasks (checklist_id, status);
CREATE INDEX IF NOT EXISTS idx_onboarding_tasks_owner_user ON app.onboarding_tasks (owner_user_id, status)
    WHERE owner_user_id IS NOT NULL;

COMMENT ON TABLE app.onboarding_tasks IS 'İşe alım sonrası checklist item''ları — rol sahibine atanır, due date ile takip.';

-- ───────────────────────────────────────────────────────────────────────────
-- 3. Career Events (terfi, transfer, rol değişimi, performans)
-- ───────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS app.career_events (
    id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id       UUID        NOT NULL REFERENCES app.tenants(id) ON DELETE CASCADE,
    employee_id     UUID        NOT NULL REFERENCES app.employees(id) ON DELETE CASCADE,
    event_type      TEXT        NOT NULL
                                CHECK (event_type IN ('hire','promotion','transfer','role_change',
                                                      'compensation_change','probation_passed',
                                                      'award','commendation','disciplinary',
                                                      'leave_start','leave_end','termination','retire')),
    effective_date  DATE        NOT NULL,
    from_value      JSONB,
    to_value        JSONB,
    reason_tr       TEXT,
    approved_by     UUID,
    approved_at     TIMESTAMPTZ,
    metadata        JSONB       NOT NULL DEFAULT '{}'::jsonb,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_career_events_tenant_employee_date ON app.career_events (tenant_id, employee_id, effective_date DESC);
CREATE INDEX IF NOT EXISTS idx_career_events_tenant_type ON app.career_events (tenant_id, event_type);

ALTER TABLE app.career_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY career_events_tenant_isolation ON app.career_events
    USING (tenant_id::text = current_setting('app.tenant_id', true))
    WITH CHECK (tenant_id::text = current_setting('app.tenant_id', true));

COMMENT ON TABLE app.career_events IS 'Çalışan kariyer olayları — timeline + audit. from_value/to_value JSONB ile anlık snapshot.';

-- ───────────────────────────────────────────────────────────────────────────
-- 4. Compensation Records (maaş tarihçesi — role-gated)
-- ───────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS app.compensation_records (
    id                UUID           PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id         UUID           NOT NULL REFERENCES app.tenants(id) ON DELETE CASCADE,
    employee_id       UUID           NOT NULL REFERENCES app.employees(id) ON DELETE CASCADE,
    effective_date    DATE           NOT NULL,
    compensation_type TEXT           NOT NULL
                                     CHECK (compensation_type IN ('base_salary','bonus','equity',
                                                                   'benefit','allowance','adjustment')),
    amount            NUMERIC(12,2)  NOT NULL,
    currency          CHAR(3)        NOT NULL DEFAULT 'TRY',
    frequency         TEXT           NOT NULL DEFAULT 'monthly'
                                     CHECK (frequency IN ('monthly','annual','one_time','hourly')),
    reason_tr         TEXT,
    approved_by       UUID,
    approved_at       TIMESTAMPTZ,
    source_event_id   UUID           REFERENCES app.career_events(id) ON DELETE SET NULL,
    is_active         BOOLEAN        NOT NULL DEFAULT TRUE,
    created_at        TIMESTAMPTZ    NOT NULL DEFAULT NOW(),
    updated_at        TIMESTAMPTZ    NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_compensation_tenant_employee_date ON app.compensation_records (tenant_id, employee_id, effective_date DESC);
CREATE INDEX IF NOT EXISTS idx_compensation_tenant_type ON app.compensation_records (tenant_id, compensation_type);

ALTER TABLE app.compensation_records ENABLE ROW LEVEL SECURITY;
CREATE POLICY compensation_tenant_isolation ON app.compensation_records
    USING (tenant_id::text = current_setting('app.tenant_id', true))
    WITH CHECK (tenant_id::text = current_setting('app.tenant_id', true));

COMMENT ON TABLE app.compensation_records IS 'Maaş + yan hak tarihçesi — gizli. UpCore uygulamasında yalnızca hr_director+ rolü okuyabilir.';

-- ───────────────────────────────────────────────────────────────────────────
-- 5. Related Contacts (acil durum, aile, referans)
-- ───────────────────────────────────────────────────────────────────────────
-- Not: Eğer `app.employee_contacts` zaten varsa ALTER ile genişlet.
CREATE TABLE IF NOT EXISTS app.related_contacts (
    id                UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id         UUID        NOT NULL REFERENCES app.tenants(id) ON DELETE CASCADE,
    employee_id       UUID        NOT NULL REFERENCES app.employees(id) ON DELETE CASCADE,
    kind              TEXT        NOT NULL
                                  CHECK (kind IN ('emergency','family','reference','medical','legal')),
    full_name         TEXT        NOT NULL,
    relation          TEXT        NOT NULL,   -- "eş", "anne", "baba", "eski yönetici"...
    phone             TEXT,
    email             TEXT,
    is_primary        BOOLEAN     NOT NULL DEFAULT FALSE,
    notes             TEXT,
    created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_related_contacts_tenant_employee ON app.related_contacts (tenant_id, employee_id, kind);

ALTER TABLE app.related_contacts ENABLE ROW LEVEL SECURITY;
CREATE POLICY related_contacts_tenant_isolation ON app.related_contacts
    USING (tenant_id::text = current_setting('app.tenant_id', true))
    WITH CHECK (tenant_id::text = current_setting('app.tenant_id', true));

-- ───────────────────────────────────────────────────────────────────────────
-- 6. Employee Positions (çoklu pozisyon / part-time FTE)
-- ───────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS app.employee_positions (
    id                UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id         UUID        NOT NULL REFERENCES app.tenants(id) ON DELETE CASCADE,
    employee_id       UUID        NOT NULL REFERENCES app.employees(id) ON DELETE CASCADE,
    position_id       UUID        NOT NULL REFERENCES app.position_definitions(id),
    department_id     UUID        REFERENCES app.departments(id),
    fte_percentage    NUMERIC(5,2) NOT NULL DEFAULT 100.00
                                   CHECK (fte_percentage > 0 AND fte_percentage <= 100),
    is_primary        BOOLEAN     NOT NULL DEFAULT TRUE,
    start_date        DATE        NOT NULL,
    end_date          DATE,
    created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_employee_positions_tenant_employee ON app.employee_positions (tenant_id, employee_id);
CREATE INDEX IF NOT EXISTS idx_employee_positions_tenant_position ON app.employee_positions (tenant_id, position_id);

ALTER TABLE app.employee_positions ENABLE ROW LEVEL SECURITY;
CREATE POLICY employee_positions_tenant_isolation ON app.employee_positions
    USING (tenant_id::text = current_setting('app.tenant_id', true))
    WITH CHECK (tenant_id::text = current_setting('app.tenant_id', true));

COMMENT ON TABLE app.employee_positions IS 'Çalışanın aynı anda birden çok pozisyonda olma durumu (part-time kombinasyonu, üretim yönetici + proje vb.).';

-- ───────────────────────────────────────────────────────────────────────────
-- 7. Offboarding Events + Exit Interviews
-- ───────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS app.offboarding_events (
    id                  UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id           UUID        NOT NULL REFERENCES app.tenants(id) ON DELETE CASCADE,
    employee_id         UUID        NOT NULL UNIQUE REFERENCES app.employees(id) ON DELETE CASCADE,
    departure_type      TEXT        NOT NULL
                                    CHECK (departure_type IN ('resignation','retirement',
                                                              'termination_just_cause',  -- 4857 madde 25
                                                              'termination_mutual',      -- tarafların anlaşması
                                                              'death','medical','end_of_contract',
                                                              'conscription','other')),
    notice_date         DATE        NOT NULL,
    last_working_day    DATE        NOT NULL,
    exit_interview_done BOOLEAN     NOT NULL DEFAULT FALSE,
    it_access_revoked   BOOLEAN     NOT NULL DEFAULT FALSE,
    it_revoked_at       TIMESTAMPTZ,
    final_pay_date      DATE,
    handover_complete   BOOLEAN     NOT NULL DEFAULT FALSE,
    handover_to_id      UUID        REFERENCES app.employees(id),
    notes               TEXT,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_offboarding_tenant_employee ON app.offboarding_events (tenant_id, employee_id);
CREATE INDEX IF NOT EXISTS idx_offboarding_tenant_last_day ON app.offboarding_events (tenant_id, last_working_day DESC);

ALTER TABLE app.offboarding_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY offboarding_events_tenant_isolation ON app.offboarding_events
    USING (tenant_id::text = current_setting('app.tenant_id', true))
    WITH CHECK (tenant_id::text = current_setting('app.tenant_id', true));

CREATE TABLE IF NOT EXISTS app.exit_interviews (
    id                   UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id            UUID        NOT NULL REFERENCES app.tenants(id) ON DELETE CASCADE,
    offboarding_id       UUID        NOT NULL UNIQUE REFERENCES app.offboarding_events(id) ON DELETE CASCADE,
    satisfaction_score   INT         CHECK (satisfaction_score BETWEEN 1 AND 5),
    would_return         BOOLEAN,
    would_recommend      BOOLEAN,
    primary_reason_code  TEXT,  -- compensation, manager, role, commute, growth, burnout, health, other
    departure_note       TEXT,  -- açık uçlu çalışan metni
    hr_summary           TEXT,  -- İK yorumu
    interview_date       DATE,
    interviewer_id       UUID,
    is_anonymous         BOOLEAN     NOT NULL DEFAULT FALSE,
    created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at           TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE app.exit_interviews ENABLE ROW LEVEL SECURITY;
CREATE POLICY exit_interviews_tenant_isolation ON app.exit_interviews
    USING (tenant_id::text = current_setting('app.tenant_id', true))
    WITH CHECK (tenant_id::text = current_setting('app.tenant_id', true));

COMMENT ON TABLE app.exit_interviews IS 'Çalışan çıkış mülakatı — isteğe bağlı anonim, trend analizi için.';

-- ───────────────────────────────────────────────────────────────────────────
-- 8. updated_at triggers
-- ───────────────────────────────────────────────────────────────────────────
DO $$
DECLARE
    t text;
    tables text[] := ARRAY[
        'offer_letters',
        'onboarding_checklists',
        'onboarding_tasks',
        'compensation_records',
        'related_contacts',
        'employee_positions',
        'offboarding_events',
        'exit_interviews'
    ];
BEGIN
    FOREACH t IN ARRAY tables LOOP
        EXECUTE format('DROP TRIGGER IF EXISTS trg_%s_updated_at ON app.%s', t, t);
        EXECUTE format(
            'CREATE TRIGGER trg_%s_updated_at BEFORE UPDATE ON app.%s FOR EACH ROW EXECUTE FUNCTION touch_updated_at()',
            t, t
        );
    END LOOP;
END$$;

-- ───────────────────────────────────────────────────────────────────────────
-- 9. Retention policy entries
-- ───────────────────────────────────────────────────────────────────────────
INSERT INTO app.retention_policies (name, table_name, retention_days, where_clause)
VALUES
    ('offer_letters_expired_2y',  'app.offer_letters',       730, 'status IN (''declined'',''expired'',''revoked'') AND decided_at < NOW() - INTERVAL ''2 years'''),
    ('exit_interviews_anon_5y',   'app.exit_interviews',    1825, 'interview_date < NOW() - INTERVAL ''5 years''')
ON CONFLICT (name) DO NOTHING;
