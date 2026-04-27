// Soak profile — 1 hour at moderate load to surface leaks.
export const options = {
  scenarios: {
    soak: {
      executor: 'constant-vus',
      vus: 100,
      duration: '1h',
    },
  },
  thresholds: {
    http_req_duration: ['p(95)<600'],
    http_req_failed: ['rate<0.01'],
    // Memory leaks manifest as growing latency; fail if p95 over final 10min > 2x initial.
    'http_req_duration{phase:end}': ['p(95)<1200'],
  },
};
