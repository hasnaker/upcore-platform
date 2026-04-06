-- =============================================================================
-- 007_turkish_leave_types.sql — 4857 sayılı İş Kanunu izin türleri
-- Global (tenant_id = NULL) → tüm tenantlar görebilir.
-- Yasal dayanak: 4857 sayılı İş Kanunu (https://www.mevzuat.gov.tr/)
-- =============================================================================

INSERT INTO app.leave_types
    (tenant_id, code, name_tr, name_en, description_tr, category, is_paid,
     requires_document, accrual_method, max_days_per_year, max_days_per_event,
     carry_over_allowed, carry_over_max_days, min_tenure_months, legal_reference, active)
VALUES
    -- YILLIK ÜCRETLİ İZİN (4857/53) --------------------------------------------
    (NULL, 'yillik_izin_1_5_yil', 'Yıllık Ücretli İzin (1-5 yıl kıdem)', 'Annual Paid Leave (1-5 yr)',
     '1 yıldan fazla 5 yıldan az (5 dahil) hizmeti olanlara 14 iş günü.',
     'yıllık', true, false, 'kıdeme_bağlı', 14, NULL, true, 14, 12, '4857/53', true),

    (NULL, 'yillik_izin_5_15_yil', 'Yıllık Ücretli İzin (5-15 yıl kıdem)', 'Annual Paid Leave (5-15 yr)',
     '5 yıldan fazla 15 yıldan az hizmeti olanlara 20 iş günü.',
     'yıllık', true, false, 'kıdeme_bağlı', 20, NULL, true, 20, 60, '4857/53', true),

    (NULL, 'yillik_izin_15_plus_yil', 'Yıllık Ücretli İzin (15+ yıl kıdem)', 'Annual Paid Leave (15+ yr)',
     '15 yıl ve daha fazla hizmeti olanlara 26 iş günü.',
     'yıllık', true, false, 'kıdeme_bağlı', 26, NULL, true, 26, 180, '4857/53', true),

    -- EVLENME İZNİ (4857/mazeret izinleri ek 2) --------------------------------
    (NULL, 'evlilik_izni', 'Evlilik İzni', 'Marriage Leave',
     'İşçiye evlenmesi halinde 3 gün ücretli mazeret izni verilir.',
     'evlilik', true, true, 'olay_bazlı', 3, 3, false, 0, 0, '4857 Ek-2', true),

    -- ÖLÜM İZNİ (4857/mazeret izinleri ek 2) -----------------------------------
    (NULL, 'olum_izni', 'Ölüm İzni (Birinci Derece Yakın)', 'Bereavement Leave',
     'Ana, baba, eş, kardeş veya çocuğun ölümü halinde 3 gün ücretli izin.',
     'ölüm', true, true, 'olay_bazlı', NULL, 3, false, 0, 0, '4857 Ek-2', true),

    -- DOĞUM İZNİ (4857/74) -----------------------------------------------------
    (NULL, 'dogum_izni_kadin', 'Doğum İzni (Analık)', 'Maternity Leave',
     'Kadın işçilere doğumdan önce 8 hafta, doğumdan sonra 8 hafta olmak üzere toplam 16 hafta izin.',
     'doğum', true, true, 'olay_bazlı', NULL, 112, false, 0, 0, '4857/74', true),

    -- BABALIK İZNİ (4857 Ek-2) -------------------------------------------------
    (NULL, 'babalik_izni', 'Babalık İzni', 'Paternity Leave',
     'İşçiye eşinin doğum yapması halinde 5 gün ücretli mazeret izni.',
     'babalık', true, true, 'olay_bazlı', 5, 5, false, 0, 0, '4857 Ek-2', true),

    -- SÜT İZNİ (4857/74 son fıkra) ---------------------------------------------
    (NULL, 'sut_izni', 'Süt İzni', 'Nursing Leave',
     'Kadın işçilere doğumdan sonra 1 yıl süreyle günde 1,5 saat süt izni.',
     'süt', true, false, 'olay_bazlı', NULL, NULL, false, 0, 0, '4857/74', true),

    -- EVLAT EDİNME İZNİ (4857 Ek-2) --------------------------------------------
    (NULL, 'evlat_edinme_izni', 'Evlat Edinme İzni', 'Adoption Leave',
     '3 yaşını doldurmamış çocuğu evlat edinen eşlerden birine 8 hafta ücretli izin.',
     'doğum', true, true, 'olay_bazlı', NULL, 56, false, 0, 0, '4857 Ek-2', true),

    -- HASTALIK / İSTİRAHAT -----------------------------------------------------
    (NULL, 'hastalik_izni', 'Hastalık İzni (Rapor)', 'Sick Leave',
     'Doktor raporuna istinaden alınan hastalık izni; SGK tarafından ödenir.',
     'hastalık', true, true, 'olay_bazlı', NULL, NULL, false, 0, 0, 'SGK 5510', true),

    -- MAZERET İZNİ (genel) -----------------------------------------------------
    (NULL, 'mazeret_izni', 'Mazeret İzni (Genel)', 'Personal Leave',
     'Özel durumlar için yönetici onayına bağlı ücretli mazeret izni.',
     'mazeret', true, false, 'yıllık_sabit', 3, NULL, false, 0, 0, 'İş Sözleşmesi', true),

    -- ÜCRETSİZ İZİN ------------------------------------------------------------
    (NULL, 'ucretsiz_izin', 'Ücretsiz İzin', 'Unpaid Leave',
     'İşveren onayı ile alınan ücretsiz izin (analık izni sonrası 6 aya kadar vb.).',
     'ücretsiz', false, false, 'olay_bazlı', NULL, 180, false, 0, 0, '4857/74', true),

    -- İDARİ İZİN ---------------------------------------------------------------
    (NULL, 'idari_izin', 'İdari İzin', 'Administrative Leave',
     'İşveren tarafından tanınan idari izin (resmi tatil, özel günler).',
     'idari', true, false, 'olay_bazlı', NULL, NULL, false, 0, 0, 'İşveren İradesi', true),

    -- YENİ İŞ ARAMA İZNİ (4857/27) ---------------------------------------------
    (NULL, 'is_arama_izni', 'Yeni İş Arama İzni', 'Job Search Leave',
     'İhbar süresi içinde işçiye günde 2 saatten az olmamak üzere yeni iş arama izni.',
     'idari', true, false, 'olay_bazlı', NULL, NULL, false, 0, 0, '4857/27', true)
ON CONFLICT (tenant_id, code) DO NOTHING;
