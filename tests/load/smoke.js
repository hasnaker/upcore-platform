// UpCore load smoke test — k6.
//
// Smoke = "does it work at all under load?". 20 VUs, 2 minutes, steady pace.
// Runs against a staging gateway. Auth via X-API-Key header (key rotated in CI).
//
// Usage locally: k6 run -e BASE_URL=http://localhost:8080 -e API_KEY=upc_live_... tests/load/smoke.js
// CI:            read BASE_URL + API_KEY from GitHub secrets.

import http from 'k6/http';
import { check, group, sleep } from 'k6';
import { Rate, Trend } from 'k6/metrics';

export const options = {
  vus: 20,
  duration: '2m',
  thresholds: {
    // Hard fail budgets — CI breaks if any exceeded.
    http_req_failed: ['rate<0.01'],          // <1% failures
    http_req_duration: ['p(95)<800'],        // p95 < 800ms
    'http_req_duration{endpoint:employees}': ['p(95)<600'],
    'http_req_duration{endpoint:burnout}':   ['p(95)<900'],
  },
};

const BASE_URL = __ENV.BASE_URL || 'http://localhost:8080';
const API_KEY  = __ENV.API_KEY  || '';

const errorRate = new Rate('upcore_errors');
const burnoutLatency = new Trend('burnout_latency_ms');

function authHeaders() {
  return {
    'X-API-Key': API_KEY,
    'Content-Type': 'application/json',
  };
}

export default function () {
  group('employees list', () => {
    const r = http.get(`${BASE_URL}/api/v1/employees?limit=50`, {
      headers: authHeaders(),
      tags: { endpoint: 'employees' },
    });
    const ok = check(r, {
      'status 200': (res) => res.status === 200,
      'has items': (res) => {
        try {
          const body = res.json();
          return Array.isArray(body.items);
        } catch (_) {
          return false;
        }
      },
    });
    errorRate.add(!ok);
  });

  group('burnout heatmap', () => {
    const r = http.get(`${BASE_URL}/api/v1/burnout/heatmap`, {
      headers: authHeaders(),
      tags: { endpoint: 'burnout' },
    });
    burnoutLatency.add(r.timings.duration);
    check(r, { 'status 2xx/3xx': (res) => res.status < 400 });
  });

  group('health', () => {
    const r = http.get(`${BASE_URL}/health`, { tags: { endpoint: 'health' } });
    check(r, { 'health 200': (res) => res.status === 200 });
  });

  sleep(1);
}
