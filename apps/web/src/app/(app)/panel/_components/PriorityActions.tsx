'use client';

import { useState, useCallback, useEffect, useMemo } from 'react';
import {
  AlertTriangle,
  TrendingUp,
  UserCheck,
  ChevronDown,
  ChevronUp,
  Check,
  X,
  Clock,
  Flame,
  Briefcase,
  CalendarDays,
  BookOpen,
  Filter,
  Bell,
  History,
  Activity,
} from 'lucide-react';

/* ─── Types ─── */

type Urgency = 'critical' | 'warning' | 'info';
type ActionStatus = 'pending' | 'approved' | 'rejected' | 'deferred';
type ActionCategory = 'tukenmislik' | 'ise-alim' | 'izin' | 'gelisim';

interface ActionItem {
  id: string;
  urgency: Urgency;
  title: string;
  description: string;
  department: string;
  affectedCount: number;
  suggestedAction: string;
  reasoning: string[];
  status: ActionStatus;
  category: ActionCategory;
  impactBefore: number;
  impactAfter: number;
  impactLabel: string;
}

interface DecisionRecord {
  actionId: string;
  actionTitle: string;
  decision: 'approved' | 'rejected' | 'deferred';
  timestamp: string;
  category: ActionCategory;
}

/* ─── API Data Types ─── */

interface BurnoutApiData {
  heatmap?: Array<{ department_name: string; week_start: string; avg_score: number; respondent_count: number }>;
  critical?: Array<{ id: number; ad: string; soyad: string; department_name: string; score: number }>;
  jdr?: Array<{ department_name: string; demands: number; resources: number }>;
  stats?: { avg_total: number; red_count: number; total_employees: number };
}

interface PriorityActionsProps {
  burnoutData?: BurnoutApiData | null;
}

/* ─── Build actions from API data ─── */

const buildActionsFromApi = (data: BurnoutApiData): ActionItem[] => {
  const actions: ActionItem[] = [];

  // Action 1: Critical employee from burnout data
  const critical = data.critical ?? [];
  const topCritical = critical[0];
  if (topCritical) {
    const jdrRow = data.jdr?.find((j) => j.department_name === topCritical.department_name);
    const demands = jdrRow?.demands ?? 78;
    const resources = jdrRow?.resources ?? 56;
    const score = Math.round(topCritical.score);
    actions.push({
      id: '1',
      urgency: 'critical',
      title: `${topCritical.ad} ${topCritical.soyad} — tukenmislik riski yukseliyor`,
      description:
        `BAT-12 skoru %${score}. JD-R dengesi bozuldu (talep ${demands}%, kaynak ${resources}%). ${topCritical.department_name} departmani.`,
      department: topCritical.department_name,
      affectedCount: 1,
      suggestedAction: 'Kocluk gorusmesi planla',
      reasoning: [
        `JD-R dengesi bozuk (Bakker & Demerouti, 2007): talep skoru ${demands}%, kaynak skoru ${resources}%. Bu kombinasyon tukenmislik onculu.`,
        'Benzer profilde %75 istifa orani (kurum ici veri): son 12 ayda benzer JD-R profilli 8 calisanin 6\'si istifa etti.',
        'Mudahale penceresi: 4 hafta (Schaufeli, 2017). Turuncu bolgeden cikis icin ilk 4 hafta kritik.',
      ],
      status: 'pending',
      category: 'tukenmislik',
      impactBefore: Math.min(90, score + 15),
      impactAfter: Math.max(15, score - 20),
      impactLabel: 'istifa olasiligi',
    });
  }

  // Action 2: Department warning from heatmap stats
  const stats = data.stats;
  if (stats && stats.red_count > 0) {
    // Find worst department from heatmap
    const heatmap = data.heatmap ?? [];
    const deptScores: Record<string, number[]> = {};
    for (const h of heatmap) {
      if (!deptScores[h.department_name]) deptScores[h.department_name] = [];
      const arr = deptScores[h.department_name];
      if (arr) arr.push(h.avg_score);
    }
    let worstDept = 'Satis';
    let worstScore = 0;
    for (const [name, scores] of Object.entries(deptScores)) {
      const latest = scores[scores.length - 1] ?? 0;
      if (latest > worstScore) {
        worstScore = latest;
        worstDept = name;
      }
    }

    actions.push({
      id: '2',
      urgency: 'warning',
      title: `${worstDept} ekibi kotulesiyor`,
      description:
        `Departman tukenmislik ortalamasi %${Math.round(worstScore)}. ${stats.red_count} kisi kirmizi bolgede. Haftalik trend negatif.`,
      department: worstDept,
      affectedCount: stats.red_count,
      suggestedAction: 'Departman mudahale plani olustur',
      reasoning: [
        'JD-R dengesi bozuk (Bakker & Demerouti, 2007): departman talep skoru medyanin 1.86 standart sapma uzerinde.',
        `Benzer profilde %${Math.round((stats.red_count / (stats.total_employees || 1)) * 100)} kirmizi bolge orani (kurum ici veri). Bu oran alarm esiginin uzerinde.`,
        'Mudahale penceresi: 6 hafta (Crawford et al., 2010). Departman bazli mudahale icin kritik esik asildi.',
      ],
      status: 'pending',
      category: 'tukenmislik',
      impactBefore: Math.round(worstScore),
      impactAfter: Math.max(20, Math.round(worstScore) - 18),
      impactLabel: 'departman tukenmislik orani',
    });
  }

  // Action 3: Static info card (until ML service connected)
  actions.push({
    id: '3',
    urgency: 'info',
    title: '2 aday mulakata hazir — %95+ uyum',
    description:
      'Selin Ozturk (Satis, %96) ve Kerem Aslan (Urun, %95) assessment\'i tamamladi. Mulakat planlamasi bekleniyor.',
    department: 'IK',
    affectedCount: 2,
    suggestedAction: 'Mulakat plani olustur',
    reasoning: [
      'JD-R fit skoru uyumlu (Xanthopoulou et al., 2007): Her iki aday da yetkinlik bazli degerlendirmede %95 ustu skor aldi.',
      'Benzer profilde %89 basarili ise alim orani (kurum ici veri). Bu esik, basarili ise alim ile guclu korelasyon gosteriyor.',
      'Ise alim penceresi: 2 hafta (Barber, 1998). Guclu adaylarin bekleme suresi sinirlidi.',
    ],
    status: 'pending',
    category: 'ise-alim',
    impactBefore: 14,
    impactAfter: 6,
    impactLabel: 'acik pozisyon gunu',
  });

  return actions;
};

/* ─── Static Fallback Data ─── */

const fallbackActions: ActionItem[] = [
  {
    id: '1',
    urgency: 'critical',
    title: 'Mehmet Kaya — tukenmislik riski yukseliyor',
    description:
      'Son 3 haftada BAT-12 skoru %28->%42. JD-R dengesi bozuldu (talep 78%, kaynak 56%). Istifa olasiligi %67.',
    department: 'Satis',
    affectedCount: 1,
    suggestedAction: 'Kocluk gorusmesi planla',
    reasoning: [
      'JD-R dengesi bozuk (Bakker & Demerouti, 2007): talep skoru 78%, kaynak skoru 56%. Bu kombinasyon tukenmislik onculu.',
      'Benzer profilde %75 istifa orani (kurum ici veri): son 12 ayda benzer JD-R profilli 8 calisanin 6\'si istifa etti.',
      'Mudahale penceresi: 4 hafta (Schaufeli, 2017). Turuncu bolgeden cikis icin ilk 4 hafta kritik.',
    ],
    status: 'pending',
    category: 'tukenmislik',
    impactBefore: 67,
    impactAfter: 28,
    impactLabel: 'istifa olasiligi',
  },
  {
    id: '2',
    urgency: 'warning',
    title: 'Satis ekibi 3 haftadir kotulesiyor',
    description:
      'Departman tukenmislik ortalamasi %34 -> %52. 4 kisi kirmizi bolgede. Haftalik trend negatif.',
    department: 'Satis',
    affectedCount: 12,
    suggestedAction: 'Departman mudahale plani olustur',
    reasoning: [
      'JD-R dengesi bozuk (Bakker & Demerouti, 2007): departman talep skoru medyanin 1.86 standart sapma uzerinde.',
      'Benzer profilde %33 kirmizi bolge orani (kurum ici veri). Bu oran alarm esiginin uzerinde.',
      'Mudahale penceresi: 6 hafta (Crawford et al., 2010). Departman bazli mudahale icin kritik esik asildi.',
    ],
    status: 'pending',
    category: 'tukenmislik',
    impactBefore: 52,
    impactAfter: 34,
    impactLabel: 'departman tukenmislik orani',
  },
  {
    id: '3',
    urgency: 'info',
    title: '2 aday mulakata hazir — %95+ uyum',
    description:
      'Selin Ozturk (Satis, %96) ve Kerem Aslan (Urun, %95) assessment\'i tamamladi. Mulakat planlamasi bekleniyor.',
    department: 'IK',
    affectedCount: 2,
    suggestedAction: 'Mulakat plani olustur',
    reasoning: [
      'JD-R fit skoru uyumlu (Xanthopoulou et al., 2007): Her iki aday da yetkinlik bazli degerlendirmede %95 ustu skor aldi.',
      'Benzer profilde %89 basarili ise alim orani (kurum ici veri). Bu esik, basarili ise alim ile guclu korelasyon gosteriyor.',
      'Ise alim penceresi: 2 hafta (Barber, 1998). Guclu adaylarin bekleme suresi sinirlidi.',
    ],
    status: 'pending',
    category: 'ise-alim',
    impactBefore: 14,
    impactAfter: 6,
    impactLabel: 'acik pozisyon gunu',
  },
];

/* ─── Config Maps ─── */

const urgencyConfig: Record<
  Urgency,
  {
    stripeColor: string;
    tagBg: string;
    tagText: string;
    label: string;
    icon: React.ReactNode;
  }
> = {
  critical: {
    stripeColor: 'bg-[#DC2626]',
    tagBg: 'bg-[#FEE2E2]',
    tagText: 'text-[#DC2626]',
    label: 'ACIL',
    icon: <AlertTriangle className="h-4 w-4 text-[#DC2626]" />,
  },
  warning: {
    stripeColor: 'bg-[#D97706]',
    tagBg: 'bg-[#FEF3C7]',
    tagText: 'text-[#D97706]',
    label: 'UYARI',
    icon: <TrendingUp className="h-4 w-4 text-[#D97706]" />,
  },
  info: {
    stripeColor: 'bg-[#5E5CE6]',
    tagBg: 'bg-[#EEF0FD]',
    tagText: 'text-[#5E5CE6]',
    label: 'BILGI',
    icon: <UserCheck className="h-4 w-4 text-[#5E5CE6]" />,
  },
};

const statusConfig: Record<
  ActionStatus,
  { label: string; bgColor: string; textColor: string; icon: React.ReactNode }
> = {
  pending: { label: '', bgColor: '', textColor: '', icon: null },
  approved: {
    label: 'Onaylandi',
    bgColor: 'bg-[#D1FAE5]',
    textColor: 'text-[#059669]',
    icon: <Check className="h-4 w-4" />,
  },
  rejected: {
    label: 'Reddedildi',
    bgColor: 'bg-[#FEE2E2]',
    textColor: 'text-[#DC2626]',
    icon: <X className="h-4 w-4" />,
  },
  deferred: {
    label: 'Ertelendi',
    bgColor: 'bg-[#FEF3C7]',
    textColor: 'text-[#D97706]',
    icon: <Clock className="h-4 w-4" />,
  },
};

const categoryConfig: Record<
  ActionCategory,
  { label: string; icon: React.ReactNode; bgColor: string; textColor: string }
> = {
  tukenmislik: {
    label: 'Tukenmislik',
    icon: <Flame className="h-3 w-3" />,
    bgColor: 'bg-[#FEE2E2]',
    textColor: 'text-[#DC2626]',
  },
  'ise-alim': {
    label: 'Ise Alim',
    icon: <Briefcase className="h-3 w-3" />,
    bgColor: 'bg-[#EEF0FD]',
    textColor: 'text-[#5E5CE6]',
  },
  izin: {
    label: 'Izin',
    icon: <CalendarDays className="h-3 w-3" />,
    bgColor: 'bg-[#FEF3C7]',
    textColor: 'text-[#D97706]',
  },
  gelisim: {
    label: 'Gelisim',
    icon: <BookOpen className="h-3 w-3" />,
    bgColor: 'bg-[#D1FAE5]',
    textColor: 'text-[#059669]',
  },
};

/* ─── Weekly sparkline data ─── */

const weeklySparkline = {
  thisWeek: [1, 2, 3, 2, 3],
  lastWeek: [2, 1, 1, 2, 1],
};

/* ─── localStorage helpers ─── */

const DECISIONS_KEY = 'upcore-decision-history';

const loadDecisions = (): DecisionRecord[] => {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(DECISIONS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
};

const saveDecision = (record: DecisionRecord): void => {
  const existing = loadDecisions();
  existing.unshift(record);
  // Keep last 20
  const trimmed = existing.slice(0, 20);
  localStorage.setItem(DECISIONS_KEY, JSON.stringify(trimmed));
};

/* ─── Sparkline Component ─── */

const Sparkline = ({
  data,
  color,
  height = 24,
  width = 60,
}: {
  data: number[];
  color: string;
  height?: number;
  width?: number;
}) => {
  const max = Math.max(...data, 1);
  const points = data
    .map((v, i) => {
      const x = (i / (data.length - 1)) * width;
      const y = height - (v / max) * height;
      return `${x},${y}`;
    })
    .join(' ');

  return (
    <svg width={width} height={height} className="inline-block">
      <polyline
        points={points}
        fill="none"
        stroke={color}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
};

/* ─── Main Component ─── */

export const PriorityActions = ({ burnoutData }: PriorityActionsProps) => {
  const [actions, setActions] = useState<ActionItem[]>(fallbackActions);
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const [toasts, setToasts] = useState<
    Array<{ id: string; message: string; type: 'success' | 'warning' | 'danger' }>
  >([]);
  const [dismissingIds, setDismissingIds] = useState<Set<string>>(new Set());
  const [decisions, setDecisions] = useState<DecisionRecord[]>([]);
  const [activeFilter, setActiveFilter] = useState<ActionCategory | 'all'>('all');
  const [showHistory, setShowHistory] = useState(false);

  // Load decision history from localStorage on mount
  useEffect(() => {
    setDecisions(loadDecisions());
  }, []);

  // Update actions from burnout API data when available
  useEffect(() => {
    if (burnoutData && (burnoutData.critical || burnoutData.stats)) {
      const apiActions = buildActionsFromApi(burnoutData);
      if (apiActions.length > 0) {
        setActions(apiActions);
      }
    }
  }, [burnoutData]);

  const pendingCount = actions.filter((a) => a.status === 'pending').length;

  const filteredActions = useMemo(() => {
    if (activeFilter === 'all') return actions;
    return actions.filter((a) => a.category === activeFilter);
  }, [actions, activeFilter]);

  const thisWeekTotal = weeklySparkline.thisWeek.reduce((a, b) => a + b, 0);
  const lastWeekTotal = weeklySparkline.lastWeek.reduce((a, b) => a + b, 0);
  const weeklyChange = thisWeekTotal - lastWeekTotal;

  const toggleExpanded = useCallback((id: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const showToast = useCallback(
    (message: string, type: 'success' | 'warning' | 'danger') => {
      const toastId = `${Date.now()}-${Math.random()}`;
      setToasts((prev) => [...prev, { id: toastId, message, type }]);
      setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== toastId));
      }, 3000);
    },
    [],
  );

  const handleAction = useCallback(
    (id: string, newStatus: ActionStatus) => {
      setActions((prev) =>
        prev.map((a) => (a.id === id ? { ...a, status: newStatus } : a)),
      );

      const action = actions.find((a) => a.id === id);
      if (!action) return;

      // Record decision
      if (newStatus === 'approved' || newStatus === 'rejected' || newStatus === 'deferred') {
        const record: DecisionRecord = {
          actionId: action.id,
          actionTitle: action.title,
          decision: newStatus as 'approved' | 'rejected' | 'deferred',
          timestamp: new Date().toISOString(),
          category: action.category,
        };
        saveDecision(record);
        setDecisions(loadDecisions());
      }

      if (newStatus === 'approved') {
        showToast(`"${action.suggestedAction}" onaylandi`, 'success');
        setTimeout(() => {
          setDismissingIds((prev) => new Set(prev).add(id));
          setTimeout(() => {
            setActions((prev) => prev.filter((a) => a.id !== id));
            setDismissingIds((prev) => {
              const next = new Set(prev);
              next.delete(id);
              return next;
            });
          }, 400);
        }, 1200);
      } else if (newStatus === 'rejected') {
        showToast(`Aksiyon reddedildi`, 'danger');
      } else if (newStatus === 'deferred') {
        showToast(`Aksiyon ertelendi`, 'warning');
      }
    },
    [actions, showToast],
  );

  const toastBgConfig = {
    success: 'bg-[#059669]',
    warning: 'bg-[#D97706]',
    danger: 'bg-[#DC2626]',
  };

  const decisionLabelMap: Record<string, { label: string; color: string }> = {
    approved: { label: 'Onaylandi', color: 'text-[#059669]' },
    rejected: { label: 'Reddedildi', color: 'text-[#DC2626]' },
    deferred: { label: 'Ertelendi', color: 'text-[#D97706]' },
  };

  const formatTimestamp = (iso: string): string => {
    const d = new Date(iso);
    return d.toLocaleDateString('tr-TR', {
      day: 'numeric',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const filterOptions: { key: ActionCategory | 'all'; label: string }[] = [
    { key: 'all', label: 'Tumu' },
    { key: 'tukenmislik', label: 'Tukenmislik' },
    { key: 'ise-alim', label: 'Ise Alim' },
    { key: 'izin', label: 'Izin' },
    { key: 'gelisim', label: 'Gelisim' },
  ];

  return (
    <div className="relative">
      {/* Toast notifications */}
      <div className="fixed right-6 top-6 z-50 flex flex-col gap-2">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={`flex items-center gap-2 rounded-lg px-4 py-3 text-sm font-medium text-white shadow-lg ${toastBgConfig[toast.type]}`}
            style={{
              animation: 'slideInRight 0.3s ease-out',
            }}
          >
            {toast.type === 'success' && <Check className="h-4 w-4" />}
            {toast.type === 'danger' && <X className="h-4 w-4" />}
            {toast.type === 'warning' && <Clock className="h-4 w-4" />}
            {toast.message}
          </div>
        ))}
      </div>

      {/* Top bar: notification badge + weekly trend + pending count */}
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        {/* Notification badge */}
        {pendingCount > 0 && (
          <div className="inline-flex items-center gap-2 rounded-full bg-[#5E5CE6] px-3 py-1.5 text-xs font-semibold text-white">
            <Bell className="h-3.5 w-3.5" />
            {pendingCount} yeni aksiyon
          </div>
        )}

        {/* Weekly sparkline trend */}
        <div className="flex items-center gap-3 rounded-lg border border-[#EDEDED] bg-white px-3 py-2">
          <div className="flex flex-col items-start">
            <span className="text-[10px] font-medium uppercase tracking-wider text-[#A3A3A3]">
              Bu Hafta / Gecen Hafta
            </span>
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold tabular-nums text-[#0A0A0A]">
                {thisWeekTotal}
              </span>
              <span className="text-[11px] text-[#A3A3A3]">vs</span>
              <span className="text-sm tabular-nums text-[#888]">{lastWeekTotal}</span>
              <span
                className={`text-xs font-semibold ${weeklyChange >= 0 ? 'text-[#DC2626]' : 'text-[#059669]'}`}
              >
                {weeklyChange >= 0 ? '+' : ''}{weeklyChange}
              </span>
            </div>
          </div>
          <div className="flex items-end gap-1">
            <Sparkline data={weeklySparkline.lastWeek} color="#D4D4D4" />
            <Sparkline
              data={weeklySparkline.thisWeek}
              color={weeklyChange >= 0 ? '#DC2626' : '#059669'}
            />
          </div>
        </div>
      </div>

      {/* Filter chips */}
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <Filter className="h-3.5 w-3.5 text-[#A3A3A3]" />
        {filterOptions.map((opt) => {
          const isActive = activeFilter === opt.key;
          return (
            <button
              key={opt.key}
              type="button"
              onClick={() => setActiveFilter(opt.key)}
              className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-[12px] font-medium transition-all ${
                isActive
                  ? 'border-[#5E5CE6] bg-[#EEF0FD] text-[#5E5CE6]'
                  : 'border-[#EDEDED] bg-white text-[#555] hover:border-[#D4D4D4]'
              }`}
            >
              {opt.key !== 'all' && categoryConfig[opt.key as ActionCategory].icon}
              {opt.label}
            </button>
          );
        })}
      </div>

      {/* Action cards */}
      <div className="flex flex-col gap-3">
        {filteredActions.length === 0 && (
          <div className="flex flex-col items-center gap-3 rounded-lg border border-[#EDEDED] bg-white px-6 py-12">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#D1FAE5]">
              <Check className="h-6 w-6 text-[#059669]" />
            </div>
            <p className="text-sm font-medium text-[#0A0A0A]">
              {activeFilter === 'all' ? 'Tum aksiyonlar tamamlandi' : 'Bu kategoride aksiyon yok'}
            </p>
            <p className="text-xs text-[#A3A3A3]">
              Yeni aksiyonlar olusturuldugunda burada gorunecek.
            </p>
          </div>
        )}

        {filteredActions.map((action) => {
          const config = urgencyConfig[action.urgency];
          const catConfig = categoryConfig[action.category];
          const isExpanded = expandedIds.has(action.id);
          const isDismissing = dismissingIds.has(action.id);
          const isActioned = action.status !== 'pending';
          const statusCfg = statusConfig[action.status];

          return (
            <div
              key={action.id}
              className={`group flex overflow-hidden rounded-lg border bg-white transition-all duration-300 ${
                isDismissing
                  ? 'max-h-0 scale-95 border-transparent opacity-0'
                  : 'max-h-[800px] scale-100 opacity-100'
              } ${
                isActioned
                  ? 'border-[#D1FAE5]'
                  : 'border-[#EDEDED] hover:border-[#D4D4D4]'
              }`}
            >
              {/* Left color stripe */}
              <div
                className={`w-[3px] shrink-0 transition-colors duration-300 ${
                  isActioned && action.status === 'approved'
                    ? 'bg-[#059669]'
                    : isActioned && action.status === 'rejected'
                      ? 'bg-[#DC2626]'
                      : isActioned && action.status === 'deferred'
                        ? 'bg-[#D97706]'
                        : config.stripeColor
                }`}
              />

              <div className="flex-1 px-5 py-4">
                <div className="flex items-start gap-4">
                  {/* Icon */}
                  <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#FAFAFA]">
                    {isActioned ? (
                      <span className={statusCfg.textColor}>{statusCfg.icon}</span>
                    ) : (
                      config.icon
                    )}
                  </div>

                  {/* Content */}
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      {isActioned ? (
                        <span
                          className={`inline-flex h-5 items-center gap-1 rounded px-1.5 text-[11px] font-semibold ${statusCfg.bgColor} ${statusCfg.textColor}`}
                        >
                          {statusCfg.label}
                        </span>
                      ) : (
                        <span
                          className={`inline-flex h-5 items-center rounded px-1.5 text-[11px] font-semibold ${config.tagBg} ${config.tagText}`}
                        >
                          {config.label}
                        </span>
                      )}

                      {/* Category badge */}
                      <span
                        className={`inline-flex h-5 items-center gap-1 rounded px-1.5 text-[11px] font-medium ${catConfig.bgColor} ${catConfig.textColor}`}
                      >
                        {catConfig.icon}
                        {catConfig.label}
                      </span>

                      <span className="text-[11px] text-[#A3A3A3]">
                        {action.department} · {action.affectedCount}{' '}
                        {action.affectedCount === 1 ? 'kisi' : 'calisan'}
                      </span>
                    </div>

                    <h3
                      className={`mt-1.5 text-sm font-medium ${
                        isActioned ? 'text-[#A3A3A3] line-through' : 'text-[#0A0A0A]'
                      }`}
                    >
                      {action.title}
                    </h3>

                    <p className="mt-0.5 text-[13px] leading-relaxed text-[#525252]">
                      {action.description}
                    </p>

                    {/* Impact prediction */}
                    {!isActioned && (
                      <div className="mt-2 inline-flex items-center gap-2 rounded-md border border-[#E0E0FF] bg-[#FAFAFF] px-3 py-1.5">
                        <Activity className="h-3.5 w-3.5 text-[#5E5CE6]" />
                        <span className="text-[12px] font-medium text-[#525252]">
                          Tahmini Etki: {action.impactLabel}{' '}
                          <span className="text-[#DC2626]">%{action.impactBefore}</span>
                          {' → '}
                          <span className="text-[#059669]">%{action.impactAfter}</span>
                        </span>
                      </div>
                    )}

                    {/* Suggested action */}
                    {!isActioned && (
                      <div className="mt-2 inline-flex items-center gap-1.5 rounded-md bg-[#FAFAFA] px-2.5 py-1 text-[12px] font-medium text-[#525252]">
                        Onerilen: {action.suggestedAction}
                      </div>
                    )}

                    {/* Expand/collapse reasoning */}
                    {!isActioned && (
                      <button
                        type="button"
                        onClick={() => toggleExpanded(action.id)}
                        className="mt-3 flex items-center gap-1 text-[12px] font-medium text-[#5E5CE6] transition-colors hover:text-[#4B4AC5]"
                      >
                        {isExpanded ? (
                          <>
                            Gizle
                            <ChevronUp className="h-3.5 w-3.5" />
                          </>
                        ) : (
                          <>
                            Bilimsel Gerekceler
                            <ChevronDown className="h-3.5 w-3.5" />
                          </>
                        )}
                      </button>
                    )}

                    {/* Reasoning bullets with academic citations */}
                    <div
                      className={`overflow-hidden transition-all duration-300 ease-in-out ${
                        isExpanded ? 'mt-3 max-h-[400px] opacity-100' : 'max-h-0 opacity-0'
                      }`}
                    >
                      <div className="rounded-lg border border-[#EDEDED] bg-[#FAFAFA] p-4">
                        <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-[#A3A3A3]">
                          Neden bu aksiyon?
                        </p>
                        <ul className="flex flex-col gap-2.5">
                          {action.reasoning.map((reason, idx) => (
                            <li
                              key={idx}
                              className="flex gap-2 text-[12px] leading-relaxed text-[#525252]"
                            >
                              <span className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-[#EEF0FD] text-[10px] font-semibold text-[#5E5CE6]">
                                {idx + 1}
                              </span>
                              {reason}
                            </li>
                          ))}
                        </ul>
                        {/* Impact bar within reasoning */}
                        <div className="mt-3 rounded-md border border-[#EDEDED] bg-white p-3">
                          <p className="mb-1.5 text-[11px] font-medium text-[#888]">
                            Mudahale Etki Tahmini
                          </p>
                          <div className="flex items-center gap-2">
                            <div className="flex-1">
                              <div className="flex items-center justify-between text-[11px]">
                                <span className="text-[#DC2626]">Oncesi: %{action.impactBefore}</span>
                                <span className="text-[#059669]">Sonrasi: %{action.impactAfter}</span>
                              </div>
                              <div className="relative mt-1 h-2 w-full overflow-hidden rounded-full bg-[#F5F5F5]">
                                <div
                                  className="absolute h-full rounded-full bg-[#FEE2E2]"
                                  style={{ width: `${action.impactBefore}%` }}
                                />
                                <div
                                  className="absolute h-full rounded-full bg-[#059669]"
                                  style={{ width: `${action.impactAfter}%` }}
                                />
                              </div>
                            </div>
                            <span className="text-[12px] font-semibold text-[#059669]">
                              -{action.impactBefore - action.impactAfter}p
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Action buttons */}
                    {!isActioned && (
                      <div className="mt-4 flex flex-wrap items-center gap-2">
                        <button
                          type="button"
                          onClick={() => handleAction(action.id, 'approved')}
                          className="inline-flex items-center gap-1.5 rounded-md bg-[#0A0A0A] px-4 py-2 text-[13px] font-medium text-white transition-all hover:bg-[#262626] active:scale-[0.97]"
                        >
                          <Check className="h-3.5 w-3.5" />
                          Onayla
                        </button>
                        <button
                          type="button"
                          onClick={() => handleAction(action.id, 'rejected')}
                          className="inline-flex items-center gap-1.5 rounded-md border border-[#EDEDED] bg-white px-4 py-2 text-[13px] font-medium text-[#525252] transition-all hover:border-[#D4D4D4] hover:bg-[#FAFAFA] active:scale-[0.97]"
                        >
                          <X className="h-3.5 w-3.5" />
                          Reddet
                        </button>
                        <button
                          type="button"
                          onClick={() => handleAction(action.id, 'deferred')}
                          className="inline-flex items-center gap-1.5 rounded-md border border-[#EDEDED] bg-white px-4 py-2 text-[13px] font-medium text-[#525252] transition-all hover:border-[#D4D4D4] hover:bg-[#FAFAFA] active:scale-[0.97]"
                        >
                          <Clock className="h-3.5 w-3.5" />
                          Ertele
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Decision History Section */}
      <div className="mt-6">
        <button
          type="button"
          onClick={() => setShowHistory((prev) => !prev)}
          className="flex w-full items-center justify-between rounded-lg border border-[#EDEDED] bg-white px-5 py-3 transition-colors hover:border-[#D4D4D4]"
        >
          <div className="flex items-center gap-2">
            <History className="h-4 w-4 text-[#5E5CE6]" />
            <span className="text-[13px] font-semibold text-[#0A0A0A]">
              Son Kararlariniz
            </span>
            {decisions.length > 0 && (
              <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-[#F5F5F5] px-1.5 text-[11px] font-medium text-[#888]">
                {decisions.length}
              </span>
            )}
          </div>
          {showHistory ? (
            <ChevronUp className="h-4 w-4 text-[#888]" />
          ) : (
            <ChevronDown className="h-4 w-4 text-[#888]" />
          )}
        </button>

        <div
          className={`overflow-hidden transition-all duration-300 ${
            showHistory ? 'mt-2 max-h-[500px] opacity-100' : 'max-h-0 opacity-0'
          }`}
        >
          {decisions.length === 0 ? (
            <div className="rounded-lg border border-[#EDEDED] bg-[#FAFAFA] px-5 py-8 text-center">
              <p className="text-xs text-[#A3A3A3]">
                Henuz karar verilmis aksiyon yok. Aksiyonlari onayladiginizda veya reddettiginizde burada gorunecek.
              </p>
            </div>
          ) : (
            <div className="rounded-lg border border-[#EDEDED] bg-white">
              <div className="divide-y divide-[#EDEDED]">
                {decisions.slice(0, 5).map((dec, idx) => {
                  const decLabel = decisionLabelMap[dec.decision] ?? { label: dec.decision, color: 'text-[#888]' };
                  const catCfg = categoryConfig[dec.category] ?? categoryConfig.tukenmislik;
                  return (
                    <div
                      key={`${dec.timestamp}-${idx}`}
                      className="flex items-center gap-3 px-5 py-3"
                    >
                      {/* Category icon */}
                      <div
                        className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-md ${catCfg.bgColor}`}
                      >
                        <span className={catCfg.textColor}>{catCfg.icon}</span>
                      </div>

                      {/* Title + timestamp */}
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-[13px] font-medium text-[#0A0A0A]">
                          {dec.actionTitle}
                        </p>
                        <p className="text-[11px] text-[#A3A3A3]">
                          {formatTimestamp(dec.timestamp)}
                        </p>
                      </div>

                      {/* Decision badge */}
                      <span className={`text-[12px] font-semibold ${decLabel.color}`}>
                        {decLabel.label}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Inline animation styles */}
      <style>{`
        @keyframes slideInRight {
          from {
            opacity: 0;
            transform: translateX(100%);
          }
          to {
            opacity: 1;
            transform: translateX(0);
          }
        }
      `}</style>
    </div>
  );
};
