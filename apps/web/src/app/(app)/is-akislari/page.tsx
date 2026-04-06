'use client';

import { useState, useEffect } from 'react';

interface WorkflowDef {
  id: string;
  name: string;
  triggerType: string;
  steps: Array<{ step: number; type: string; role: string; condition?: string }>;
  active: boolean;
}

interface WorkflowInstance {
  id: string;
  definitionName: string;
  entityType: string;
  entityId: string;
  currentStep: number;
  totalSteps: number;
  status: string;
  startedAt: string;
}

interface RecentAction {
  instanceId: string;
  definitionName: string;
  stepIndex: number;
  action: string;
  actorName: string;
  decision: string;
  completedAt: string;
}

interface WorkflowStats {
  totalActive: number;
  pendingApprovals: number;
  avgCompletionTime: string;
}

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  active: { label: 'Aktif', color: '#5E5CE6', bg: '#f0f0ff' },
  completed: { label: 'Tamamlandi', color: '#059669', bg: '#D1FAE5' },
  cancelled: { label: 'Iptal', color: '#DC2626', bg: '#FEE2E2' },
  failed: { label: 'Hata', color: '#DC2626', bg: '#FEE2E2' },
};

const TRIGGER_LABELS: Record<string, string> = {
  leave_request: 'Izin Talebi',
  performance_review: 'Performans Degerlendirme',
  compensation_review: 'Maas Artisi',
  onboarding: 'Ise Alim',
};

const STEP_ICONS: Record<string, string> = {
  approval: '✓',
  notification: '📧',
  self_assessment: '📝',
  manager_review: '👤',
  calibration: '⚖️',
};

export default function IsAkislariPage() {
  const [definitions, setDefinitions] = useState<WorkflowDef[]>([]);
  const [instances, setInstances] = useState<WorkflowInstance[]>([]);
  const [recentActions, setRecentActions] = useState<RecentAction[]>([]);
  const [stats, setStats] = useState<WorkflowStats | null>(null);
  const [tab, setTab] = useState<'overview' | 'definitions' | 'history'>('overview');

  useEffect(() => {
    fetch('/api/workflows')
      .then((r) => r.json())
      .then((data) => {
        if (data.definitions) setDefinitions(data.definitions);
        if (data.instances) setInstances(data.instances);
        if (data.recentActions) setRecentActions(data.recentActions);
        if (data.stats) setStats(data.stats);
      })
      .catch(() => {});
  }, []);

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-[#0A0A0A]">Is Akislari</h1>
        <p className="mt-1 text-sm text-[#525252]">Onay zincirleri, otomatik tetikleyiciler ve is akisi yonetimi.</p>
      </div>

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-3 gap-3">
          <div className="rounded-xl border border-[#f0f0f0] bg-white p-4">
            <div className="text-[11px] font-medium text-[#888]">Aktif Akis</div>
            <div className="mt-1 text-[22px] font-bold text-[#5E5CE6]">{stats.totalActive}</div>
          </div>
          <div className="rounded-xl border border-[#f0f0f0] bg-white p-4">
            <div className="text-[11px] font-medium text-[#888]">Bekleyen Onay</div>
            <div className="mt-1 text-[22px] font-bold text-[#D97706]">{stats.pendingApprovals}</div>
          </div>
          <div className="rounded-xl border border-[#f0f0f0] bg-white p-4">
            <div className="text-[11px] font-medium text-[#888]">Ort. Tamamlanma</div>
            <div className="mt-1 text-[22px] font-bold text-[#059669]">{stats.avgCompletionTime}</div>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-1 rounded-xl border border-[#f0f0f0] bg-[#fafafa] p-1">
        {[
          { key: 'overview' as const, label: 'Aktif Akislar' },
          { key: 'definitions' as const, label: 'Akis Tanimlari' },
          { key: 'history' as const, label: 'Gecmis Islemler' },
        ].map((t) => (
          <button key={t.key} onClick={() => setTab(t.key)}
            className={`flex-1 rounded-lg px-4 py-2.5 text-[13px] font-medium transition-all ${tab === t.key ? 'bg-white text-[#0A0A0A] shadow-sm' : 'text-[#737373]'}`}>
            {t.label}
          </button>
        ))}
      </div>

      {/* Active Instances */}
      {tab === 'overview' && (
        <div className="flex flex-col gap-3">
          {instances.length === 0 ? (
            <div className="rounded-xl border border-[#f0f0f0] bg-white p-8 text-center text-[13px] text-[#888]">
              Aktif is akisi bulunmuyor. Bir onay sureci basladiginda burada gorunur.
            </div>
          ) : (
            instances.map((inst) => {
              const statusConf = STATUS_CONFIG[inst.status] || STATUS_CONFIG['active']!;
              const progressPct = inst.totalSteps > 0 ? Math.round((inst.currentStep / inst.totalSteps) * 100) : 0;
              return (
                <div key={inst.id} className="rounded-xl border border-[#f0f0f0] bg-white p-5">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="text-[14px] font-semibold text-[#0A0A0A]">{inst.definitionName}</h4>
                      <span className="text-[12px] text-[#888]">{inst.entityType}</span>
                    </div>
                    <span className="rounded-full px-2 py-0.5 text-[10px] font-semibold" style={{ color: statusConf.color, background: statusConf.bg }}>
                      {statusConf.label}
                    </span>
                  </div>
                  <div className="mt-3">
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="text-[#888]">Adim {inst.currentStep}/{inst.totalSteps}</span>
                      <span className="font-semibold text-[#5E5CE6]">%{progressPct}</span>
                    </div>
                    <div className="mt-1 h-2 overflow-hidden rounded-full bg-[#f0f0f0]">
                      <div className="h-full rounded-full bg-[#5E5CE6]" style={{ width: `${progressPct}%` }} />
                    </div>
                  </div>
                  <div className="mt-2 text-[11px] text-[#888]">
                    Baslangic: {new Date(inst.startedAt).toLocaleDateString('tr-TR')}
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

      {/* Workflow Definitions */}
      {tab === 'definitions' && (
        <div className="flex flex-col gap-3">
          {definitions.map((def) => (
            <div key={def.id} className="rounded-xl border border-[#f0f0f0] bg-white p-5">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-[14px] font-semibold text-[#0A0A0A]">{def.name}</h4>
                  <span className="text-[12px] text-[#888]">Tetikleyici: {TRIGGER_LABELS[def.triggerType] || def.triggerType}</span>
                </div>
                <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${def.active ? 'bg-[#D1FAE5] text-[#059669]' : 'bg-[#F5F5F5] text-[#888]'}`}>
                  {def.active ? 'Aktif' : 'Pasif'}
                </span>
              </div>

              {/* Step visualization */}
              <div className="mt-4 flex items-center gap-1">
                {def.steps.map((step, i) => (
                  <div key={i} className="flex items-center">
                    <div className="flex flex-col items-center">
                      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#f0f0ff] text-[14px]">
                        {STEP_ICONS[step.type] || '•'}
                      </div>
                      <span className="mt-1 text-[9px] font-medium text-[#888]">{step.role}</span>
                      {step.condition && (
                        <span className="mt-0.5 text-[8px] text-[#D97706]">if: {step.condition}</span>
                      )}
                    </div>
                    {i < def.steps.length - 1 && (
                      <div className="mx-1 h-px w-6 bg-[#d4d4d4]" />
                    )}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Recent Actions */}
      {tab === 'history' && (
        <div className="overflow-hidden rounded-xl border border-[#f0f0f0] bg-white">
          {recentActions.length === 0 ? (
            <div className="p-8 text-center text-[13px] text-[#888]">Henuz islem gecmisi yok.</div>
          ) : (
            <table className="w-full text-[12px]">
              <thead>
                <tr className="border-b border-[#f0f0f0] bg-[#fafafa]">
                  <th className="px-4 py-3 text-left font-semibold text-[#525252]">Akis</th>
                  <th className="px-4 py-3 text-left font-semibold text-[#525252]">Islem</th>
                  <th className="px-4 py-3 text-left font-semibold text-[#525252]">Karar</th>
                  <th className="px-4 py-3 text-left font-semibold text-[#525252]">Tarih</th>
                </tr>
              </thead>
              <tbody>
                {recentActions.map((action, i) => (
                  <tr key={i} className="border-b border-[#f0f0f0] last:border-0 hover:bg-[#fafafa]">
                    <td className="px-4 py-3 font-medium text-[#0A0A0A]">{action.definitionName}</td>
                    <td className="px-4 py-3 text-[#525252]">{action.action}</td>
                    <td className="px-4 py-3">
                      <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                        action.decision === 'approved' ? 'bg-[#D1FAE5] text-[#059669]' :
                        action.decision === 'rejected' ? 'bg-[#FEE2E2] text-[#DC2626]' :
                        'bg-[#FEF3C7] text-[#D97706]'
                      }`}>
                        {action.decision === 'approved' ? 'Onaylandi' : action.decision === 'rejected' ? 'Reddedildi' : 'Eskalasyon'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-[#888]">{new Date(action.completedAt).toLocaleDateString('tr-TR')}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}
    </div>
  );
}
