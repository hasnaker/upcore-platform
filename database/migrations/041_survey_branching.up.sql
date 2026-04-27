-- 041_survey_branching.up.sql
-- NOT: app.survey_questions tablosu henüz migration'larda yaratılmamış.
-- Branching + sentiment feature'ı survey_questions yaratıldıktan sonra açılacak.
-- Bu migration geçici olarak no-op; gerçek DDL v2 sürümünde gelir.

DO $$
BEGIN
  IF EXISTS (SELECT FROM information_schema.tables
             WHERE table_schema='app' AND table_name='survey_questions') THEN
    EXECUTE $sql$
      ALTER TABLE app.survey_questions
        ADD COLUMN IF NOT EXISTS branching_rules jsonb NOT NULL DEFAULT '[]'::jsonb
    $sql$;
  ELSE
    RAISE NOTICE 'Skipping 041: app.survey_questions yok (v2 sürümünde eklenecek)';
  END IF;
END$$;
