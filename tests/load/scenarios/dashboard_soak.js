// k6 scenario — executive dashboard soak at 500 VUs for 15 minutes.
// Targets 8 KPI endpoints in parallel like a real CxO morning.
import http from 'k6/http';
import { check, group, sleep } from 'k6';

const BASE = __ENV.K6_BASE_URL || 'https://staging.upcore.app';
const TOKEN = __ENV.K6_TOKEN;
const TENANT = __ENV.K6_TENANT_ID;

export const options = {
  scenarios: {
    soak: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '1m', target: 500 },
        { duration: '13m', target: 500 },
        { duration: '1m', target: 0 },
      ],
    },
  },
  thresholds: {
    http_req_duration: ['p(95)<800'],
    http_req_failed: ['rate<0.01'],
    checks: ['rate>0.98'],
  },
};

const ENDPOINTS = [
  '/api/burnout/heatmap',
  '/api/actions?limit=5',
  '/api/performance',
  '/api/predictions',
  '/api/engagement',
  '/api/employees?status=active&limit=1',
  '/api/bordro',
  '/api/reports',
];

export default function () {
  group('executive_dashboard', () => {
    ENDPOINTS.forEach((path) => {
      const res = http.get(`${BASE}${path}`, {
        headers: {
          Authorization: `Bearer ${TOKEN}`,
          'X-Tenant-ID': TENANT,
        },
        tags: { endpoint: path },
      });
      check(res, {
        [`${path}: 2xx`]: (r) => r.status >= 200 && r.status < 300,
      });
    });
  });
  sleep(30 + Math.random() * 30);
}
