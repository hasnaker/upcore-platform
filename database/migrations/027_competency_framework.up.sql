-- =============================================================================
-- 027_competency_framework.up.sql
-- Performans modülü için kompetans kataloğu.
-- Global (tenant_id NULL) kayıtlar seed edilir; tenant kendi customization için
-- aynı code ile override yazabilir.
-- =============================================================================

SET search_path TO app, public;

CREATE TABLE IF NOT EXISTS app.competencies (
    id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id     UUID        REFERENCES app.tenants(id) ON DELETE CASCADE, -- NULL = global
    code          TEXT        NOT NULL,
    name_tr       TEXT        NOT NULL,
    name_en       TEXT,
    description_tr TEXT,
    category      TEXT        NOT NULL
                              CHECK (category IN ('leadership','execution','teamwork','technical','behavioral','business')),
    applies_to    TEXT[]      NOT NULL DEFAULT ARRAY['all']::TEXT[],  -- 'all' | 'manager' | 'ic' | 'executive'
    anchors       JSONB       NOT NULL DEFAULT '{}'::jsonb, -- 1-5 ratings için davranış ankorları
    is_active     BOOLEAN     NOT NULL DEFAULT TRUE,
    created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (tenant_id, code)
);

CREATE INDEX IF NOT EXISTS idx_competencies_tenant ON app.competencies (tenant_id);
CREATE INDEX IF NOT EXISTS idx_competencies_category ON app.competencies (category) WHERE is_active = TRUE;

ALTER TABLE app.competencies ENABLE ROW LEVEL SECURITY;
-- Tenant override kayıtlarını yalnızca ait olduğu tenant görsün; global kayıtlar herkese görünür.
CREATE POLICY competencies_visibility ON app.competencies
    USING (tenant_id IS NULL OR tenant_id::text = current_setting('app.tenant_id', true))
    WITH CHECK (tenant_id IS NOT NULL AND tenant_id::text = current_setting('app.tenant_id', true));

DROP TRIGGER IF EXISTS trg_competencies_updated_at ON app.competencies;
CREATE TRIGGER trg_competencies_updated_at
    BEFORE UPDATE ON app.competencies
    FOR EACH ROW EXECUTE FUNCTION touch_updated_at();

-- ───────────────────────────────────────────────────────────────────────────
-- Seed: 16 core kompetans (Türkiye HR pratiği + Workday/SAP Benchmark)
-- ───────────────────────────────────────────────────────────────────────────
INSERT INTO app.competencies (tenant_id, code, name_tr, name_en, description_tr, category, applies_to, anchors) VALUES
    (NULL, 'iletisim', 'İletişim', 'Communication',
     'Yazılı ve sözlü iletişimde netlik, empati ve aktif dinleme.',
     'behavioral', ARRAY['all'],
     '{"1":"Bilgiyi eksik veya kafa karıştırıcı aktarır","3":"Düzenli ve anlaşılır şekilde iletişim kurar","5":"Farklı paydaşlara uyarlanmış, etkili iletişim kurar"}'::jsonb),
    (NULL, 'takim_calismasi', 'Takım Çalışması', 'Teamwork',
     'Farklı disiplinlerden takımlarla uyumlu çalışma, ortak başarıya katkı.',
     'teamwork', ARRAY['all'],
     '{"1":"Takım hedefleri yerine bireysel çalışır","3":"Takım içinde güvenilir katkı sağlar","5":"Takım dinamiklerini iyileştirir, başkalarını güçlendirir"}'::jsonb),
    (NULL, 'problem_cozme', 'Problem Çözme', 'Problem Solving',
     'Karmaşık sorunları analiz eder, yapılandırır ve uygulanabilir çözümler üretir.',
     'execution', ARRAY['all'],
     '{"1":"Basit problemlerde bile rehberlik gerektirir","3":"Standart problemleri bağımsız çözer","5":"Belirsiz, stratejik problemlere yapılandırılmış yaklaşım geliştirir"}'::jsonb),
    (NULL, 'sonuc_odaklilik', 'Sonuç Odaklılık', 'Results Orientation',
     'Taahhüt ettiği hedefleri izlenebilir sonuçlara dönüştürür.',
     'execution', ARRAY['all'],
     '{"1":"Sık sık taahhütlerini kaçırır","3":"Planladığı hedefleri tutarlı şekilde gerçekleştirir","5":"Beklenenin ötesinde sonuç üretir, standartları yükseltir"}'::jsonb),
    (NULL, 'teknik_uzmanlik', 'Teknik Uzmanlık', 'Technical Expertise',
     'Rol gerektiren alanda derin bilgi ve uygulama becerisi.',
     'technical', ARRAY['ic','manager'],
     '{"1":"Temel konularda bile başkalarına bağımlı","3":"Rolünün gerektirdiği derinlikte uzman","5":"Alanında referans kişi, içerik üretir ve başkalarını geliştirir"}'::jsonb),
    (NULL, 'musteri_odaklilik', 'Müşteri Odaklılık', 'Customer Focus',
     'İç ve dış müşterinin ihtiyaçlarını anlar, çözüme dönüştürür.',
     'business', ARRAY['all'],
     '{"1":"Müşteri geri bildirimine duyarsız","3":"Müşteri ihtiyaçlarını dikkate alarak çalışır","5":"Müşteri deneyimini iyileştiren inovasyonlara öncülük eder"}'::jsonb),
    (NULL, 'kararlilik', 'Kararlılık', 'Decisiveness',
     'Yeterli bilgi olduğunda zamanında ve sorumlu karar verir.',
     'behavioral', ARRAY['manager','executive'],
     '{"1":"Karar vermekten kaçınır","3":"Gerekli veriyle makul kararlar alır","5":"Belirsizlik altında hızlı ve sağlam kararlar üretir"}'::jsonb),
    (NULL, 'degisim_yonetimi', 'Değişim Yönetimi', 'Change Management',
     'Değişimi kucaklar, başkalarını değişime hazırlar.',
     'leadership', ARRAY['manager','executive'],
     '{"1":"Değişime direnir","3":"Değişime uyum sağlar","5":"Değişimi planlı biçimde yönetir, örnek olur"}'::jsonb),
    (NULL, 'ekip_gelistirme', 'Ekip Geliştirme', 'Talent Development',
     'Ekip üyelerinin yetkinliklerini geliştirir, yedekleme planlar.',
     'leadership', ARRAY['manager','executive'],
     '{"1":"Ekibinin gelişimini ihmal eder","3":"Düzenli geri bildirim verir","5":"Kariyer planları, koçluk ve mentörlük ile ekibini dönüştürür"}'::jsonb),
    (NULL, 'stratejik_dusunme', 'Stratejik Düşünme', 'Strategic Thinking',
     'Kısa vadeli işleri şirket stratejisiyle ilişkilendirir.',
     'leadership', ARRAY['manager','executive'],
     '{"1":"Yalnızca günlük operasyonla ilgilenir","3":"Takım hedeflerini stratejiyle hizalar","5":"Yeni stratejik fırsatları tanımlar ve iş kurallarını yeniden yazar"}'::jsonb),
    (NULL, 'hesap_verebilirlik', 'Hesap Verebilirlik', 'Accountability',
     'Sonuç sahipliği alır, taahhütlerini sahiplenir.',
     'behavioral', ARRAY['all'],
     '{"1":"Sorumluluktan kaçar","3":"Kendi işinin sonuçlarını sahiplenir","5":"Takım sonuçlarını da sahiplenir, başkalarını sorumlu tutar"}'::jsonb),
    (NULL, 'ogrenme_cevikliigi', 'Öğrenme Çevikliği', 'Learning Agility',
     'Yeni bilgileri hızla özümser, uygular.',
     'behavioral', ARRAY['all'],
     '{"1":"Yeni becerileri benimsemekte zorlanır","3":"Gerektiğinde öğrenir","5":"Sürekli öğrenir ve öğrendiklerini takıma aktarır"}'::jsonb),
    (NULL, 'kvkk_etik', 'KVKK ve Etik', 'KVKK & Ethics',
     'KVKK, gizlilik ve etik kurallara eksiksiz uyum.',
     'behavioral', ARRAY['all'],
     '{"1":"Gizlilik/etik ihlali riskleri yaratır","3":"Kuralları eksiksiz takip eder","5":"Etik kültürün lideri, zorlu durumları yönetir"}'::jsonb),
    (NULL, 'veri_analizi', 'Veri Analizi', 'Data & Analytics',
     'Veriden içgörü çıkarır, kararları kanıta dayandırır.',
     'technical', ARRAY['all'],
     '{"1":"Veri olmadan görüşe dayalı karar verir","3":"Temel analizleri yapar","5":"Veri stratejisine yön verir, gelişmiş analizler üretir"}'::jsonb),
    (NULL, 'inovasyon', 'İnovasyon', 'Innovation',
     'Süreç, ürün ve hizmette yeni fikirler geliştirir.',
     'business', ARRAY['all'],
     '{"1":"Mevcut şekliyle kalmayı tercih eder","3":"Zaman zaman iyileştirme önerir","5":"Yenilikçi çözümler tasarlar ve hayata geçirir"}'::jsonb),
    (NULL, 'is_guvenligi', 'İş Sağlığı ve Güvenliği', 'OHS',
     '6331 İSG Kanunu uyumu, tehlike tespiti ve güvenli çalışma.',
     'behavioral', ARRAY['all'],
     '{"1":"İSG kurallarına duyarsız","3":"Kuralları eksiksiz uygular","5":"İSG kültürünü yerleştirir, iyileştirme önerir"}'::jsonb)
ON CONFLICT (tenant_id, code) DO NOTHING;

COMMENT ON TABLE app.competencies IS
    'Performans + 360 değerlendirme için kompetans kataloğu. Global (tenant_id NULL) baseline + tenant-specific override destekler.';
