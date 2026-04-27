-- 043_mobility_marketplace.up.sql
-- Dahili kariyer marketplace: mevcut çalışanlar, açık pozisyonlar için
-- başvuru yapabilir. AI talent matching skoru ile sıralanır.

-- Dahili iş ilanı (public ATS'ten farklı; sadece aktif çalışanlara görünür).
CREATE TABLE IF NOT EXISTS app.internal_opportunities (
    id                 uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id          uuid NOT NULL,
    requisition_id     uuid,  -- external ATS ile eşleşme varsa
    title              varchar(200) NOT NULL,
    description        text,
    department_id      uuid,
    position_id        uuid,
    location           varchar(200),
    is_remote          boolean NOT NULL DEFAULT FALSE,
    opportunity_type   varchar(40) NOT NULL DEFAULT 'permanent',
        -- permanent|rotation|project|mentorship|secondment
    required_skills    text[],
    preferred_skills   text[],
    posted_by          uuid NOT NULL,
    posted_at          timestamptz NOT NULL DEFAULT now(),
    closes_at          timestamptz,
    status             varchar(20) NOT NULL DEFAULT 'open'
        CHECK (status IN ('draft','open','closed','filled','cancelled')),
    created_at         timestamptz NOT NULL DEFAULT now(),
    updated_at         timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_internal_opps_open
    ON app.internal_opportunities (tenant_id, status, closes_at)
    WHERE status = 'open';

ALTER TABLE app.internal_opportunities ENABLE ROW LEVEL SECURITY;
CREATE POLICY internal_opps_rls ON app.internal_opportunities
    USING (tenant_id = current_setting('app.tenant_id')::uuid)
    WITH CHECK (tenant_id = current_setting('app.tenant_id')::uuid);

-- Çalışan başvurusu (gizli, yönetici onayı opsiyonel).
CREATE TABLE IF NOT EXISTS app.internal_applications (
    id                 uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id          uuid NOT NULL,
    opportunity_id     uuid NOT NULL REFERENCES app.internal_opportunities(id) ON DELETE CASCADE,
    employee_id        uuid NOT NULL,
    cover_note         text,
    match_score        numeric(4, 3),  -- 0..1 AI matching
    status             varchar(20) NOT NULL DEFAULT 'applied'
        CHECK (status IN ('applied','under_review','shortlisted','interview','offered','withdrawn','rejected','accepted')),
    confidential       boolean NOT NULL DEFAULT TRUE,
    applied_at         timestamptz NOT NULL DEFAULT now(),
    decided_at         timestamptz,
    decision_notes     text,
    UNIQUE (tenant_id, opportunity_id, employee_id)
);

CREATE INDEX IF NOT EXISTS idx_internal_apps_emp
    ON app.internal_applications (tenant_id, employee_id);

ALTER TABLE app.internal_applications ENABLE ROW LEVEL SECURITY;
CREATE POLICY internal_apps_rls ON app.internal_applications
    USING (tenant_id = current_setting('app.tenant_id')::uuid)
    WITH CHECK (tenant_id = current_setting('app.tenant_id')::uuid);

-- Talent embedding storage: employee yetenek + career history vektörü.
-- Recommendation servisinin Pinecone/PGvector snapshot'ını buradan okur.
CREATE TABLE IF NOT EXISTS app.talent_embeddings (
    tenant_id          uuid NOT NULL,
    employee_id        uuid NOT NULL,
    embedding_version  varchar(40) NOT NULL,
    vector             jsonb NOT NULL,       -- production pgvector; dev jsonb
    indexed_skills     text[] NOT NULL DEFAULT '{}',
    updated_at         timestamptz NOT NULL DEFAULT now(),
    PRIMARY KEY (tenant_id, employee_id)
);

ALTER TABLE app.talent_embeddings ENABLE ROW LEVEL SECURITY;
CREATE POLICY talent_embeddings_rls ON app.talent_embeddings
    USING (tenant_id = current_setting('app.tenant_id')::uuid)
    WITH CHECK (tenant_id = current_setting('app.tenant_id')::uuid);

COMMENT ON TABLE app.internal_opportunities IS 'Dahili kariyer marketplace — sadece aktif çalışanlara görünür';
COMMENT ON TABLE app.internal_applications IS 'Çalışanın dahili başvurusu — confidential=TRUE ise manager görmez';
COMMENT ON TABLE app.talent_embeddings IS 'AI matching için çalışan vektör snapshotu (yetenek + kariyer)';
