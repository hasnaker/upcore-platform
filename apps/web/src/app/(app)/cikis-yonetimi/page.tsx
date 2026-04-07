'use client';

import { useState, useEffect, useCallback } from 'react';

/* ─── Types ─── */
interface ExitInterview {
  interviewId: string;
  interviewerName: string;
  interviewDate: string;
  overallSatisfaction: number;
  reasonForLeaving: string;
  wouldRecommend: boolean;
  feedbackSummary: string;
}

interface OffboardingProcess {
  processId: string;
  employeeId: string;
  name: string;
  department: string;
  reason: 'resignation' | 'termination' | 'mutual' | 'retirement' | 'contract_end';
  lastWorkingDay: string;
  noticePeriodDays: number;
  status: string;
  exitInterviewCompleted: boolean;
  equipmentReturned: boolean;
  accessRevoked: boolean;
  knowledgeTransferStatus: 'pending' | 'in_progress' | 'completed';
  createdAt: string;
  exitInterview: ExitInterview | null;
}

interface OffboardingSummary {
  activeCount: number;
  completedThisMonth: number;
  avgDurationDays: number;
}

interface Employee {
  id: string;
  name: string;
  department: string;
}

/* ─── Constants ─── */
const REASON_LABELS: { [key: string]: { label: string; bg: string; text: string } } = {
  resignation: { label: 'Istifa', bg: '#FEF3C7', text: '#D97706' },
  termination: { label: 'Is Akdi Feshi', bg: '#FEE2E2', text: '#DC2626' },
  mutual: { label: 'Karsilikli', bg: '#EEF0FD', text: '#5E5CE6' },
  retirement: { label: 'Emeklilik', bg: '#D1FAE5', text: '#059669' },
  contract_end: { label: 'Sozlesme Sonu', bg: '#F3F4F6', text: '#6B7280' },
};

const STATUS_LABELS: { [key: string]: { label: string; bg: string; text: string } } = {
  active: { label: 'Aktif', bg: '#EEF0FD', text: '#5E5CE6' },
  in_progress: { label: 'Devam Ediyor', bg: '#FEF3C7', text: '#D97706' },
  completed: { label: 'Tamamlandi', bg: '#D1FAE5', text: '#059669' },
};

const KT_LABELS: { [key: string]: { label: string; bg: string; text: string } } = {
  pending: { label: 'Beklemede', bg: '#F3F4F6', text: '#6B7280' },
  in_progress: { label: 'Devam Ediyor', bg: '#FEF3C7', text: '#D97706' },
  completed: { label: 'Tamamlandi', bg: '#D1FAE5', text: '#059669' },
};

/* ─── Fallback Data ─── */
const FALLBACK_PROCESSES: OffboardingProcess[] = [
  {
    processId: 'off-1',
    employeeId: 'emp-1',
    name: 'Ali Yilmaz',
    department: 'Muhendislik',
    reason: 'resignation',
    lastWorkingDay: '2026-04-30',
    noticePeriodDays: 30,
    status: 'active',
    exitInterviewCompleted: true,
    equipmentReturned: false,
    accessRevoked: false,
    knowledgeTransferStatus: 'in_progress',
    createdAt: '2026-03-31T10:00:00Z',
    exitInterview: {
      interviewId: 'ei-1',
      interviewerName: 'Ayse Demir',
      interviewDate: '2026-04-05',
      overallSatisfaction: 3,
      reasonForLeaving: 'Kariyer gelisimi icin yeni firsatlar aramasi',
      wouldRecommend: true,
      feedbackSummary: 'Calisan genel olarak memnun ancak kariyer yolunun sinirli oldugunu belirtti. Yonetim desteginden memnun.',
    },
  },
  {
    processId: 'off-2',
    employeeId: 'emp-2',
    name: 'Fatma Kaya',
    department: 'Pazarlama',
    reason: 'mutual',
    lastWorkingDay: '2026-04-15',
    noticePeriodDays: 15,
    status: 'active',
    exitInterviewCompleted: false,
    equipmentReturned: false,
    accessRevoked: false,
    knowledgeTransferStatus: 'pending',
    createdAt: '2026-04-01T09:00:00Z',
    exitInterview: null,
  },
  {
    processId: 'off-3',
    employeeId: 'emp-3',
    name: 'Mehmet Ozturk',
    department: 'Finans',
    reason: 'retirement',
    lastWorkingDay: '2026-05-31',
    noticePeriodDays: 60,
    status: 'active',
    exitInterviewCompleted: false,
    equipmentReturned: false,
    accessRevoked: false,
    knowledgeTransferStatus: 'pending',
    createdAt: '2026-03-25T14:00:00Z',
    exitInterview: null,
  },
  {
    processId: 'off-4',
    employeeId: 'emp-4',
    name: 'Zeynep Arslan',
    department: 'Insan Kaynaklari',
    reason: 'termination',
    lastWorkingDay: '2026-03-31',
    noticePeriodDays: 0,
    status: 'completed',
    exitInterviewCompleted: true,
    equipmentReturned: true,
    accessRevoked: true,
    knowledgeTransferStatus: 'completed',
    createdAt: '2026-03-15T08:00:00Z',
    exitInterview: {
      interviewId: 'ei-2',
      interviewerName: 'Hasan Aker',
      interviewDate: '2026-03-28',
      overallSatisfaction: 2,
      reasonForLeaving: 'Performans kaynaklari nedenlerle is akdi feshi',
      wouldRecommend: false,
      feedbackSummary: 'Calisan surec hakkinda olumsuz gorusler belirtti. Egitim ve destek eksikligi vurgulandi.',
    },
  },
  {
    processId: 'off-5',
    employeeId: 'emp-5',
    name: 'Burak Celik',
    department: 'Satis',
    reason: 'contract_end',
    lastWorkingDay: '2026-03-20',
    noticePeriodDays: 15,
    status: 'completed',
    exitInterviewCompleted: true,
    equipmentReturned: true,
    accessRevoked: true,
    knowledgeTransferStatus: 'completed',
    createdAt: '2026-03-01T11:00:00Z',
    exitInterview: null,
  },
];

const FALLBACK_SUMMARY: OffboardingSummary = {
  activeCount: 3,
  completedThisMonth: 2,
  avgDurationDays: 18,
};

const FALLBACK_EMPLOYEES: Employee[] = [
  { id: 'emp-10', name: 'Emre Sahin', department: 'Muhendislik' },
  { id: 'emp-11', name: 'Selin Yildiz', department: 'Pazarlama' },
  { id: 'emp-12', name: 'Kerem Aslan', department: 'Urun' },
  { id: 'emp-13', name: 'Deniz Korkmaz', department: 'Satis' },
  { id: 'emp-14', name: 'Elif Dogan', department: 'Finans' },
];

/* ─── Component ─── */
export default function CikisYonetimiPage() {
  const [processes, setProcesses] = useState<OffboardingProcess[]>(FALLBACK_PROCESSES);
  const [summary, setSummary] = useState<OffboardingSummary>(FALLBACK_SUMMARY);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [employees] = useState<Employee[]>(FALLBACK_EMPLOYEES);

  // New process form state
  const [formEmployeeId, setFormEmployeeId] = useState('');
  const [formReason, setFormReason] = useState('resignation');
  const [formLastDay, setFormLastDay] = useState('');
  const [formNoticeDays, setFormNoticeDays] = useState(30);
  const [submitting, setSubmitting] = useState(false);

  const fetchData = useCallback(() => {
    fetch('/api/offboarding')
      .then((r) => r.json())
      .then((data) => {
        if (data.processes && data.processes.length > 0) {
          setProcesses(data.processes);
        }
        if (data.summary) {
          setSummary(data.summary);
        }
      })
      .catch(() => {
        // API failed — keep fallback data
      });
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleChecklistToggle = (processId: string, field: 'exit_interview_completed' | 'equipment_returned' | 'access_revoked', currentValue: boolean) => {
    const newValue = !currentValue;
    setProcesses((prev) =>
      prev.map((p) => {
        if (p.processId !== processId) return p;
        return {
          ...p,
          [field === 'exit_interview_completed' ? 'exitInterviewCompleted' : field === 'equipment_returned' ? 'equipmentReturned' : 'accessRevoked']: newValue,
        };
      }),
    );

    fetch('/api/offboarding', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ processId, field, value: newValue }),
    }).catch(() => {
      // Revert on error
      setProcesses((prev) =>
        prev.map((p) => {
          if (p.processId !== processId) return p;
          return {
            ...p,
            [field === 'exit_interview_completed' ? 'exitInterviewCompleted' : field === 'equipment_returned' ? 'equipmentReturned' : 'accessRevoked']: currentValue,
          };
        }),
      );
    });
  };

  const handleKnowledgeTransfer = (processId: string, value: 'pending' | 'in_progress' | 'completed') => {
    setProcesses((prev) =>
      prev.map((p) => (p.processId === processId ? { ...p, knowledgeTransferStatus: value } : p)),
    );

    fetch('/api/offboarding', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ processId, field: 'knowledge_transfer_status', value }),
    }).catch(() => {
      // Revert would require storing old value
    });
  };

  const handleNewProcess = () => {
    if (!formEmployeeId || !formReason || !formLastDay) return;
    setSubmitting(true);

    fetch('/api/offboarding', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        employeeId: formEmployeeId,
        reason: formReason,
        lastWorkingDay: formLastDay,
        noticePeriodDays: formNoticeDays,
      }),
    })
      .then((r) => r.json())
      .then((data) => {
        if (data.success) {
          const employee = employees.find((e) => e.id === formEmployeeId);
          const newProcess: OffboardingProcess = {
            processId: data.processId || `off-${Date.now()}`,
            employeeId: formEmployeeId,
            name: employee?.name || 'Yeni Calisan',
            department: employee?.department || '',
            reason: formReason as OffboardingProcess['reason'],
            lastWorkingDay: formLastDay,
            noticePeriodDays: formNoticeDays,
            status: 'active',
            exitInterviewCompleted: false,
            equipmentReturned: false,
            accessRevoked: false,
            knowledgeTransferStatus: 'pending',
            createdAt: new Date().toISOString(),
            exitInterview: null,
          };
          setProcesses((prev) => [newProcess, ...prev]);
          setSummary((prev) => ({ ...prev, activeCount: prev.activeCount + 1 }));
        }
        setModalOpen(false);
        setFormEmployeeId('');
        setFormReason('resignation');
        setFormLastDay('');
        setFormNoticeDays(30);
      })
      .catch(() => {
        // Fallback: still add locally
        const employee = employees.find((e) => e.id === formEmployeeId);
        const newProcess: OffboardingProcess = {
          processId: `off-${Date.now()}`,
          employeeId: formEmployeeId,
          name: employee?.name || 'Yeni Calisan',
          department: employee?.department || '',
          reason: formReason as OffboardingProcess['reason'],
          lastWorkingDay: formLastDay,
          noticePeriodDays: formNoticeDays,
          status: 'active',
          exitInterviewCompleted: false,
          equipmentReturned: false,
          accessRevoked: false,
          knowledgeTransferStatus: 'pending',
          createdAt: new Date().toISOString(),
          exitInterview: null,
        };
        setProcesses((prev) => [newProcess, ...prev]);
        setSummary((prev) => ({ ...prev, activeCount: prev.activeCount + 1 }));
        setModalOpen(false);
        setFormEmployeeId('');
        setFormReason('resignation');
        setFormLastDay('');
        setFormNoticeDays(30);
      })
      .finally(() => setSubmitting(false));
  };

  const activeProcesses = processes.filter((p) => p.status === 'active' || p.status === 'in_progress');
  const completedProcesses = processes.filter((p) => p.status === 'completed');

  const formatDate = (dateStr: string) => {
    try {
      return new Date(dateStr).toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' });
    } catch {
      return dateStr;
    }
  };

  const daysRemaining = (lastDay: string) => {
    const diff = Math.ceil((new Date(lastDay).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
    return diff > 0 ? diff : 0;
  };

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 700, color: '#111' }}>Cikis Yonetimi</h1>
          <p style={{ fontSize: 14, color: '#888', marginTop: 4 }}>
            Calisan cikis sureclerini yonetin, kontrol listelerini takip edin.
          </p>
        </div>
        <button
          onClick={() => setModalOpen(true)}
          style={{
            fontSize: 13,
            fontWeight: 600,
            color: 'white',
            background: '#111',
            border: 'none',
            borderRadius: 10,
            padding: '10px 20px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: 6,
          }}
        >
          + Yeni Cikis Sureci
        </button>
      </div>

      {/* Summary Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16 }}>
        <div style={{ background: 'white', border: '1px solid #f0f0f0', borderRadius: 12, padding: 20 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: '#888', textTransform: 'uppercase', letterSpacing: 1 }}>
            Aktif Cikis Sureci
          </div>
          <div style={{ fontSize: 32, fontWeight: 700, color: '#5E5CE6', marginTop: 8 }}>
            {summary.activeCount}
          </div>
          <div style={{ fontSize: 12, color: '#aaa', marginTop: 4 }}>Devam eden surecler</div>
        </div>
        <div style={{ background: 'white', border: '1px solid #f0f0f0', borderRadius: 12, padding: 20 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: '#888', textTransform: 'uppercase', letterSpacing: 1 }}>
            Tamamlanan (Bu Ay)
          </div>
          <div style={{ fontSize: 32, fontWeight: 700, color: '#059669', marginTop: 8 }}>
            {summary.completedThisMonth}
          </div>
          <div style={{ fontSize: 12, color: '#aaa', marginTop: 4 }}>Basariyla sonuclanan</div>
        </div>
        <div style={{ background: 'white', border: '1px solid #f0f0f0', borderRadius: 12, padding: 20 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: '#888', textTransform: 'uppercase', letterSpacing: 1 }}>
            Ortalama Sure
          </div>
          <div style={{ fontSize: 32, fontWeight: 700, color: '#D97706', marginTop: 8 }}>
            {summary.avgDurationDays} <span style={{ fontSize: 14, fontWeight: 400 }}>gun</span>
          </div>
          <div style={{ fontSize: 12, color: '#aaa', marginTop: 4 }}>Cikis sureci ortalamasi</div>
        </div>
      </div>

      {/* Active Processes */}
      {activeProcesses.length > 0 && (
        <div>
          <div style={{ fontSize: 13, fontWeight: 700, color: '#888', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 12 }}>
            Aktif Surecler ({activeProcesses.length})
          </div>
          <div className="flex flex-col gap-3">
            {activeProcesses.map((p) => {
              const reason = REASON_LABELS[p.reason] ?? REASON_LABELS['resignation']!;
              const status = STATUS_LABELS[p.status] ?? STATUS_LABELS['initiated']!;
              const isExpanded = expanded === p.processId;
              const days = daysRemaining(p.lastWorkingDay);
              const completedItems = [p.exitInterviewCompleted, p.equipmentReturned, p.accessRevoked, p.knowledgeTransferStatus === 'completed'].filter(Boolean).length;

              return (
                <div
                  key={p.processId}
                  style={{
                    background: 'white',
                    border: '1px solid #f0f0f0',
                    borderRadius: 12,
                    borderLeft: `3px solid ${days <= 7 ? '#DC2626' : days <= 14 ? '#D97706' : '#5E5CE6'}`,
                    overflow: 'hidden',
                  }}
                >
                  <div style={{ padding: '20px 24px' }}>
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-2" style={{ marginBottom: 6 }}>
                          <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 10, background: reason.bg, color: reason.text }}>
                            {reason.label}
                          </span>
                          <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 10, background: status.bg, color: status.text }}>
                            {status.label}
                          </span>
                          {days <= 7 && (
                            <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 10, background: '#FEE2E2', color: '#DC2626' }}>
                              {days} gun kaldi
                            </span>
                          )}
                        </div>
                        <div style={{ fontSize: 16, fontWeight: 600, color: '#111' }}>{p.name}</div>
                        <div style={{ fontSize: 13, color: '#888', marginTop: 2 }}>
                          {p.department} · Son gun: {formatDate(p.lastWorkingDay)} · Ihbar: {p.noticePeriodDays} gun
                        </div>
                        {/* Mini progress */}
                        <div style={{ marginTop: 8, display: 'flex', alignItems: 'center', gap: 8 }}>
                          <div style={{ flex: 1, height: 4, background: '#f0f0f0', borderRadius: 2 }}>
                            <div style={{ width: `${(completedItems / 4) * 100}%`, height: '100%', background: '#5E5CE6', borderRadius: 2, transition: 'width 0.3s' }} />
                          </div>
                          <span style={{ fontSize: 11, color: '#888', fontWeight: 600 }}>{completedItems}/4</span>
                        </div>
                      </div>
                      <button
                        onClick={() => setExpanded(isExpanded ? null : p.processId)}
                        style={{
                          fontSize: 12,
                          color: '#888',
                          background: 'none',
                          border: '1px solid #e5e5e5',
                          borderRadius: 8,
                          padding: '6px 12px',
                          cursor: 'pointer',
                        }}
                      >
                        {isExpanded ? 'Kapat' : 'Detay'}
                      </button>
                    </div>

                    {/* Expandable Checklist */}
                    {isExpanded && (
                      <div style={{ marginTop: 16, paddingTop: 16, borderTop: '1px solid #f0f0f0' }}>
                        <div style={{ fontSize: 11, fontWeight: 700, color: '#888', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 12 }}>
                          Kontrol Listesi
                        </div>

                        <div className="flex flex-col gap-3">
                          {/* Exit interview toggle */}
                          <div
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: 12,
                              padding: '12px 16px',
                              background: p.exitInterviewCompleted ? '#F0FDF4' : '#FAFAFA',
                              border: `1px solid ${p.exitInterviewCompleted ? '#BBF7D0' : '#f0f0f0'}`,
                              borderRadius: 10,
                              cursor: 'pointer',
                            }}
                            onClick={() => handleChecklistToggle(p.processId, 'exit_interview_completed', p.exitInterviewCompleted)}
                          >
                            <div
                              style={{
                                width: 22,
                                height: 22,
                                borderRadius: 6,
                                border: `2px solid ${p.exitInterviewCompleted ? '#059669' : '#D4D4D4'}`,
                                background: p.exitInterviewCompleted ? '#059669' : 'white',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                flexShrink: 0,
                                transition: 'all 0.2s',
                              }}
                            >
                              {p.exitInterviewCompleted && (
                                <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                                  <path d="M2.5 6L5 8.5L9.5 3.5" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                </svg>
                              )}
                            </div>
                            <div style={{ flex: 1 }}>
                              <div style={{ fontSize: 14, fontWeight: 500, color: '#111' }}>Cikis gorusmesi tamamlandi</div>
                              <div style={{ fontSize: 12, color: '#888' }}>Calisan ile cikis gorusmesi yapildi</div>
                            </div>
                          </div>

                          {/* Equipment returned toggle */}
                          <div
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: 12,
                              padding: '12px 16px',
                              background: p.equipmentReturned ? '#F0FDF4' : '#FAFAFA',
                              border: `1px solid ${p.equipmentReturned ? '#BBF7D0' : '#f0f0f0'}`,
                              borderRadius: 10,
                              cursor: 'pointer',
                            }}
                            onClick={() => handleChecklistToggle(p.processId, 'equipment_returned', p.equipmentReturned)}
                          >
                            <div
                              style={{
                                width: 22,
                                height: 22,
                                borderRadius: 6,
                                border: `2px solid ${p.equipmentReturned ? '#059669' : '#D4D4D4'}`,
                                background: p.equipmentReturned ? '#059669' : 'white',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                flexShrink: 0,
                                transition: 'all 0.2s',
                              }}
                            >
                              {p.equipmentReturned && (
                                <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                                  <path d="M2.5 6L5 8.5L9.5 3.5" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                </svg>
                              )}
                            </div>
                            <div style={{ flex: 1 }}>
                              <div style={{ fontSize: 14, fontWeight: 500, color: '#111' }}>Ekipman iade edildi</div>
                              <div style={{ fontSize: 12, color: '#888' }}>Laptop, telefon ve diger ekipmanlar teslim alindi</div>
                            </div>
                          </div>

                          {/* Access revoked toggle */}
                          <div
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: 12,
                              padding: '12px 16px',
                              background: p.accessRevoked ? '#F0FDF4' : '#FAFAFA',
                              border: `1px solid ${p.accessRevoked ? '#BBF7D0' : '#f0f0f0'}`,
                              borderRadius: 10,
                              cursor: 'pointer',
                            }}
                            onClick={() => handleChecklistToggle(p.processId, 'access_revoked', p.accessRevoked)}
                          >
                            <div
                              style={{
                                width: 22,
                                height: 22,
                                borderRadius: 6,
                                border: `2px solid ${p.accessRevoked ? '#059669' : '#D4D4D4'}`,
                                background: p.accessRevoked ? '#059669' : 'white',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                flexShrink: 0,
                                transition: 'all 0.2s',
                              }}
                            >
                              {p.accessRevoked && (
                                <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                                  <path d="M2.5 6L5 8.5L9.5 3.5" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                </svg>
                              )}
                            </div>
                            <div style={{ flex: 1 }}>
                              <div style={{ fontSize: 14, fontWeight: 500, color: '#111' }}>Sistem erisimi kapatildi</div>
                              <div style={{ fontSize: 12, color: '#888' }}>Tum hesaplar ve erisim yetkileri iptal edildi</div>
                            </div>
                          </div>

                          {/* Knowledge transfer status */}
                          <div
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: 12,
                              padding: '12px 16px',
                              background: p.knowledgeTransferStatus === 'completed' ? '#F0FDF4' : '#FAFAFA',
                              border: `1px solid ${p.knowledgeTransferStatus === 'completed' ? '#BBF7D0' : '#f0f0f0'}`,
                              borderRadius: 10,
                            }}
                          >
                            <div style={{ flex: 1 }}>
                              <div style={{ fontSize: 14, fontWeight: 500, color: '#111' }}>Bilgi transferi durumu</div>
                              <div style={{ fontSize: 12, color: '#888' }}>Is surecleri ve bilgi devri</div>
                            </div>
                            <div style={{ display: 'flex', gap: 4 }}>
                              {(['pending', 'in_progress', 'completed'] as const).map((val) => {
                                const kt = KT_LABELS[val]!;
                                const isSelected = p.knowledgeTransferStatus === val;
                                return (
                                  <button
                                    key={val}
                                    onClick={() => handleKnowledgeTransfer(p.processId, val)}
                                    style={{
                                      fontSize: 11,
                                      fontWeight: 600,
                                      padding: '4px 10px',
                                      borderRadius: 8,
                                      border: `1px solid ${isSelected ? kt.text : '#e5e5e5'}`,
                                      background: isSelected ? kt.bg : 'white',
                                      color: isSelected ? kt.text : '#888',
                                      cursor: 'pointer',
                                    }}
                                  >
                                    {kt.label}
                                  </button>
                                );
                              })}
                            </div>
                          </div>
                        </div>

                        {/* Exit Interview Summary */}
                        {p.exitInterviewCompleted && p.exitInterview && (
                          <div style={{ marginTop: 16, background: '#FAFAFF', border: '1px solid #E0E0FF', borderRadius: 10, padding: 16 }}>
                            <div style={{ fontSize: 11, fontWeight: 700, color: '#5E5CE6', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 10 }}>
                              Cikis Gorusmesi Ozeti
                            </div>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
                              <div>
                                <div style={{ fontSize: 11, color: '#888' }}>Gorusmeci</div>
                                <div style={{ fontSize: 13, fontWeight: 500, color: '#111' }}>{p.exitInterview.interviewerName}</div>
                              </div>
                              <div>
                                <div style={{ fontSize: 11, color: '#888' }}>Tarih</div>
                                <div style={{ fontSize: 13, fontWeight: 500, color: '#111' }}>{formatDate(p.exitInterview.interviewDate)}</div>
                              </div>
                              <div>
                                <div style={{ fontSize: 11, color: '#888' }}>Genel Memnuniyet</div>
                                <div style={{ display: 'flex', gap: 2, marginTop: 2 }}>
                                  {[1, 2, 3, 4, 5].map((star) => (
                                    <span key={star} style={{ fontSize: 14, color: star <= p.exitInterview!.overallSatisfaction ? '#D97706' : '#E5E5E5' }}>
                                      ★
                                    </span>
                                  ))}
                                </div>
                              </div>
                              <div>
                                <div style={{ fontSize: 11, color: '#888' }}>Tavsiye Eder mi?</div>
                                <div style={{ fontSize: 13, fontWeight: 500, color: p.exitInterview.wouldRecommend ? '#059669' : '#DC2626' }}>
                                  {p.exitInterview.wouldRecommend ? 'Evet' : 'Hayir'}
                                </div>
                              </div>
                            </div>
                            <div>
                              <div style={{ fontSize: 11, color: '#888', marginBottom: 4 }}>Ayrilma Nedeni</div>
                              <div style={{ fontSize: 13, color: '#525252' }}>{p.exitInterview.reasonForLeaving}</div>
                            </div>
                            <div style={{ marginTop: 10 }}>
                              <div style={{ fontSize: 11, color: '#888', marginBottom: 4 }}>Geri Bildirim Ozeti</div>
                              <div style={{ fontSize: 13, color: '#525252', lineHeight: 1.6 }}>{p.exitInterview.feedbackSummary}</div>
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Completed Processes */}
      {completedProcesses.length > 0 && (
        <div>
          <div style={{ fontSize: 13, fontWeight: 700, color: '#888', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 12 }}>
            Tamamlanan Surecler ({completedProcesses.length})
          </div>
          <div style={{ background: 'white', border: '1px solid #f0f0f0', borderRadius: 12, overflow: 'hidden' }}>
            {completedProcesses.map((p, i) => {
              const reason = REASON_LABELS[p.reason] ?? REASON_LABELS['resignation']!;
              return (
                <div
                  key={p.processId}
                  style={{
                    padding: '16px 24px',
                    borderBottom: i < completedProcesses.length - 1 ? '1px solid #f0f0f0' : 'none',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: 16,
                  }}
                >
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 14, fontWeight: 600, color: '#111' }}>{p.name}</div>
                    <div style={{ fontSize: 12, color: '#888', marginTop: 2 }}>
                      {p.department} · {formatDate(p.lastWorkingDay)}
                    </div>
                  </div>
                  <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 10, background: reason.bg, color: reason.text }}>
                    {reason.label}
                  </span>
                  <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 10, background: '#D1FAE5', color: '#059669' }}>
                    Tamamlandi
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {processes.length === 0 && (
        <div style={{ textAlign: 'center', padding: 48, color: '#aaa', fontSize: 14 }}>
          Henuz cikis sureci bulunmuyor.
        </div>
      )}

      {/* New Process Modal */}
      {modalOpen && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.4)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
          }}
          onClick={() => setModalOpen(false)}
        >
          <div
            style={{
              background: 'white',
              borderRadius: 16,
              padding: 32,
              width: '100%',
              maxWidth: 480,
              boxShadow: '0 20px 60px rgba(0,0,0,0.15)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ fontSize: 18, fontWeight: 700, color: '#111', marginBottom: 4 }}>
              Yeni Cikis Sureci
            </div>
            <div style={{ fontSize: 13, color: '#888', marginBottom: 24 }}>
              Calisan cikis surecini baslatmak icin bilgileri girin.
            </div>

            <div className="flex flex-col gap-4">
              {/* Employee Select */}
              <div>
                <label style={{ fontSize: 12, fontWeight: 600, color: '#525252', display: 'block', marginBottom: 6 }}>
                  Calisan
                </label>
                <select
                  value={formEmployeeId}
                  onChange={(e) => setFormEmployeeId(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    border: '1px solid #e5e5e5',
                    borderRadius: 10,
                    fontSize: 14,
                    color: '#111',
                    background: 'white',
                  }}
                >
                  <option value="">Calisan secin...</option>
                  {employees.map((e) => (
                    <option key={e.id} value={e.id}>
                      {e.name} — {e.department}
                    </option>
                  ))}
                </select>
              </div>

              {/* Reason Select */}
              <div>
                <label style={{ fontSize: 12, fontWeight: 600, color: '#525252', display: 'block', marginBottom: 6 }}>
                  Ayrilma Nedeni
                </label>
                <select
                  value={formReason}
                  onChange={(e) => setFormReason(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    border: '1px solid #e5e5e5',
                    borderRadius: 10,
                    fontSize: 14,
                    color: '#111',
                    background: 'white',
                  }}
                >
                  {Object.entries(REASON_LABELS).map(([key, val]) => (
                    <option key={key} value={key}>
                      {val.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Last Working Day */}
              <div>
                <label style={{ fontSize: 12, fontWeight: 600, color: '#525252', display: 'block', marginBottom: 6 }}>
                  Son Calisma Gunu
                </label>
                <input
                  type="date"
                  value={formLastDay}
                  onChange={(e) => setFormLastDay(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    border: '1px solid #e5e5e5',
                    borderRadius: 10,
                    fontSize: 14,
                    color: '#111',
                  }}
                />
              </div>

              {/* Notice Period */}
              <div>
                <label style={{ fontSize: 12, fontWeight: 600, color: '#525252', display: 'block', marginBottom: 6 }}>
                  Ihbar Suresi (gun)
                </label>
                <input
                  type="number"
                  value={formNoticeDays}
                  onChange={(e) => setFormNoticeDays(parseInt(e.target.value) || 0)}
                  min={0}
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    border: '1px solid #e5e5e5',
                    borderRadius: 10,
                    fontSize: 14,
                    color: '#111',
                  }}
                />
              </div>
            </div>

            <div className="flex justify-end gap-3" style={{ marginTop: 24 }}>
              <button
                onClick={() => setModalOpen(false)}
                style={{
                  fontSize: 13,
                  fontWeight: 600,
                  color: '#888',
                  background: 'none',
                  border: '1px solid #e5e5e5',
                  borderRadius: 10,
                  padding: '10px 20px',
                  cursor: 'pointer',
                }}
              >
                Iptal
              </button>
              <button
                onClick={handleNewProcess}
                disabled={!formEmployeeId || !formLastDay || submitting}
                style={{
                  fontSize: 13,
                  fontWeight: 600,
                  color: 'white',
                  background: !formEmployeeId || !formLastDay ? '#ccc' : '#111',
                  border: 'none',
                  borderRadius: 10,
                  padding: '10px 20px',
                  cursor: !formEmployeeId || !formLastDay ? 'not-allowed' : 'pointer',
                }}
              >
                {submitting ? 'Baslatiliyor...' : 'Sureci Baslat'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
