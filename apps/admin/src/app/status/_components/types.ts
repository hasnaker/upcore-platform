export interface AdminComponent {
  id: string;
  code: string;
  name: string;
  category: 'core' | 'service' | 'ml' | 'integration';
  status:
    | 'operational'
    | 'degraded'
    | 'partial_outage'
    | 'major_outage'
    | 'maintenance';
  sort_order: number;
}

export interface AdminIncident {
  id: string;
  title: string;
  impact: 'none' | 'minor' | 'major' | 'critical';
  status:
    | 'investigating'
    | 'identified'
    | 'monitoring'
    | 'resolved'
    | 'postmortem';
  started_at: string;
  resolved_at?: string | null;
  component_ids: string[];
  postmortem_url?: string | null;
  postmortem_summary?: string | null;
}

export interface AdminMaintenance {
  id: string;
  title: string;
  description: string;
  scheduled_start: string;
  scheduled_end: string;
  status: 'scheduled' | 'in_progress' | 'completed' | 'canceled';
  component_ids: string[];
}
