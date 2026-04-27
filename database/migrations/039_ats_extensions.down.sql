-- 039_ats_extensions.down.sql
DROP TABLE IF EXISTS app.candidate_tokens;
ALTER TABLE app.interviews
    DROP COLUMN IF EXISTS video_room_url,
    DROP COLUMN IF EXISTS video_provider,
    DROP COLUMN IF EXISTS video_recording_url;
ALTER TABLE app.candidates
    DROP COLUMN IF EXISTS linkedin_url,
    DROP COLUMN IF EXISTS linkedin_profile,
    DROP COLUMN IF EXISTS linkedin_fetched_at;
