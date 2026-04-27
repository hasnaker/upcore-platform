// k6 scenario — 50 req/s ML inference (burnout-prediction).
// Target: p(95) < 300ms.
import http from 'k6/http';
import { check } from 'k6';

const BASE = __ENV.K6_ML_BASE_URL || 'https://ml-staging.upcore.app';
const TOKEN = __ENV.K6_ML_TOKEN;

export const options = {
  scenarios: {
    ml_steady: {
      executor: 'constant-arrival-rate',
      rate: 50,
      timeUnit: '1s',
      duration: '3m',
      preAllocatedVUs: 100,
      maxVUs: 200,
    },
  },
  thresholds: {
    http_req_duration: ['p(95)<300', 'p(99)<600'],
    http_req_failed: ['rate<0.005'],
  },
};

function sampleFeatures() {
  return {
    bat_exhaustion: Math.random(),
    bat_cynicism: Math.random(),
    bat_efficacy: 0.5 + Math.random() * 0.5,
    copsoq_workload: Math.random(),
    uwes_vigor: Math.random(),
    overtime_ytd_hours: 80 + Math.random() * 200,
  };
}

export default function () {
  const res = http.post(
    `${BASE}/v1/predict/burnout`,
    JSON.stringify({ features: sampleFeatures(), explain: false }),
    {
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${TOKEN}`,
      },
      tags: { endpoint: 'burnout_predict' },
    },
  );
  check(res, {
    '200 OK': (r) => r.status === 200,
    'has score': (r) => {
      try { return typeof JSON.parse(r.body).risk_90d === 'number'; }
      catch { return false; }
    },
  });
}
