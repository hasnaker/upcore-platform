'use client';

import { useState, useEffect, useCallback } from 'react';

interface ENPSData {
  score: number;
  promoters: number;
  passives: number;
  detractors: number;
  total: number;
}

interface DeptScore {
  department: string;
  satisfaction: number;
  growth: number;
  culture: number;
  responseCount: number;
}

interface ActionPlan {
  id: string;
  title: string;
  description: string;
  owner: string;
  status: string;
  dueDate: string;
}

interface Survey {
  id: string;
  name: string;
  survey_type: string;
  status: string;
  start_date: string;
  end_date: string;
}

interface SurveyForm {
  name: string;
  surveyType: string;
  startDate: string;
  endDate: string;
}

interface ActionPlanForm {
  title: string;
  description: string;
  ownerId: string;
  dueDate: string;
  departmentId: string;
}

interface ResponseForm {
  surveyId: string;
  enpsScore: number | null;
  satisfaction: number;
  growth: number;
  culture: number;
  comments: string;
}

const SURVEY_TYPE_LABELS: Record<string, string> = {
  pulse: 'Nabiz Anketi',
  enps: 'eNPS Anketi',
  annual: 'Yillik Anket',
};

const EMPTY_SURVEY_FORM: SurveyForm = { name: '', surveyType: 'pulse', startDate: '', endDate: '' };
const EMPTY_ACTION_FORM: ActionPlanForm = { title: '', description: '', ownerId: '', dueDate: '', departmentId: '' };
const EMPTY_RESPONSE_FORM: ResponseForm = { surveyId: '', enpsScore: null, satisfaction: 3, growth: 3, culture: 3, comments: '' };

export default function BaglilikPage() {
  const [enps, setEnps] = useState<ENPSData | null>(null);
  const [deptScores, setDeptScores] = useState<DeptScore[]>([]);
  const [actionPlans, setActionPlans] = useState<ActionPlan[]>([]);
  const [surveys, setSurveys] = useState<Survey[]>([]);
  const [tab, setTab] = useState<'enps' | 'departments' | 'actions' | 'respond'>('enps');

  // Modal & form states
  const [showNewSurvey, setShowNewSurvey] = useState(false);
  const [surveyForm, setSurveyForm] = useState<SurveyForm>(EMPTY_SURVEY_FORM);
  const [showNewAction, setShowNewAction] = useState(false);
  const [actionForm, setActionForm] = useState<ActionPlanForm>(EMPTY_ACTION_FORM);
  const [responseForm, setResponseForm] = useState<ResponseForm>(EMPTY_RESPONSE_FORM);
  const [submitting, setSubmitting] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const showToast = useCallback((message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  }, []);

  const loadData = useCallback(() => {
    fetch('/api/engagement')
      .then((r) => r.json())
      .then((data) => {
        if (data.eNPS) setEnps(data.eNPS);
        if (data.departmentScores) setDeptScores(data.departmentScores);
        if (data.actionPlans) setActionPlans(data.actionPlans);
        if (data.surveys) setSurveys(data.surveys);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleCreateSurvey = async () => {
    if (!surveyForm.name.trim()) {
      showToast('Anket adi zorunludur', 'error');
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch('/api/engagement', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'create_survey',
          name: surveyForm.name.trim(),
          surveyType: surveyForm.surveyType,
          startDate: surveyForm.startDate || null,
          endDate: surveyForm.endDate || null,
        }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        showToast('Anket olusturuldu!');
        setShowNewSurvey(false);
        setSurveyForm(EMPTY_SURVEY_FORM);
        loadData();
      } else {
        showToast(data.error || 'Anket olusturulamadi', 'error');
      }
    } catch {
      showToast('Baglanti hatasi', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleCreateActionPlan = async () => {
    if (!actionForm.title.trim()) {
      showToast('Baslik zorunludur', 'error');
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch('/api/engagement', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'create_action_plan',
          title: actionForm.title.trim(),
          description: actionForm.description.trim(),
          ownerId: actionForm.ownerId.trim() || null,
          dueDate: actionForm.dueDate || null,
          departmentId: actionForm.departmentId.trim() || null,
        }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        showToast('Aksiyon plani olusturuldu!');
        setShowNewAction(false);
        setActionForm(EMPTY_ACTION_FORM);
        loadData();
      } else {
        showToast(data.error || 'Aksiyon plani olusturulamadi', 'error');
      }
    } catch {
      showToast('Baglanti hatasi', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleSubmitResponse = async () => {
    if (!responseForm.surveyId) {
      showToast('Bir anket secmelisiniz', 'error');
      return;
    }
    if (responseForm.enpsScore === null) {
      showToast('eNPS puani secmelisiniz', 'error');
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch('/api/engagement', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'submit_response',
          surveyId: responseForm.surveyId,
          enpsScore: responseForm.enpsScore,
          responses: {
            satisfaction: responseForm.satisfaction,
            growth: responseForm.growth,
            culture: responseForm.culture,
          },
          comments: responseForm.comments.trim() || null,
        }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        showToast('Yanitiniz kaydedildi!');
        setResponseForm(EMPTY_RESPONSE_FORM);
        loadData();
      } else {
        showToast(data.error || 'Yanit gonderilemedi', 'error');
      }
    } catch {
      showToast('Baglanti hatasi', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const enpsColor = (score: number) => score >= 50 ? '#059669' : score >= 20 ? '#5E5CE6' : score >= 0 ? '#D97706' : '#DC2626';
  const enpsLabel = (score: number) => score >= 50 ? 'Mukemmel' : score >= 20 ? 'Iyi' : score >= 0 ? 'Gelisim Gerekli' : 'Kritik';

  return (
    <div className="flex flex-col gap-8">
      {/* Toast Notification */}
      {toast && (
        <div className={`fixed right-4 top-4 z-50 rounded-xl px-5 py-3 text-[13px] font-medium shadow-lg transition-all ${
          toast.type === 'success' ? 'bg-[#059669] text-white' : 'bg-[#DC2626] text-white'
        }`}>
          {toast.message}
        </div>
      )}

      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-[#0A0A0A]">Calisan Bagliligi</h1>
          <p className="mt-1 text-sm text-[#525252]">eNPS takibi, departman memnuniyeti ve aksiyon planlari.</p>
        </div>
        <button onClick={() => setShowNewSurvey(true)}
          className="rounded-lg bg-[#5E5CE6] px-4 py-2.5 text-[13px] font-semibold text-white shadow-sm transition-all hover:bg-[#4B49C9]">
          + Yeni Anket Baslat
        </button>
      </div>

      {/* New Survey Modal */}
      {showNewSurvey && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={() => setShowNewSurvey(false)}>
          <div className="mx-4 w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-[16px] font-semibold text-[#0A0A0A]">Yeni Anket Olustur</h3>
            <div className="mt-4 grid gap-3">
              <div>
                <label className="text-[11px] font-semibold text-[#888]">Anket Adi *</label>
                <input value={surveyForm.name} onChange={(e) => setSurveyForm({ ...surveyForm, name: e.target.value })}
                  placeholder="Orn: 2026 Q2 Nabiz Anketi" className="mt-1 w-full rounded-lg border border-[#e5e5e5] px-3 py-2 text-[13px] outline-none focus:border-[#5E5CE6]" />
              </div>
              <div>
                <label className="text-[11px] font-semibold text-[#888]">Anket Turu</label>
                <select value={surveyForm.surveyType} onChange={(e) => setSurveyForm({ ...surveyForm, surveyType: e.target.value })}
                  className="mt-1 w-full rounded-lg border border-[#e5e5e5] px-3 py-2 text-[13px] outline-none focus:border-[#5E5CE6]">
                  {Object.entries(SURVEY_TYPE_LABELS).map(([key, label]) => (
                    <option key={key} value={key}>{label}</option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-semibold text-[#888]">Baslangic Tarihi</label>
                  <input type="date" value={surveyForm.startDate} onChange={(e) => setSurveyForm({ ...surveyForm, startDate: e.target.value })}
                    className="mt-1 w-full rounded-lg border border-[#e5e5e5] px-3 py-2 text-[13px] outline-none focus:border-[#5E5CE6]" />
                </div>
                <div>
                  <label className="text-[11px] font-semibold text-[#888]">Bitis Tarihi</label>
                  <input type="date" value={surveyForm.endDate} onChange={(e) => setSurveyForm({ ...surveyForm, endDate: e.target.value })}
                    className="mt-1 w-full rounded-lg border border-[#e5e5e5] px-3 py-2 text-[13px] outline-none focus:border-[#5E5CE6]" />
                </div>
              </div>
            </div>
            <div className="mt-5 flex justify-end gap-2">
              <button onClick={() => { setShowNewSurvey(false); setSurveyForm(EMPTY_SURVEY_FORM); }}
                className="rounded-lg border border-[#e5e5e5] px-4 py-2 text-[13px] font-medium text-[#525252] hover:bg-[#fafafa]">
                Iptal
              </button>
              <button onClick={handleCreateSurvey} disabled={submitting}
                className="rounded-lg bg-[#5E5CE6] px-4 py-2 text-[13px] font-semibold text-white hover:bg-[#4B49C9] disabled:opacity-50">
                {submitting ? 'Olusturuluyor...' : 'Olustur'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* eNPS Hero Card */}
      {enps && (
        <div className="rounded-2xl border border-[#f0f0f0] bg-white p-8">
          <div className="flex flex-col items-center gap-6 sm:flex-row sm:items-start sm:gap-12">
            {/* Score Gauge */}
            <div className="flex flex-col items-center">
              <div className="relative flex h-32 w-32 items-center justify-center">
                <svg className="absolute inset-0" viewBox="0 0 120 120">
                  <circle cx="60" cy="60" r="54" fill="none" stroke="#f0f0f0" strokeWidth="8" />
                  <circle cx="60" cy="60" r="54" fill="none" stroke={enpsColor(enps.score)} strokeWidth="8"
                    strokeDasharray={`${Math.max(0, (enps.score + 100) / 200) * 339} 339`}
                    strokeLinecap="round" transform="rotate(-90 60 60)" />
                </svg>
                <div className="text-center">
                  <div className="text-[28px] font-bold" style={{ color: enpsColor(enps.score) }}>{enps.score}</div>
                  <div className="text-[10px] font-semibold text-[#888]">eNPS</div>
                </div>
              </div>
              <span className="mt-2 rounded-full px-3 py-1 text-[11px] font-semibold" style={{ color: enpsColor(enps.score), background: `${enpsColor(enps.score)}15` }}>
                {enpsLabel(enps.score)}
              </span>
            </div>

            {/* Breakdown */}
            <div className="flex-1">
              <h3 className="text-[15px] font-semibold text-[#0A0A0A]">Employee Net Promoter Score</h3>
              <p className="mt-1 text-[12px] text-[#888]">
                &quot;Upcore&apos;u calisma yeri olarak arkadaslariniza tavsiye eder misiniz?&quot; (0-10)
              </p>
              <div className="mt-4 flex gap-4">
                <div className="flex-1 rounded-lg bg-[#D1FAE5] p-3 text-center">
                  <div className="text-[20px] font-bold text-[#059669]">{enps.promoters}</div>
                  <div className="text-[10px] font-semibold text-[#059669]">Promoter (9-10)</div>
                </div>
                <div className="flex-1 rounded-lg bg-[#FEF3C7] p-3 text-center">
                  <div className="text-[20px] font-bold text-[#D97706]">{enps.passives}</div>
                  <div className="text-[10px] font-semibold text-[#D97706]">Pasif (7-8)</div>
                </div>
                <div className="flex-1 rounded-lg bg-[#FEE2E2] p-3 text-center">
                  <div className="text-[20px] font-bold text-[#DC2626]">{enps.detractors}</div>
                  <div className="text-[10px] font-semibold text-[#DC2626]">Detraktor (0-6)</div>
                </div>
              </div>
              <div className="mt-3 text-[11px] text-[#888]">Toplam {enps.total} yanittan. eNPS = %Promoter - %Detraktor</div>
            </div>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-1 rounded-xl border border-[#f0f0f0] bg-[#fafafa] p-1">
        {[
          { key: 'enps' as const, label: 'Departman Detay' },
          { key: 'departments' as const, label: 'Memnuniyet Haritasi' },
          { key: 'actions' as const, label: 'Aksiyon Planlari' },
          { key: 'respond' as const, label: 'Anketi Yanitla' },
        ].map((t) => (
          <button key={t.key} onClick={() => setTab(t.key)}
            className={`flex-1 rounded-lg px-4 py-2.5 text-[13px] font-medium transition-all ${tab === t.key ? 'bg-white text-[#0A0A0A] shadow-sm' : 'text-[#737373]'}`}>
            {t.label}
          </button>
        ))}
      </div>

      {/* Department Scores */}
      {tab === 'enps' && (
        <div className="grid gap-3">
          {deptScores.map((dept) => {
            const avgScore = ((dept.satisfaction + dept.growth + dept.culture) / 3).toFixed(1);
            return (
              <div key={dept.department} className="rounded-xl border border-[#f0f0f0] bg-white p-5">
                <div className="flex items-center justify-between">
                  <h4 className="text-[14px] font-semibold text-[#0A0A0A]">{dept.department}</h4>
                  <span className="text-[12px] text-[#888]">{dept.responseCount} yanit</span>
                </div>
                <div className="mt-3 grid grid-cols-3 gap-4">
                  {[
                    { label: 'Memnuniyet', value: dept.satisfaction, color: '#5E5CE6' },
                    { label: 'Gelisim', value: dept.growth, color: '#059669' },
                    { label: 'Kultur', value: dept.culture, color: '#D97706' },
                  ].map((dim) => (
                    <div key={dim.label}>
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="text-[#888]">{dim.label}</span>
                        <span className="font-bold" style={{ color: dim.color }}>{dim.value}/5</span>
                      </div>
                      <div className="mt-1 h-2 overflow-hidden rounded-full bg-[#f0f0f0]">
                        <div className="h-full rounded-full" style={{ width: `${(dim.value / 5) * 100}%`, background: dim.color }} />
                      </div>
                    </div>
                  ))}
                </div>
                <div className="mt-2 text-right text-[11px] font-semibold text-[#5E5CE6]">Ortalama: {avgScore}/5</div>
              </div>
            );
          })}
        </div>
      )}

      {/* Satisfaction Heatmap */}
      {tab === 'departments' && (
        <div className="rounded-xl border border-[#f0f0f0] bg-white p-6">
          <h3 className="mb-4 text-[13px] font-semibold uppercase tracking-widest text-[#A3A3A3]">Departman Memnuniyet Haritasi</h3>
          <div className="overflow-hidden rounded-lg">
            <div className="grid grid-cols-4 gap-px bg-[#f0f0f0]">
              <div className="bg-[#fafafa] p-3 text-[11px] font-semibold text-[#888]">Departman</div>
              <div className="bg-[#fafafa] p-3 text-center text-[11px] font-semibold text-[#888]">Memnuniyet</div>
              <div className="bg-[#fafafa] p-3 text-center text-[11px] font-semibold text-[#888]">Gelisim</div>
              <div className="bg-[#fafafa] p-3 text-center text-[11px] font-semibold text-[#888]">Kultur</div>
              {deptScores.map((dept) => (
                <>
                  <div key={`${dept.department}-name`} className="bg-white p-3 text-[12px] font-medium text-[#0A0A0A]">{dept.department}</div>
                  {[dept.satisfaction, dept.growth, dept.culture].map((val, i) => {
                    const bg = val >= 4 ? '#D1FAE5' : val >= 3 ? '#FEF3C7' : '#FEE2E2';
                    const color = val >= 4 ? '#059669' : val >= 3 ? '#D97706' : '#DC2626';
                    return (
                      <div key={`${dept.department}-${i}`} className="flex items-center justify-center p-3" style={{ background: bg }}>
                        <span className="text-[14px] font-bold" style={{ color }}>{val}</span>
                      </div>
                    );
                  })}
                </>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Action Plans */}
      {tab === 'actions' && (
        <div className="flex flex-col gap-4">
          {/* New Action Plan Button */}
          <div className="flex justify-end">
            <button onClick={() => setShowNewAction(true)}
              className="rounded-lg bg-[#059669] px-4 py-2.5 text-[13px] font-semibold text-white shadow-sm transition-all hover:bg-[#047857]">
              + Yeni Aksiyon Plani
            </button>
          </div>

          {/* New Action Plan Modal */}
          {showNewAction && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={() => setShowNewAction(false)}>
              <div className="mx-4 w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl" onClick={(e) => e.stopPropagation()}>
                <h3 className="text-[16px] font-semibold text-[#0A0A0A]">Yeni Aksiyon Plani</h3>
                <div className="mt-4 grid gap-3">
                  <div>
                    <label className="text-[11px] font-semibold text-[#888]">Baslik *</label>
                    <input value={actionForm.title} onChange={(e) => setActionForm({ ...actionForm, title: e.target.value })}
                      placeholder="Aksiyon plani basligi" className="mt-1 w-full rounded-lg border border-[#e5e5e5] px-3 py-2 text-[13px] outline-none focus:border-[#5E5CE6]" />
                  </div>
                  <div>
                    <label className="text-[11px] font-semibold text-[#888]">Aciklama</label>
                    <textarea value={actionForm.description} onChange={(e) => setActionForm({ ...actionForm, description: e.target.value })}
                      placeholder="Detayli aciklama" rows={3}
                      className="mt-1 w-full resize-none rounded-lg border border-[#e5e5e5] px-3 py-2 text-[13px] outline-none focus:border-[#5E5CE6]" />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-[11px] font-semibold text-[#888]">Sorumlu ID</label>
                      <input value={actionForm.ownerId} onChange={(e) => setActionForm({ ...actionForm, ownerId: e.target.value })}
                        placeholder="Calisan ID" className="mt-1 w-full rounded-lg border border-[#e5e5e5] px-3 py-2 text-[13px] outline-none focus:border-[#5E5CE6]" />
                    </div>
                    <div>
                      <label className="text-[11px] font-semibold text-[#888]">Departman ID</label>
                      <input value={actionForm.departmentId} onChange={(e) => setActionForm({ ...actionForm, departmentId: e.target.value })}
                        placeholder="Departman ID" className="mt-1 w-full rounded-lg border border-[#e5e5e5] px-3 py-2 text-[13px] outline-none focus:border-[#5E5CE6]" />
                    </div>
                  </div>
                  <div>
                    <label className="text-[11px] font-semibold text-[#888]">Son Tarih</label>
                    <input type="date" value={actionForm.dueDate} onChange={(e) => setActionForm({ ...actionForm, dueDate: e.target.value })}
                      className="mt-1 w-full rounded-lg border border-[#e5e5e5] px-3 py-2 text-[13px] outline-none focus:border-[#5E5CE6]" />
                  </div>
                </div>
                <div className="mt-5 flex justify-end gap-2">
                  <button onClick={() => { setShowNewAction(false); setActionForm(EMPTY_ACTION_FORM); }}
                    className="rounded-lg border border-[#e5e5e5] px-4 py-2 text-[13px] font-medium text-[#525252] hover:bg-[#fafafa]">
                    Iptal
                  </button>
                  <button onClick={handleCreateActionPlan} disabled={submitting}
                    className="rounded-lg bg-[#059669] px-4 py-2 text-[13px] font-semibold text-white hover:bg-[#047857] disabled:opacity-50">
                    {submitting ? 'Olusturuluyor...' : 'Olustur'}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Action Plan Cards */}
          <div className="flex flex-col gap-3">
            {actionPlans.length === 0 ? (
              <div className="rounded-xl border border-[#f0f0f0] bg-white p-8 text-center text-[13px] text-[#888]">
                Henuz aksiyon plani olusturulmamis.
              </div>
            ) : (
              actionPlans.map((plan) => (
                <div key={plan.id} className="rounded-xl border border-[#f0f0f0] bg-white p-5">
                  <div className="flex items-start justify-between">
                    <div>
                      <h4 className="text-[14px] font-semibold text-[#0A0A0A]">{plan.title}</h4>
                      {plan.description && <p className="mt-1 text-[12px] text-[#888]">{plan.description}</p>}
                    </div>
                    <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                      plan.status === 'completed' ? 'bg-[#D1FAE5] text-[#059669]' :
                      plan.status === 'in_progress' ? 'bg-[#f0f0ff] text-[#5E5CE6]' :
                      'bg-[#F5F5F5] text-[#888]'
                    }`}>
                      {plan.status === 'completed' ? 'Tamamlandi' : plan.status === 'in_progress' ? 'Devam Ediyor' : 'Planlandi'}
                    </span>
                  </div>
                  <div className="mt-3 flex items-center gap-4 text-[11px] text-[#888]">
                    {plan.owner && <span>Sorumlu: {plan.owner}</span>}
                    {plan.dueDate && <span>Son Tarih: {new Date(plan.dueDate).toLocaleDateString('tr-TR')}</span>}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* Survey Response Form */}
      {tab === 'respond' && (
        <div className="rounded-2xl border border-[#f0f0f0] bg-white p-6">
          <h3 className="text-[16px] font-semibold text-[#0A0A0A]">Anketi Yanitla</h3>
          <p className="mt-1 text-[12px] text-[#888]">Asagidaki sorulari yanitlayarak geri bildiriminizi paylasın.</p>

          <div className="mt-6 grid gap-6">
            {/* Survey Selection */}
            <div>
              <label className="text-[12px] font-semibold text-[#525252]">Anket Secin</label>
              <select value={responseForm.surveyId} onChange={(e) => setResponseForm({ ...responseForm, surveyId: e.target.value })}
                className="mt-1 w-full rounded-lg border border-[#e5e5e5] px-3 py-2.5 text-[13px] outline-none focus:border-[#5E5CE6]">
                <option value="">-- Anket secin --</option>
                {surveys.filter((s) => s.status === 'active').map((s) => (
                  <option key={s.id} value={s.id}>{s.name} ({SURVEY_TYPE_LABELS[s.survey_type] || s.survey_type})</option>
                ))}
              </select>
            </div>

            {/* eNPS Question */}
            <div>
              <label className="text-[12px] font-semibold text-[#525252]">
                Upcore&apos;u calisma yeri olarak arkadaslariniza tavsiye eder misiniz? (0-10)
              </label>
              <div className="mt-3 flex flex-wrap gap-2">
                {Array.from({ length: 11 }, (_, i) => i).map((score) => {
                  const isSelected = responseForm.enpsScore === score;
                  const bg = score >= 9 ? (isSelected ? '#059669' : '#D1FAE5') :
                             score >= 7 ? (isSelected ? '#D97706' : '#FEF3C7') :
                             (isSelected ? '#DC2626' : '#FEE2E2');
                  const color = score >= 9 ? (isSelected ? '#fff' : '#059669') :
                                score >= 7 ? (isSelected ? '#fff' : '#D97706') :
                                (isSelected ? '#fff' : '#DC2626');
                  return (
                    <button key={score} onClick={() => setResponseForm({ ...responseForm, enpsScore: score })}
                      className="flex h-10 w-10 items-center justify-center rounded-lg text-[14px] font-bold transition-all"
                      style={{ background: bg, color }}>
                      {score}
                    </button>
                  );
                })}
              </div>
              <div className="mt-2 flex justify-between text-[10px] text-[#aaa]">
                <span>Kesinlikle tavsiye etmem</span>
                <span>Kesinlikle tavsiye ederim</span>
              </div>
            </div>

            {/* Dimension Questions - Likert Scale */}
            {[
              { key: 'satisfaction' as const, label: 'Genel Memnuniyet', desc: 'Is yerinizden ne kadar memnunsunuz?' },
              { key: 'growth' as const, label: 'Gelisim Firsatlari', desc: 'Kariyer gelisim firsatlarinizi nasil degerlendirirsiniz?' },
              { key: 'culture' as const, label: 'Sirket Kulturu', desc: 'Sirket kulturunu nasil degerlendirirsiniz?' },
            ].map((dim) => (
              <div key={dim.key}>
                <label className="text-[12px] font-semibold text-[#525252]">{dim.label}</label>
                <p className="text-[11px] text-[#888]">{dim.desc}</p>
                <div className="mt-2 flex gap-2">
                  {[1, 2, 3, 4, 5].map((val) => {
                    const isSelected = responseForm[dim.key] === val;
                    const labels = ['Cok Kotu', 'Kotu', 'Orta', 'Iyi', 'Cok Iyi'];
                    return (
                      <button key={val} onClick={() => setResponseForm({ ...responseForm, [dim.key]: val })}
                        className={`flex-1 rounded-lg border py-2.5 text-center transition-all ${
                          isSelected
                            ? 'border-[#5E5CE6] bg-[#5E5CE6] text-white'
                            : 'border-[#e5e5e5] bg-white text-[#525252] hover:border-[#5E5CE6] hover:bg-[#f0f0ff]'
                        }`}>
                        <div className="text-[14px] font-bold">{val}</div>
                        <div className="text-[9px]">{labels[val - 1]}</div>
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}

            {/* Comments */}
            <div>
              <label className="text-[12px] font-semibold text-[#525252]">Ek Yorumlariniz</label>
              <textarea value={responseForm.comments} onChange={(e) => setResponseForm({ ...responseForm, comments: e.target.value })}
                placeholder="Eklemek istediginiz dusuncelerinizi yazin..." rows={4}
                className="mt-1 w-full resize-none rounded-lg border border-[#e5e5e5] px-3 py-2.5 text-[13px] outline-none focus:border-[#5E5CE6]" />
            </div>

            {/* Submit */}
            <div className="flex justify-end">
              <button onClick={handleSubmitResponse} disabled={submitting}
                className="rounded-lg bg-[#5E5CE6] px-6 py-2.5 text-[13px] font-semibold text-white shadow-sm transition-all hover:bg-[#4B49C9] disabled:opacity-50">
                {submitting ? 'Gonderiliyor...' : 'Yaniti Gonder'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
