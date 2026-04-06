-- =============================================================================
-- 002_dev_users.sql — HR Director, Manager, Employee users for each tenant
-- =============================================================================

-- Acme Türkiye users ---------------------------------------------------------
INSERT INTO app.users (id, tenant_id, email, email_verified, first_name, last_name, display_name, locale, timezone, status, primary_role)
VALUES
    ('aaaaaaa1-0000-0000-0000-000000000001', '11111111-1111-1111-1111-111111111111', 'ayse.yilmaz@acme.com.tr', true, 'Ayşe', 'Yılmaz', 'Ayşe Yılmaz', 'tr-TR', 'Europe/Istanbul', 'active', 'hr_director'),
    ('aaaaaaa1-0000-0000-0000-000000000002', '11111111-1111-1111-1111-111111111111', 'mehmet.kaya@acme.com.tr',   true, 'Mehmet','Kaya',  'Mehmet Kaya',   'tr-TR','Europe/Istanbul','active','people_partner'),
    ('aaaaaaa1-0000-0000-0000-000000000003', '11111111-1111-1111-1111-111111111111', 'can.demir@acme.com.tr',     true, 'Can','Demir',    'Can Demir',     'tr-TR','Europe/Istanbul','active','line_manager'),
    ('aaaaaaa1-0000-0000-0000-000000000004', '11111111-1111-1111-1111-111111111111', 'elif.sahin@acme.com.tr',    true, 'Elif','Şahin',   'Elif Şahin',    'tr-TR','Europe/Istanbul','active','employee'),
    ('aaaaaaa1-0000-0000-0000-000000000005', '11111111-1111-1111-1111-111111111111', 'admin@acme.com.tr',         true, 'Sistem','Yöneticisi','Sistem Yöneticisi','tr-TR','Europe/Istanbul','active','super_admin')
ON CONFLICT (id) DO NOTHING;

-- Demo Tech users -------------------------------------------------------------
INSERT INTO app.users (id, tenant_id, email, email_verified, first_name, last_name, display_name, locale, timezone, status, primary_role)
VALUES
    ('bbbbbbb2-0000-0000-0000-000000000001', '22222222-2222-2222-2222-222222222222', 'zeynep.arslan@demotech.io', true, 'Zeynep','Arslan', 'Zeynep Arslan', 'tr-TR','Europe/Istanbul','active','hr_director'),
    ('bbbbbbb2-0000-0000-0000-000000000002', '22222222-2222-2222-2222-222222222222', 'burak.yildiz@demotech.io',  true, 'Burak','Yıldız',  'Burak Yıldız',  'tr-TR','Europe/Istanbul','active','line_manager'),
    ('bbbbbbb2-0000-0000-0000-000000000003', '22222222-2222-2222-2222-222222222222', 'seda.koc@demotech.io',      true, 'Seda','Koç',      'Seda Koç',      'tr-TR','Europe/Istanbul','active','employee')
ON CONFLICT (id) DO NOTHING;

-- Pilot Sağlık users ----------------------------------------------------------
INSERT INTO app.users (id, tenant_id, email, email_verified, first_name, last_name, display_name, locale, timezone, status, primary_role)
VALUES
    ('ccccccc3-0000-0000-0000-000000000001', '33333333-3333-3333-3333-333333333333', 'dr.hakan.ozdemir@pilotsaglik.com.tr', true, 'Hakan','Özdemir','Dr. Hakan Özdemir','tr-TR','Europe/Istanbul','active','hr_director'),
    ('ccccccc3-0000-0000-0000-000000000002', '33333333-3333-3333-3333-333333333333', 'fatma.aydin@pilotsaglik.com.tr',     true, 'Fatma','Aydın', 'Fatma Aydın',     'tr-TR','Europe/Istanbul','active','people_partner'),
    ('ccccccc3-0000-0000-0000-000000000003', '33333333-3333-3333-3333-333333333333', 'emre.celik@pilotsaglik.com.tr',      true, 'Emre','Çelik',  'Emre Çelik',      'tr-TR','Europe/Istanbul','active','line_manager'),
    ('ccccccc3-0000-0000-0000-000000000004', '33333333-3333-3333-3333-333333333333', 'nuray.polat@pilotsaglik.com.tr',     true, 'Nuray','Polat', 'Nuray Polat',     'tr-TR','Europe/Istanbul','active','employee')
ON CONFLICT (id) DO NOTHING;
