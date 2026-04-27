// k6 scenario — 1000 eş zamanlı pulse submit.
// Target: p(95) < 200ms, error < 0.5%.
import http from 'k6/http';
import { check, sleep } from 'k6';
import { Trend, Counter } from 'k6/metrics';

const BASE = __ENV.K6_BASE_URL || 'https://staging.upcore.app';
const TOKEN = __ENV.K6_TOKEN;
const TENANT = __ENV.K6_TENANT_ID;
const SURVEY_ID = __ENV.K6_SURVEY_ID || '00000000-0000-0000-0000-000000000001';

export const options = {
  scenarios: {
    pulse_rush: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '30s', target: 200 },
        { duration: '1m', target: 1000 },
        { duration: '2m', target: 1000 },
        { duration: '30s', target: 0 },
      ],
      gracefulRampDown: '10s',
    },
  },
  thresholds: {
    http_req_duration: ['p(95)<200', 'p(99)<500'],
    http_req_failed: ['rate<0.005'],
    checks: ['rate>0.995'],
  },
};

const submitLatency = new Trend('pulse_submit_latency', true);
const dropouts = new Counter('pulse_submit_dropouts');

function buildAnswers() {
  // BAT-12-TR: 12 item, 1-5 Likert
  const out = [];
  for (let i = 0; i < 12; i++) {
    out.push({ question_id: `q${i + 1}`, numeric_value: 1 + (i % 5) });
  }
  return out;
}

export default function () {
  const body = JSON.stringify({
    survey_id: SURVEY_ID,
    anonymous: true,
    answers: buildAnswers(),
    client_sent_at: new Date().toISOString(),
  });
  const res = http.post(`${BASE}/api/v1/surveys/responses`, body, {
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${TOKEN}`,
      'X-Tenant-ID': TENANT,
      'Idempotency-Key': `${__VU}-${__ITER}-${Date.now()}`,
    },
    tags: { endpoint: 'pulse_submit' },
  });
  submitLatency.add(res.timings.duration);
  const ok = check(res, {
    '201 Created': (r) => r.status === 201,
    'response_id returned': (r) => {
      try {
        return !!JSON.parse(r.body).response_id;
      } catch {
        return false;
      }
    },
  });
  if (!ok) dropouts.add(1);
  sleep(0.1 + Math.random() * 0.3);
}
