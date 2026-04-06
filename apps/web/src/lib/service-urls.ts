/**
 * Service URL configuration — TEK KAYNAK
 * Development: localhost ports
 * Production: Azure Container Apps internal URLs (from env vars)
 */

export const SERVICES = {
  employee: process.env['EMPLOYEE_SERVICE_URL'] || 'http://localhost:8003',
  organization: process.env['ORGANIZATION_SERVICE_URL'] || 'http://localhost:8004',
  leave: process.env['LEAVE_SERVICE_URL'] || 'http://localhost:8005',
  document: process.env['DOCUMENT_SERVICE_URL'] || 'http://localhost:8006',
  survey: process.env['SURVEY_SERVICE_URL'] || 'http://localhost:8007',
  intervention: process.env['INTERVENTION_SERVICE_URL'] || 'http://localhost:8008',
  audit: process.env['AUDIT_SERVICE_URL'] || 'http://localhost:8009',
  notification: process.env['NOTIFICATION_SERVICE_URL'] || 'http://localhost:8010',
  ats: process.env['ATS_SERVICE_URL'] || 'http://localhost:8011',
  assessment: process.env['ASSESSMENT_SERVICE_URL'] || 'http://localhost:8012',
  gateway: process.env['GATEWAY_SERVICE_URL'] || 'http://localhost:8080',
  scoring: process.env['SCORING_SERVICE_URL'] || 'http://127.0.0.1:8025',
  burnout: process.env['BURNOUT_SERVICE_URL'] || 'http://127.0.0.1:8022',
  recommend: process.env['RECOMMEND_SERVICE_URL'] || 'http://127.0.0.1:8023',
  actionCenter: process.env['ACTION_SERVICE_URL'] || 'http://127.0.0.1:8024',
} as const;

export const DB_URL = process.env['DATABASE_URL'] || 'postgresql://upcore:upcore_dev_password@localhost:5432/upcore_dev';

export const TENANT_ID = '11111111-1111-1111-1111-111111111111';

export const DEV_HEADERS = {
  'X-Tenant-Id': TENANT_ID,
  'X-User-Id': '00000000-0000-0000-0000-000000000001',
  'X-User-Role': 'hr_director',
  'Content-Type': 'application/json',
} as const;
