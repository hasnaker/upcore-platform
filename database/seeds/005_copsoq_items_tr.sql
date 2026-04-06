-- =============================================================================
-- 005_copsoq_items_tr.sql — COPSOQ-III-TR (Kopenhag Psikososyal Risk Envanteri)
-- Copenhagen Psychosocial Questionnaire III — Turkish short form (24 items).
-- Original: Burr et al. (2019). Third version of the COPSOQ.
-- Turkish adaptation: TR validation (Karagöl 2021, provisional).
-- =============================================================================

INSERT INTO app.instruments (id, code, version, locale, name_tr, name_en, description_tr,
                             license, author_org, citations, item_count, scale_min, scale_max, response_format, active, published_at)
VALUES (
    '20000000-0000-0000-0000-000000000024',
    'copsoq', '3.0-short-tr', 'tr-TR',
    'Kopenhag Psikososyal Anketi III (Kısa Form)',
    'Copenhagen Psychosocial Questionnaire III (Short Form)',
    'COPSOQ-III-TR kısa formu 24 maddelik psikososyal iş riski tarama aracıdır. Talepler, etki/kontrol, sosyal destek, lider-üye ilişkileri, anlam ve iyi oluş boyutlarını ölçer.',
    'CC-BY-NC-SA-4.0',
    'National Research Centre for the Working Environment (NFA) / TR uyarlama',
    '[{"authors":"Burr, Berthelsen, Moncada et al.","year":2019,"title":"COPSOQ III: a new version"},{"authors":"Karagöl","year":2021,"title":"COPSOQ III Türkçe Geçerlik"}]'::jsonb,
    24, 1, 5, 'frequency_5', true, '2023-01-01'
)
ON CONFLICT (code, version, locale) DO NOTHING;

INSERT INTO app.instrument_items (instrument_id, item_code, seq, subscale, text_tr, text_en, reverse_coded, min_value, max_value, anchor_labels, required, active)
VALUES
    ('20000000-0000-0000-0000-000000000024','cop_01', 1,'quantitative_demands','İşte birikmiş bir iş yükünüz oluyor mu?','Do you have a large work load?',false,1,5,
        '{"1":"Hiç","2":"Nadiren","3":"Bazen","4":"Sık sık","5":"Her zaman"}'::jsonb, true, true),
    ('20000000-0000-0000-0000-000000000024','cop_02', 2,'quantitative_demands','İşinizi bitirmek için hızla çalışmak zorunda kalıyor musunuz?','Do you have to work very fast?',false,1,5,
        '{"1":"Hiç","2":"Nadiren","3":"Bazen","4":"Sık sık","5":"Her zaman"}'::jsonb, true, true),
    ('20000000-0000-0000-0000-000000000024','cop_03', 3,'quantitative_demands','İşinizin dağılımı düzensiz mi, bu yüzden işler birikiyor mu?','Is your work unevenly distributed so it piles up?',false,1,5,
        '{"1":"Hiç","2":"Nadiren","3":"Bazen","4":"Sık sık","5":"Her zaman"}'::jsonb, true, true),
    ('20000000-0000-0000-0000-000000000024','cop_04', 4,'emotional_demands','İşiniz duygusal olarak zorlayıcı mı?','Is your work emotionally demanding?',false,1,5,
        '{"1":"Hiç","2":"Nadiren","3":"Bazen","4":"Sık sık","5":"Her zaman"}'::jsonb, true, true),
    ('20000000-0000-0000-0000-000000000024','cop_05', 5,'emotional_demands','İşiniz duygusal olarak sizi etkiliyor mu?','Does your work put you in emotionally disturbing situations?',false,1,5,
        '{"1":"Hiç","2":"Nadiren","3":"Bazen","4":"Sık sık","5":"Her zaman"}'::jsonb, true, true),
    ('20000000-0000-0000-0000-000000000024','cop_06', 6,'influence','İşinizin nasıl yapılacağı konusunda söz sahibi misiniz?','Do you have a large degree of influence over your work?',true,1,5,
        '{"1":"Hiç","2":"Nadiren","3":"Bazen","4":"Sık sık","5":"Her zaman"}'::jsonb, true, true),
    ('20000000-0000-0000-0000-000000000024','cop_07', 7,'influence','İş temponuzu kendiniz belirleyebiliyor musunuz?','Can you influence the amount of work assigned to you?',true,1,5,
        '{"1":"Hiç","2":"Nadiren","3":"Bazen","4":"Sık sık","5":"Her zaman"}'::jsonb, true, true),
    ('20000000-0000-0000-0000-000000000024','cop_08', 8,'possibilities_development','İşiniz yeni şeyler öğrenme imkânı sunuyor mu?','Do you have the possibility of learning new things through your work?',true,1,5,
        '{"1":"Hiç","2":"Nadiren","3":"Bazen","4":"Sık sık","5":"Her zaman"}'::jsonb, true, true),
    ('20000000-0000-0000-0000-000000000024','cop_09', 9,'possibilities_development','İşiniz sizi kişisel olarak geliştiriyor mu?','Does your work give you the opportunity to develop your skills?',true,1,5,
        '{"1":"Hiç","2":"Nadiren","3":"Bazen","4":"Sık sık","5":"Her zaman"}'::jsonb, true, true),
    ('20000000-0000-0000-0000-000000000024','cop_10',10,'meaning_of_work','Yaptığınız işin anlamlı olduğunu hissediyor musunuz?','Do you feel that the work you do is important?',true,1,5,
        '{"1":"Hiç","2":"Nadiren","3":"Bazen","4":"Sık sık","5":"Her zaman"}'::jsonb, true, true),
    ('20000000-0000-0000-0000-000000000024','cop_11',11,'meaning_of_work','İşinizin anlamlı olduğunu hissediyor musunuz?','Do you feel that your work is meaningful?',true,1,5,
        '{"1":"Hiç","2":"Nadiren","3":"Bazen","4":"Sık sık","5":"Her zaman"}'::jsonb, true, true),
    ('20000000-0000-0000-0000-000000000024','cop_12',12,'predictability','İş yerinizdeki önemli kararlardan önceden haberdar oluyor musunuz?','At your place of work, are you informed well in advance of decisions?',true,1,5,
        '{"1":"Hiç","2":"Nadiren","3":"Bazen","4":"Sık sık","5":"Her zaman"}'::jsonb, true, true),
    ('20000000-0000-0000-0000-000000000024','cop_13',13,'recognition','İşiniz değerlendirilip takdir ediliyor mu?','Is your work recognised and appreciated?',true,1,5,
        '{"1":"Hiç","2":"Nadiren","3":"Bazen","4":"Sık sık","5":"Her zaman"}'::jsonb, true, true),
    ('20000000-0000-0000-0000-000000000024','cop_14',14,'role_clarity','İşinizde ne beklendiğini net olarak biliyor musunuz?','Does your work have clear objectives?',true,1,5,
        '{"1":"Hiç","2":"Nadiren","3":"Bazen","4":"Sık sık","5":"Her zaman"}'::jsonb, true, true),
    ('20000000-0000-0000-0000-000000000024','cop_15',15,'role_conflict','Çelişen talepler arasında kaldığınız oluyor mu?','Do you receive incompatible requests from two or more people?',false,1,5,
        '{"1":"Hiç","2":"Nadiren","3":"Bazen","4":"Sık sık","5":"Her zaman"}'::jsonb, true, true),
    ('20000000-0000-0000-0000-000000000024','cop_16',16,'quality_of_leadership','Yöneticiniz işinizi iyi planlıyor mu?','To what extent would you say that your immediate superior makes sure that the individual member of staff has good development possibilities?',true,1,5,
        '{"1":"Hiç","2":"Nadiren","3":"Bazen","4":"Sık sık","5":"Her zaman"}'::jsonb, true, true),
    ('20000000-0000-0000-0000-000000000024','cop_17',17,'quality_of_leadership','Yöneticiniz iş tatmininizi önemsiyor mu?','To what extent would you say that your immediate superior gives high priority to job satisfaction?',true,1,5,
        '{"1":"Hiç","2":"Nadiren","3":"Bazen","4":"Sık sık","5":"Her zaman"}'::jsonb, true, true),
    ('20000000-0000-0000-0000-000000000024','cop_18',18,'social_support_colleagues','İş arkadaşlarınız gerekirse sizi dinliyor mu?','How often do you get help and support from your colleagues, if needed?',true,1,5,
        '{"1":"Hiç","2":"Nadiren","3":"Bazen","4":"Sık sık","5":"Her zaman"}'::jsonb, true, true),
    ('20000000-0000-0000-0000-000000000024','cop_19',19,'social_support_supervisor','Yöneticinizden gerektiğinde destek alabiliyor musunuz?','How often is your immediate superior willing to listen to your problems at work, if needed?',true,1,5,
        '{"1":"Hiç","2":"Nadiren","3":"Bazen","4":"Sık sık","5":"Her zaman"}'::jsonb, true, true),
    ('20000000-0000-0000-0000-000000000024','cop_20',20,'sense_of_community','İş yerinizde topluluk duygusu var mı?','Is there a good atmosphere between you and your colleagues?',true,1,5,
        '{"1":"Hiç","2":"Nadiren","3":"Bazen","4":"Sık sık","5":"Her zaman"}'::jsonb, true, true),
    ('20000000-0000-0000-0000-000000000024','cop_21',21,'work_family_conflict','İşiniz özel yaşamınıza engel oluyor mu?','Do you feel that your work drains so much energy that it has a negative effect on your private life?',false,1,5,
        '{"1":"Hiç","2":"Nadiren","3":"Bazen","4":"Sık sık","5":"Her zaman"}'::jsonb, true, true),
    ('20000000-0000-0000-0000-000000000024','cop_22',22,'work_family_conflict','İş stresinizi eve taşıyor musunuz?','Do you feel that your work takes so much of your time that it has a negative effect on your private life?',false,1,5,
        '{"1":"Hiç","2":"Nadiren","3":"Bazen","4":"Sık sık","5":"Her zaman"}'::jsonb, true, true),
    ('20000000-0000-0000-0000-000000000024','cop_23',23,'job_insecurity','İşinizi kaybetmekten endişe duyuyor musunuz?','Are you worried about becoming unemployed?',false,1,5,
        '{"1":"Hiç","2":"Nadiren","3":"Bazen","4":"Sık sık","5":"Her zaman"}'::jsonb, true, true),
    ('20000000-0000-0000-0000-000000000024','cop_24',24,'self_rated_health','Genel olarak sağlığınızı nasıl değerlendirirsiniz?','In general, would you say your health is: (1=Poor ... 5=Excellent)',true,1,5,
        '{"1":"Kötü","2":"Vasat","3":"İyi","4":"Çok iyi","5":"Mükemmel"}'::jsonb, true, true)
ON CONFLICT (instrument_id, item_code) DO NOTHING;

INSERT INTO app.norm_tables (instrument_id, version, population, n, subscale_means, subscale_sds, cutoffs, collected_at, source_citation, active)
VALUES (
    '20000000-0000-0000-0000-000000000024',
    '3.0-short-tr', 'tr_working_adult', 980,
    '{"quantitative_demands":3.1,"emotional_demands":2.8,"influence":2.9,"meaning_of_work":3.8,"quality_of_leadership":3.2,"social_support_colleagues":3.6,"work_family_conflict":2.7}'::jsonb,
    '{"quantitative_demands":0.9,"emotional_demands":1.0,"influence":1.1,"meaning_of_work":0.95,"quality_of_leadership":1.05,"social_support_colleagues":0.88,"work_family_conflict":1.12}'::jsonb,
    '{"green":{"max":40},"yellow":{"min":41,"max":60},"red":{"min":61}}'::jsonb,
    '2023-09-01',
    'Karagöl (2021) + Upcore pilot 2023',
    true
)
ON CONFLICT (instrument_id, version, population) DO NOTHING;
