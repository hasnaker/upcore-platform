// Status servisi API istemcisi.
//
// Sunucu tarafında çalışır (Next.js RSC). Status servisi ayrı cluster'da
// olmalı; ana platform down olsa bile bu sayfa çalışabilsin.

const STATUS_API_BASE =
  process.env['STATUS_API_BASE'] ??
  process.env['NEXT_PUBLIC_STATUS_API_BASE'] ??
  'http://localhost:8030';

export interface Component {
  id: string;
  code: string;
  name: string;
  description?: string | null;
  category: 'core' | 'service' | 'ml' | 'integration';
  sort_order: number;
  status: ComponentStatus;
  healthcheck_url?: string | null;
  prometheus_job?: string | null;
  auto_sync_enabled: boolean;
  last_checked_at?: string | null;
  created_at: string;
  updated_at: string;
}

export interface DailyRollup {
  component_id: string;
  day: string;
  total_probes: number;
  failed_probes: number;
  p95_latency_ms?: number | null;
  incident_count: number;
}

export type ComponentStatus =
  | 'operational'
  | 'degraded'
  | 'partial_outage'
  | 'major_outage'
  | 'maintenance';

export type IncidentStatus =
  | 'investigating'
  | 'identified'
  | 'monitoring'
  | 'resolved'
  | 'postmortem';

export type IncidentImpact = 'none' | 'minor' | 'major' | 'critical';

export interface Incident {
  id: string;
  title: string;
  impact: IncidentImpact;
  status: IncidentStatus;
  started_at: string;
  resolved_at?: string | null;
  postmortem_url?: string | null;
  postmortem_summary?: string | null;
  component_ids: string[];
  created_by?: string | null;
  created_at: string;
  updated_at: string;
}

export interface IncidentUpdate {
  id: string;
  incident_id: string;
  status: IncidentStatus;
  body: string;
  author?: string | null;
  created_at: string;
}

export interface MaintenanceWindow {
  id: string;
  title: string;
  description: string;
  scheduled_start: string;
  scheduled_end: string;
  status: 'scheduled' | 'in_progress' | 'completed' | 'canceled';
  component_ids: string[];
  created_by?: string | null;
  created_at: string;
  updated_at: string;
}

export interface ComponentWithHistory extends Component {
  history: DailyRollup[];
}

async function fetchJSON<T>(path: string, init?: RequestInit): Promise<T | null> {
  try {
    const res = await fetch(`${STATUS_API_BASE}${path}`, {
      ...init,
      // 30s freshness, server-side only.
      next: { revalidate: 30 },
      headers: { 'Content-Type': 'application/json', ...(init?.headers ?? {}) },
    });
    if (!res.ok) return null;
    return (await res.json()) as T;
  } catch {
    return null;
  }
}

export async function getComponents(): Promise<ComponentWithHistory[]> {
  const data = await fetchJSON<{ components: ComponentWithHistory[] }>(
    '/api/v2/components?with_history=true',
  );
  if (!data?.components) return [];
  return data.components;
}

export async function getUnresolvedIncidents(): Promise<Incident[]> {
  const data = await fetchJSON<{ incidents: Incident[] }>('/api/v2/incidents/unresolved');
  return data?.incidents ?? [];
}

export async function getIncidents(days = 90): Promise<Incident[]> {
  const data = await fetchJSON<{ incidents: Incident[] }>(`/api/v2/incidents?days=${days}`);
  return data?.incidents ?? [];
}

export async function getIncident(
  id: string,
): Promise<{ incident: Incident; updates: IncidentUpdate[] } | null> {
  return fetchJSON(`/api/v2/incidents/${id}`);
}

export async function getUpcomingMaintenance(): Promise<MaintenanceWindow[]> {
  const data = await fetchJSON<{ scheduled_maintenances: MaintenanceWindow[] }>(
    '/api/v2/scheduled-maintenances',
  );
  return data?.scheduled_maintenances ?? [];
}

export async function getStatusSummary(): Promise<{
  global: ComponentStatus;
  description: string;
} | null> {
  const data = await fetchJSON<{
    status: { indicator: string; description: string };
  }>('/api/v2/status');
  if (!data) return null;
  const map: Record<string, ComponentStatus> = {
    none: 'operational',
    minor: 'degraded',
    major: 'partial_outage',
    critical: 'major_outage',
    maintenance: 'maintenance',
  };
  return {
    global: map[data.status.indicator] ?? 'operational',
    description: data.status.description,
  };
}

export function rollupGlobalStatus(components: Component[]): ComponentStatus {
  const rank: Record<ComponentStatus, number> = {
    operational: 0,
    maintenance: 1,
    degraded: 2,
    partial_outage: 3,
    major_outage: 4,
  };
  let worst: ComponentStatus = 'operational';
  for (const c of components) {
    if (rank[c.status] > rank[worst]) worst = c.status;
  }
  return worst;
}

export function submitSubscribe(payload: {
  channel: 'email' | 'webhook' | 'rss';
  target: string;
  component_ids?: string[];
}): Promise<Response> {
  return fetch(`${STATUS_API_BASE}/api/v2/subscribe`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
}
