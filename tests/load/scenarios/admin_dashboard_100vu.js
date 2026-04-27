// k6 scenario — 100 eş zamanlı admin dashboard açılışı.
// Target: p(95) < 800ms.
import http from 'k6/http';
import { check, group, sleep } from 'k6';

const BASE = __ENV.K6_BASE_URL || 'https://staging.upcore.app';
const TOKEN = __ENV.K6_ADMIN_TOKEN;

export const options = {
  scenarios: {
    admin_dash: {
      executor: 'constant-vus',
      vus: 100,
      duration: '3m',
    },
  },
  thresholds: {
    'http_req_duration{endpoint:dashboard_summary}': ['p(95)<800'],
    'http_req_duration{endpoint:tenant_list}': ['p(95)<500'],
    http_req_failed: ['rate<0.01'],
  },
};

export default function () {
  const h = {
    Authorization: `Bearer ${TOKEN}`,
  };

  group('admin home', () => {
    const r1 = http.get(`${BASE}/api/admin/v1/dashboard/summary`, {
      headers: h,
      tags: { endpoint: 'dashboard_summary' },
    });
    check(r1, { '200': (r) => r.status === 200 });

    const r2 = http.get(`${BASE}/api/admin/v1/tenants?page=1&limit=50`, {
      headers: h,
      tags: { endpoint: 'tenant_list' },
    });
    check(r2, { '200': (r) => r.status === 200 });

    const r3 = http.get(`${BASE}/api/admin/v1/audit/events?limit=25`, {
      headers: h,
      tags: { endpoint: 'audit_recent' },
    });
    check(r3, { '200': (r) => r.status === 200 });
  });

  sleep(1 + Math.random());
}
