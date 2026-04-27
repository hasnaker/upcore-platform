// Types + hooks used by the ML-itiraz (ML objection) portal page.
// These mirror the app/api/routes_audit.py response schemas from
// services/burnout-prediction and live here so the page.tsx shell
// can stay focused on layout composition.

export interface TopDriver {
  feature: string;
  label_tr: string;
  shap_value: number;
  abs_shap: number;
  direction: 'positive' | 'negative';
  actual_value: number;
}

export interface UserPrediction {
  prediction_id: string;
  model_version: string;
  prediction_value: number;
  horizon_days: number;
  predicted_at: string;
  consent_status: string;
  objected_at: string | null;
  top_drivers: TopDriver[];
}

export interface ObjectionResponse {
  objection_id: string;
  prediction_id: string;
  status: string;
  message: string;
}

export function bandFor(value: number): { label: string; color: string } {
  if (value >= 0.5)
    return {
      label: 'Kırmızı',
      color: 'bg-red-100 text-red-800 border-red-200',
    };
  if (value >= 0.25)
    return {
      label: 'Sarı',
      color: 'bg-amber-100 text-amber-800 border-amber-200',
    };
  return {
    label: 'Yeşil',
    color: 'bg-emerald-100 text-emerald-800 border-emerald-200',
  };
}

export function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleString('tr-TR', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return iso;
  }
}
