// k6 scenario — auth/me smoke. Fast CI gate, 10 VUs 60s.
import http from 'k6/http';
import { check } from 'k6';

const BASE = __ENV.K6_BASE_URL || 'https://staging.upcore.app';
const TOKEN = __ENV.K6_TOKEN;
const TENANT = __ENV.K6_TENANT_ID;

export const options = {
  vus: 10,
  duration: '1m',
  thresholds: {
    http_req_duration: ['p(95)<300'],
    http_req_failed: ['rate<0.01'],
  },
};

export default function () {
  const res = http.get(`${BASE}/api/v1/auth/me`, {
    headers: {
      Authorization: `Bearer ${TOKEN}`,
      'X-Tenant-ID': TENANT,
    },
  });
  check(res, {
    '200 OK': (r) => r.status === 200,
    'has user_id': (r) => !!r.json('user_id'),
  });
}
