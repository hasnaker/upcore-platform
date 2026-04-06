import { NextResponse } from 'next/server';

const SERVICES = [
  { name: 'auth', port: 8001, host: 'localhost' },
  { name: 'tenant', port: 8002, host: 'localhost' },
  { name: 'employee', port: 8003, host: 'localhost' },
  { name: 'organization', port: 8004, host: 'localhost' },
  { name: 'leave', port: 8005, host: 'localhost' },
  { name: 'document', port: 8006, host: 'localhost' },
  { name: 'survey', port: 8007, host: 'localhost' },
  { name: 'intervention', port: 8008, host: 'localhost' },
  { name: 'audit', port: 8009, host: 'localhost' },
  { name: 'notification', port: 8010, host: 'localhost' },
  { name: 'ats', port: 8011, host: 'localhost' },
  { name: 'assessment', port: 8012, host: 'localhost' },
  { name: 'api-gateway', port: 8080, host: 'localhost' },
  { name: 'psychometric-scoring', port: 8025, host: '127.0.0.1' },
  { name: 'burnout-prediction', port: 8022, host: '127.0.0.1' },
  { name: 'recommendation', port: 8023, host: '127.0.0.1' },
  { name: 'action-center', port: 8024, host: '127.0.0.1' },
];

export async function GET() {
  const checks = await Promise.all(
    SERVICES.map(async (svc) => {
      try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 2000);
        const res = await fetch(`http://${svc.host}:${svc.port}/health`, { signal: controller.signal });
        clearTimeout(timeout);
        return { name: svc.name, port: svc.port, status: res.ok ? 'healthy' : 'unhealthy', code: res.status };
      } catch {
        return { name: svc.name, port: svc.port, status: 'down', code: 0 };
      }
    })
  );

  const healthy = checks.filter((c: { status: string }) => c.status === 'healthy').length;
  const total = checks.length;
  const overall = healthy === total ? 'healthy' : healthy > total * 0.7 ? 'degraded' : 'unhealthy';

  return NextResponse.json({ status: overall, healthy, total, services: checks, timestamp: new Date().toISOString() });
}
