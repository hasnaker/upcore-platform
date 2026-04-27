-- 056_status_page.up.sql
-- Public status page için tablolar.
-- status.upcore.io sayfasında kullanılan bileşenler, incident'lar,
-- update'ler, aboneler ve planlı bakım pencerelerini tutar.
--
-- Bu veriler tenant-agnostic public datadır — RLS yoktur. Yazma/silme
-- yetkisi uygulama seviyesinde (admin rolü + middleware) korunur.

-- 1. Bileşen kataloğu ------------------------------------------------------

CREATE TABLE IF NOT EXISTS app.status_components (
    id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    code          varchar(60) UNIQUE NOT NULL,  -- api_gateway, auth_service, ml_burnout
    name          varchar(120) NOT NULL,
    description   text,
    category      varchar(40) NOT NULL
        CHECK (category IN ('core', 'service', 'ml', 'integration')),
    sort_order    integer NOT NULL DEFAULT 100,
    status        varchar(20) NOT NULL DEFAULT 'operational'
        CHECK (status IN ('operational', 'degraded', 'partial_outage', 'major_outage', 'maintenance')),
    healthcheck_url text,      -- synthetic probe için /health URL
    prometheus_job  varchar(80), -- scrape job adı
    auto_sync_enabled boolean NOT NULL DEFAULT TRUE,
    last_checked_at timestamptz,
    created_at    timestamptz NOT NULL DEFAULT now(),
    updated_at    timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_status_components_category
    ON app.status_components (category, sort_order);

-- 2. Günlük uptime snapshot (90 günlük grafik için) ------------------------
-- Her gün her bileşen için 1 satır — pass_count / total_probes = daily uptime.

CREATE TABLE IF NOT EXISTS app.status_component_daily (
    component_id  uuid NOT NULL REFERENCES app.status_components(id) ON DELETE CASCADE,
    day           date NOT NULL,
    total_probes  integer NOT NULL DEFAULT 0,
    failed_probes integer NOT NULL DEFAULT 0,
    p95_latency_ms integer,
    incident_count integer NOT NULL DEFAULT 0,
    PRIMARY KEY (component_id, day)
);

CREATE INDEX IF NOT EXISTS idx_status_component_daily_day
    ON app.status_component_daily (day DESC);

-- 3. Incident (olay) -------------------------------------------------------

CREATE TABLE IF NOT EXISTS app.status_incidents (
    id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    title         varchar(200) NOT NULL,
    impact        varchar(20) NOT NULL DEFAULT 'minor'
        CHECK (impact IN ('none', 'minor', 'major', 'critical')),
    status        varchar(20) NOT NULL DEFAULT 'investigating'
        CHECK (status IN ('investigating', 'identified', 'monitoring', 'resolved', 'postmortem')),
    started_at    timestamptz NOT NULL DEFAULT now(),
    resolved_at   timestamptz,
    postmortem_url text,
    postmortem_summary text,
    component_ids uuid[] NOT NULL DEFAULT ARRAY[]::uuid[],
    created_by    varchar(120),  -- admin kullanıcı user_id (clerk sub)
    created_at    timestamptz NOT NULL DEFAULT now(),
    updated_at    timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_status_incidents_active
    ON app.status_incidents (status, started_at DESC)
    WHERE status <> 'resolved';
CREATE INDEX IF NOT EXISTS idx_status_incidents_started
    ON app.status_incidents (started_at DESC);

-- 4. Incident update akışı -------------------------------------------------

CREATE TABLE IF NOT EXISTS app.status_incident_updates (
    id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    incident_id   uuid NOT NULL REFERENCES app.status_incidents(id) ON DELETE CASCADE,
    status        varchar(20) NOT NULL
        CHECK (status IN ('investigating', 'identified', 'monitoring', 'resolved', 'postmortem')),
    body          text NOT NULL,
    author        varchar(120),
    created_at    timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_status_incident_updates_incident
    ON app.status_incident_updates (incident_id, created_at DESC);

-- 5. Planlı bakım pencereleri ---------------------------------------------

CREATE TABLE IF NOT EXISTS app.status_maintenance_windows (
    id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    title         varchar(200) NOT NULL,
    description   text NOT NULL,
    scheduled_start timestamptz NOT NULL,
    scheduled_end   timestamptz NOT NULL,
    status        varchar(20) NOT NULL DEFAULT 'scheduled'
        CHECK (status IN ('scheduled', 'in_progress', 'completed', 'canceled')),
    component_ids uuid[] NOT NULL DEFAULT ARRAY[]::uuid[],
    created_by    varchar(120),
    created_at    timestamptz NOT NULL DEFAULT now(),
    updated_at    timestamptz NOT NULL DEFAULT now(),
    CHECK (scheduled_end > scheduled_start)
);

CREATE INDEX IF NOT EXISTS idx_status_maintenance_upcoming
    ON app.status_maintenance_windows (scheduled_start)
    WHERE status IN ('scheduled', 'in_progress');

-- 6. Aboneler (double opt-in) ---------------------------------------------

CREATE TABLE IF NOT EXISTS app.status_subscribers (
    id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    channel       varchar(20) NOT NULL
        CHECK (channel IN ('email', 'webhook', 'rss')),
    target        varchar(500) NOT NULL,  -- email adresi veya webhook URL
    component_ids uuid[] NOT NULL DEFAULT ARRAY[]::uuid[],  -- boş = tüm bileşenler
    confirmed     boolean NOT NULL DEFAULT FALSE,
    confirm_token varchar(80),
    unsubscribe_token varchar(80) NOT NULL,
    created_at    timestamptz NOT NULL DEFAULT now(),
    confirmed_at  timestamptz,
    last_notified_at timestamptz,
    UNIQUE (channel, target)
);

CREATE INDEX IF NOT EXISTS idx_status_subscribers_confirmed
    ON app.status_subscribers (channel, confirmed);

-- 7. Seed — 20+ servis + 2 ML + 5 entegrasyon bileşeni --------------------

INSERT INTO app.status_components (code, name, category, sort_order, healthcheck_url, prometheus_job) VALUES
-- Core Platform
('api_gateway',    'API Gateway',          'core', 10, 'http://api-gateway:8080/health',    'api-gateway'),
('web_app',        'Web Uygulaması',       'core', 20, 'http://web:3000/api/health',        'web'),
('admin_panel',    'Admin Paneli',         'core', 30, 'http://admin:3001/api/health',      'admin'),
-- Services
('auth',           'Auth Servisi',         'service', 100, 'http://auth:8001/health',            'auth'),
('employee',       'Çalışan Servisi',      'service', 110, 'http://employee:8002/health',        'employee'),
('tenant',         'Tenant Servisi',       'service', 120, 'http://tenant:8003/health',          'tenant'),
('performance',    'Performans Servisi',   'service', 130, 'http://performance:8004/health',     'performance'),
('mobility',       'Mobility Servisi',     'service', 140, 'http://mobility:8005/health',        'mobility'),
('intervention',   'Koruma (Müdahale)',    'service', 150, 'http://intervention:8006/health',    'intervention'),
('audit',          'Audit Servisi',        'service', 160, 'http://audit:8007/health',           'audit'),
('notification',   'Bildirim Servisi',     'service', 170, 'http://notification:8008/health',    'notification'),
('survey',         'Anket Servisi',        'service', 180, 'http://survey:8009/health',          'survey'),
('assessment',     'Değerlendirme',        'service', 190, 'http://assessment:8010/health',      'assessment'),
('ats',            'İşe Alım (ATS)',       'service', 200, 'http://ats:8011/health',             'ats'),
('organization',   'Organizasyon',         'service', 210, 'http://organization:8012/health',    'organization'),
('document',       'Belge Servisi',        'service', 220, 'http://document:8013/health',        'document'),
('leave',          'İzin Servisi',         'service', 230, 'http://leave:8014/health',           'leave'),
('billing',        'Billing Servisi',      'service', 240, 'http://billing:8026/health',         'billing'),
('bordro',         'Bordro Servisi',       'service', 250, 'http://bordro:8015/health',          'bordro'),
('status',         'Status Servisi',       'service', 260, 'http://status:8030/health',          'status'),
-- ML Services
('ml_burnout',     'ML · Burnout Tahmini', 'ml', 500, 'http://ml-burnout:8100/health',     'ml-burnout'),
('ml_jdr_fit',     'ML · JD-R Fit',        'ml', 510, 'http://ml-jdr:8101/health',         'ml-jdr'),
-- Integrations
('int_sgk',        'Entegrasyon · SGK',       'integration', 900, NULL, NULL),
('int_edevlet',    'Entegrasyon · e-Devlet',  'integration', 910, NULL, NULL),
('int_slack',      'Entegrasyon · Slack',     'integration', 920, NULL, NULL),
('int_teams',      'Entegrasyon · Teams',     'integration', 930, NULL, NULL),
('int_stripe',     'Entegrasyon · Stripe',    'integration', 940, NULL, NULL)
ON CONFLICT (code) DO NOTHING;

COMMENT ON TABLE app.status_components IS 'Public status page bileşenleri — 20+ servis + 2 ML + 5 entegrasyon';
COMMENT ON TABLE app.status_incidents IS 'Aktif + geçmiş incidentlar; 90 gün sonra arşivlenir (soft retention)';
COMMENT ON TABLE app.status_subscribers IS 'Double opt-in e-posta/webhook/RSS aboneleri — KVKK uyumlu';
