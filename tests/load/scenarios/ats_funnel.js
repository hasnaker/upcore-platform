// k6 scenario — ATS funnel churn. 50 concurrent recruiters creating
// candidates, applications, moving them across pipeline stages.
import http from 'k6/http';
import { check, sleep } from 'k6';

const BASE = __ENV.K6_BASE_URL || 'https://staging.upcore.app';
const TOKEN = __ENV.K6_TOKEN;
const TENANT = __ENV.K6_TENANT_ID;
const REQ_ID = __ENV.K6_REQUISITION_ID;

export const options = {
  scenarios: {
    funnel: {
      executor: 'constant-vus',
      vus: 50,
      duration: '5m',
    },
  },
  thresholds: {
    http_req_duration: ['p(95)<1200'],
    http_req_failed: ['rate<0.02'],
    checks: ['rate>0.97'],
  },
};

const hdrs = () => ({
  Authorization: `Bearer ${TOKEN}`,
  'X-Tenant-ID': TENANT,
  'Content-Type': 'application/json',
});

export default function () {
  if (!REQ_ID) throw new Error('K6_REQUISITION_ID required');

  // 1. create candidate
  const c = http.post(`${BASE}/api/v1/ats/candidates`, JSON.stringify({
    ad_soyad: `Load Test ${__VU}-${__ITER}`,
    email: `loadtest-${__VU}-${__ITER}@example.com`,
    source: 'direct',
  }), { headers: hdrs(), tags: { endpoint: 'cand_create' } });
  check(c, { 'cand 201': (r) => r.status === 201 });
  const candidateID = c.json('id');
  if (!candidateID) return;

  // 2. submit application
  const a = http.post(`${BASE}/api/v1/ats/applications`, JSON.stringify({
    requisition_id: REQ_ID,
    candidate_id: candidateID,
  }), { headers: hdrs(), tags: { endpoint: 'app_submit' } });
  check(a, { 'app 201': (r) => r.status === 201 });
  const appID = a.json('id');
  if (!appID) return;

  // 3. move to interview stage
  http.post(`${BASE}/api/v1/ats/applications/${appID}/move`,
    JSON.stringify({ target_stage: 'interview' }),
    { headers: hdrs(), tags: { endpoint: 'app_move' } });

  sleep(Math.random() * 3);
}
