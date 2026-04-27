// UpCore stress test — ramp to breakpoint.
//
// Goal: find the throughput at which p95 latency exceeds SLO or error rate
// spikes. Ramps from 0 → 300 VUs over 10 minutes with a 5-minute plateau.
//
// Runs only on-demand (workflow_dispatch) or weekly nightly — NEVER on PRs.

import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
  stages: [
    { duration: '2m', target: 50 },
    { duration: '3m', target: 150 },
    { duration: '5m', target: 300 },
    { duration: '2m', target: 0 },
  ],
  thresholds: {
    http_req_failed:  ['rate<0.05'],
    http_req_duration: ['p(95)<1500', 'p(99)<3000'],
  },
};

const BASE_URL = __ENV.BASE_URL || 'http://localhost:8080';
const API_KEY  = __ENV.API_KEY  || '';

const ENDPOINTS = [
  '/api/v1/employees?limit=100',
  '/api/v1/leaves?status=pending',
  '/api/v1/burnout/heatmap',
  '/api/v1/performance/reviews?cycle=active',
  '/api/v1/reports/kpi',
];

export default function () {
  const path = ENDPOINTS[Math.floor(Math.random() * ENDPOINTS.length)];
  const r = http.get(`${BASE_URL}${path}`, {
    headers: { 'X-API-Key': API_KEY },
  });
  check(r, { 'ok': (res) => res.status < 500 });
  sleep(Math.random() * 2);
}
