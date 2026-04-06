'use client';

import { useState, useMemo, useCallback, useEffect } from 'react';
import {
  Plus,
  X,
  Calendar,
  Check,
  Umbrella,
  Briefcase,
  Heart,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  AlertTriangle,
  Info,
  ArrowRight,
  Users,
  BarChart3,
  Flag,
  ChevronUp,
} from 'lucide-react';

type LeaveStatus = 'pending' | 'approved' | 'rejected';
type TabKey = 'my' | 'team' | 'calendar';

interface LeaveRequest {
  id: string;
  employee: string;
  type: string;
  startDate: string;
  endDate: string;
  days: number;
  reason: string;
  status: LeaveStatus;
}

/* ─── Turkish Public Holidays 2026 ─── */
const TURKISH_HOLIDAYS_2026: { date: string; name: string; duration?: string }[] = [
  { date: '2026-01-01', name: 'Yilbasi', duration: '1 gun' },
  { date: '2026-03-28', name: 'Ramazan Bayrami 1. Gun', duration: '3 gun' },
  { date: '2026-03-29', name: 'Ramazan Bayrami 2. Gun' },
  { date: '2026-03-30', name: 'Ramazan Bayrami 3. Gun' },
  { date: '2026-04-23', name: '23 Nisan Ulusal Egemenlik ve Cocuk Bayrami', duration: '1 gun' },
  { date: '2026-05-01', name: 'Emek ve Dayanisma Gunu (Isci Bayrami)', duration: '1 gun' },
  { date: '2026-05-19', name: '19 Mayis Ataturk\'u Anma, Genclik ve Spor Bayrami', duration: '1 gun' },
  { date: '2026-06-05', name: 'Kurban Bayrami 1. Gun', duration: '4 gun' },
  { date: '2026-06-06', name: 'Kurban Bayrami 2. Gun' },
  { date: '2026-06-07', name: 'Kurban Bayrami 3. Gun' },
  { date: '2026-06-08', name: 'Kurban Bayrami 4. Gun' },
  { date: '2026-07-15', name: '15 Temmuz Demokrasi ve Milli Birlik Gunu', duration: '1 gun' },
  { date: '2026-08-30', name: '30 Agustos Zafer Bayrami', duration: '1 gun' },
  { date: '2026-10-29', name: '29 Ekim Cumhuriyet Bayrami', duration: '1 gun' },
];

const holidayDateSet = new Set(TURKISH_HOLIDAYS_2026.map((h) => h.date));

/* ─── Business day calculator ─── */
const isWeekend = (d: Date): boolean => d.getDay() === 0 || d.getDay() === 6;

const toDateStr = (d: Date): string => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
};

interface BusinessDayResult {
  businessDays: number;
  weekendDays: number;
  holidays: string[];
  totalCalendarDays: number;
}

const calculateBusinessDays = (start: string, end: string): BusinessDayResult => {
  if (!start || !end) return { businessDays: 0, weekendDays: 0, holidays: [], totalCalendarDays: 0 };
  const s = new Date(start);
  const e = new Date(end);
  if (s > e) return { businessDays: 0, weekendDays: 0, holidays: [], totalCalendarDays: 0 };

  let businessDays = 0;
  let weekendDays = 0;
  const holidays: string[] = [];
  const cur = new Date(s);
  let totalCalendarDays = 0;

  while (cur <= e) {
    totalCalendarDays++;
    const ds = toDateStr(cur);
    if (isWeekend(cur)) {
      weekendDays++;
    } else if (holidayDateSet.has(ds)) {
      const h = TURKISH_HOLIDAYS_2026.find((hh) => hh.date === ds);
      if (h) holidays.push(`${h.date.slice(5)} ${h.name}`);
    } else {
      businessDays++;
    }
    cur.setDate(cur.getDate() + 1);
  }

  return { businessDays, weekendDays, holidays, totalCalendarDays };
};

/* ─── Format date for display ─── */
const formatDateTR = (dateStr: string): string => {
  const months = ['Oca', 'Sub', 'Mar', 'Nis', 'May', 'Haz', 'Tem', 'Agu', 'Eyl', 'Eki', 'Kas', 'Ara'];
  const d = new Date(dateStr);
  return `${d.getDate()} ${months[d.getMonth()]}`;
};

/* ─── Leave type rules ─── */
const leaveTypeRules: Record<string, { rule: string; minNoticeDays: number; maxConsecutive: number | null; requiresDoc: string | null }> = {
  'Yillik Izin': {
    rule: 'Min 1 gun onceden talep, max 14 gun ust uste',
    minNoticeDays: 1,
    maxConsecutive: 14,
    requiresDoc: null,
  },
  'Hastalik Izni': {
    rule: '3+ gun icin saglik raporu zorunlu',
    minNoticeDays: 0,
    maxConsecutive: null,
    requiresDoc: '3+ gun icin saglik raporu',
  },
  'Uzaktan Calisma': {
    rule: 'Ayda max 10 gun, yonetici onayi gerekli',
    minNoticeDays: 1,
    maxConsecutive: 5,
    requiresDoc: null,
  },
  'Mazeret Izni': {
    rule: 'Yilda max 10 gun, belge gerekebilir',
    minNoticeDays: 0,
    maxConsecutive: 3,
    requiresDoc: null,
  },
  'Dogum Izni': {
    rule: '16 hafta (8+8), uzatilabilir. Saglik raporu zorunlu',
    minNoticeDays: 30,
    maxConsecutive: null,
    requiresDoc: 'Saglik raporu zorunlu',
  },
};

/* ─── Team members for overlap check ─── */
const teamMembers = [
  { name: 'Hasan Aker', department: 'Muhendislik' },
  { name: 'Elif Demir', department: 'Muhendislik' },
  { name: 'Burak Arslan', department: 'Muhendislik' },
  { name: 'Selin Ozturk', department: 'Muhendislik' },
  { name: 'Emre Sahin', department: 'Muhendislik' },
  { name: 'Ayse Korkmaz', department: 'Muhendislik' },
];

/* ─── Initial data ─── */
const initialLeaves: LeaveRequest[] = [
  { id: '1', employee: 'Hasan Aker', type: 'Yillik Izin', startDate: '2026-04-10', endDate: '2026-04-14', days: 3, reason: 'Aile ziyareti', status: 'pending' },
  { id: '2', employee: 'Hasan Aker', type: 'Yillik Izin', startDate: '2026-03-01', endDate: '2026-03-05', days: 5, reason: 'Tatil', status: 'approved' },
  { id: '3', employee: 'Elif Demir', type: 'Hastalik Izni', startDate: '2026-04-07', endDate: '2026-04-08', days: 2, reason: 'Doktor raporu', status: 'pending' },
  { id: '4', employee: 'Burak Arslan', type: 'Yillik Izin', startDate: '2026-04-15', endDate: '2026-04-18', days: 4, reason: 'Kisisel', status: 'pending' },
  { id: '5', employee: 'Selin Ozturk', type: 'Uzaktan Calisma', startDate: '2026-04-09', endDate: '2026-04-09', days: 1, reason: 'Ev tadilati', status: 'approved' },
  { id: '6', employee: 'Emre Sahin', type: 'Yillik Izin', startDate: '2026-04-10', endDate: '2026-04-11', days: 2, reason: 'Kisisel is', status: 'approved' },
  { id: '7', employee: 'Hasan Aker', type: 'Mazeret Izni', startDate: '2026-02-10', endDate: '2026-02-10', days: 1, reason: 'Resmi islem', status: 'approved' },
];

interface BalanceCardData {
  label: string;
  total: number;
  used: number;
  icon: typeof Umbrella;
  color: string;
  accrualNote: string;
  legalRef: string;
  carried: number;
  maxCarry: number;
  requiresDoc: string;
  detailLines: string[];
}

const balanceCards: BalanceCardData[] = [
  {
    label: 'Yillik Izin', total: 20, used: 6, icon: Umbrella, color: '#5E5CE6',
    accrualNote: '20 gun hak (Madde 53, 5-15 yil kidem)',
    legalRef: '4857 Is Kanunu Madde 53',
    carried: 0, maxCarry: 40,
    requiresDoc: 'Hayir',
    detailLines: [
      'Kullanilan: 6 gun',
      'Tasinan (gecen yildan): 0 gun',
      'Kalan: 14 gun',
      'Max tasima: 40 gun (2x yillik hak)',
    ],
  },
  {
    label: 'Mazeret Izni', total: 10, used: 2, icon: Briefcase, color: '#D97706',
    accrualNote: '10 gun/yil mazeret hakki',
    legalRef: '4857 Is Kanunu Madde 46',
    carried: 0, maxCarry: 0,
    requiresDoc: 'Hayir',
    detailLines: [
      'Kullanilan: 2 gun',
      'Kalan: 8 gun',
      'Belge gerektirir: Hayir',
      'Yillik sinir: 10 gun (tasinmaz)',
    ],
  },
  {
    label: 'Hastalik Izni', total: 999, used: 3, icon: Heart, color: '#DC2626',
    accrualNote: 'Sinirsiz (saglik raporu ile)',
    legalRef: '4857 Is Kanunu Madde 25/I',
    carried: 0, maxCarry: 0,
    requiresDoc: '3+ gun icin rapor zorunlu',
    detailLines: [
      'Kullanilan: 3 gun (2 ayri rapor)',
      '3+ gun icin saglik raporu zorunlu',
      'Sinirsiz (raporlu)',
      'Ucretli hastalik: SGK odemesi (2 gunden sonra)',
    ],
  },
];

const leaveTypes = ['Yillik Izin', 'Hastalik Izni', 'Uzaktan Calisma', 'Mazeret Izni', 'Dogum Izni'];

const statusConfig: Record<LeaveStatus, { label: string; bg: string; text: string }> = {
  pending: { label: 'Bekliyor', bg: 'bg-[#FEF3C7]', text: 'text-[#D97706]' },
  approved: { label: 'Onaylandi', bg: 'bg-[#D1FAE5]', text: 'text-[#059669]' },
  rejected: { label: 'Reddedildi', bg: 'bg-[#FEE2E2]', text: 'text-[#DC2626]' },
};

/* ─── Approval chain ─── */
const approvalChain = [
  { role: 'Siz', name: '', status: 'done' as const },
  { role: 'Yonetici', name: 'Ayse K.', status: 'current' as const },
  { role: 'IK', name: 'Selin O.', status: 'pending' as const },
  { role: 'Onay', name: '', status: 'pending' as const },
];

/* ─── Leave Analytics Data ─── */
const departmentUtilization = [
  { dept: 'Satis', pct: 78, color: '#DC2626' },
  { dept: 'Muhendislik', pct: 62, color: '#5E5CE6' },
  { dept: 'IK', pct: 85, color: '#D97706' },
  { dept: 'Finans', pct: 45, color: '#059669' },
];

const monthlyTrend = [
  { month: 'Oca', days: 12 },
  { month: 'Sub', days: 8 },
  { month: 'Mar', days: 15 },
  { month: 'Nis', days: 22 },
  { month: 'May', days: 10 },
  { month: 'Haz', days: 14 },
];

const leaveTypeDistribution = [
  { type: 'Yillik', pct: 68, color: '#5E5CE6' },
  { type: 'Mazeret', pct: 18, color: '#D97706' },
  { type: 'Hastalik', pct: 14, color: '#DC2626' },
];

const upcomingLeaveSchedule = [
  { week: 'Bu hafta (7-11 Nis)', count: 3, names: ['Elif D.', 'Burak A.', 'Emre S.'] },
  { week: 'Gelecek hafta (14-18 Nis)', count: 5, names: ['Hasan A.', 'Burak A.', 'Selin O.', 'Mehmet K.', 'Zeynep A.'] },
  { week: '21-25 Nisan', count: 2, names: ['Ayse K.', 'Selin O.'] },
];

const departmentAlerts = [
  { dept: 'Satis', dateRange: '15-19 Nisan', pct: 33, severity: 'high' as const },
  { dept: 'Muhendislik', dateRange: '10-14 Nisan', pct: 28, severity: 'medium' as const },
];

/* ─── Resmi Tatiller 2026 (Tam Liste) ─── */
const HOLIDAYS_DISPLAY_LIST = [
  { date: '1 Ocak', name: 'Yilbasi', duration: '1 gun' },
  { date: '23 Nisan', name: 'Ulusal Egemenlik ve Cocuk Bayrami', duration: '1 gun' },
  { date: '1 Mayis', name: 'Emek ve Dayanisma Gunu (Isci Bayrami)', duration: '1 gun' },
  { date: '19 Mayis', name: 'Ataturk\'u Anma, Genclik ve Spor Bayrami', duration: '1 gun' },
  { date: '15 Temmuz', name: 'Demokrasi ve Milli Birlik Gunu', duration: '1 gun' },
  { date: '30 Agustos', name: 'Zafer Bayrami', duration: '1 gun' },
  { date: '28-30 Mart', name: 'Ramazan Bayrami', duration: '3 gun' },
  { date: '5-8 Haziran', name: 'Kurban Bayrami', duration: '4 gun' },
  { date: '29 Ekim', name: 'Cumhuriyet Bayrami', duration: '1 gun' },
];

/* ─── Leave Request Detail Approval Steps ─── */
interface ApprovalStep {
  label: string;
  status: 'done' | 'current' | 'pending';
  date: string;
  approver?: string;
}

const getApprovalTimeline = (status: LeaveStatus): ApprovalStep[] => {
  if (status === 'rejected') {
    return [
      { label: 'Talep Olusturuldu', status: 'done', date: '02 Nis 2026, 09:15' },
      { label: 'Yonetici Onayi', status: 'done', date: '02 Nis 2026, 14:30', approver: 'Ayse Kara (Yonetici)' },
      { label: 'Reddedildi', status: 'done', date: '02 Nis 2026, 15:00', approver: 'Red sebebi: Ekip yogunlugu' },
      { label: 'Tamamlandi', status: 'pending', date: '-' },
    ];
  }
  return [
    { label: 'Talep Olusturuldu', status: 'done', date: '02 Nis 2026, 09:15' },
    { label: 'Yonetici Onayi', status: status === 'pending' ? 'current' : 'done', date: status === 'pending' ? 'Bekliyor...' : '02 Nis 2026, 14:30', approver: 'Ayse Kara (Yonetici)' },
    { label: 'IK Onayi', status: status === 'approved' ? 'done' : 'pending', date: status === 'approved' ? '03 Nis 2026, 10:00' : '-', approver: 'Hasan Aker (IK Direktoru)' },
    { label: 'Tamamlandi', status: status === 'approved' ? 'done' : 'pending', date: status === 'approved' ? '03 Nis 2026, 10:00' : '-' },
  ];
};

/* ─── API Types ─── */
interface ApiLeaveBalance {
  accrued_days: number;
  used_days: number;
  pending_days: number;
  remaining_days: number;
  leave_type_id?: string;
  leave_type_name?: string;
}

interface ApiLeaveRequest {
  id: string;
  start_date: string;
  end_date: string;
  total_days: number;
  status: string;
  reason: string;
  employee_name?: string;
  leave_type_name?: string;
}

interface ApiLeaveType {
  id: string;
  code: string;
  name_tr: string;
}

const mapApiRequestsToLeaves = (requests: ApiLeaveRequest[]): LeaveRequest[] => {
  return requests.map((r) => ({
    id: r.id,
    employee: r.employee_name ?? 'Hasan Aker',
    type: r.leave_type_name ?? 'Yillik Izin',
    startDate: r.start_date,
    endDate: r.end_date,
    days: r.total_days,
    reason: r.reason || '-',
    status: (r.status === 'approved' ? 'approved' : r.status === 'rejected' ? 'rejected' : 'pending') as LeaveStatus,
  }));
};

export default function IzinlerPage() {
  const [activeTab, setActiveTab] = useState<TabKey>('my');
  const [leaves, setLeaves] = useState<LeaveRequest[]>(initialLeaves);
  const [formOpen, setFormOpen] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [showBalanceDetail, setShowBalanceDetail] = useState<string | null>(null);
  const [calendarMonth, setCalendarMonth] = useState(3); // April 2026 (0-indexed)
  const [calendarYear] = useState(2026);
  const [loading, setLoading] = useState(true);
  const [apiBalance, setApiBalance] = useState<ApiLeaveBalance[] | null>(null);
  const [apiLeaveTypes, setApiLeaveTypes] = useState<ApiLeaveType[] | null>(null);
  const [selectedLeave, setSelectedLeave] = useState<LeaveRequest | null>(null);
  const [showAnalytics, setShowAnalytics] = useState(true);
  const [showHolidaysList, setShowHolidaysList] = useState(false);

  // Form state
  const [formType, setFormType] = useState<string>(leaveTypes[0] ?? 'Yillik Izin');
  const [formStart, setFormStart] = useState('');
  const [formEnd, setFormEnd] = useState('');
  const [formReason, setFormReason] = useState('');

  /* ─── Fetch leave data from API ─── */
  const fetchLeaveData = useCallback(() => {
    fetch('/api/leaves')
      .then((r) => r.json())
      .then((data) => {
        if (data.requests && data.requests.length > 0) {
          setLeaves(mapApiRequestsToLeaves(data.requests));
        }
        if (data.balance && data.balance.length > 0) {
          setApiBalance(data.balance);
        }
        if (data.types && data.types.length > 0) {
          setApiLeaveTypes(data.types);
        }
      })
      .catch(() => {
        // Keep fallback data
      })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    fetchLeaveData();
  }, [fetchLeaveData]);

  /* ─── Dynamic balance cards from API ─── */
  const dynamicBalanceCards = useMemo((): BalanceCardData[] => {
    if (!apiBalance || apiBalance.length === 0) return balanceCards;
    return apiBalance.slice(0, 3).map((b, idx) => {
      const fallback = balanceCards[idx];
      return {
        label: b.leave_type_name ?? fallback?.label ?? 'Izin',
        total: b.accrued_days,
        used: b.used_days,
        icon: fallback?.icon ?? Umbrella,
        color: fallback?.color ?? '#5E5CE6',
        accrualNote: `Toplam hak: ${b.accrued_days} gun, bekleyen: ${b.pending_days} gun`,
        legalRef: fallback?.legalRef ?? '4857 Is Kanunu',
        carried: fallback?.carried ?? 0,
        maxCarry: fallback?.maxCarry ?? 0,
        requiresDoc: fallback?.requiresDoc ?? 'Hayir',
        detailLines: fallback?.detailLines ?? [`Kullanilan: ${b.used_days} gun`, `Kalan: ${b.remaining_days} gun`],
      };
    });
  }, [apiBalance]);

  const showToast = useCallback((msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 2500);
  }, []);

  /* ─── Business day calculation for form ─── */
  const formCalc = useMemo(() => {
    if (!formStart || !formEnd) return null;
    return calculateBusinessDays(formStart, formEnd);
  }, [formStart, formEnd]);

  /* ─── Team overlap warning ─── */
  const teamOverlap = useMemo(() => {
    if (!formStart || !formEnd) return { count: 0, names: [] as string[], departmentPct: 0 };
    const overlapping = leaves.filter(
      (l) =>
        l.employee !== 'Hasan Aker' &&
        l.status !== 'rejected' &&
        l.startDate <= formEnd &&
        l.endDate >= formStart
    );
    const names = [...new Set(overlapping.map((l) => l.employee))];
    const deptSize = teamMembers.length;
    const absentCount = names.length + 1; // +1 for current user
    const departmentPct = Math.round((absentCount / deptSize) * 100);
    return { count: names.length, names, departmentPct };
  }, [formStart, formEnd, leaves]);

  /* ─── Leave type rule for selected type ─── */
  const currentRule = leaveTypeRules[formType] ?? null;

  const handleSubmit = () => {
    if (!formStart || !formEnd) return;
    const calc = calculateBusinessDays(formStart, formEnd);

    // Find leave_type_id from API types
    const matchedType = apiLeaveTypes?.find((t) => t.name_tr === formType);
    const leaveTypeId = matchedType?.id ?? '1';

    // Submit to API
    fetch('/api/leaves', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        employee_id: '00000000-0000-0000-0000-000000000001',
        leave_type_id: leaveTypeId,
        start_date: formStart,
        end_date: formEnd,
        reason: formReason || '-',
      }),
    })
      .then((r) => r.json())
      .then(() => {
        showToast('Izin talebi olusturuldu');
        // Refetch data from API
        fetchLeaveData();
      })
      .catch(() => {
        // Fallback: add locally
        const newLeave: LeaveRequest = {
          id: String(Date.now()),
          employee: 'Hasan Aker',
          type: formType as string,
          startDate: formStart,
          endDate: formEnd,
          days: calc.businessDays,
          reason: formReason || '-',
          status: 'pending',
        };
        setLeaves((prev) => [newLeave, ...prev]);
        showToast('Izin talebi olusturuldu (cevrimdisi)');
      });

    setFormOpen(false);
    setFormStart('');
    setFormEnd('');
    setFormReason('');
  };

  const handleApprove = (id: string) => {
    setLeaves((prev) => prev.map((l) => (l.id === id ? { ...l, status: 'approved' as LeaveStatus } : l)));
    showToast('Izin talebi onaylandi');
  };

  const handleReject = (id: string) => {
    setLeaves((prev) => prev.map((l) => (l.id === id ? { ...l, status: 'rejected' as LeaveStatus } : l)));
    showToast('Izin talebi reddedildi');
  };

  const myLeaves = leaves.filter((l) => l.employee === 'Hasan Aker');
  const teamLeaves = leaves.filter((l) => l.employee !== 'Hasan Aker');

  /* ─── Used days for balance after form ─── */
  const balanceAfterRequest = useMemo(() => {
    const card = dynamicBalanceCards.find((c) => c.label === formType);
    if (!card || !formCalc) return null;
    if (card.total >= 999) return null; // Unlimited type, no balance check
    const remaining = card.total - card.used;
    const afterRemaining = remaining - formCalc.businessDays;
    return { before: remaining, after: afterRemaining, total: card.total, used: card.used };
  }, [formType, formCalc, dynamicBalanceCards]);

  const tabs: { key: TabKey; label: string }[] = [
    { key: 'my', label: 'Izinlerim' },
    { key: 'team', label: 'Ekip Izinleri' },
    { key: 'calendar', label: 'Takvim' },
  ];

  /* ─── Calendar helpers ─── */
  const monthNames = ['Ocak', 'Subat', 'Mart', 'Nisan', 'Mayis', 'Haziran', 'Temmuz', 'Agustos', 'Eylul', 'Ekim', 'Kasim', 'Aralik'];
  const daysInMonth = new Date(calendarYear, calendarMonth + 1, 0).getDate();
  const firstDayOfWeek = (new Date(calendarYear, calendarMonth, 1).getDay() + 6) % 7; // Monday-based
  const todayStr = new Date().toISOString().slice(0, 10);

  const prevMonth = () => setCalendarMonth((m) => (m === 0 ? 11 : m - 1));
  const nextMonth = () => setCalendarMonth((m) => (m === 11 ? 0 : m + 1));

  if (loading) {
    return (
      <div className="flex flex-col gap-8" style={{ fontFamily: 'Inter, sans-serif' }}>
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-[#0A0A0A]">Izin Yonetimi</h1>
          <p className="mt-1 text-sm text-[#525252]">Veriler yukleniyor...</p>
        </div>
        <div className="grid gap-4 sm:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-28 animate-pulse rounded-xl border border-[#EDEDED] bg-[#F5F5F5]" />
          ))}
        </div>
        <div className="h-64 animate-pulse rounded-xl border border-[#EDEDED] bg-[#F5F5F5]" />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-8" style={{ fontFamily: 'Inter, sans-serif' }}>
      {/* Toast */}
      {toast && (
        <div className="fixed right-6 top-6 z-50 flex items-center gap-2 rounded-lg bg-[#059669] px-4 py-3 text-sm font-medium text-white shadow-lg">
          <Check className="h-4 w-4" />
          {toast}
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-[#0A0A0A]">Izin Yonetimi</h1>
          <p className="mt-1 text-sm text-[#525252]">
            Izin bakiyelerinizi goruntuleyin, talep olusturun ve ekip izinlerini takip edin.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setFormOpen(true)}
          className="inline-flex items-center gap-2 rounded-lg bg-[#0A0A0A] px-4 py-2.5 text-sm font-medium text-white transition-all hover:bg-[#262626] active:scale-[0.97]"
        >
          <Plus className="h-4 w-4" />
          Yeni Izin Talebi
        </button>
      </div>

      {/* Balance Cards — with click to show history */}
      <div className="grid gap-4 sm:grid-cols-3">
        {dynamicBalanceCards.map((card) => {
          const Icon = card.icon;
          const isUnlimited = card.total >= 999;
          const remaining = isUnlimited ? -1 : card.total - card.used;
          const pct = isUnlimited ? Math.min(card.used * 5, 100) : Math.round((card.used / card.total) * 100);
          const isExpanded = showBalanceDetail === card.label;
          return (
            <div key={card.label} className="rounded-xl border border-[#EDEDED] bg-white">
              <button
                type="button"
                onClick={() => setShowBalanceDetail(isExpanded ? null : card.label)}
                className="w-full p-5 text-left"
              >
                <div className="flex items-center gap-3">
                  <div
                    className="flex h-10 w-10 items-center justify-center rounded-lg"
                    style={{ backgroundColor: `${card.color}15` }}
                  >
                    <Icon className="h-5 w-5" style={{ color: card.color }} />
                  </div>
                  <div className="flex-1">
                    <p className="text-xs font-medium text-[#A3A3A3]">{card.label}</p>
                    <p className="text-xl font-semibold tabular-nums text-[#0A0A0A]">
                      {isUnlimited ? (
                        <><span className="text-lg">Sinirsiz</span> <span className="text-sm font-normal text-[#A3A3A3]">(raporlu)</span></>
                      ) : (
                        <>{remaining} <span className="text-sm font-normal text-[#A3A3A3]">/ {card.total} gun</span></>
                      )}
                    </p>
                  </div>
                  <ChevronDown className={`h-4 w-4 text-[#A3A3A3] transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                </div>
                <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-[#F5F5F5]">
                  <div
                    className="h-full rounded-full transition-all"
                    style={{ width: `${pct}%`, backgroundColor: card.color }}
                  />
                </div>
                <p className="mt-1 text-[11px] text-[#A3A3A3]">{card.used} gun kullanildi {isUnlimited && '(2 ayri rapor)'}</p>
              </button>

              {/* Expanded: Enterprise-depth balance detail */}
              {isExpanded && (
                <div className="border-t border-[#EDEDED] px-5 py-4">
                  <p className="mb-3 text-xs font-semibold text-[#0A0A0A]">Bakiye Detayi</p>
                  {/* Legal reference */}
                  <div className="mb-3 rounded-lg bg-[#F0F9FF] p-3 border border-[#BAE6FD]">
                    <div className="flex items-start gap-2">
                      <Info className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#2563EB]" />
                      <div>
                        <p className="text-[11px] font-semibold text-[#1E40AF]">{card.legalRef}</p>
                        <p className="mt-0.5 text-[11px] text-[#525252]">{card.accrualNote}</p>
                      </div>
                    </div>
                  </div>
                  {/* Detail lines */}
                  <div className="mb-3 rounded-lg bg-[#F5F5F5] p-3 space-y-1.5">
                    {card.detailLines.map((line, idx) => (
                      <div key={idx} className="flex items-center justify-between text-xs">
                        <span className="text-[#525252]">{line}</span>
                      </div>
                    ))}
                    {card.label !== 'Hastalik Izni' && (
                      <>
                        <div className="border-t border-[#E5E5E5] my-1.5" />
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-[#A3A3A3]">Toplam hak</span>
                          <span className="font-semibold text-[#0A0A0A]">{card.total} gun</span>
                        </div>
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-[#A3A3A3]">Kullanilan</span>
                          <span className="font-semibold text-[#0A0A0A]">{card.used} gun</span>
                        </div>
                        {card.carried > 0 && (
                          <div className="flex items-center justify-between text-xs">
                            <span className="text-[#A3A3A3]">Gecen yildan tasinan</span>
                            <span className="font-semibold text-[#0A0A0A]">{card.carried} gun</span>
                          </div>
                        )}
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-[#A3A3A3]">Kalan</span>
                          <span className="font-semibold" style={{ color: card.color }}>{isUnlimited ? 'Sinirsiz' : `${remaining} gun`}</span>
                        </div>
                        {card.maxCarry > 0 && (
                          <div className="flex items-center justify-between text-xs">
                            <span className="text-[#A3A3A3]">Max tasima limiti</span>
                            <span className="font-medium text-[#0A0A0A]">{card.maxCarry} gun</span>
                          </div>
                        )}
                      </>
                    )}
                    {card.label === 'Hastalik Izni' && (
                      <>
                        <div className="border-t border-[#E5E5E5] my-1.5" />
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-[#A3A3A3]">Belge zorunlulugu</span>
                          <span className="font-semibold text-[#D97706]">{card.requiresDoc}</span>
                        </div>
                      </>
                    )}
                  </div>
                  <p className="mb-2 text-[11px] font-medium text-[#A3A3A3]">Kullanim gecmisi</p>
                  {myLeaves
                    .filter((l) => {
                      if (card.label === 'Mazeret Izni') return l.type === 'Mazeret Izni' && l.status === 'approved';
                      if (card.label === 'Hastalik Izni') return l.type === 'Hastalik Izni' && l.status === 'approved';
                      return l.type === card.label && l.status === 'approved';
                    })
                    .slice(0, 5)
                    .map((l) => (
                      <div key={l.id} className="flex items-center justify-between py-1.5 text-xs">
                        <span className="text-[#525252]">{formatDateTR(l.startDate)} — {formatDateTR(l.endDate)}</span>
                        <span className="font-medium text-[#0A0A0A]">{l.days} gun</span>
                      </div>
                    ))}
                  {myLeaves.filter((l) => l.type === card.label && l.status === 'approved').length === 0 && (
                    <p className="py-2 text-xs text-[#A3A3A3]">Henuz kullanim yok</p>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Approval Chain Visualization */}
      <div className="rounded-xl border border-[#EDEDED] bg-white p-5">
        <p className="mb-4 text-sm font-semibold text-[#0A0A0A]">Onay Sureci</p>
        <div className="flex items-center gap-2 overflow-x-auto">
          {approvalChain.map((step, i) => (
            <div key={step.role} className="flex items-center gap-2">
              <div className="flex items-center gap-2">
                <div
                  className={`flex h-8 w-8 items-center justify-center rounded-full text-xs font-semibold ${
                    step.status === 'done'
                      ? 'bg-[#059669] text-white'
                      : step.status === 'current'
                        ? 'bg-[#5E5CE6] text-white'
                        : 'bg-[#F5F5F5] text-[#A3A3A3]'
                  }`}
                >
                  {step.status === 'done' ? <Check className="h-4 w-4" /> : i + 1}
                </div>
                <div>
                  <p className={`text-xs font-medium ${step.status === 'current' ? 'text-[#5E5CE6]' : 'text-[#0A0A0A]'}`}>
                    {step.role}
                  </p>
                  {step.name && <p className="text-[10px] text-[#A3A3A3]">{step.name}</p>}
                </div>
              </div>
              {i < approvalChain.length - 1 && (
                <ArrowRight className={`h-4 w-4 shrink-0 ${step.status === 'done' ? 'text-[#059669]' : 'text-[#D4D4D4]'}`} />
              )}
            </div>
          ))}
        </div>
        <p className="mt-3 text-[11px] text-[#A3A3A3]">
          Talebiniz: Siz &rarr; Yonetici (Ayse K.) &rarr; IK &rarr; Onay
        </p>
      </div>

      {/* Tabs */}
      <div>
        <div className="flex gap-1 border-b border-[#EDEDED]">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              type="button"
              onClick={() => setActiveTab(tab.key)}
              className={`px-4 py-2.5 text-sm font-medium transition-colors ${
                activeTab === tab.key
                  ? 'border-b-2 border-[#0A0A0A] text-[#0A0A0A]'
                  : 'text-[#A3A3A3] hover:text-[#525252]'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* My Leaves */}
        {activeTab === 'my' && (
          <div className="mt-6 space-y-4">
            <div className="rounded-xl border border-[#EDEDED] bg-white">
              <div className="divide-y divide-[#EDEDED]">
                {myLeaves.length === 0 && (
                  <div className="px-6 py-12 text-center text-sm text-[#A3A3A3]">
                    Henuz izin talebi yok.
                  </div>
                )}
                {myLeaves.map((leave) => {
                  const st = statusConfig[leave.status];
                  const isSelected = selectedLeave?.id === leave.id;
                  return (
                    <button
                      key={leave.id}
                      type="button"
                      onClick={() => setSelectedLeave(isSelected ? null : leave)}
                      className={`flex w-full items-center gap-4 px-5 py-4 text-left transition-colors hover:bg-[#FAFAFA] ${isSelected ? 'bg-[#F5F3FF]' : ''}`}
                    >
                      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#F5F5F5]">
                        <Calendar className="h-5 w-5 text-[#525252]" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-[#0A0A0A]">{leave.type}</p>
                        <p className="text-xs text-[#A3A3A3]">
                          {formatDateTR(leave.startDate)} — {formatDateTR(leave.endDate)} · {leave.days} is gunu
                        </p>
                        {leave.reason !== '-' && (
                          <p className="mt-0.5 text-[11px] text-[#A3A3A3]">{leave.reason}</p>
                        )}
                      </div>
                      <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-semibold ${st.bg} ${st.text}`}>
                        {st.label}
                      </span>
                      <ChevronDown className={`h-4 w-4 text-[#A3A3A3] transition-transform ${isSelected ? 'rotate-180' : ''}`} />
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Leave Request Detail Panel */}
            {selectedLeave && (
              <div className="rounded-xl border border-[#5E5CE6] bg-white p-5 shadow-sm">
                <div className="flex items-center justify-between mb-4">
                  <p className="text-sm font-semibold text-[#0A0A0A]">Izin Talep Detayi</p>
                  <button type="button" onClick={() => setSelectedLeave(null)} className="text-[#A3A3A3] hover:text-[#525252]">
                    <X className="h-4 w-4" />
                  </button>
                </div>

                {/* Request Timeline */}
                <div className="mb-5">
                  <p className="mb-3 text-xs font-semibold text-[#525252]">Onay Zaman Cizelgesi</p>
                  <div className="space-y-3">
                    {getApprovalTimeline(selectedLeave.status).map((step, i) => (
                      <div key={i} className="flex items-start gap-3">
                        <div className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[10px] font-semibold ${
                          step.status === 'done' ? 'bg-[#059669] text-white'
                          : step.status === 'current' ? 'bg-[#5E5CE6] text-white'
                          : 'bg-[#F5F5F5] text-[#A3A3A3]'
                        }`}>
                          {step.status === 'done' ? <Check className="h-3.5 w-3.5" /> : i + 1}
                        </div>
                        <div className="flex-1">
                          <p className={`text-xs font-medium ${step.status === 'current' ? 'text-[#5E5CE6]' : step.status === 'done' ? 'text-[#0A0A0A]' : 'text-[#A3A3A3]'}`}>
                            {step.label}
                          </p>
                          <p className="text-[10px] text-[#A3A3A3]">{step.date}</p>
                          {step.approver && <p className="text-[10px] text-[#525252]">{step.approver}</p>}
                        </div>
                        {i < getApprovalTimeline(selectedLeave.status).length - 1 && (
                          <div className="hidden" />
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Business Days Calculation Detail */}
                {(() => {
                  const calc = calculateBusinessDays(selectedLeave.startDate, selectedLeave.endDate);
                  return (
                    <div className="mb-5 rounded-lg bg-[#FAFAFA] p-4 border border-[#EDEDED]">
                      <div className="flex items-center gap-2 mb-2">
                        <Calendar className="h-3.5 w-3.5 text-[#5E5CE6]" />
                        <p className="text-xs font-semibold text-[#0A0A0A]">Is Gunu Hesabi</p>
                      </div>
                      <p className="text-xs text-[#525252]">
                        {formatDateTR(selectedLeave.startDate)} — {formatDateTR(selectedLeave.endDate)}: {calc.totalCalendarDays} takvim gunu - {calc.weekendDays} hafta sonu - {calc.holidays.length} tatil = <span className="font-semibold text-[#5E5CE6]">{calc.businessDays} is gunu</span>
                      </p>
                      {calc.holidays.length > 0 && (
                        <p className="mt-1 text-[10px] text-[#DC2626]">
                          Tatil: {calc.holidays.join(', ')}
                        </p>
                      )}
                    </div>
                  );
                })()}

                {/* Team Impact */}
                {(() => {
                  const overlapping = leaves.filter(
                    (l) => l.employee !== selectedLeave.employee && l.status !== 'rejected' &&
                      l.startDate <= selectedLeave.endDate && l.endDate >= selectedLeave.startDate
                  );
                  if (overlapping.length === 0) return (
                    <div className="mb-5 rounded-lg bg-[#D1FAE5] p-3 border border-[#A7F3D0]">
                      <p className="text-xs text-[#059669] font-medium">Bu tarihte ekipten baska kimse izinde degil.</p>
                    </div>
                  );
                  return (
                    <div className="mb-5 rounded-lg bg-[#FEF3C7] p-3 border border-[#FDE68A]">
                      <div className="flex items-center gap-2 mb-2">
                        <Users className="h-3.5 w-3.5 text-[#D97706]" />
                        <p className="text-xs font-semibold text-[#92400E]">Ekip Etkisi</p>
                      </div>
                      <p className="text-xs text-[#92400E]">
                        Bu tarihte ekipten {overlapping.length} kisi daha izinde:
                      </p>
                      <div className="mt-1 space-y-0.5">
                        {overlapping.map((l) => (
                          <p key={l.id} className="text-[10px] text-[#525252]">
                            {l.employee} ({l.type.toLowerCase()})
                          </p>
                        ))}
                      </div>
                    </div>
                  );
                })()}

                {/* Approval Chain */}
                <div className="rounded-lg bg-[#F5F5F5] p-3">
                  <p className="text-[11px] font-medium text-[#A3A3A3] mb-1">Onay zinciri</p>
                  <p className="text-xs text-[#525252]">
                    Onaylayan: Ayse Kara (Yonetici) &rarr; Hasan Aker (IK Direktoru)
                  </p>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Team Leaves */}
        {activeTab === 'team' && (
          <div className="mt-6 rounded-xl border border-[#EDEDED] bg-white">
            <div className="divide-y divide-[#EDEDED]">
              {teamLeaves.length === 0 && (
                <div className="px-6 py-12 text-center text-sm text-[#A3A3A3]">
                  Ekip izin talebi yok.
                </div>
              )}
              {teamLeaves.map((leave) => {
                const st = statusConfig[leave.status];
                return (
                  <div key={leave.id} className="flex items-center gap-4 px-5 py-4 transition-colors hover:bg-[#FAFAFA]">
                    <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[#F5F5F5] text-xs font-medium text-[#525252]">
                      {leave.employee.split(' ').map((n) => n[0]).join('')}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-[#0A0A0A]">{leave.employee}</p>
                      <p className="text-xs text-[#A3A3A3]">
                        {leave.type} · {formatDateTR(leave.startDate)} — {formatDateTR(leave.endDate)} · {leave.days} is gunu
                      </p>
                    </div>
                    <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-semibold ${st.bg} ${st.text}`}>
                      {st.label}
                    </span>
                    {leave.status === 'pending' && (
                      <div className="flex gap-1">
                        <button
                          type="button"
                          onClick={() => handleApprove(leave.id)}
                          className="inline-flex items-center gap-1 rounded-md bg-[#0A0A0A] px-3 py-1.5 text-xs font-medium text-white transition-all hover:bg-[#262626] active:scale-[0.97]"
                        >
                          <Check className="h-3.5 w-3.5" />
                          Onayla
                        </button>
                        <button
                          type="button"
                          onClick={() => handleReject(leave.id)}
                          className="inline-flex items-center gap-1 rounded-md border border-[#EDEDED] bg-white px-3 py-1.5 text-xs font-medium text-[#525252] transition-all hover:bg-[#FAFAFA] active:scale-[0.97]"
                        >
                          <X className="h-3.5 w-3.5" />
                          Reddet
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Calendar View — Full feature */}
        {activeTab === 'calendar' && (
          <div className="mt-6 rounded-xl border border-[#EDEDED] bg-white p-6">
            {/* Month navigation */}
            <div className="mb-4 flex items-center justify-between">
              <button type="button" onClick={prevMonth} className="rounded-lg border border-[#EDEDED] p-2 text-[#525252] hover:bg-[#FAFAFA]">
                <ChevronLeft className="h-4 w-4" />
              </button>
              <p className="text-sm font-semibold text-[#0A0A0A]">{monthNames[calendarMonth]} {calendarYear}</p>
              <button type="button" onClick={nextMonth} className="rounded-lg border border-[#EDEDED] p-2 text-[#525252] hover:bg-[#FAFAFA]">
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>

            <div className="grid grid-cols-7 gap-1">
              {['Pzt', 'Sal', 'Car', 'Per', 'Cum', 'Cmt', 'Paz'].map((d) => (
                <div key={d} className="py-2 text-center text-[11px] font-semibold uppercase text-[#A3A3A3]">
                  {d}
                </div>
              ))}
              {Array.from({ length: firstDayOfWeek }).map((_, i) => (
                <div key={`empty-${i}`} />
              ))}
              {Array.from({ length: daysInMonth }).map((_, i) => {
                const day = i + 1;
                const dateStr = `${calendarYear}-${String(calendarMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
                const isHoliday = holidayDateSet.has(dateStr);
                const holidayInfo = TURKISH_HOLIDAYS_2026.find((h) => h.date === dateStr);
                const isToday = dateStr === todayStr;
                const myLeave = leaves.some(
                  (l) => l.employee === 'Hasan Aker' && l.status !== 'rejected' && dateStr >= l.startDate && dateStr <= l.endDate
                );
                const teamLeave = leaves.some(
                  (l) => l.employee !== 'Hasan Aker' && l.status !== 'rejected' && dateStr >= l.startDate && dateStr <= l.endDate
                );
                const d = new Date(dateStr);
                const weekend = d.getDay() === 0 || d.getDay() === 6;

                let bgClass = 'text-[#525252] hover:bg-[#F5F5F5]';
                let ringClass = '';
                if (isToday) ringClass = 'ring-2 ring-[#0A0A0A]';
                if (weekend) bgClass = 'text-[#A3A3A3] bg-[#FAFAFA]';
                if (isHoliday) bgClass = 'bg-[#FEE2E2] text-[#DC2626] font-medium';
                if (teamLeave) bgClass = 'bg-[#DBEAFE] text-[#2563EB] font-medium';
                if (myLeave) bgClass = 'bg-[#5E5CE6] text-white font-medium';

                return (
                  <div
                    key={day}
                    title={holidayInfo?.name || ''}
                    className={`flex h-10 items-center justify-center rounded-md text-sm tabular-nums transition-colors ${bgClass} ${ringClass}`}
                  >
                    {day}
                  </div>
                );
              })}
            </div>

            {/* Legend */}
            <div className="mt-4 flex flex-wrap items-center gap-4">
              <div className="flex items-center gap-1.5">
                <span className="h-3 w-3 rounded-sm bg-[#5E5CE6]" />
                <span className="text-[11px] text-[#525252]">Kendi izinleriniz</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="h-3 w-3 rounded-sm bg-[#DBEAFE]" />
                <span className="text-[11px] text-[#525252]">Ekip izinleri</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="h-3 w-3 rounded-sm bg-[#FEE2E2]" />
                <span className="text-[11px] text-[#525252]">Resmi tatiller</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="h-3 w-3 rounded-sm ring-2 ring-[#0A0A0A]" />
                <span className="text-[11px] text-[#525252]">Bugun</span>
              </div>
            </div>

            {/* Holidays in this month */}
            {(() => {
              const monthHolidays = TURKISH_HOLIDAYS_2026.filter((h) => {
                const parts = h.date.split('-');
                const hMonth = parseInt(parts[1] ?? '0', 10) - 1;
                return hMonth === calendarMonth;
              });
              if (monthHolidays.length === 0) return null;
              return (
                <div className="mt-4 rounded-lg bg-[#FEF2F2] p-3">
                  <p className="mb-2 text-xs font-semibold text-[#DC2626]">Bu ayin resmi tatilleri</p>
                  {monthHolidays.map((h) => (
                    <p key={h.date} className="text-xs text-[#525252]">
                      {formatDateTR(h.date)} — {h.name}
                    </p>
                  ))}
                </div>
              );
            })()}
          </div>
        )}
      </div>

      {/* ─── Leave Analytics Panel ─── */}
      <div className="rounded-xl border border-[#EDEDED] bg-white">
        <button
          type="button"
          onClick={() => setShowAnalytics(!showAnalytics)}
          className="flex w-full items-center justify-between px-5 py-4"
        >
          <div className="flex items-center gap-2">
            <BarChart3 className="h-4 w-4 text-[#5E5CE6]" />
            <p className="text-sm font-semibold text-[#0A0A0A]">Izin Analitikleri</p>
          </div>
          {showAnalytics ? <ChevronUp className="h-4 w-4 text-[#A3A3A3]" /> : <ChevronDown className="h-4 w-4 text-[#A3A3A3]" />}
        </button>

        {showAnalytics && (
          <div className="border-t border-[#EDEDED] px-5 py-5 space-y-6">
            {/* Department Utilization */}
            <div>
              <p className="mb-3 text-xs font-semibold text-[#525252]">Departman Bazli Kullanim Orani</p>
              <div className="space-y-2.5">
                {departmentUtilization.map((d) => (
                  <div key={d.dept}>
                    <div className="flex items-center justify-between text-xs mb-1">
                      <span className="text-[#525252]">{d.dept}</span>
                      <span className="font-semibold" style={{ color: d.color }}>%{d.pct}</span>
                    </div>
                    <div className="h-2 w-full overflow-hidden rounded-full bg-[#F5F5F5]">
                      <div className="h-full rounded-full transition-all" style={{ width: `${d.pct}%`, backgroundColor: d.color }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Monthly Trend */}
            <div>
              <p className="mb-3 text-xs font-semibold text-[#525252]">Aylik Izin Kullanim Trendi</p>
              <div className="flex items-end gap-2">
                {monthlyTrend.map((m, i) => {
                  const maxDays = Math.max(...monthlyTrend.map((mt) => mt.days));
                  const heightPct = (m.days / maxDays) * 100;
                  const isCurrentMonth = i === 3; // April
                  const prevMonth = monthlyTrend[i - 1];
                  const trend = prevMonth ? m.days - prevMonth.days : 0;
                  return (
                    <div key={m.month} className="flex flex-1 flex-col items-center gap-1">
                      <span className="text-[10px] font-semibold tabular-nums text-[#525252]">{m.days}</span>
                      <div
                        className={`w-full rounded-t-md transition-all ${isCurrentMonth ? 'bg-[#5E5CE6]' : 'bg-[#E5E5E5]'}`}
                        style={{ height: `${Math.max(heightPct * 0.6, 8)}px` }}
                      />
                      <span className={`text-[10px] ${isCurrentMonth ? 'font-semibold text-[#5E5CE6]' : 'text-[#A3A3A3]'}`}>{m.month}</span>
                      {trend > 0 && isCurrentMonth && (
                        <span className="text-[9px] font-medium text-[#DC2626]">+{trend}</span>
                      )}
                    </div>
                  );
                })}
              </div>
              <p className="mt-2 text-[10px] text-[#A3A3A3]">
                Nisan: 22 gun (Ramazan Bayrami etkisi)
              </p>
            </div>

            {/* Leave Type Distribution */}
            <div>
              <p className="mb-3 text-xs font-semibold text-[#525252]">Izin Turu Dagilimi</p>
              <div className="flex items-center gap-3">
                <div className="flex h-3 w-full overflow-hidden rounded-full bg-[#F5F5F5]">
                  {leaveTypeDistribution.map((lt) => (
                    <div key={lt.type} className="h-full transition-all" style={{ width: `${lt.pct}%`, backgroundColor: lt.color }} />
                  ))}
                </div>
              </div>
              <div className="mt-2 flex flex-wrap gap-4">
                {leaveTypeDistribution.map((lt) => (
                  <div key={lt.type} className="flex items-center gap-1.5">
                    <span className="h-2.5 w-2.5 rounded-sm" style={{ backgroundColor: lt.color }} />
                    <span className="text-[11px] text-[#525252]">{lt.type} %{lt.pct}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Upcoming Leaves Calendar */}
            <div>
              <p className="mb-3 text-xs font-semibold text-[#525252]">Yaklasan Izinler</p>
              <div className="space-y-2">
                {upcomingLeaveSchedule.map((w) => (
                  <div key={w.week} className="flex items-center justify-between rounded-lg bg-[#FAFAFA] px-3 py-2.5">
                    <div>
                      <p className="text-xs font-medium text-[#0A0A0A]">{w.week}</p>
                      <p className="text-[10px] text-[#A3A3A3]">{w.names.join(', ')}</p>
                    </div>
                    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                      w.count >= 5 ? 'bg-[#FEE2E2] text-[#DC2626]' : w.count >= 3 ? 'bg-[#FEF3C7] text-[#D97706]' : 'bg-[#D1FAE5] text-[#059669]'
                    }`}>
                      {w.count} kisi
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Department Capacity Alerts */}
            {departmentAlerts.length > 0 && (
              <div className="space-y-2">
                {departmentAlerts.filter((a) => a.severity === 'high').map((alert) => (
                  <div key={alert.dept} className="flex items-start gap-2 rounded-lg bg-[#FEF3C7] border border-[#FDE68A] p-3">
                    <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-[#D97706]" />
                    <p className="text-xs font-medium text-[#92400E]">
                      {alert.dept} departmani %{alert.pct}+ bos kalacak {alert.dateRange}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* ─── Turkish Holidays 2026 Section ─── */}
      <div className="rounded-xl border border-[#EDEDED] bg-white">
        <button
          type="button"
          onClick={() => setShowHolidaysList(!showHolidaysList)}
          className="flex w-full items-center justify-between px-5 py-4"
        >
          <div className="flex items-center gap-2">
            <Flag className="h-4 w-4 text-[#DC2626]" />
            <p className="text-sm font-semibold text-[#0A0A0A]">2026 Resmi Tatiller</p>
            <span className="text-xs text-[#A3A3A3]">({HOLIDAYS_DISPLAY_LIST.length} tatil, toplam 14 gun)</span>
          </div>
          {showHolidaysList ? <ChevronUp className="h-4 w-4 text-[#A3A3A3]" /> : <ChevronDown className="h-4 w-4 text-[#A3A3A3]" />}
        </button>

        {showHolidaysList && (
          <div className="border-t border-[#EDEDED] px-5 py-4">
            <div className="space-y-2">
              {HOLIDAYS_DISPLAY_LIST.map((h) => {
                const isPast = (() => {
                  const monthMap: Record<string, number> = { Ocak: 0, Subat: 1, Mart: 2, Nisan: 3, Mayis: 4, Haziran: 5, Temmuz: 6, Agustos: 7, Eylul: 8, Ekim: 9, Kasim: 10, Aralik: 11 };
                  const parts = h.date.split(' ');
                  const monthName = parts[parts.length - 1] ?? '';
                  const month = monthMap[monthName];
                  if (month === undefined) return false;
                  return month < 3; // Before April (current month)
                })();
                return (
                  <div key={h.date} className={`flex items-center justify-between rounded-lg px-3 py-2.5 ${isPast ? 'bg-[#F5F5F5] opacity-60' : 'bg-[#FEF2F2]'}`}>
                    <div className="flex items-center gap-3">
                      <span className={`inline-flex h-8 items-center justify-center rounded-lg px-2.5 text-[11px] font-semibold ${isPast ? 'bg-[#E5E5E5] text-[#A3A3A3]' : 'bg-[#DC2626] text-white'}`}>
                        {h.date}
                      </span>
                      <p className={`text-xs font-medium ${isPast ? 'text-[#A3A3A3]' : 'text-[#0A0A0A]'}`}>{h.name}</p>
                    </div>
                    <span className="text-[10px] font-medium text-[#525252]">{h.duration}</span>
                  </div>
                );
              })}
            </div>
            <div className="mt-3 rounded-lg bg-[#F0F9FF] p-3 border border-[#BAE6FD]">
              <p className="text-[11px] text-[#1E40AF]">
                <span className="font-semibold">Stratejik izin plani:</span> Ramazan Bayrami (28-30 Mart) ve Kurban Bayrami (5-8 Haziran) oncesinde 1-2 gun izin alarak uzun tatiller olusturabilirsiniz.
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Modal — Deep version with calculator + overlap + rules */}
      {formOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#0A0A0A]/50 p-4">
          <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-xl bg-white shadow-xl">
            <div className="flex items-center justify-between border-b border-[#EDEDED] px-6 py-4">
              <h3 className="text-base font-semibold text-[#0A0A0A]">Yeni Izin Talebi</h3>
              <button type="button" onClick={() => setFormOpen(false)} className="text-[#A3A3A3] hover:text-[#525252]">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="flex flex-col gap-4 p-6">
              {/* Leave Type */}
              <div>
                <label className="mb-1 block text-xs font-medium text-[#525252]">Izin Turu</label>
                <div className="relative">
                  <select
                    value={formType}
                    onChange={(e) => setFormType(e.target.value)}
                    className="w-full appearance-none rounded-lg border border-[#EDEDED] bg-white px-3 py-2.5 text-sm text-[#0A0A0A] outline-none focus:border-[#5E5CE6] focus:ring-1 focus:ring-[#5E5CE6]"
                  >
                    {leaveTypes.map((t) => (
                      <option key={t} value={t}>{t}</option>
                    ))}
                  </select>
                  <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#A3A3A3]" />
                </div>
                {/* Leave type rule */}
                {currentRule && (
                  <div className="mt-2 flex items-start gap-2 rounded-lg bg-[#F5F5F5] px-3 py-2">
                    <Info className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#5E5CE6]" />
                    <div>
                      <p className="text-[11px] text-[#525252]">{currentRule.rule}</p>
                      {currentRule.requiresDoc && (
                        <p className="mt-0.5 text-[11px] font-medium text-[#D97706]">{currentRule.requiresDoc}</p>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Dates */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block text-xs font-medium text-[#525252]">Baslangic</label>
                  <input
                    type="date"
                    value={formStart}
                    onChange={(e) => setFormStart(e.target.value)}
                    className="w-full rounded-lg border border-[#EDEDED] px-3 py-2.5 text-sm text-[#0A0A0A] outline-none focus:border-[#5E5CE6] focus:ring-1 focus:ring-[#5E5CE6]"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-[#525252]">Bitis</label>
                  <input
                    type="date"
                    value={formEnd}
                    onChange={(e) => setFormEnd(e.target.value)}
                    className="w-full rounded-lg border border-[#EDEDED] px-3 py-2.5 text-sm text-[#0A0A0A] outline-none focus:border-[#5E5CE6] focus:ring-1 focus:ring-[#5E5CE6]"
                  />
                </div>
              </div>

              {/* ─── 4857 Is Kanunu Calculator ─── */}
              {formCalc && formCalc.totalCalendarDays > 0 && (
                <div className="rounded-lg border border-[#EDEDED] bg-[#FAFAFA] p-4">
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-[#5E5CE6]" />
                    <p className="text-sm font-semibold text-[#0A0A0A]">
                      {formatDateTR(formStart)} — {formatDateTR(formEnd)}: {formCalc.businessDays} is gunu
                    </p>
                  </div>
                  <div className="mt-2 space-y-1">
                    {formCalc.weekendDays > 0 && (
                      <p className="text-xs text-[#A3A3A3]">
                        {formCalc.weekendDays} hafta sonu gunu cikarildi
                      </p>
                    )}
                    {formCalc.holidays.length > 0 && (
                      <p className="text-xs text-[#DC2626]">
                        {formCalc.holidays.length} resmi tatil cikarildi: {formCalc.holidays.join(', ')}
                      </p>
                    )}
                    <p className="text-xs text-[#A3A3A3]">
                      Toplam {formCalc.totalCalendarDays} takvim gunu
                    </p>
                  </div>
                </div>
              )}

              {/* ─── Team Overlap Warning ─── */}
              {formStart && formEnd && teamOverlap.count > 0 && (
                <div className={`flex items-start gap-2 rounded-lg p-3 ${teamOverlap.departmentPct >= 30 ? 'bg-[#FEF3C7] border border-[#D97706]' : 'bg-[#FEF9C3]'}`}>
                  <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-[#D97706]" />
                  <div>
                    <p className="text-xs font-medium text-[#92400E]">
                      Bu tarihte ekipten {teamOverlap.count} kisi daha izinde
                    </p>
                    <p className="mt-0.5 text-[11px] text-[#92400E]">
                      {teamOverlap.names.join(', ')}
                    </p>
                    {teamOverlap.departmentPct >= 30 && (
                      <p className="mt-1 text-[11px] font-semibold text-[#DC2626]">
                        Departman %{teamOverlap.departmentPct} bos kalacak (&gt;%30 esik)
                      </p>
                    )}
                  </div>
                </div>
              )}

              {/* ─── Balance After Request ─── */}
              {balanceAfterRequest && formCalc && formCalc.businessDays > 0 && (
                <div className="flex items-center gap-3 rounded-lg bg-[#F0F9FF] p-3">
                  <Users className="h-4 w-4 text-[#5E5CE6]" />
                  <div className="flex-1">
                    <p className="text-xs text-[#525252]">
                      Kalan bakiye: {balanceAfterRequest.before} &rarr; {balanceAfterRequest.after} gun
                    </p>
                    {balanceAfterRequest.after < 0 && (
                      <p className="mt-0.5 text-[11px] font-semibold text-[#DC2626]">
                        Yetersiz bakiye! {Math.abs(balanceAfterRequest.after)} gun eksik.
                      </p>
                    )}
                  </div>
                </div>
              )}

              {/* Reason */}
              <div>
                <label className="mb-1 block text-xs font-medium text-[#525252]">Aciklama</label>
                <textarea
                  value={formReason}
                  onChange={(e) => setFormReason(e.target.value)}
                  rows={3}
                  placeholder="Izin nedeninizi yazin..."
                  className="w-full rounded-lg border border-[#EDEDED] px-3 py-2.5 text-sm text-[#0A0A0A] outline-none focus:border-[#5E5CE6] focus:ring-1 focus:ring-[#5E5CE6]"
                />
              </div>

              {/* Approval Chain Preview */}
              <div className="rounded-lg bg-[#F5F5F5] px-3 py-2">
                <p className="mb-1 text-[11px] font-medium text-[#A3A3A3]">Onay sureci</p>
                <div className="flex items-center gap-1 text-xs text-[#525252]">
                  <span>Siz</span>
                  <ArrowRight className="h-3 w-3 text-[#A3A3A3]" />
                  <span>Yonetici (Ayse K.)</span>
                  <ArrowRight className="h-3 w-3 text-[#A3A3A3]" />
                  <span>IK</span>
                  <ArrowRight className="h-3 w-3 text-[#A3A3A3]" />
                  <span className="font-medium text-[#059669]">Onay</span>
                </div>
              </div>
            </div>
            <div className="flex justify-end gap-2 border-t border-[#EDEDED] px-6 py-4">
              <button
                type="button"
                onClick={() => setFormOpen(false)}
                className="rounded-lg border border-[#EDEDED] px-4 py-2 text-sm font-medium text-[#525252] hover:bg-[#FAFAFA]"
              >
                Iptal
              </button>
              <button
                type="button"
                onClick={handleSubmit}
                disabled={!formStart || !formEnd || (balanceAfterRequest !== null && balanceAfterRequest.after < 0)}
                className="rounded-lg bg-[#0A0A0A] px-4 py-2 text-sm font-medium text-white transition-all hover:bg-[#262626] active:scale-[0.97] disabled:cursor-not-allowed disabled:opacity-40"
              >
                Talep Olustur
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
