// Baseline profile — 10 vus, 5 min; smoke check for nightly CI.
export const options = {
  scenarios: {
    baseline: {
      executor: 'constant-vus',
      vus: 10,
      duration: '5m',
    },
  },
  thresholds: {
    http_req_duration: ['p(95)<400'],
    http_req_failed: ['rate<0.001'],
  },
};
