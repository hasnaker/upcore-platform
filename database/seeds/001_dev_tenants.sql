-- =============================================================================
-- 001_dev_tenants.sql — 3 sample tenants for local development
-- =============================================================================

INSERT INTO app.tenants (id, name, slug, legal_name, tax_id, country, language, timezone, data_residency, plan, seats_allowed, status, contact_email, contact_phone, settings)
VALUES
    (
        '11111111-1111-1111-1111-111111111111',
        'Acme Türkiye',
        'acme-tr',
        'Acme Teknoloji A.Ş.',
        '1234567890',
        'TR', 'tr-TR', 'Europe/Istanbul', 'eu-west',
        'growth', 500, 'active',
        'iletisim@acme.com.tr', '+90 212 555 10 01',
        jsonb_build_object('theme','light','features', ARRAY['burnout','ats','surveys'])
    ),
    (
        '22222222-2222-2222-2222-222222222222',
        'Demo Tech',
        'demo-tech',
        'Demo Teknoloji Ltd. Şti.',
        '9876543210',
        'TR', 'tr-TR', 'Europe/Istanbul', 'eu-west',
        'starter', 100, 'trial',
        'info@demotech.io', '+90 216 555 20 02',
        jsonb_build_object('theme','dark','features', ARRAY['burnout','surveys'])
    ),
    (
        '33333333-3333-3333-3333-333333333333',
        'Pilot Sağlık',
        'pilot-health',
        'Pilot Sağlık Hizmetleri A.Ş.',
        '5555555555',
        'TR', 'tr-TR', 'Europe/Istanbul', 'eu-west',
        'enterprise', 2000, 'active',
        'ik@pilotsaglik.com.tr', '+90 312 555 30 03',
        jsonb_build_object('theme','light','features', ARRAY['burnout','ats','surveys','interventions','mobility'])
    )
ON CONFLICT (id) DO NOTHING;
