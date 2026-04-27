// k6 scenario — OKR kaskad create, 20 vus.
import http from 'k6/http';
import { check } from 'k6';

const BASE = __ENV.K6_BASE_URL || 'https://staging.upcore.app';
const TOKEN = __ENV.K6_TOKEN;
const TENANT = __ENV.K6_TENANT_ID;

export const options = {
  vus: 20,
  duration: '2m',
  thresholds: {
    http_req_duration: ['p(95)<400'],
    http_req_failed: ['rate<0.01'],
  },
};

export default function () {
  const r = http.post(
    `${BASE}/api/v1/okr/objectives`,
    JSON.stringify({
      level: 'individual',
      title: `k6 test ${__VU}-${__ITER}`,
      key_results: [{ description: 'KR1', target: 100 }],
    }),
    {
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${TOKEN}`,
        'X-Tenant-ID': TENANT,
      },
    },
  );
  check(r, { '201 Created': (x) => x.status === 201 });
}
