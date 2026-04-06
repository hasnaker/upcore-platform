'use client';

import { useState, useEffect, useCallback } from 'react';

interface WorkflowStep {
  step: number;
  type: string;
  role: string;
  condition?: string;
}

interface WorkflowDef {
  id: string;
  name: string;
  triggerType: string;
  steps: WorkflowStep[];
  active: boolean;
}

interface WorkflowInstance {
  id: string;
  definitionId: string;
  definitionName: string;
  entityType: string;
  entityId: string;
  currentStep: number;
  totalSteps: number;
  status: string;
  startedAt: string;
  definitionSteps: WorkflowStep[];
  currentStepDef: WorkflowStep | null;
  stepStartedAt: string;
}

interface RecentAction {
  instanceId: string;
  definitionName: string;
  stepIndex: number;
  action: string;
  actorName: string;
  decision: string;
  completedAt: string;
  comments: string;
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
  approval: '\u2713',
  notification: '\uD83D\uDCE7',
  self_assessment: '\uD83D\uDCDD',
  manager_review: '\uD83D\uDC64',
  calibration: '\u2696\uFE0F',
};

const ROLE_LABELS: Record<string, string> = {
  manager: 'Yonetici',
  hr: 'IK',
  hr_director: 'IK Direktoru',
  director: 'Direktor',
  ceo: 'CEO',
  employee: 'Calisan',
  department_head: 'Departman Baskani',
  finance: 'Finans',
  admin: 'Yonetici',
};

const formatDuration = (startDateStr: string): { text: string; slaColor: string } => {
  const start = new Date(startDateStr);
  const now = new Date();
  const diffMs = now.getTime() - start.getTime();
  const diffHours = diffMs / (1000 * 60 * 60);
  const days = Math.floor(diffHours / 24);
  const hours = Math.floor(diffHours % 24);

  let text: string;
  if (days > 0) {
    text = `${days} gun ${hours} saat`;
  } else if (hours > 0) {
    text = `${hours} saat`;
  } else {
    const mins = Math.max(1, Math.floor(diffMs / (1000 * 60)));
    text = `${mins} dakika`;
  }

  let slaColor: string;
  if (diffHours < 24) {
    slaColor = '#059669'; // green
  } else if (diffHours < 72) {
    slaColor = '#D97706'; // yellow
  } else {
    slaColor = '#DC2626'; // red
  }

  return { text, slaColor };
};

export default function IsAkislariPage() {
  const [definitions, setDefinitions] = useState<WorkflowDef[]>([]);
  const [instances, setInstances] = useState<WorkflowInstance[]>([]);
  const [recentActions, setRecentActions] = useState<RecentAction[]>([]);
  const [stats, setStats] = useState<WorkflowStats | null>(null);
  const [tab, setTab] = useState<'overview' | 'definitions' | 'history'>('overview');

  // Approve/Reject state
  const [actionTarget, setActionTarget] = useState<{ instanceId: string; decision: 'approved' | 'rejected' | 'escalated' } | null>(null);
  const [actionComments, setActionComments] = useState('');
  const [actionLoading, setActionLoading] = useState(false);
  const [actionError, setActionError] = useState('');
  const [actionSuccess, setActionSuccess] = useState('');

  // New instance modal
  const [showNewModal, setShowNewModal] = useState(false);
  const [newDefId, setNewDefId] = useState('');
  const [newEntityType, setNewEntityType] = useState('');
  const [newEntityId, setNewEntityId] = useState('');
  const [newLoading, setNewLoading] = useState(false);
  const [newError, setNewError] = useState('');

  const loadData = useCallback(() => {
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

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleAction = async () => {
    if (!actionTarget) return;
    setActionLoading(true);
    setActionError('');
    setActionSuccess('');
    try {
      const res = await fetch('/api/workflows', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          instanceId: actionTarget.instanceId,
          decision: actionTarget.decision,
          comments: actionComments,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setActionError(data.error || 'Islem basarisiz');
      } else {
        setActionSuccess(data.message || 'Islem basarili');
        setActionTarget(null);
        setActionComments('');
        // Refresh data
        loadData();
        // Clear success after 3s
        setTimeout(() => setActionSuccess(''), 3000);
      }
    } catch {
      setActionError('Sunucu hatasi');
    } finally {
      setActionLoading(false);
    }
  };

  const handleCreateInstance = async () => {
    if (!newDefId || !newEntityType || !newEntityId) {
      setNewError('Tum alanlar zorunludur');
      return;
    }
    setNewLoading(true);
    setNewError('');
    try {
      const res = await fetch('/api/workflows', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          definitionId: newDefId,
          entityType: newEntityType,
          entityId: newEntityId,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setNewError(data.error || 'Olusturulamadi');
      } else {
        setShowNewModal(false);
        setNewDefId('');
        setNewEntityType('');
        setNewEntityId('');
        loadData();
      }
    } catch {
      setNewError('Sunucu hatasi');
    } finally {
      setNewLoading(false);
    }
  };

  return (
    <div className="flex flex-col gap-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-[#0A0A0A]">Is Akislari</h1>
          <p className="mt-1 text-sm text-[#525252]">Onay zincirleri, otomatik tetikleyiciler ve is akisi yonetimi.</p>
        </div>
        <button
          onClick={() => setShowNewModal(true)}
          className="rounded-xl bg-[#5E5CE6] px-4 py-2.5 text-[13px] font-semibold text-white transition-all hover:bg-[#4B49B6]"
        >
          + Yeni Is Akisi Baslat
        </button>
      </div>

      {/* Success toast */}
      {actionSuccess && (
        <div className="rounded-xl border border-[#A7F3D0] bg-[#D1FAE5] px-4 py-3 text-[13px] font-medium text-[#059669]">
          {actionSuccess}
        </div>
      )}

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
              const isActive = inst.status === 'active';
              const isActionTarget = actionTarget?.instanceId === inst.id;
              const currentStepDef = inst.currentStepDef;
              const roleName = currentStepDef ? (ROLE_LABELS[currentStepDef.role] || currentStepDef.role) : '';
              const stepTypeName = currentStepDef ? (STEP_ICONS[currentStepDef.type] || '') : '';

              // SLA calculation
              const sla = inst.stepStartedAt ? formatDuration(inst.stepStartedAt) : null;

              return (
                <div key={inst.id} className="rounded-xl border border-[#f0f0f0] bg-white p-5">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="text-[14px] font-semibold text-[#0A0A0A]">{inst.definitionName}</h4>
                      <span className="text-[12px] text-[#888]">{inst.entityType} &middot; {inst.entityId}</span>
                    </div>
                    <span className="rounded-full px-2 py-0.5 text-[10px] font-semibold" style={{ color: statusConf.color, background: statusConf.bg }}>
                      {statusConf.label}
                    </span>
                  </div>

                  {/* Step progress */}
                  <div className="mt-3">
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="text-[#888]">
                        {stepTypeName} Adim {inst.currentStep}/{inst.totalSteps}
                        {currentStepDef && (
                          <span className="ml-1 font-medium text-[#525252]">: {currentStepDef.type === 'approval' ? 'Onay' : currentStepDef.type === 'notification' ? 'Bildirim' : currentStepDef.type}</span>
                        )}
                      </span>
                      <span className="font-semibold text-[#5E5CE6]">%{progressPct}</span>
                    </div>
                    <div className="mt-1 h-2 overflow-hidden rounded-full bg-[#f0f0f0]">
                      <div className="h-full rounded-full bg-[#5E5CE6]" style={{ width: `${progressPct}%` }} />
                    </div>
                  </div>

                  {/* Who is blocking + SLA */}
                  <div className="mt-3 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="text-[11px] text-[#888]">
                        Baslangic: {new Date(inst.startedAt).toLocaleDateString('tr-TR')}
                      </div>
                      {isActive && roleName && (
                        <div className="rounded-md bg-[#FEF3C7] px-2 py-0.5 text-[10px] font-semibold text-[#D97706]">
                          Bekleyen: {roleName} onayi
                        </div>
                      )}
                    </div>
                    {isActive && sla && (
                      <div className="flex items-center gap-1 text-[10px] font-semibold" style={{ color: sla.slaColor }}>
                        <span className="inline-block h-1.5 w-1.5 rounded-full" style={{ background: sla.slaColor }} />
                        Bu adimda: {sla.text}
                      </div>
                    )}
                  </div>

                  {/* Step visualization mini */}
                  {inst.definitionSteps && inst.definitionSteps.length > 0 && (
                    <div className="mt-3 flex items-center gap-0.5">
                      {inst.definitionSteps.map((step, i) => {
                        const stepNum = i + 1;
                        const isDone = stepNum < inst.currentStep;
                        const isCurrent = stepNum === inst.currentStep;
                        return (
                          <div key={i} className="flex items-center">
                            <div
                              className={`flex h-7 w-7 items-center justify-center rounded-md text-[10px] font-semibold ${
                                isDone ? 'bg-[#D1FAE5] text-[#059669]' :
                                isCurrent ? 'bg-[#5E5CE6] text-white' :
                                'bg-[#f5f5f5] text-[#888]'
                              }`}
                              title={`${step.role} - ${step.type}`}
                            >
                              {isDone ? '\u2713' : stepNum}
                            </div>
                            {i < inst.definitionSteps.length - 1 && (
                              <div className={`mx-0.5 h-px w-4 ${isDone ? 'bg-[#059669]' : 'bg-[#d4d4d4]'}`} />
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {/* Approve/Reject buttons */}
                  {isActive && (
                    <div className="mt-4 border-t border-[#f0f0f0] pt-4">
                      {!isActionTarget ? (
                        <div className="flex gap-2">
                          <button
                            onClick={() => {
                              setActionTarget({ instanceId: inst.id, decision: 'approved' });
                              setActionComments('');
                              setActionError('');
                            }}
                            className="rounded-lg bg-[#059669] px-4 py-2 text-[12px] font-semibold text-white transition-all hover:bg-[#047857]"
                          >
                            Onayla
                          </button>
                          <button
                            onClick={() => {
                              setActionTarget({ instanceId: inst.id, decision: 'rejected' });
                              setActionComments('');
                              setActionError('');
                            }}
                            className="rounded-lg bg-[#DC2626] px-4 py-2 text-[12px] font-semibold text-white transition-all hover:bg-[#B91C1C]"
                          >
                            Reddet
                          </button>
                          <button
                            onClick={() => {
                              setActionTarget({ instanceId: inst.id, decision: 'escalated' });
                              setActionComments('');
                              setActionError('');
                            }}
                            className="rounded-lg border border-[#D97706] px-4 py-2 text-[12px] font-semibold text-[#D97706] transition-all hover:bg-[#FEF3C7]"
                          >
                            Eskale Et
                          </button>
                        </div>
                      ) : (
                        <div className="flex flex-col gap-3">
                          <div className="text-[12px] font-semibold text-[#525252]">
                            {actionTarget.decision === 'approved' ? 'Onay' : actionTarget.decision === 'rejected' ? 'Red' : 'Eskalasyon'} yorumu (istege bagli):
                          </div>
                          <textarea
                            value={actionComments}
                            onChange={(e) => setActionComments(e.target.value)}
                            placeholder="Yorum ekleyin..."
                            rows={2}
                            className="w-full rounded-lg border border-[#e0e0e0] px-3 py-2 text-[12px] text-[#0A0A0A] placeholder:text-[#aaa] focus:border-[#5E5CE6] focus:outline-none"
                          />
                          {actionError && (
                            <div className="text-[11px] font-medium text-[#DC2626]">{actionError}</div>
                          )}
                          <div className="flex gap-2">
                            <button
                              onClick={handleAction}
                              disabled={actionLoading}
                              className={`rounded-lg px-4 py-2 text-[12px] font-semibold text-white transition-all ${
                                actionTarget.decision === 'approved' ? 'bg-[#059669] hover:bg-[#047857]' :
                                actionTarget.decision === 'rejected' ? 'bg-[#DC2626] hover:bg-[#B91C1C]' :
                                'bg-[#D97706] hover:bg-[#B45309]'
                              } disabled:opacity-50`}
                            >
                              {actionLoading ? 'Isleniyor...' : 'Onayla ve Gonder'}
                            </button>
                            <button
                              onClick={() => { setActionTarget(null); setActionComments(''); setActionError(''); }}
                              className="rounded-lg border border-[#e0e0e0] px-4 py-2 text-[12px] font-medium text-[#888] transition-all hover:bg-[#fafafa]"
                            >
                              Iptal
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
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
                        {STEP_ICONS[step.type] || '\u2022'}
                      </div>
                      <span className="mt-1 text-[9px] font-medium text-[#888]">{ROLE_LABELS[step.role] || step.role}</span>
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

      {/* Recent Actions / History */}
      {tab === 'history' && (
        <div className="overflow-hidden rounded-xl border border-[#f0f0f0] bg-white">
          {recentActions.length === 0 ? (
            <div className="p-8 text-center text-[13px] text-[#888]">Henuz islem gecmisi yok.</div>
          ) : (
            <table className="w-full text-[12px]">
              <thead>
                <tr className="border-b border-[#f0f0f0] bg-[#fafafa]">
                  <th className="px-4 py-3 text-left font-semibold text-[#525252]">Akis</th>
                  <th className="px-4 py-3 text-left font-semibold text-[#525252]">Adim</th>
                  <th className="px-4 py-3 text-left font-semibold text-[#525252]">Karar</th>
                  <th className="px-4 py-3 text-left font-semibold text-[#525252]">Yorum</th>
                  <th className="px-4 py-3 text-left font-semibold text-[#525252]">Tarih</th>
                  <th className="px-4 py-3 text-left font-semibold text-[#525252]">Gecen Sure</th>
                </tr>
              </thead>
              <tbody>
                {recentActions.map((action, i) => {
                  const timeSince = action.completedAt ? formatDuration(action.completedAt) : null;
                  return (
                    <tr key={i} className="border-b border-[#f0f0f0] last:border-0 hover:bg-[#fafafa]">
                      <td className="px-4 py-3 font-medium text-[#0A0A0A]">{action.definitionName}</td>
                      <td className="px-4 py-3 text-[#525252]">Adim {action.stepIndex}</td>
                      <td className="px-4 py-3">
                        <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                          action.decision === 'approved' ? 'bg-[#D1FAE5] text-[#059669]' :
                          action.decision === 'rejected' ? 'bg-[#FEE2E2] text-[#DC2626]' :
                          'bg-[#FEF3C7] text-[#D97706]'
                        }`}>
                          {action.decision === 'approved' ? 'Onaylandi' : action.decision === 'rejected' ? 'Reddedildi' : 'Eskalasyon'}
                        </span>
                      </td>
                      <td className="max-w-[200px] truncate px-4 py-3 text-[#888]">{action.comments || '-'}</td>
                      <td className="px-4 py-3 text-[#888]">{new Date(action.completedAt).toLocaleDateString('tr-TR')}</td>
                      <td className="px-4 py-3">
                        {timeSince && (
                          <span className="text-[10px] font-semibold" style={{ color: timeSince.slaColor }}>
                            {timeSince.text} once
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* New Instance Modal */}
      {showNewModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
            <h3 className="text-[16px] font-semibold text-[#0A0A0A]">Yeni Is Akisi Baslat</h3>
            <p className="mt-1 text-[12px] text-[#888]">Bir is akisi tanimini secin ve baslatin.</p>

            <div className="mt-5 flex flex-col gap-4">
              {/* Definition select */}
              <div>
                <label className="mb-1 block text-[11px] font-semibold text-[#525252]">Is Akisi Tanimi</label>
                <select
                  value={newDefId}
                  onChange={(e) => setNewDefId(e.target.value)}
                  className="w-full rounded-lg border border-[#e0e0e0] bg-white px-3 py-2.5 text-[13px] text-[#0A0A0A] focus:border-[#5E5CE6] focus:outline-none"
                >
                  <option value="">Secin...</option>
                  {definitions.filter((d) => d.active).map((d) => (
                    <option key={d.id} value={d.id}>{d.name} ({d.steps.length} adim)</option>
                  ))}
                </select>
              </div>

              {/* Entity type */}
              <div>
                <label className="mb-1 block text-[11px] font-semibold text-[#525252]">Varlik Tipi</label>
                <select
                  value={newEntityType}
                  onChange={(e) => setNewEntityType(e.target.value)}
                  className="w-full rounded-lg border border-[#e0e0e0] bg-white px-3 py-2.5 text-[13px] text-[#0A0A0A] focus:border-[#5E5CE6] focus:outline-none"
                >
                  <option value="">Secin...</option>
                  <option value="leave_request">Izin Talebi</option>
                  <option value="performance_review">Performans Degerlendirme</option>
                  <option value="compensation_review">Maas Artisi</option>
                  <option value="onboarding">Ise Alim</option>
                  <option value="employee">Calisan</option>
                  <option value="document">Belge</option>
                </select>
              </div>

              {/* Entity ID */}
              <div>
                <label className="mb-1 block text-[11px] font-semibold text-[#525252]">Varlik ID</label>
                <input
                  type="text"
                  value={newEntityId}
                  onChange={(e) => setNewEntityId(e.target.value)}
                  placeholder="ornek: uuid veya referans no"
                  className="w-full rounded-lg border border-[#e0e0e0] px-3 py-2.5 text-[13px] text-[#0A0A0A] placeholder:text-[#aaa] focus:border-[#5E5CE6] focus:outline-none"
                />
              </div>

              {newError && (
                <div className="text-[11px] font-medium text-[#DC2626]">{newError}</div>
              )}
            </div>

            <div className="mt-6 flex justify-end gap-2">
              <button
                onClick={() => { setShowNewModal(false); setNewError(''); }}
                className="rounded-lg border border-[#e0e0e0] px-4 py-2.5 text-[13px] font-medium text-[#888] transition-all hover:bg-[#fafafa]"
              >
                Iptal
              </button>
              <button
                onClick={handleCreateInstance}
                disabled={newLoading}
                className="rounded-lg bg-[#5E5CE6] px-4 py-2.5 text-[13px] font-semibold text-white transition-all hover:bg-[#4B49B6] disabled:opacity-50"
              >
                {newLoading ? 'Olusturuluyor...' : 'Baslat'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
