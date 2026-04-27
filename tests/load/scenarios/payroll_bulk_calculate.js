// k6 scenario — 10k employee bulk payroll calculate.
// Cold run: expected under 30s. Success threshold p(95) < 60s.
import http from 'k6/http';
import { check } from 'k6';

const BASE = __ENV.K6_BASE_URL || 'https://staging.upcore.app';
const TOKEN = __ENV.K6_TOKEN;
const TENANT = __ENV.K6_TENANT_ID;
const RUN_ID = __ENV.K6_RUN_ID;

export const options = {
  scenarios: {
    bulk: { executor: 'shared-iterations', vus: 1, iterations: 1, maxDuration: '5m' },
  },
  thresholds: {
    http_req_duration: ['p(95)<60000', 'p(99)<90000'],
    http_req_failed: ['rate<0.01'],
    checks: ['rate>0.99'],
  },
};

export default function () {
  if (!RUN_ID) throw new Error('K6_RUN_ID env var is required');
  const res = http.post(
    `${BASE}/api/v1/bordro/runs/${RUN_ID}/calculate-all-active`,
    '{}',
    {
      headers: {
        Authorization: `Bearer ${TOKEN}`,
        'X-Tenant-ID': TENANT,
        'Content-Type': 'application/json',
      },
      timeout: '120s',
      tags: { endpoint: 'bulk_calculate' },
    },
  );
  check(res, {
    '200 OK': (r) => r.status === 200,
    'at least 9k slips': (r) => {
      try {
        return JSON.parse(r.body).employee_count >= 9000;
      } catch {
        return false;
      }
    },
  });
}
