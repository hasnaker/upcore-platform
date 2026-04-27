// k6 scenario — employee list pagination at 10k rows.
// Target p(95) < 500ms, error rate < 1%.
import http from 'k6/http';
import { check, sleep } from 'k6';

const BASE = __ENV.K6_BASE_URL || 'https://staging.upcore.app';
const TOKEN = __ENV.K6_TOKEN;
const TENANT = __ENV.K6_TENANT_ID;

export const options = {
  scenarios: {
    steady: {
      executor: 'constant-vus',
      vus: 100,
      duration: '3m',
    },
  },
  thresholds: {
    http_req_duration: ['p(95)<500', 'p(99)<1200'],
    http_req_failed: ['rate<0.01'],
    checks: ['rate>0.99'],
  },
};

const PAGES = [1, 2, 3, 4, 5];

export default function () {
  const page = PAGES[Math.floor(Math.random() * PAGES.length)];
  const res = http.get(`${BASE}/api/v1/employees?page=${page}&limit=100`, {
    headers: {
      Authorization: `Bearer ${TOKEN}`,
      'X-Tenant-ID': TENANT,
    },
    tags: { endpoint: 'list' },
  });
  check(res, {
    '200 OK': (r) => r.status === 200,
    'has items': (r) => JSON.parse(r.body).items?.length > 0,
  });
  sleep(Math.random() * 2);
}
