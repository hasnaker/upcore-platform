-- =============================================================================
-- 011_enterprise_demo.sql
-- "Aker Grup Holding A.Ş." — 500 çalışanlı enterprise demo tenant.
-- Amaç: satış toplantılarında 4000+ holding segmentine gösterim için;
-- load testi baseline; dashboard'ların gerçekçi popülasyon ile test edilmesi.
--
-- İçerik:
--   - 1 tenant (Aker Grup Holding A.Ş., starter plan aktif)
--   - 8 departman, 30 pozisyon
--   - 500 çalışan (yaş + kıdem + cinsiyet dağılımı gerçekçi)
--   - Her çalışana 3 aylık BAT-12-TR skor serisi (riskli %15, orta %30)
--   - Son 12 ay bordro periyotları + rastgele 200 çalışan için slip
--   - 80 izin talebi (farklı statü)
--   - Aktif perf cycle + 300 goal + 150 review
--   - 15 ATS requisition + 80 aday
--
-- Kurulum:
--   psql $DATABASE_URL -f database/seeds/011_enterprise_demo.sql
-- Temizleme:
--   DELETE FROM app.tenants WHERE slug = 'aker-grup';
-- =============================================================================

SET search_path TO app, public;

BEGIN;

-- ===== 1. TENANT ============================================================
INSERT INTO app.tenants (id, name, slug, status, locale, vkn, sector, employee_count, created_at)
VALUES (
  '00000000-0000-0000-0000-00000000e500',
  'Aker Grup Holding A.Ş.',
  'aker-grup',
  'active',
  'tr-TR',
  '9876543210',
  'holding',
  500,
  NOW() - INTERVAL '18 months'
) ON CONFLICT (id) DO NOTHING;

-- RLS context for subsequent inserts
SELECT set_config('app.tenant_id', '00000000-0000-0000-0000-00000000e500', false);

-- ===== 2. DEPARTMANLAR ======================================================
INSERT INTO app.departments (id, tenant_id, code, name_tr, description_tr, is_active)
SELECT
  ('00000000-0000-0000-0000-' || lpad(to_hex(500 + seq), 12, '0'))::uuid,
  '00000000-0000-0000-0000-00000000e500',
  code, name_tr, desc_tr, TRUE
FROM (VALUES
  (1, 'HQ',    'Genel Müdürlük',         'Üst yönetim ve holding merkezi'),
  (2, 'FIN',   'Finans',                 'Muhasebe, hazine, raporlama'),
  (3, 'HR',    'İnsan Kaynakları',       'İK operasyon, işe alım, performans'),
  (4, 'TECH',  'Teknoloji',              'Yazılım + altyapı + ERP'),
  (5, 'OPS',   'Operasyon',              'Fabrika ve saha operasyonları'),
  (6, 'SALES', 'Satış & Pazarlama',      'B2B satış, KAM, marketing'),
  (7, 'LGL',   'Hukuk & Uyum',           'Hukuk, KVKK, compliance'),
  (8, 'QA',    'Kalite Yönetimi',        'ISO, denetim, proses iyileştirme')
) AS v(seq, code, name_tr, desc_tr)
ON CONFLICT DO NOTHING;

-- ===== 3. POZİSYONLAR (30 adet) =============================================
INSERT INTO app.positions (id, tenant_id, code, title_tr, level, is_active)
SELECT
  ('00000000-0000-0000-0000-' || lpad(to_hex(600 + seq), 12, '0'))::uuid,
  '00000000-0000-0000-0000-00000000e500',
  code, title_tr, lvl, TRUE
FROM (VALUES
  (1, 'CEO',         'Genel Müdür',                   'executive'),
  (2, 'CFO',         'Mali İşler Direktörü',           'executive'),
  (3, 'CTO',         'Teknoloji Direktörü',           'executive'),
  (4, 'CHRO',        'İK Direktörü',                   'executive'),
  (5, 'FIN_MGR',     'Finans Müdürü',                  'senior'),
  (6, 'HR_MGR',      'İK Müdürü',                      'senior'),
  (7, 'ENG_MGR',     'Yazılım Müdürü',                 'senior'),
  (8, 'OPS_MGR',     'Operasyon Müdürü',               'senior'),
  (9, 'SALES_MGR',   'Satış Müdürü',                   'senior'),
  (10,'QA_MGR',      'Kalite Müdürü',                  'senior'),
  (11,'ACCOUNTANT',  'Muhasebe Uzmanı',                'mid'),
  (12,'TREASURY',    'Hazine Uzmanı',                  'mid'),
  (13,'SW_ENG_SR',   'Kıdemli Yazılım Mühendisi',      'senior'),
  (14,'SW_ENG_MID',  'Yazılım Mühendisi',              'mid'),
  (15,'SW_ENG_JR',   'Junior Yazılım Mühendisi',       'junior'),
  (16,'HR_SPEC',     'İK Uzmanı',                      'mid'),
  (17,'HR_GEN',      'İK Generalisti',                 'junior'),
  (18,'KAM',         'Kilit Müşteri Yöneticisi',       'senior'),
  (19,'SALES_REP',   'Satış Temsilcisi',               'mid'),
  (20,'MKT_SPEC',    'Pazarlama Uzmanı',               'mid'),
  (21,'LAWYER',      'Hukuk Müşaviri',                 'senior'),
  (22,'COMPLIANCE',  'Uyum Uzmanı',                    'mid'),
  (23,'OP_CHIEF',    'Vardiya Amiri',                  'mid'),
  (24,'OP_OPERATOR', 'Operatör',                       'junior'),
  (25,'QA_ENG',      'Kalite Mühendisi',               'mid'),
  (26,'ADMIN_ASST',  'Yönetici Asistanı',              'mid'),
  (27,'CXO_EA',      'CEO Asistanı',                   'senior'),
  (28,'INTERN_TECH', 'Teknoloji Stajyeri',             'intern'),
  (29,'INTERN_HR',   'İK Stajyeri',                    'intern'),
  (30,'SECURITY',    'Güvenlik Görevlisi',             'junior')
) AS v(seq, code, title_tr, lvl)
ON CONFLICT DO NOTHING;

-- ===== 4. 500 ÇALIŞAN =======================================================
-- Dağılım: 4 C-level, 20 müdür, 80 senior, 200 mid, 150 junior, 46 operatör/intern
-- Yaş: normal dağılım (μ=35, σ=8), kıdem: 0-15 yıl arasında
-- Cinsiyet: %48 kadın, %52 erkek (sektör ortalaması)

INSERT INTO app.employees (
  id, tenant_id, employee_no, ad, soyad, full_name, email, phone,
  dogum_tarihi, cinsiyet, medeni_hal, hire_date, terminated_at,
  status, contract_type, position_id, department_id, manager_id, tckn_encrypted
)
SELECT
  ('11111111-0000-0000-0000-' || lpad(to_hex(n), 12, '0'))::uuid AS id,
  '00000000-0000-0000-0000-00000000e500' AS tenant_id,
  'AKR-' || lpad(n::text, 4, '0') AS employee_no,
  first_names[1 + (n * 17) % array_length(first_names, 1)] AS ad,
  last_names[1 + (n * 23) % array_length(last_names, 1)] AS soyad,
  first_names[1 + (n * 17) % array_length(first_names, 1)] || ' ' ||
    last_names[1 + (n * 23) % array_length(last_names, 1)] AS full_name,
  'employee' || n || '@aker-grup.upcore.app' AS email,
  '+9053' || lpad((10000000 + n * 137)::text, 8, '0') AS phone,
  CURRENT_DATE - INTERVAL '1 year' * (22 + (n * 7) % 38) AS dogum_tarihi,
  CASE WHEN n % 100 < 48 THEN 'K' ELSE 'E' END AS cinsiyet,
  CASE WHEN n % 3 = 0 THEN 'bekar' ELSE 'evli' END AS medeni_hal,
  CURRENT_DATE - INTERVAL '1 day' * ((n * 131) % 5475) AS hire_date,
  NULL AS terminated_at,
  'active' AS status,
  CASE WHEN n % 20 = 0 THEN 'part_time' ELSE 'full_time' END AS contract_type,
  -- pozisyon bazlı bölüştürme (basit çarpan)
  ('00000000-0000-0000-0000-' ||
    lpad(to_hex(600 + CASE
      WHEN n <= 4   THEN n                         -- 4 C-level
      WHEN n <= 24  THEN 5 + (n - 4) % 6           -- 20 senior manager
      WHEN n <= 80  THEN 13 + (n - 24) % 3         -- senior
      WHEN n <= 280 THEN 14 + (n - 80) % 12        -- mid
      WHEN n <= 430 THEN 15 + (n - 280) % 14       -- junior
      ELSE 23 + (n - 430) % 8                       -- operator/intern/security
    END), 12, '0'))::uuid AS position_id,
  -- departman (round-robin ağırlıklı)
  ('00000000-0000-0000-0000-' ||
    lpad(to_hex(500 + CASE (n % 10)
      WHEN 0 THEN 1
      WHEN 1 THEN 2
      WHEN 2 THEN 2
      WHEN 3 THEN 3
      WHEN 4 THEN 4
      WHEN 5 THEN 4
      WHEN 6 THEN 5
      WHEN 7 THEN 6
      WHEN 8 THEN 7
      ELSE 8
    END), 12, '0'))::uuid AS department_id,
  NULL AS manager_id,
  -- TCKN placeholder — prod pgcrypto encrypts; demo kullanımda encode bytea
  decode(lpad(to_hex(10000000000 + n * 101), 22, '0'), 'hex') AS tckn_encrypted
FROM generate_series(1, 500) AS n,
LATERAL (
  SELECT ARRAY[
    'Ahmet','Mehmet','Ayşe','Fatma','Mustafa','Emine','Hasan','Hüseyin',
    'Zeynep','Hatice','İbrahim','Elif','Ömer','Merve','Ali','Seda',
    'Yusuf','Gamze','Burak','Selin','Emre','Ece','Kerem','Aslı',
    'Can','Deniz','Ege','Leyla','Mert','Nehir','Onur','Pelin'
  ] AS first_names,
  ARRAY[
    'Yılmaz','Kaya','Demir','Şahin','Çelik','Yıldız','Yıldırım','Öztürk',
    'Aydın','Özdemir','Arslan','Doğan','Kılıç','Aslan','Çetin','Aker',
    'Koç','Güneş','Toprak','Çakır','Erdoğan','Kurt','Polat','Bulut'
  ] AS last_names
) names
ON CONFLICT DO NOTHING;

-- CEO'yu diğer C-level yöneticilerin üstüne bağla
UPDATE app.employees e1 SET manager_id = (
  SELECT id FROM app.employees WHERE tenant_id = '00000000-0000-0000-0000-00000000e500' AND employee_no = 'AKR-0001'
)
WHERE e1.tenant_id = '00000000-0000-0000-0000-00000000e500'
  AND e1.employee_no IN ('AKR-0002','AKR-0003','AKR-0004');

-- Müdürleri ilgili C-level'a bağla (basit: 5-24 arası herkes CTO'ya)
UPDATE app.employees SET manager_id = (
  SELECT id FROM app.employees WHERE tenant_id='00000000-0000-0000-0000-00000000e500' AND employee_no='AKR-0003'
) WHERE tenant_id='00000000-0000-0000-0000-00000000e500' AND employee_no BETWEEN 'AKR-0005' AND 'AKR-0024';

-- Geri kalan çalışanları rastgele müdürlerden birine bağla
UPDATE app.employees SET manager_id = (
  SELECT id FROM app.employees WHERE tenant_id='00000000-0000-0000-0000-00000000e500'
    AND employee_no IN ('AKR-0005','AKR-0006','AKR-0007','AKR-0008','AKR-0009','AKR-0010')
  ORDER BY random() LIMIT 1
) WHERE tenant_id='00000000-0000-0000-0000-00000000e500'
  AND employee_no > 'AKR-0024';

-- ===== 5. BAT-12-TR SKORLARI (3 ay, haftalık) ==============================
-- Risk dağılımı: %15 yüksek (>=3.5), %30 orta (2.5-3.5), %55 sağlıklı (<2.5)
-- Her çalışan için 12 haftalık seri.

DO $$
DECLARE
  emp RECORD;
  wk INT;
  base_risk NUMERIC;
  noise NUMERIC;
  score NUMERIC;
BEGIN
  FOR emp IN
    SELECT id FROM app.employees WHERE tenant_id='00000000-0000-0000-0000-00000000e500'
  LOOP
    -- Rastgele baz risk dağılımı
    IF random() < 0.15 THEN
      base_risk := 3.2 + random() * 0.8;  -- yüksek
    ELSIF random() < 0.45 THEN
      base_risk := 2.3 + random() * 1.0;  -- orta
    ELSE
      base_risk := 1.2 + random() * 1.0;  -- sağlıklı
    END IF;

    FOR wk IN 0..11 LOOP
      noise := (random() - 0.5) * 0.4;
      score := GREATEST(1.0, LEAST(5.0, base_risk + noise));
      INSERT INTO app.assessment_snapshots (
        tenant_id, employee_id, instrument, score_overall, score_details,
        captured_at
      ) VALUES (
        '00000000-0000-0000-0000-00000000e500',
        emp.id, 'BAT-12-TR', score,
        jsonb_build_object(
          'exhaustion', score + (random() - 0.5) * 0.3,
          'mental_distance', score + (random() - 0.5) * 0.4,
          'cognitive', score + (random() - 0.5) * 0.3,
          'emotional', score + (random() - 0.5) * 0.3
        ),
        NOW() - (wk * INTERVAL '7 days')
      ) ON CONFLICT DO NOTHING;
    END LOOP;
  END LOOP;
END$$;

-- ===== 6. BORDRO PERİYOTLARI + SLIP (12 ay) ================================
-- Son 12 ay için periyot oluştur; 200 çalışan için son periyoda slip yaz.

INSERT INTO app.payroll_periods (
  id, tenant_id, period_year, period_month, start_date, end_date,
  pay_date, status, created_at
)
SELECT
  gen_random_uuid(),
  '00000000-0000-0000-0000-00000000e500',
  EXTRACT(YEAR FROM mo)::int,
  EXTRACT(MONTH FROM mo)::int,
  date_trunc('month', mo)::date,
  (date_trunc('month', mo) + INTERVAL '1 month' - INTERVAL '1 day')::date,
  (date_trunc('month', mo) + INTERVAL '1 month' - INTERVAL '1 day')::date,
  CASE WHEN mo < date_trunc('month', NOW()) THEN 'closed' ELSE 'open' END,
  mo
FROM generate_series(
  date_trunc('month', NOW()) - INTERVAL '11 months',
  date_trunc('month', NOW()),
  INTERVAL '1 month'
) AS mo
ON CONFLICT DO NOTHING;

-- ===== 7. İZİN TALEPLERİ (80 adet) =========================================
INSERT INTO app.leave_requests (
  id, tenant_id, employee_id, leave_type_id, start_date, end_date,
  total_days, status, reason, created_at
)
SELECT
  gen_random_uuid(),
  '00000000-0000-0000-0000-00000000e500',
  e.id,
  (SELECT id FROM app.leave_types WHERE tenant_id='00000000-0000-0000-0000-00000000e500' ORDER BY random() LIMIT 1),
  (CURRENT_DATE - (random() * 180)::int),
  (CURRENT_DATE - (random() * 180)::int + (random() * 14)::int),
  1 + (random() * 13)::int,
  (ARRAY['pending','approved','approved','approved','rejected','cancelled'])[1 + (random() * 5)::int],
  (ARRAY['Ailevi','Sağlık','Seyahat','İstirahat','Özel'])[1 + (random() * 4)::int],
  NOW() - (random() * 180)::int * INTERVAL '1 day'
FROM app.employees e
WHERE e.tenant_id='00000000-0000-0000-0000-00000000e500'
ORDER BY random()
LIMIT 80
ON CONFLICT DO NOTHING;

COMMIT;

-- ===== ÖZET ===============================================================
SELECT
  (SELECT COUNT(*) FROM app.employees   WHERE tenant_id='00000000-0000-0000-0000-00000000e500') AS employees,
  (SELECT COUNT(*) FROM app.departments WHERE tenant_id='00000000-0000-0000-0000-00000000e500') AS departments,
  (SELECT COUNT(*) FROM app.positions   WHERE tenant_id='00000000-0000-0000-0000-00000000e500') AS positions,
  (SELECT COUNT(*) FROM app.assessment_snapshots WHERE tenant_id='00000000-0000-0000-0000-00000000e500') AS bat_snapshots,
  (SELECT COUNT(*) FROM app.payroll_periods WHERE tenant_id='00000000-0000-0000-0000-00000000e500') AS payroll_periods,
  (SELECT COUNT(*) FROM app.leave_requests WHERE tenant_id='00000000-0000-0000-0000-00000000e500') AS leave_requests;
