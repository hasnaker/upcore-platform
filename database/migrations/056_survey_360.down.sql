SET search_path TO app, public;

DELETE FROM app.notification_templates
 WHERE tenant_id IS NULL
   AND template_key IN (
       'performance.survey_360.invitation.v1',
       'performance.survey_360.invitation.reminder.v1'
   );

DELETE FROM app.retention_policies WHERE name = 's360_camp_complete_5y';

DROP TABLE IF EXISTS app.survey_360_responses CASCADE;
DROP TABLE IF EXISTS app.survey_360_invitations CASCADE;
DROP TABLE IF EXISTS app.survey_360_campaigns CASCADE;
