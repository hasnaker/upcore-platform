-- 039_ats_extensions.up.sql
-- LinkedIn profil kaydı + video interview room + aday magic-link token.

-- LinkedIn profil link + çekilen veri snapshot'ı.
ALTER TABLE app.candidates
    ADD COLUMN IF NOT EXISTS linkedin_url        varchar(500),
    ADD COLUMN IF NOT EXISTS linkedin_profile    jsonb,
    ADD COLUMN IF NOT EXISTS linkedin_fetched_at timestamptz;

-- Video interview kaydı (Daily.co / Google Meet link + metadata).
ALTER TABLE app.interviews
    ADD COLUMN IF NOT EXISTS video_room_url      varchar(500),
    ADD COLUMN IF NOT EXISTS video_provider      varchar(40),  -- daily|meet|zoom|teams
    ADD COLUMN IF NOT EXISTS video_recording_url varchar(500);

-- Aday magic-link token (JWT veya random opaque). Kısa ömürlü (14 gün).
CREATE TABLE IF NOT EXISTS app.candidate_tokens (
    token        varchar(255) PRIMARY KEY,
    tenant_id    uuid NOT NULL,
    candidate_id uuid NOT NULL REFERENCES app.candidates(id) ON DELETE CASCADE,
    purpose      varchar(40) NOT NULL,  -- portal|offer_accept|interview_join
    expires_at   timestamptz NOT NULL,
    consumed_at  timestamptz,
    created_at   timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_candidate_tokens_exp
    ON app.candidate_tokens (expires_at) WHERE consumed_at IS NULL;

ALTER TABLE app.candidate_tokens ENABLE ROW LEVEL SECURITY;
-- Magic-link erişimini RLS bypass ile destekleyeceğiz; aşağıdaki policy
-- sadece tenant-scoped admin GET'leri için.
CREATE POLICY candidate_tokens_admin_rls ON app.candidate_tokens
    USING (tenant_id = current_setting('app.tenant_id')::uuid)
    WITH CHECK (tenant_id = current_setting('app.tenant_id')::uuid);

COMMENT ON COLUMN app.candidates.linkedin_profile IS 'LinkedIn API''den çekilen profil snapshotu: deneyim, eğitim, yetenekler';
COMMENT ON TABLE app.candidate_tokens IS 'Aday magic-link token DB — portal/offer/interview linkleri bu tablo üzerinden doğrulanır';
