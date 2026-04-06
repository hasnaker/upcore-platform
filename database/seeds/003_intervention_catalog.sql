-- =============================================================================
-- 003_intervention_catalog.sql — 20 base interventions (global, tenant_id=NULL)
-- Evidence tiers: A (RCT-backed), B (quasi-experimental), C (field-tested)
-- =============================================================================

INSERT INTO app.interventions
    (tenant_id, code, title_tr, title_en, description_tr, description_en, category,
     evidence_tier, target_drivers, target_burnout_band, delivery_mode,
     expected_effect_size, time_to_effect_weeks, duration_weeks, cost_tier, citations, active)
VALUES
    (NULL, 'coaching_1on1', 'Bireysel Koçluk (1:1)', 'Individual Coaching (1:1)',
     'Sertifikalı bir koç ile haftalık 60 dk 1:1 oturumlar. Stres, önceliklendirme ve iş yükü yönetimine odaklanır.',
     'Weekly 60-min sessions with a certified coach focusing on stress, prioritization and workload management.',
     'coaching', 'A', ARRAY['workload','emotional_demands','role_conflict'], ARRAY['moderate','high'], '1on1',
     0.45, 4, 8, 'high', '["Grant 2003 - Meta-analysis of coaching"]'::jsonb, true),

    (NULL, 'workload_rebalance', 'İş Yükü Dengesi Görüşmesi', 'Workload Rebalancing Session',
     'Yönetici ile 30 dk: öncelikler, kapasite ve kritik olmayan görevlerin ötelenmesi.',
     '30-min session with manager: priorities, capacity, deferring non-critical tasks.',
     'workload', 'A', ARRAY['workload','time_pressure'], ARRAY['moderate','high','very_high'], '1on1',
     0.38, 2, 1, 'low', '["Demerouti 2001 - JD-R Model"]'::jsonb, true),

    (NULL, 'flex_schedule', 'Esnek Çalışma Saatleri', 'Flexible Work Schedule',
     '4 hafta boyunca esnek başlangıç/bitiş saatleri ve uzaktan çalışma imkânı.',
     'Flexible start/end times and remote work for 4 weeks.',
     'flexibility', 'B', ARRAY['work_life_balance','autonomy'], ARRAY['low','moderate','high'], 'policy_change',
     0.30, 3, 4, 'low', '["Allen 2013 - Work-family flexibility"]'::jsonb, true),

    (NULL, 'mindfulness_mbsr', 'Bilinçli Farkındalık (MBSR-TR)', 'Mindfulness-Based Stress Reduction',
     '8 haftalık grup MBSR programı (haftada 2 saat, günlük 20 dk pratik).',
     '8-week MBSR group program (2hr/week, 20min/day practice).',
     'wellbeing', 'A', ARRAY['emotional_exhaustion','emotional_demands'], ARRAY['moderate','high'], 'group',
     0.52, 8, 8, 'medium', '["Kabat-Zinn 1990","Khoury 2015 - meta-analysis"]'::jsonb, true),

    (NULL, 'peer_support', 'Meslektaş Destek Grubu', 'Peer Support Group',
     'Ayda 2 kez 60 dk peer support group; deneyim paylaşımı ve karşılıklı destek.',
     '60-min bi-weekly peer support group for experience sharing and mutual support.',
     'social_support', 'B', ARRAY['social_support','emotional_demands'], ARRAY['moderate','high'], 'group',
     0.33, 4, 12, 'low', '["Peterson 2008 - peer support at work"]'::jsonb, true),

    (NULL, 'recognition_program', 'Takdir & Ödüllendirme Programı', 'Recognition & Rewards Program',
     'Aylık peer-nominated takdir; kamuya açık teşekkür; somut ödüller.',
     'Monthly peer-nominated recognition; public thank-yous; tangible rewards.',
     'recognition', 'B', ARRAY['recognition','reward'], ARRAY['low','moderate'], 'policy_change',
     0.28, 4, 24, 'medium', '["Brun & Dugas 2008 - workplace recognition"]'::jsonb, true),

    (NULL, 'skill_dev_plan', 'Bireysel Gelişim Planı', 'Individual Development Plan',
     'Yönetici ile birlikte 3 aylık gelişim hedefleri, öğrenme bütçesi.',
     'Quarterly development goals with manager plus learning budget.',
     'skill_dev', 'B', ARRAY['development','growth'], ARRAY['low','moderate'], '1on1',
     0.25, 6, 12, 'medium', '["Manuti 2015 - workplace learning"]'::jsonb, true),

    (NULL, 'manager_training', 'Yönetici Eğitimi: Psikolojik Güvenlik', 'Manager Training: Psychological Safety',
     'Yöneticiler için 2 günlük eğitim: empatik dinleme, geri bildirim, psikolojik güvenlik.',
     '2-day training for managers: empathetic listening, feedback, psychological safety.',
     'leadership', 'A', ARRAY['supervisor_support','psychological_safety'], ARRAY['low','moderate','high'], 'workshop',
     0.41, 4, 2, 'medium', '["Edmondson 1999","Kelloway 2013 - leadership training"]'::jsonb, true),

    (NULL, 'role_clarity_ws', 'Rol Netliği Çalıştayı', 'Role Clarity Workshop',
     'Takım bazlı 3 saat: RACI matrisi, görev-yetki-sorumluluk netleştirme.',
     'Team-based 3hr: RACI matrix, clarify tasks/authority/responsibility.',
     'role_design', 'B', ARRAY['role_ambiguity','role_conflict'], ARRAY['moderate','high'], 'workshop',
     0.35, 2, 1, 'low', '["Tubre & Collins 2000 - role conflict"]'::jsonb, true),

    (NULL, 'sleep_hygiene', 'Uyku Hijyeni Programı', 'Sleep Hygiene Program',
     '6 haftalık self-service uyku hijyeni programı + giyilebilir cihaz takibi.',
     '6-week self-service sleep hygiene program + wearable tracking.',
     'wellbeing', 'B', ARRAY['exhaustion','recovery'], ARRAY['moderate','high'], 'self_service',
     0.37, 6, 6, 'low', '["Irish 2015 - sleep hygiene review"]'::jsonb, true),

    (NULL, 'meeting_reduction', 'Toplantı Diyeti', 'Meeting Reduction Initiative',
     'Haftada 1 gün "toplantısız gün", max 45 dk/toplantı, ajanda zorunluluğu.',
     'One meeting-free day/week, max 45min per meeting, agenda required.',
     'workload', 'B', ARRAY['time_pressure','workload'], ARRAY['low','moderate','high'], 'policy_change',
     0.29, 2, 8, 'low', '["Rogelberg 2019 - surviving meetings"]'::jsonb, true),

    (NULL, 'autonomy_boost', 'Otonomi Artırma Projesi', 'Autonomy Enhancement Project',
     'Karar verme sınırları genişletilir, micro-management azaltılır.',
     'Expand decision-making boundaries, reduce micro-management.',
     'role_design', 'B', ARRAY['autonomy','decision_latitude'], ARRAY['low','moderate','high'], 'policy_change',
     0.36, 4, 12, 'low', '["Karasek 1990 - Job Demand-Control"]'::jsonb, true),

    (NULL, 'ergonomic_setup', 'Ergonomik Çalışma Ortamı', 'Ergonomic Workspace Setup',
     'Masa/sandalye/ekran değerlendirme, gerekirse yeni ekipman tedariki.',
     'Desk/chair/screen evaluation with new equipment if needed.',
     'environment', 'C', ARRAY['physical_demands'], ARRAY['low','moderate'], 'tool',
     0.20, 2, 1, 'medium', '["Robertson 2009 - office ergonomics"]'::jsonb, true),

    (NULL, 'psych_first_aid', 'Psikolojik İlk Yardım Desteği', 'Psychological First Aid',
     'EAP hattı ile 5 seanslık kısa süreli psikolojik destek.',
     'EAP line-based short-term psychological support (5 sessions).',
     'wellbeing', 'A', ARRAY['emotional_exhaustion','mental_health'], ARRAY['high','very_high'], '1on1',
     0.48, 2, 5, 'medium', '["Vogel 2016 - EAP effectiveness"]'::jsonb, true),

    (NULL, 'micro_breaks', 'Mikro Mola Alışkanlığı', 'Micro-Break Habit',
     'Her 90 dk 5 dk mola; mola hatırlatıcı uygulama entegrasyonu.',
     '5-min break every 90 min; break-reminder app integration.',
     'wellbeing', 'C', ARRAY['exhaustion','cognitive_impairment'], ARRAY['low','moderate'], 'self_service',
     0.18, 2, 4, 'low', '["Kim 2017 - micro-breaks study"]'::jsonb, true),

    (NULL, 'career_conversation', 'Kariyer Sohbeti', 'Career Conversation',
     'Üst yönetici ile 60 dk kariyer planlama ve gelişim sohbeti.',
     '60-min career planning and development conversation with senior manager.',
     'skill_dev', 'B', ARRAY['growth','development'], ARRAY['low','moderate'], '1on1',
     0.27, 4, 1, 'low', '["Seibert 2001 - career proactivity"]'::jsonb, true),

    (NULL, 'team_building', 'Takım Bağı Etkinliği', 'Team Bonding Activity',
     'Çeyrekte bir yarım günlük takım aktivitesi (offsite veya workshop).',
     'Quarterly half-day team activity (offsite or workshop).',
     'social_support', 'C', ARRAY['social_support','team_cohesion'], ARRAY['low','moderate'], 'group',
     0.22, 2, 1, 'medium', '["Klein 2009 - team building meta-analysis"]'::jsonb, true),

    (NULL, 'gratitude_practice', 'Şükran Günlüğü', 'Gratitude Journaling',
     '4 haftalık günlük şükran yazma pratiği (self-service modül).',
     '4-week daily gratitude journaling (self-service module).',
     'wellbeing', 'B', ARRAY['positive_affect','wellbeing'], ARRAY['low','moderate'], 'self_service',
     0.24, 2, 4, 'low', '["Emmons 2003 - counting blessings"]'::jsonb, true),

    (NULL, 'delegation_coaching', 'Delegasyon Koçluğu', 'Delegation Coaching',
     'Yöneticiler için 4 seanslık delegasyon becerisi geliştirme.',
     '4-session delegation skill development for managers.',
     'leadership', 'B', ARRAY['workload','delegation'], ARRAY['moderate','high'], '1on1',
     0.31, 4, 4, 'medium', '["Yukl 2013 - leadership delegation"]'::jsonb, true),

    (NULL, 'deep_work_block', 'Derin Çalışma Blokları', 'Deep Work Blocks',
     'Günde 2 saat kesintisiz "derin çalışma" takvim bloğu (DND modu).',
     '2hr uninterrupted deep-work calendar block per day (DND mode).',
     'workload', 'C', ARRAY['time_pressure','focus'], ARRAY['low','moderate','high'], 'self_service',
     0.26, 2, 8, 'low', '["Newport 2016 - Deep Work"]'::jsonb, true)
ON CONFLICT (tenant_id, code) DO NOTHING;
