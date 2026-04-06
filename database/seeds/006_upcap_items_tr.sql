-- =============================================================================
-- 006_upcap_items_tr.sql — UpCap-TR (12 madde, CPC-12 temelli)
-- Başvuru: Maddux (2016) - Compound PsyCap Scale (CPC-12).
-- Turkish adaptation: Upcore internal adaptation based on CPC-12 (Maddux 2016).
-- Lisans: CC-BY 4.0 (original CPC-12 is public academic).
-- Ölçek: Öz-yeterlik, umut, iyimserlik ve psikolojik dayanıklılık alt boyutları.
-- =============================================================================

INSERT INTO app.instruments (id, code, version, locale, name_tr, name_en, description_tr,
                             license, author_org, citations, item_count, scale_min, scale_max, response_format, active, published_at)
VALUES (
    '30000000-0000-0000-0000-000000000012',
    'upcap', '1.0', 'tr-TR',
    'UpCap-TR (Psikolojik Kapasite Ölçeği)',
    'UpCap Psychological Capacity Scale',
    'UpCap-TR, Maddux (2016) tarafından geliştirilen CPC-12 (Compound PsyCap Scale) temel alınarak Türkçe''ye uyarlanmış 12 maddelik psikolojik sermaye ölçeğidir. 4 alt boyut: öz-yeterlik (self-efficacy), umut (hope), iyimserlik (optimism), dayanıklılık (resilience).',
    'CC-BY-4.0',
    'Upcore Research Team (based on Maddux 2016 CPC-12)',
    '[{"authors":"Maddux","year":2016,"title":"Self-Efficacy and PsyCap: CPC-12 Scale"},{"authors":"Luthans, Youssef, Avolio","year":2007,"title":"Psychological Capital"}]'::jsonb,
    12, 1, 6, 'likert_6', true, '2024-01-01'
)
ON CONFLICT (code, version, locale) DO NOTHING;

INSERT INTO app.instrument_items (instrument_id, item_code, seq, subscale, text_tr, text_en, reverse_coded, min_value, max_value, anchor_labels, required, active)
VALUES
    ('30000000-0000-0000-0000-000000000012','upcap_01', 1,'self_efficacy','Uzun vadeli sorunlara çözüm bulma konusunda kendime güvenirim.','I feel confident finding solutions to long-term problems.',false,1,6,
        '{"1":"Kesinlikle katılmıyorum","2":"Katılmıyorum","3":"Biraz katılmıyorum","4":"Biraz katılıyorum","5":"Katılıyorum","6":"Kesinlikle katılıyorum"}'::jsonb, true, true),
    ('30000000-0000-0000-0000-000000000012','upcap_02', 2,'self_efficacy','Bir iş problemini tartışırken kendi fikrimi güvenle sunabilirim.','I feel confident presenting my opinion when discussing work issues.',false,1,6,
        '{"1":"Kesinlikle katılmıyorum","2":"Katılmıyorum","3":"Biraz katılmıyorum","4":"Biraz katılıyorum","5":"Katılıyorum","6":"Kesinlikle katılıyorum"}'::jsonb, true, true),
    ('30000000-0000-0000-0000-000000000012','upcap_03', 3,'self_efficacy','Yeni görevler üstlenme konusunda kendime güvenirim.','I feel confident taking on new tasks.',false,1,6,
        '{"1":"Kesinlikle katılmıyorum","2":"Katılmıyorum","3":"Biraz katılmıyorum","4":"Biraz katılıyorum","5":"Katılıyorum","6":"Kesinlikle katılıyorum"}'::jsonb, true, true),
    ('30000000-0000-0000-0000-000000000012','upcap_04', 4,'hope','Şu an iş hedeflerime ulaşma yolunda çok hevesliyim.','Right now I see myself as being pretty successful at work.',false,1,6,
        '{"1":"Kesinlikle katılmıyorum","2":"Katılmıyorum","3":"Biraz katılmıyorum","4":"Biraz katılıyorum","5":"Katılıyorum","6":"Kesinlikle katılıyorum"}'::jsonb, true, true),
    ('30000000-0000-0000-0000-000000000012','upcap_05', 5,'hope','İş hedeflerime ulaşmak için birçok yol düşünebilirim.','I can think of many ways to reach my current work goals.',false,1,6,
        '{"1":"Kesinlikle katılmıyorum","2":"Katılmıyorum","3":"Biraz katılmıyorum","4":"Biraz katılıyorum","5":"Katılıyorum","6":"Kesinlikle katılıyorum"}'::jsonb, true, true),
    ('30000000-0000-0000-0000-000000000012','upcap_06', 6,'hope','İşte karşılaştığım zorluklarda enerjik hissediyorum.','At this time, I am meeting the work goals I set for myself.',false,1,6,
        '{"1":"Kesinlikle katılmıyorum","2":"Katılmıyorum","3":"Biraz katılmıyorum","4":"Biraz katılıyorum","5":"Katılıyorum","6":"Kesinlikle katılıyorum"}'::jsonb, true, true),
    ('30000000-0000-0000-0000-000000000012','upcap_07', 7,'optimism','İşimle ilgili olarak belirsiz durumlarda iyi sonucu beklerim.','When things are uncertain at work, I usually expect the best.',false,1,6,
        '{"1":"Kesinlikle katılmıyorum","2":"Katılmıyorum","3":"Biraz katılmıyorum","4":"Biraz katılıyorum","5":"Katılıyorum","6":"Kesinlikle katılıyorum"}'::jsonb, true, true),
    ('30000000-0000-0000-0000-000000000012','upcap_08', 8,'optimism','Gelecekte işimin daha iyi olacağına inanıyorum.','I''m optimistic about what will happen to me in the future as it pertains to work.',false,1,6,
        '{"1":"Kesinlikle katılmıyorum","2":"Katılmıyorum","3":"Biraz katılmıyorum","4":"Biraz katılıyorum","5":"Katılıyorum","6":"Kesinlikle katılıyorum"}'::jsonb, true, true),
    ('30000000-0000-0000-0000-000000000012','upcap_09', 9,'optimism','İşimde olayların iyi yönde ilerleyeceğine inanırım.','In this job, things never work out the way I want them to.',true,1,6,
        '{"1":"Kesinlikle katılmıyorum","2":"Katılmıyorum","3":"Biraz katılmıyorum","4":"Biraz katılıyorum","5":"Katılıyorum","6":"Kesinlikle katılıyorum"}'::jsonb, true, true),
    ('30000000-0000-0000-0000-000000000012','upcap_10',10,'resilience','İşimdeki zorluklardan genellikle çabuk toparlanırım.','I usually take stressful things at work in stride.',false,1,6,
        '{"1":"Kesinlikle katılmıyorum","2":"Katılmıyorum","3":"Biraz katılmıyorum","4":"Biraz katılıyorum","5":"Katılıyorum","6":"Kesinlikle katılıyorum"}'::jsonb, true, true),
    ('30000000-0000-0000-0000-000000000012','upcap_11',11,'resilience','Gerektiğinde işte kendi başımın çaresine bakabilirim.','I can get through difficult times at work because I''ve experienced difficulty before.',false,1,6,
        '{"1":"Kesinlikle katılmıyorum","2":"Katılmıyorum","3":"Biraz katılmıyorum","4":"Biraz katılıyorum","5":"Katılıyorum","6":"Kesinlikle katılıyorum"}'::jsonb, true, true),
    ('30000000-0000-0000-0000-000000000012','upcap_12',12,'resilience','Engellerin üstesinden geldikçe güçlendiğimi hissederim.','I feel I can handle many things at a time at this job.',false,1,6,
        '{"1":"Kesinlikle katılmıyorum","2":"Katılmıyorum","3":"Biraz katılmıyorum","4":"Biraz katılıyorum","5":"Katılıyorum","6":"Kesinlikle katılıyorum"}'::jsonb, true, true)
ON CONFLICT (instrument_id, item_code) DO NOTHING;

INSERT INTO app.norm_tables (instrument_id, version, population, n, subscale_means, subscale_sds, cutoffs, collected_at, source_citation, active)
VALUES (
    '30000000-0000-0000-0000-000000000012',
    '1.0', 'tr_working_adult', 820,
    '{"self_efficacy":4.52,"hope":4.38,"optimism":4.21,"resilience":4.45,"total":4.39}'::jsonb,
    '{"self_efficacy":0.92,"hope":0.88,"optimism":1.01,"resilience":0.95,"total":0.78}'::jsonb,
    '{"low":{"max":3.49},"moderate":{"min":3.50,"max":4.49},"high":{"min":4.50,"max":5.49},"very_high":{"min":5.50}}'::jsonb,
    '2024-02-01',
    'Upcore internal norm study 2024 (n=820), based on Maddux CPC-12',
    true
)
ON CONFLICT (instrument_id, version, population) DO NOTHING;
