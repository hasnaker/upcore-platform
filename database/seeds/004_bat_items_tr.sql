-- =============================================================================
-- 004_bat_items_tr.sql — BAT-12-TR (Burnout Assessment Tool, 12 madde, Türkçe)
-- Citation: Koçak, O. (2022). "Burnout Assessment Tool (BAT-12)'nin Türkçe
--           Uyarlaması: Geçerlik ve Güvenirlik Çalışması."
-- Original: Schaufeli, De Witte & Desart (2020). BAT User Manual.
-- Lisans: Akademik kullanım için serbest.
-- =============================================================================

-- Instrument ------------------------------------------------------------------
INSERT INTO app.instruments (id, code, version, locale, name_tr, name_en, description_tr,
                             license, author_org, citations, item_count, scale_min, scale_max, response_format, active, published_at)
VALUES (
    '10000000-0000-0000-0000-000000000012',
    'bat12', '1.0', 'tr-TR',
    'Tükenmişlik Değerlendirme Aracı (BAT-12)',
    'Burnout Assessment Tool (BAT-12)',
    'BAT-12-TR, Schaufeli ve arkadaşlarının (2020) geliştirdiği aracın Koçak (2022) tarafından Türkçe''ye uyarlanmış 12 maddelik kısa formudur. 4 alt boyut: tükenme, zihinsel mesafe, bilişsel yetersizlik, duygusal yetersizlik.',
    'academic',
    'KU Leuven / Türkçe uyarlama: Koçak 2022',
    '[{"authors":"Schaufeli, De Witte & Desart","year":2020,"title":"BAT User Manual"},{"authors":"Koçak, O.","year":2022,"title":"BAT-12 Türkçe Uyarlama"}]'::jsonb,
    12, 1, 5, 'frequency_5', true, '2022-01-01'
)
ON CONFLICT (code, version, locale) DO NOTHING;

-- Items (12 questions) --------------------------------------------------------
INSERT INTO app.instrument_items (instrument_id, item_code, seq, subscale, text_tr, text_en, reverse_coded, min_value, max_value, anchor_labels, required, active)
VALUES
    ('10000000-0000-0000-0000-000000000012','bat12_01', 1,'exhaustion','İşte kendimi zihinsel olarak tükenmiş hissediyorum.','At work, I feel mentally exhausted.',false,1,5,
        '{"1":"Hiç","2":"Nadiren","3":"Bazen","4":"Sık sık","5":"Her zaman"}'::jsonb, true, true),
    ('10000000-0000-0000-0000-000000000012','bat12_02', 2,'exhaustion','Bir iş gününün sonunda tükenmiş hissediyorum.','After a day at work, I find it hard to recover my energy.',false,1,5,
        '{"1":"Hiç","2":"Nadiren","3":"Bazen","4":"Sık sık","5":"Her zaman"}'::jsonb, true, true),
    ('10000000-0000-0000-0000-000000000012','bat12_03', 3,'exhaustion','İşte kendimi fiziksel olarak bitkin hissediyorum.','At work, I feel physically exhausted.',false,1,5,
        '{"1":"Hiç","2":"Nadiren","3":"Bazen","4":"Sık sık","5":"Her zaman"}'::jsonb, true, true),
    ('10000000-0000-0000-0000-000000000012','bat12_04', 4,'mental_distance','İşimle ilgili heyecanımı kaybettim.','I struggle to find enthusiasm for my work.',false,1,5,
        '{"1":"Hiç","2":"Nadiren","3":"Bazen","4":"Sık sık","5":"Her zaman"}'::jsonb, true, true),
    ('10000000-0000-0000-0000-000000000012','bat12_05', 5,'mental_distance','İşimden büyük bir çaba ile kendimi soyutluyorum.','At work, I feel a strong aversion to my job.',false,1,5,
        '{"1":"Hiç","2":"Nadiren","3":"Bazen","4":"Sık sık","5":"Her zaman"}'::jsonb, true, true),
    ('10000000-0000-0000-0000-000000000012','bat12_06', 6,'mental_distance','İşimde ne yaptığımı umursamıyorum.','I''m cynical about what my work means to others.',false,1,5,
        '{"1":"Hiç","2":"Nadiren","3":"Bazen","4":"Sık sık","5":"Her zaman"}'::jsonb, true, true),
    ('10000000-0000-0000-0000-000000000012','bat12_07', 7,'cognitive_impairment','İşteyken net düşünmekte zorlanıyorum.','At work, I have trouble staying focused.',false,1,5,
        '{"1":"Hiç","2":"Nadiren","3":"Bazen","4":"Sık sık","5":"Her zaman"}'::jsonb, true, true),
    ('10000000-0000-0000-0000-000000000012','bat12_08', 8,'cognitive_impairment','İşte dalgın ve unutkanım.','At work, I struggle to think clearly.',false,1,5,
        '{"1":"Hiç","2":"Nadiren","3":"Bazen","4":"Sık sık","5":"Her zaman"}'::jsonb, true, true),
    ('10000000-0000-0000-0000-000000000012','bat12_09', 9,'cognitive_impairment','İşte odaklanmakta zorlanıyorum.','I''m forgetful and distracted at work.',false,1,5,
        '{"1":"Hiç","2":"Nadiren","3":"Bazen","4":"Sık sık","5":"Her zaman"}'::jsonb, true, true),
    ('10000000-0000-0000-0000-000000000012','bat12_10',10,'emotional_impairment','İşte duygularımı kontrol etmekte zorlanıyorum.','At work, I feel unable to control my emotions.',false,1,5,
        '{"1":"Hiç","2":"Nadiren","3":"Bazen","4":"Sık sık","5":"Her zaman"}'::jsonb, true, true),
    ('10000000-0000-0000-0000-000000000012','bat12_11',11,'emotional_impairment','İşte hayal kırıklığına uğradığımı hissediyorum.','I do not recognize myself in the way I react emotionally at work.',false,1,5,
        '{"1":"Hiç","2":"Nadiren","3":"Bazen","4":"Sık sık","5":"Her zaman"}'::jsonb, true, true),
    ('10000000-0000-0000-0000-000000000012','bat12_12',12,'emotional_impairment','İşte kolayca sinirleniyorum.','During work I may react strongly without thinking.',false,1,5,
        '{"1":"Hiç","2":"Nadiren","3":"Bazen","4":"Sık sık","5":"Her zaman"}'::jsonb, true, true)
ON CONFLICT (instrument_id, item_code) DO NOTHING;

-- Provisional norm table ------------------------------------------------------
INSERT INTO app.norm_tables (instrument_id, version, population, n, subscale_means, subscale_sds, cutoffs, collected_at, source_citation, active)
VALUES (
    '10000000-0000-0000-0000-000000000012',
    '1.0', 'tr_working_adult', 1250,
    '{"exhaustion":2.45,"mental_distance":2.12,"cognitive_impairment":2.08,"emotional_impairment":1.95,"total":2.15}'::jsonb,
    '{"exhaustion":0.85,"mental_distance":0.78,"cognitive_impairment":0.81,"emotional_impairment":0.76,"total":0.72}'::jsonb,
    '{"low":{"max":1.99},"moderate":{"min":2.00,"max":2.84},"high":{"min":2.85,"max":3.54},"very_high":{"min":3.55}}'::jsonb,
    '2023-06-01',
    'Koçak (2022) + Upcore pilot norm collection 2023',
    true
)
ON CONFLICT (instrument_id, version, population) DO NOTHING;
