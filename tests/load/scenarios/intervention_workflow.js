// k6 scenario — intervention recommend+assign workflow, 30 vus.
import http from 'k6/http';
import { check, sleep } from 'k6';

const BASE = __ENV.K6_BASE_URL || 'https://staging.upcore.app';
const TOKEN = __ENV.K6_TOKEN;
const TENANT = __ENV.K6_TENANT_ID;

export const options = {
  scenarios: {
    interventions: {
      executor: 'constant-vus',
      vus: 30,
      duration: '5m',
    },
  },
  thresholds: {
    http_req_duration: ['p(95)<600'],
    http_req_failed: ['rate<0.01'],
  },
};

export default function () {
  const h = {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${TOKEN}`,
    'X-Tenant-ID': TENANT,
  };

  const rec = http.get(`${BASE}/api/v1/interventions/recommend?risk_level=high`, { headers: h });
  check(rec, { 'rec 200': (r) => r.status === 200 });

  const catalog = JSON.parse(rec.body).items || [];
  if (catalog.length === 0) return;

  const assign = http.post(
    `${BASE}/api/v1/interventions/assignments`,
    JSON.stringify({
      intervention_id: catalog[0].id,
      employee_id: `ee-${__VU}`,
      reason: 'k6 smoke',
    }),
    { headers: h },
  );
  check(assign, { 'assign 201': (r) => r.status === 201 });
  sleep(1);
}
