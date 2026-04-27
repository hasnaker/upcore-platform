-- =============================================================================
-- 055_survey_360.up.sql
-- 360° Feedback kampanyaları — wizard + anonim mod + radar raporu
--   - survey_360_campaigns    (subject bazında kampanya)
--   - survey_360_invitations  (reviewer davetleri, relation + self/peer/mgr/DR)
--   - survey_360_responses    (competency bazında skor + yorum)
-- Minimum cevap eşiği + anonim mod + RLS + audit.
-- =============================================================================

SET search_path TO app, public;

-- ───────────────────────────────────────────────────────────────────────────
-- 1. Campaigns
-- ───────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS app.survey_360_campaigns (
    id                UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id         UUID        NOT NULL REFERENCES app.tenants(id) ON DELETE CASCADE,
    cycle_id          UUID        NOT NULL REFERENCES app.performance_cycles(id) ON DELETE CASCADE,
    subject_user_id   UUID        NOT NULL,           -- kime feedback toplanıyor (employee.id)
    created_by        UUID        NOT NULL,           -- manager/HR employee.id
    anonymity_mode    TEXT        NOT NULL DEFAULT 'anonymous'
                                  CHECK (anonymity_mode IN ('anonymous','named')),
    status            TEXT        NOT NULL DEFAULT 'draft'
                                  CHECK (status IN ('draft','distributed','collecting','complete','cancelled')),
    due_date          DATE        NOT NULL,
    min_responses     INT         NOT NULL DEFAULT 3 CHECK (min_responses >= 1),
    metadata          JSONB       NOT NULL DEFAULT '{}'::jsonb,
    distributed_at    TIMESTAMPTZ,
    completed_at      TIMESTAMPTZ,
    created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_s360_camp_tenant_subject
    ON app.survey_360_campaigns (tenant_id, subject_user_id);
CREATE INDEX IF NOT EXISTS idx_s360_camp_tenant_status
    ON app.survey_360_campaigns (tenant_id, status);

ALTER TABLE app.survey_360_campaigns ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS s360_camp_tenant_isolation ON app.survey_360_campaigns;
CREATE POLICY s360_camp_tenant_isolation ON app.survey_360_campaigns
    USING (tenant_id::text = current_setting('app.tenant_id', true))
    WITH CHECK (tenant_id::text = current_setting('app.tenant_id', true));

-- ───────────────────────────────────────────────────────────────────────────
-- 2. Invitations
-- ───────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS app.survey_360_invitations (
    id                UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id         UUID        NOT NULL REFERENCES app.tenants(id) ON DELETE CASCADE,
    campaign_id       UUID        NOT NULL REFERENCES app.survey_360_campaigns(id) ON DELETE CASCADE,
    reviewer_user_id  UUID        NOT NULL,           -- employee.id
    relation          TEXT        NOT NULL
                                  CHECK (relation IN ('self','manager','peer','direct_report')),
    status            TEXT        NOT NULL DEFAULT 'pending'
                                  CHECK (status IN ('pending','sent','responded','declined','expired')),
    sent_at           TIMESTAMPTZ,
    responded_at      TIMESTAMPTZ,
    created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (campaign_id, reviewer_user_id)
);

CREATE INDEX IF NOT EXISTS idx_s360_inv_tenant_reviewer
    ON app.survey_360_invitations (tenant_id, reviewer_user_id);
CREATE INDEX IF NOT EXISTS idx_s360_inv_campaign
    ON app.survey_360_invitations (campaign_id);

ALTER TABLE app.survey_360_invitations ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS s360_inv_tenant_isolation ON app.survey_360_invitations;
CREATE POLICY s360_inv_tenant_isolation ON app.survey_360_invitations
    USING (tenant_id::text = current_setting('app.tenant_id', true))
    WITH CHECK (tenant_id::text = current_setting('app.tenant_id', true));

-- ───────────────────────────────────────────────────────────────────────────
-- 3. Responses (competency bazında skor)
-- ───────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS app.survey_360_responses (
    id                UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id         UUID        NOT NULL REFERENCES app.tenants(id) ON DELETE CASCADE,
    invitation_id     UUID        NOT NULL REFERENCES app.survey_360_invitations(id) ON DELETE CASCADE,
    campaign_id       UUID        NOT NULL REFERENCES app.survey_360_campaigns(id) ON DELETE CASCADE,
    competency_code   TEXT        NOT NULL,
    competency_name_tr TEXT       NOT NULL,
    score             SMALLINT    NOT NULL CHECK (score BETWEEN 1 AND 5),
    comment           TEXT,
    created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (invitation_id, competency_code)
);

CREATE INDEX IF NOT EXISTS idx_s360_resp_campaign
    ON app.survey_360_responses (campaign_id);
CREATE INDEX IF NOT EXISTS idx_s360_resp_tenant_camp
    ON app.survey_360_responses (tenant_id, campaign_id);

ALTER TABLE app.survey_360_responses ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS s360_resp_tenant_isolation ON app.survey_360_responses;
CREATE POLICY s360_resp_tenant_isolation ON app.survey_360_responses
    USING (tenant_id::text = current_setting('app.tenant_id', true))
    WITH CHECK (tenant_id::text = current_setting('app.tenant_id', true));

-- ───────────────────────────────────────────────────────────────────────────
-- 4. updated_at triggers
-- ───────────────────────────────────────────────────────────────────────────
DO $$
DECLARE
    t text;
    tables text[] := ARRAY['survey_360_campaigns','survey_360_invitations'];
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
-- 5. Retention — tamamlanan 360 kampanyaları 5 yıl (KVKK performans kategorisi)
-- ───────────────────────────────────────────────────────────────────────────
INSERT INTO app.retention_policies (name, table_name, retention_days, where_clause)
VALUES
    ('s360_camp_complete_5y', 'app.survey_360_campaigns', 1825,
     'status = ''complete'' AND completed_at < NOW() - INTERVAL ''5 years''')
ON CONFLICT (name) DO NOTHING;

-- ───────────────────────────────────────────────────────────────────────────
-- 6. Notification templates (Türkçe e-posta) — global
--    Trigger event: performance.survey_360.invitation.v1
--    Hatırlatıcı: performance.survey_360.invitation.reminder.v1 (due-2d)
-- ───────────────────────────────────────────────────────────────────────────
INSERT INTO app.notification_templates
    (tenant_id, template_key, channel, locale, subject, body, variables, active)
VALUES
    (
        NULL,
        'performance.survey_360.invitation.v1',
        'email',
        'tr-TR',
        '{{subject_name}} için 360° geri bildiriminizi bekliyoruz',
        E'Merhaba {{reviewer_name}},\n\n{{subject_name}} hakkında 360° geri bildirim kampanyası başlatıldı ve sizin katılımınız istendi.\n\nİlişki rolünüz: {{relation_label}}\nSon tarih: {{due_date}}\nAnonim mod: {{anonymity_label}}\n\nCevaplarınızı aşağıdaki bağlantı üzerinden iletebilirsiniz:\n{{response_url}}\n\nSaygılarımızla,\nUpCore',
        '["subject_name","reviewer_name","relation_label","due_date","anonymity_label","response_url"]'::jsonb,
        true
    ),
    (
        NULL,
        'performance.survey_360.invitation.reminder.v1',
        'email',
        'tr-TR',
        'Hatırlatma · {{subject_name}} için 360° geri bildirim son 2 gün',
        E'Merhaba {{reviewer_name}},\n\n{{subject_name}} için başlatılan 360° geri bildirim kampanyası 2 gün içinde sona eriyor. Katkınız değerli — henüz cevap vermediyseniz lütfen aşağıdaki bağlantıdan doldurunuz:\n\n{{response_url}}\n\nSon tarih: {{due_date}}\n\nTeşekkürler,\nUpCore',
        '["subject_name","reviewer_name","due_date","response_url"]'::jsonb,
        true
    )
ON CONFLICT (tenant_id, template_key, channel, locale) DO NOTHING;
