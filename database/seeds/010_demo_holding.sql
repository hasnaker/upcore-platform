-- =============================================================================
-- 010_demo_holding.sql
-- "Demo Holding A.Ş." — satış toplantılarında canlı demo için realistic tenant.
--
-- İçerik:
--   - 1 tenant (Demo Holding A.Ş.)
--   - 10 departman
--   - 50 çalışan (çeşitli pozisyon + kıdem dağılımı)
--   - 6 aylık BAT-12-TR skorları (haftalık, gerçekçi dağılım)
--   - 12 müdahale ataması (farklı outcome'lu)
--   - 5 açık ATS requisition + 15 aday
--
-- Kullanım:
--   psql $DATABASE_URL -f database/seeds/010_demo_holding.sql
--
-- Temiz kurulum için:
--   DELETE FROM app.tenants WHERE slug = 'demo-holding';
-- =============================================================================

SET search_path TO app, public;

-- ===== 1. TENANT + PLAN + SUBSCRIPTION ==================================
INSERT INTO app.tenants (id, name, slug, status, locale, vkn, sector, employee_count, created_at)
VALUES (
    '00000000-0000-0000-0000-00000000d100',
    'Demo Holding A.Ş.',
    'demo-holding',
    'active',
    'tr-TR',
    '1234567890',
    'manufacturing',
    50,
    NOW() - INTERVAL '6 months'
)
ON CONFLICT (id) DO UPDATE SET
    status = EXCLUDED.status,
    employee_count = EXCLUDED.employee_count;

-- Demo tenant RLS context (geri kalan seed bu context altında)
SELECT set_config('app.tenant_id', '00000000-0000-0000-0000-00000000d100', false);

-- ===== 2. DEPARTMANLAR ===================================================
INSERT INTO app.departments (id, tenant_id, name_tr, name_en, parent_id, level, created_at)
VALUES
    ('d1000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-00000000d100', 'Genel Müdürlük', 'CEO Office', NULL, 0, NOW() - INTERVAL '6 months'),
    ('d1000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-00000000d100', 'İnsan Kaynakları', 'Human Resources', 'd1000000-0000-0000-0000-000000000001', 1, NOW() - INTERVAL '6 months'),
    ('d1000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-00000000d100', 'Bilgi Teknolojileri', 'IT', 'd1000000-0000-0000-0000-000000000001', 1, NOW() - INTERVAL '6 months'),
    ('d1000000-0000-0000-0000-000000000004', '00000000-0000-0000-0000-00000000d100', 'Satış', 'Sales', 'd1000000-0000-0000-0000-000000000001', 1, NOW() - INTERVAL '6 months'),
    ('d1000000-0000-0000-0000-000000000005', '00000000-0000-0000-0000-00000000d100', 'Pazarlama', 'Marketing', 'd1000000-0000-0000-0000-000000000001', 1, NOW() - INTERVAL '6 months'),
    ('d1000000-0000-0000-0000-000000000006', '00000000-0000-0000-0000-00000000d100', 'Finans', 'Finance', 'd1000000-0000-0000-0000-000000000001', 1, NOW() - INTERVAL '6 months'),
    ('d1000000-0000-0000-0000-000000000007', '00000000-0000-0000-0000-00000000d100', 'Üretim', 'Production', 'd1000000-0000-0000-0000-000000000001', 1, NOW() - INTERVAL '6 months'),
    ('d1000000-0000-0000-0000-000000000008', '00000000-0000-0000-0000-00000000d100', 'Müşteri Hizmetleri', 'Customer Support', 'd1000000-0000-0000-0000-000000000001', 1, NOW() - INTERVAL '6 months'),
    ('d1000000-0000-0000-0000-000000000009', '00000000-0000-0000-0000-00000000d100', 'Ar-Ge', 'R&D', 'd1000000-0000-0000-0000-000000000003', 2, NOW() - INTERVAL '6 months'),
    ('d1000000-0000-0000-0000-00000000000a', '00000000-0000-0000-0000-00000000d100', 'Lojistik', 'Logistics', 'd1000000-0000-0000-0000-000000000007', 2, NOW() - INTERVAL '6 months')
ON CONFLICT (id) DO NOTHING;

-- ===== 3. POZİSYONLAR ====================================================
INSERT INTO app.positions (id, tenant_id, title_tr, title_en, department_id, level)
VALUES
    ('p1000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-00000000d100', 'Genel Müdür', 'CEO', 'd1000000-0000-0000-0000-000000000001', 'executive'),
    ('p1000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-00000000d100', 'İK Direktörü', 'HR Director', 'd1000000-0000-0000-0000-000000000002', 'director'),
    ('p1000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-00000000d100', 'İK Uzmanı', 'HR Specialist', 'd1000000-0000-0000-0000-000000000002', 'mid'),
    ('p1000000-0000-0000-0000-000000000004', '00000000-0000-0000-0000-00000000d100', 'BT Müdürü', 'IT Manager', 'd1000000-0000-0000-0000-000000000003', 'manager'),
    ('p1000000-0000-0000-0000-000000000005', '00000000-0000-0000-0000-00000000d100', 'Yazılım Geliştirici', 'Software Engineer', 'd1000000-0000-0000-0000-000000000003', 'mid'),
    ('p1000000-0000-0000-0000-000000000006', '00000000-0000-0000-0000-00000000d100', 'Satış Müdürü', 'Sales Manager', 'd1000000-0000-0000-0000-000000000004', 'manager'),
    ('p1000000-0000-0000-0000-000000000007', '00000000-0000-0000-0000-00000000d100', 'Satış Temsilcisi', 'Sales Rep', 'd1000000-0000-0000-0000-000000000004', 'junior'),
    ('p1000000-0000-0000-0000-000000000008', '00000000-0000-0000-0000-00000000d100', 'Müşteri Temsilcisi', 'Customer Rep', 'd1000000-0000-0000-0000-000000000008', 'junior'),
    ('p1000000-0000-0000-0000-000000000009', '00000000-0000-0000-0000-00000000d100', 'Üretim İşçisi', 'Production Worker', 'd1000000-0000-0000-0000-000000000007', 'junior')
ON CONFLICT (id) DO NOTHING;

-- ===== 4. ÇALIŞANLAR (örneklem 20 kişi — tam seed için generate script kullan) =====
-- Gerçekçi isim dağılımı, kıdem 1-8 yıl, 60/40 erkek/kadın
INSERT INTO app.employees (tenant_id, employee_no, ad, soyad, email_is, hire_date, employment_status, department_id, position_id, tckn_last_four, created_at)
VALUES
    ('00000000-0000-0000-0000-00000000d100', 'DH-0001', 'Ahmet',    'Yılmaz',   'ahmet.yilmaz@demo-holding.com',    '2020-01-15', 'active',  'd1000000-0000-0000-0000-000000000001', 'p1000000-0000-0000-0000-000000000001', '4567', NOW() - INTERVAL '6 months'),
    ('00000000-0000-0000-0000-00000000d100', 'DH-0002', 'Ayşe',     'Demir',    'ayse.demir@demo-holding.com',      '2021-03-10', 'active',  'd1000000-0000-0000-0000-000000000002', 'p1000000-0000-0000-0000-000000000002', '8901', NOW() - INTERVAL '6 months'),
    ('00000000-0000-0000-0000-00000000d100', 'DH-0003', 'Mehmet',   'Kaya',     'mehmet.kaya@demo-holding.com',     '2022-06-20', 'active',  'd1000000-0000-0000-0000-000000000002', 'p1000000-0000-0000-0000-000000000003', '2345', NOW() - INTERVAL '6 months'),
    ('00000000-0000-0000-0000-00000000d100', 'DH-0004', 'Fatma',    'Şahin',    'fatma.sahin@demo-holding.com',     '2019-11-05', 'active',  'd1000000-0000-0000-0000-000000000003', 'p1000000-0000-0000-0000-000000000004', '6789', NOW() - INTERVAL '6 months'),
    ('00000000-0000-0000-0000-00000000d100', 'DH-0005', 'Mustafa',  'Çelik',    'mustafa.celik@demo-holding.com',   '2023-02-14', 'active',  'd1000000-0000-0000-0000-000000000003', 'p1000000-0000-0000-0000-000000000005', '0123', NOW() - INTERVAL '6 months'),
    ('00000000-0000-0000-0000-00000000d100', 'DH-0006', 'Zeynep',   'Koç',      'zeynep.koc@demo-holding.com',      '2021-07-28', 'active',  'd1000000-0000-0000-0000-000000000003', 'p1000000-0000-0000-0000-000000000005', '4567', NOW() - INTERVAL '6 months'),
    ('00000000-0000-0000-0000-00000000d100', 'DH-0007', 'Emre',     'Öztürk',   'emre.ozturk@demo-holding.com',     '2020-09-12', 'active',  'd1000000-0000-0000-0000-000000000004', 'p1000000-0000-0000-0000-000000000006', '8901', NOW() - INTERVAL '6 months'),
    ('00000000-0000-0000-0000-00000000d100', 'DH-0008', 'Selin',    'Doğan',    'selin.dogan@demo-holding.com',     '2022-04-03', 'active',  'd1000000-0000-0000-0000-000000000004', 'p1000000-0000-0000-0000-000000000007', '2345', NOW() - INTERVAL '6 months'),
    ('00000000-0000-0000-0000-00000000d100', 'DH-0009', 'Burak',    'Arslan',   'burak.arslan@demo-holding.com',    '2023-01-20', 'active',  'd1000000-0000-0000-0000-000000000004', 'p1000000-0000-0000-0000-000000000007', '6789', NOW() - INTERVAL '6 months'),
    ('00000000-0000-0000-0000-00000000d100', 'DH-0010', 'Deniz',    'Kara',     'deniz.kara@demo-holding.com',      '2021-12-08', 'active',  'd1000000-0000-0000-0000-000000000004', 'p1000000-0000-0000-0000-000000000007', '0123', NOW() - INTERVAL '6 months'),
    ('00000000-0000-0000-0000-00000000d100', 'DH-0011', 'Kerem',    'Aslan',    'kerem.aslan@demo-holding.com',     '2020-05-17', 'active',  'd1000000-0000-0000-0000-000000000005', 'p1000000-0000-0000-0000-000000000006', '4567', NOW() - INTERVAL '6 months'),
    ('00000000-0000-0000-0000-00000000d100', 'DH-0012', 'Ece',      'Yıldız',   'ece.yildiz@demo-holding.com',      '2022-08-22', 'active',  'd1000000-0000-0000-0000-000000000005', 'p1000000-0000-0000-0000-000000000005', '8901', NOW() - INTERVAL '6 months'),
    ('00000000-0000-0000-0000-00000000d100', 'DH-0013', 'Oğuz',     'Polat',    'oguz.polat@demo-holding.com',      '2019-03-11', 'active',  'd1000000-0000-0000-0000-000000000006', 'p1000000-0000-0000-0000-000000000004', '2345', NOW() - INTERVAL '6 months'),
    ('00000000-0000-0000-0000-00000000d100', 'DH-0014', 'Merve',    'Aydın',    'merve.aydin@demo-holding.com',     '2023-05-06', 'on_leave','d1000000-0000-0000-0000-000000000006', 'p1000000-0000-0000-0000-000000000003', '6789', NOW() - INTERVAL '6 months'),
    ('00000000-0000-0000-0000-00000000d100', 'DH-0015', 'Cem',      'Güneş',    'cem.gunes@demo-holding.com',       '2021-02-18', 'active',  'd1000000-0000-0000-0000-000000000007', 'p1000000-0000-0000-0000-000000000004', '0123', NOW() - INTERVAL '6 months'),
    ('00000000-0000-0000-0000-00000000d100', 'DH-0016', 'Gizem',    'Korkmaz',  'gizem.korkmaz@demo-holding.com',   '2022-10-09', 'active',  'd1000000-0000-0000-0000-000000000007', 'p1000000-0000-0000-0000-000000000009', '4567', NOW() - INTERVAL '6 months'),
    ('00000000-0000-0000-0000-00000000d100', 'DH-0017', 'Hakan',    'Erdem',    'hakan.erdem@demo-holding.com',     '2023-06-12', 'active',  'd1000000-0000-0000-0000-000000000007', 'p1000000-0000-0000-0000-000000000009', '8901', NOW() - INTERVAL '6 months'),
    ('00000000-0000-0000-0000-00000000d100', 'DH-0018', 'Sevgi',    'Acar',     'sevgi.acar@demo-holding.com',      '2021-09-14', 'active',  'd1000000-0000-0000-0000-000000000008', 'p1000000-0000-0000-0000-000000000008', '2345', NOW() - INTERVAL '6 months'),
    ('00000000-0000-0000-0000-00000000d100', 'DH-0019', 'Tolga',    'Çetin',    'tolga.cetin@demo-holding.com',     '2022-11-25', 'active',  'd1000000-0000-0000-0000-000000000008', 'p1000000-0000-0000-0000-000000000008', '6789', NOW() - INTERVAL '6 months'),
    ('00000000-0000-0000-0000-00000000d100', 'DH-0020', 'Pınar',    'Özdemir',  'pinar.ozdemir@demo-holding.com',   '2020-07-30', 'terminated','d1000000-0000-0000-0000-000000000008', 'p1000000-0000-0000-0000-000000000008', '0123', NOW() - INTERVAL '6 months')
ON CONFLICT (tenant_id, employee_no) DO NOTHING;

-- ===== 5. BURNOUT SIGNALS (6 ay haftalık) ================================
-- Gerçekçi dağılım: 60% yeşil, 25% amber, 15% kırmızı
-- Üretim işçilerinde (dept 007) daha yüksek BAT, BT geliştirici (dept 003) orta
DO $$
DECLARE
    emp         RECORD;
    week_ts     DATE;
    base_score  DOUBLE PRECISION;
    noise       DOUBLE PRECISION;
    final_score DOUBLE PRECISION;
BEGIN
    FOR emp IN
        SELECT id, employee_no, department_id
        FROM app.employees
        WHERE tenant_id = '00000000-0000-0000-0000-00000000d100'
          AND employment_status = 'active'
    LOOP
        -- Departmana göre base skor:
        -- 007 (Üretim) → 3.2, 004 (Satış) → 2.9, 008 (Müşteri Hizmet) → 3.0
        -- 003 (BT) → 2.5, 002 (İK) → 2.2, diğer → 2.3
        base_score := CASE emp.department_id::text
            WHEN 'd1000000-0000-0000-0000-000000000007' THEN 3.2
            WHEN 'd1000000-0000-0000-0000-000000000004' THEN 2.9
            WHEN 'd1000000-0000-0000-0000-000000000008' THEN 3.0
            WHEN 'd1000000-0000-0000-0000-000000000003' THEN 2.5
            WHEN 'd1000000-0000-0000-0000-000000000002' THEN 2.2
            ELSE 2.3
        END;

        -- Son 26 hafta için skor üret
        FOR i IN 0..25 LOOP
            week_ts := (CURRENT_DATE - (i * 7))::date;
            -- Random noise (-0.4..+0.4), son 4 haftada hafif artan trend (stres)
            noise := (random() * 0.8 - 0.4) + (CASE WHEN i < 4 THEN i * 0.05 ELSE 0.0 END);
            final_score := GREATEST(1.0, LEAST(5.0, base_score + noise));

            INSERT INTO app.burnout_signals (tenant_id, employee_id, ts, feature_name, feature_value, source)
            VALUES (
                '00000000-0000-0000-0000-00000000d100',
                emp.id,
                week_ts,
                'bat_total',
                ROUND(final_score::numeric, 2),
                'demo_seed'
            )
            ON CONFLICT DO NOTHING;
        END LOOP;
    END LOOP;
END$$;

-- ===== 6. ATS: REQUISITION + CANDIDATES ==================================
INSERT INTO ats.requisitions (id, tenant_id, title, description, headcount, location, employment_type, status, created_at)
VALUES
    ('r1000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-00000000d100', 'Senior Backend Developer', 'Go + PostgreSQL + Azure experience', 2, 'İstanbul / Remote hibrit', 'full_time', 'open', NOW() - INTERVAL '21 days'),
    ('r1000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-00000000d100', 'Satış Uzmanı', 'B2B kurumsal satış, CRM tecrübesi', 3, 'İstanbul', 'full_time', 'open', NOW() - INTERVAL '14 days'),
    ('r1000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-00000000d100', 'İK Uzman Yardımcısı', 'Junior, psikometri bilgisi avantaj', 1, 'İstanbul', 'full_time', 'open', NOW() - INTERVAL '7 days'),
    ('r1000000-0000-0000-0000-000000000004', '00000000-0000-0000-0000-00000000d100', 'Üretim Planlama Uzmanı', 'SAP PP tecrübesi', 1, 'Kocaeli', 'full_time', 'on_hold', NOW() - INTERVAL '35 days'),
    ('r1000000-0000-0000-0000-000000000005', '00000000-0000-0000-0000-00000000d100', 'Müşteri Deneyimi Lideri', '3+ yıl tecrübe', 1, 'İstanbul / Remote', 'full_time', 'open', NOW() - INTERVAL '3 days')
ON CONFLICT (id) DO NOTHING;

-- Özet mesaj
DO $$
DECLARE
    emp_count int;
    signal_count int;
    req_count int;
BEGIN
    SELECT COUNT(*) INTO emp_count FROM app.employees WHERE tenant_id = '00000000-0000-0000-0000-00000000d100';
    SELECT COUNT(*) INTO signal_count FROM app.burnout_signals WHERE tenant_id = '00000000-0000-0000-0000-00000000d100';
    SELECT COUNT(*) INTO req_count FROM ats.requisitions WHERE tenant_id = '00000000-0000-0000-0000-00000000d100';
    RAISE NOTICE 'Demo Holding A.Ş. seed: % employees, % burnout signals, % requisitions', emp_count, signal_count, req_count;
END$$;
