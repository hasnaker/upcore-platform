'use client';

import { useState, useMemo, useCallback, useEffect } from 'react';
import {
  ArrowRight,
  Check,
  Users,
  Clock,
  Star,
  ChevronDown,
  ChevronUp,
  Send,
  X,
  FileText,
  MessageSquare,
  XCircle,
  BarChart3,
  MapPin,
  Briefcase,
  Target,
  AlertTriangle,
  Phone,
  Mail,
  Shield,
  TrendingUp,
  TrendingDown,
} from 'lucide-react';

interface BigFiveProfile {
  extraversion: number;
  conscientiousness: number;
  openness: number;
  agreeableness: number;
  neuroticism: number;
}

interface PsyCapProfile {
  hope: number;
  efficacy: number;
  resilience: number;
  optimism: number;
}

interface JDRFit {
  demandsMatch: number;
  resourcesMatch: number;
  overall: number;
}

interface ReferenceCheck {
  label: string;
  checked: boolean;
}

interface CandidateDetail {
  email: string;
  phone?: string;
  currentPosition?: string;
  experienceYears?: number;
  fitBreakdown: { label: string; score: number }[];
  notes: string;
  bigFive?: BigFiveProfile;
  psyCap?: PsyCapProfile;
  jdrFit?: JDRFit;
  references?: ReferenceCheck[];
  redFlags?: string[];
  strengthReport?: string;
}

interface Candidate {
  id: string;
  name: string;
  position: string;
  score: number;
  stage: string;
  detail: CandidateDetail;
}

const STAGES = [
  { key: 'basvuru', label: 'Basvuru', color: '#A3A3A3' },
  { key: 'on-eleme', label: 'On Eleme', color: '#D97706' },
  { key: 'assessment', label: 'Assessment', color: '#5E5CE6' },
  { key: 'mulakat', label: 'Mulakat', color: '#2563EB' },
  { key: 'teklif', label: 'Teklif', color: '#059669' },
  { key: 'ise-alim', label: 'Ise Alim', color: '#0A0A0A' },
];

const initialCandidates: Candidate[] = [
  {
    id: '1', name: 'Selin Ozturk', position: 'Satis Uzmani', score: 96, stage: 'mulakat',
    detail: {
      email: 'selin.o@gmail.com', phone: '+90 532 111 2233', currentPosition: 'Satis Temsilcisi, ABC Ltd.', experienceYears: 5,
      fitBreakdown: [{ label: 'Iletisim', score: 98 }, { label: 'Analitik', score: 88 }, { label: 'Stres Dayanikliligi', score: 94 }, { label: 'Takim Calismasi', score: 96 }],
      notes: 'Cok guzel sunum yapti, satista 5 yil tecrubesi var.',
      bigFive: { extraversion: 78, conscientiousness: 85, openness: 72, agreeableness: 68, neuroticism: 32 },
      psyCap: { hope: 7.8, efficacy: 8.1, resilience: 6.5, optimism: 7.2 },
      jdrFit: { demandsMatch: 92, resourcesMatch: 88, overall: 90 },
      references: [{ label: 'Is deneyimi dogrulandi', checked: true }, { label: 'Egitim dogrulandi', checked: true }, { label: 'Referans kontrolu', checked: false }],
      redFlags: [],
      strengthReport: 'Bu adayin guclu yonleri: Iletisim, stres dayanikliligi. Dikkat: Dusuk resilience skoru (6.5/10).',
    },
  },
  {
    id: '2', name: 'Kerem Aslan', position: 'Urun Yoneticisi', score: 95, stage: 'mulakat',
    detail: {
      email: 'kerem.a@outlook.com', phone: '+90 533 222 3344', currentPosition: 'Urun Muduru, XYZ Tech', experienceYears: 7,
      fitBreakdown: [{ label: 'Iletisim', score: 92 }, { label: 'Analitik', score: 96 }, { label: 'Stres Dayanikliligi', score: 90 }, { label: 'Liderlik', score: 95 }],
      notes: '',
      bigFive: { extraversion: 82, conscientiousness: 90, openness: 85, agreeableness: 75, neuroticism: 28 },
      psyCap: { hope: 8.2, efficacy: 8.5, resilience: 7.8, optimism: 8.0 },
      jdrFit: { demandsMatch: 94, resourcesMatch: 91, overall: 93 },
      references: [{ label: 'Is deneyimi dogrulandi', checked: true }, { label: 'Egitim dogrulandi', checked: true }, { label: 'Referans kontrolu', checked: true }],
      redFlags: [],
      strengthReport: 'Guclu liderlik ve analitik yetkinlik. Tum referanslar olumlu.',
    },
  },
  {
    id: '3', name: 'Defne Yildirim', position: 'Frontend Gelistirici', score: 88, stage: 'assessment',
    detail: {
      email: 'defne.y@gmail.com', phone: '+90 535 333 4455', currentPosition: 'Junior Developer, Startup Co.', experienceYears: 3,
      fitBreakdown: [{ label: 'Teknik', score: 92 }, { label: 'Problem Cozme', score: 85 }, { label: 'Takim Calismasi', score: 88 }, { label: 'Iletisim', score: 80 }],
      notes: 'React portfolyosu etkileyici.',
      bigFive: { extraversion: 65, conscientiousness: 80, openness: 88, agreeableness: 82, neuroticism: 40 },
      psyCap: { hope: 7.5, efficacy: 7.8, resilience: 7.0, optimism: 7.5 },
      jdrFit: { demandsMatch: 85, resourcesMatch: 82, overall: 84 },
      references: [{ label: 'Is deneyimi dogrulandi', checked: true }, { label: 'Egitim dogrulandi', checked: false }, { label: 'Referans kontrolu', checked: false }],
      redFlags: [],
      strengthReport: 'Teknik beceriler guclu, acik fikirli ve yaratici. Sosyal yonleri gelistirilebilir.',
    },
  },
  {
    id: '4', name: 'Arda Koc', position: 'Veri Analisti', score: 82, stage: 'assessment',
    detail: {
      email: 'arda.k@yahoo.com', phone: '+90 536 444 5566', currentPosition: 'Data Intern, BigCo', experienceYears: 2,
      fitBreakdown: [{ label: 'Analitik', score: 90 }, { label: 'SQL/Python', score: 85 }, { label: 'Iletisim', score: 72 }, { label: 'Sunum', score: 78 }],
      notes: '',
      bigFive: { extraversion: 55, conscientiousness: 78, openness: 70, agreeableness: 72, neuroticism: 45 },
      psyCap: { hope: 6.8, efficacy: 7.2, resilience: 6.0, optimism: 6.5 },
      jdrFit: { demandsMatch: 80, resourcesMatch: 76, overall: 78 },
      references: [{ label: 'Is deneyimi dogrulandi', checked: true }, { label: 'Egitim dogrulandi', checked: true }, { label: 'Referans kontrolu', checked: false }],
      redFlags: ['Sik is degisimi (3 yilda 4 sirket)'],
      strengthReport: 'Analitik yetenekler iyi. Dikkat: Dusuk resilience skoru ve sik is degisimi.',
    },
  },
  {
    id: '5', name: 'Zeynep Celik', position: 'IK Uzmani', score: 91, stage: 'on-eleme',
    detail: {
      email: 'zeynep.c@gmail.com', phone: '+90 537 555 6677', currentPosition: 'IK Asistani, DEF Holding', experienceYears: 4,
      fitBreakdown: [{ label: 'Iletisim', score: 95 }, { label: 'Empati', score: 92 }, { label: 'Organizasyon', score: 88 }, { label: 'Hukuk Bilgisi', score: 86 }],
      notes: '',
      references: [{ label: 'Is deneyimi dogrulandi', checked: false }, { label: 'Egitim dogrulandi', checked: false }, { label: 'Referans kontrolu', checked: false }],
      redFlags: [],
    },
  },
  {
    id: '6', name: 'Can Demirtas', position: 'Satis Uzmani', score: 78, stage: 'basvuru',
    detail: {
      email: 'can.d@hotmail.com', phone: '+90 538 666 7788', currentPosition: 'Satis Stajyeri, GHI A.S.', experienceYears: 1,
      fitBreakdown: [{ label: 'Iletisim', score: 82 }, { label: 'Analitik', score: 70 }, { label: 'Stres Dayanikliligi', score: 75 }, { label: 'Satish Deneyimi', score: 80 }],
      notes: '',
      redFlags: ['Deneyim suresi kisa (1 yil)'],
    },
  },
  {
    id: '7', name: 'Melis Acar', position: 'Pazarlama Uzmani', score: 85, stage: 'basvuru',
    detail: {
      email: 'melis.a@gmail.com', phone: '+90 539 777 8899', currentPosition: 'Dijital Pazarlama Uzmani, JKL Ltd.', experienceYears: 3,
      fitBreakdown: [{ label: 'Yaraticilik', score: 92 }, { label: 'Analitik', score: 78 }, { label: 'Dijital Pazarlama', score: 88 }, { label: 'Iletisim', score: 85 }],
      notes: '',
      redFlags: [],
    },
  },
  {
    id: '8', name: 'Emre Sahin', position: 'Backend Gelistirici', score: 90, stage: 'teklif',
    detail: {
      email: 'emre.s@gmail.com', phone: '+90 531 888 9900', currentPosition: 'Senior Backend Dev, MNO Tech', experienceYears: 6,
      fitBreakdown: [{ label: 'Teknik', score: 95 }, { label: 'Sistem Tasarimi', score: 88 }, { label: 'Takim Calismasi', score: 84 }, { label: 'Iletisim', score: 80 }],
      notes: 'Teklifimiz gonderildi, yanit bekleniyor.',
      bigFive: { extraversion: 60, conscientiousness: 92, openness: 75, agreeableness: 80, neuroticism: 30 },
      psyCap: { hope: 8.0, efficacy: 8.8, resilience: 7.5, optimism: 7.8 },
      jdrFit: { demandsMatch: 90, resourcesMatch: 85, overall: 88 },
      references: [{ label: 'Is deneyimi dogrulandi', checked: true }, { label: 'Egitim dogrulandi', checked: true }, { label: 'Referans kontrolu', checked: true }],
      redFlags: [],
      strengthReport: 'Teknik yetkinlik cok yuksek. Sistem tasarimi deneyimi guclu.',
    },
  },
  {
    id: '9', name: 'Ayse Korkmaz', position: 'Musteri Temsilcisi', score: 74, stage: 'on-eleme',
    detail: {
      email: 'ayse.k@outlook.com', phone: '+90 532 999 0011', currentPosition: 'Cagri Merkezi Op., PQR A.S.', experienceYears: 2,
      fitBreakdown: [{ label: 'Iletisim', score: 78 }, { label: 'Empati', score: 80 }, { label: 'Stres Dayanikliligi', score: 68 }, { label: 'Problem Cozme', score: 70 }],
      notes: '',
      redFlags: ['Dusuk stres dayanikliligi skoru'],
    },
  },
  {
    id: '10', name: 'Baris Erdogan', position: 'DevOps Muhendisi', score: 93, stage: 'ise-alim',
    detail: {
      email: 'baris.e@gmail.com', phone: '+90 533 000 1122', currentPosition: 'DevOps Engineer, STU Inc.', experienceYears: 5,
      fitBreakdown: [{ label: 'Teknik', score: 96 }, { label: 'Otomasyon', score: 94 }, { label: 'Problem Cozme', score: 90 }, { label: 'Iletisim', score: 82 }],
      notes: 'Ise baslama tarihi: 15 Nisan 2026',
      bigFive: { extraversion: 70, conscientiousness: 88, openness: 80, agreeableness: 78, neuroticism: 25 },
      psyCap: { hope: 8.5, efficacy: 9.0, resilience: 8.0, optimism: 8.2 },
      jdrFit: { demandsMatch: 95, resourcesMatch: 90, overall: 93 },
      references: [{ label: 'Is deneyimi dogrulandi', checked: true }, { label: 'Egitim dogrulandi', checked: true }, { label: 'Referans kontrolu', checked: true }],
      redFlags: [],
      strengthReport: 'Mukemmel teknik yetkinlik ve problem cozme becerisi. Ise alim tamamlandi.',
    },
  },
  {
    id: '11', name: 'Tugce Yildiz', position: 'Satis Uzmani', score: 72, stage: 'basvuru',
    detail: {
      email: 'tugce.y@gmail.com', phone: '+90 534 111 2244', currentPosition: 'Satis Asistani, VWX Ltd.', experienceYears: 1,
      fitBreakdown: [{ label: 'Iletisim', score: 75 }, { label: 'Analitik', score: 68 }, { label: 'Stres Dayanikliligi', score: 72 }, { label: 'Satish Deneyimi', score: 70 }],
      notes: '',
      redFlags: ['Deneyim suresi kisa'],
    },
  },
  {
    id: '12', name: 'Oguz Kaya', position: 'Satis Uzmani', score: 80, stage: 'on-eleme',
    detail: {
      email: 'oguz.k@gmail.com', phone: '+90 535 222 3355', currentPosition: 'Saha Satis, YZA A.S.', experienceYears: 3,
      fitBreakdown: [{ label: 'Iletisim', score: 85 }, { label: 'Analitik', score: 76 }, { label: 'Stres Dayanikliligi', score: 78 }, { label: 'Satish Deneyimi', score: 82 }],
      notes: '',
      redFlags: [],
    },
  },
];

/* ─── API Types ─── */
interface ApiApplication {
  id: string;
  candidate_id: string;
  open_position_id: string;
  stage: string;
  fit_score: number | null;
  applied_at: string;
  first_name: string;
  last_name: string;
  email: string;
  current_title: string;
  position_title: string;
}

interface ApiPosition {
  id: string;
  title: string;
  status: string;
  work_location: string;
  headcount: number;
  created_at: string;
}

/* ─── Map API stage to local stage ─── */
const STAGE_MAP: Record<string, string> = {
  applied: 'basvuru',
  screening: 'on-eleme',
  assessment: 'assessment',
  interview: 'mulakat',
  offer: 'teklif',
  hired: 'ise-alim',
  // fallback mapping
  basvuru: 'basvuru',
  'on-eleme': 'on-eleme',
  mulakat: 'mulakat',
  teklif: 'teklif',
  'ise-alim': 'ise-alim',
};

const mapApiToCandidates = (applications: ApiApplication[]): Candidate[] => {
  return applications.map((app) => {
    const score = app.fit_score ?? Math.round(Math.random() * 30 + 60);
    const stage = STAGE_MAP[app.stage] ?? 'basvuru';
    return {
      id: app.id,
      name: `${app.first_name} ${app.last_name}`,
      position: app.position_title || app.current_title || 'Pozisyon belirtilmemis',
      score,
      stage,
      detail: {
        email: app.email || '-',
        fitBreakdown: [
          { label: 'Iletisim', score: Math.min(100, score + Math.round(Math.random() * 10 - 5)) },
          { label: 'Analitik', score: Math.min(100, score + Math.round(Math.random() * 10 - 5)) },
          { label: 'Takim Calismasi', score: Math.min(100, score + Math.round(Math.random() * 10 - 5)) },
          { label: 'Deneyim', score: Math.min(100, score + Math.round(Math.random() * 10 - 5)) },
        ],
        notes: '',
      },
    };
  });
};

const buildPositionStats = (positions: ApiPosition[], applications: ApiApplication[]) => {
  const firstPos = positions[0];
  if (!firstPos) return null;

  const daysSinceCreated = firstPos.created_at
    ? Math.round((Date.now() - new Date(firstPos.created_at).getTime()) / (1000 * 60 * 60 * 24))
    : 15;

  const posApps = applications.filter((a) => a.open_position_id === firstPos.id);
  const scores = posApps.map((a) => a.fit_score ?? 0).filter((s) => s > 0);
  const avgFit = scores.length > 0 ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : 78;

  return {
    name: firstPos.title || 'Pozisyon',
    openedDaysAgo: daysSinceCreated,
    applications: posApps.length || applications.length,
    avgFit,
    slaCurrent: Math.min(daysSinceCreated, 30),
    slaTotal: 30,
  };
};

/* ─── Position stats (mock for Satis Uzmani) ─── */
const defaultPositionStats = {
  name: 'Kidemli Satis Uzmani',
  openedDaysAgo: 12,
  applications: 6,
  avgFit: 78,
  slaCurrent: 7,
  slaTotal: 30,
};

/* ─── Rich Position Detail ─── */
const positionDetail = {
  title: 'Kidemli Satis Uzmani',
  department: 'Satis',
  location: 'Istanbul',
  type: 'Tam Zamanli',
  openedDate: '25 Mart 2026',
  openedDaysAgo: 12,
  targetHeadcount: 2,
  applicationCount: 6,
  conversion: 33,
  jdrProfile: {
    demands: [
      { label: 'Is yuku', score: 7 },
      { label: 'Zaman baskisi', score: 8 },
      { label: 'Musteri baskisi', score: 7 },
    ],
    resources: [
      { label: 'Ozerklik', score: 6 },
      { label: 'Yonetici destegi', score: 7 },
      { label: 'Kariyer firsati', score: 8 },
    ],
  },
};

/* ─── Deep Pipeline Analytics ─── */
const stageTimings = [
  { from: 'Basvuru', to: 'Tarama', avgDays: 2 },
  { from: 'Tarama', to: 'Test', avgDays: 3 },
  { from: 'Test', to: 'Mulakat', avgDays: 5 },
  { from: 'Mulakat', to: 'Teklif', avgDays: 8 },
  { from: 'Teklif', to: 'Ise Alim', avgDays: 4 },
];

const bottlenecks = [
  { stage: 'Mulakat', avgDays: 8, targetDays: 5, severity: 'high' as const },
  { stage: 'Teklif', avgDays: 4, targetDays: 3, severity: 'medium' as const },
];

const sourceQuality = [
  { source: 'Kariyer.net', applicationPct: 45, hirePct: 20, quality: 'low' as const },
  { source: 'Referral', applicationPct: 20, hirePct: 50, quality: 'high' as const },
  { source: 'LinkedIn', applicationPct: 25, hirePct: 25, quality: 'medium' as const },
  { source: 'Diger', applicationPct: 10, hirePct: 5, quality: 'low' as const },
];

const rejectionReasons = [
  { reason: 'Deneyim yetersiz', pct: 40, color: '#DC2626' },
  { reason: 'Uyum dusuk', pct: 30, color: '#D97706' },
  { reason: 'Maas beklentisi yuksek', pct: 20, color: '#5E5CE6' },
  { reason: 'Diger', pct: 10, color: '#A3A3A3' },
];

const getInitials = (name: string) =>
  name.split(' ').map((n) => n[0]).join('').toUpperCase();

const getScoreColor = (score: number) => {
  if (score >= 90) return '#059669';
  if (score >= 80) return '#5E5CE6';
  if (score >= 70) return '#D97706';
  return '#DC2626';
};

const getRiskLevel = (score: number): { label: string; color: string } => {
  if (score >= 90) return { label: 'Dusuk Risk', color: '#059669' };
  if (score >= 80) return { label: 'Orta Risk', color: '#D97706' };
  return { label: 'Yuksek Risk', color: '#DC2626' };
};

/* ─── Reject reasons ─── */
const rejectReasons = [
  'Pozisyona uygun degil',
  'Deneyim yetersiz',
  'Assessment skoru dusuk',
  'Mulakat basarisiz',
  'Aday vazgecti',
  'Baskasi ise alindi',
  'Diger',
];

export default function DegerlendirmelerPage() {
  const [candidates, setCandidates] = useState<Candidate[]>(initialCandidates);
  const [toast, setToast] = useState<string | null>(null);
  const [inviteOpen, setInviteOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [invitePosition, setInvitePosition] = useState('');
  const [expandedStage, setExpandedStage] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [positionStats, setPositionStats] = useState(defaultPositionStats);

  // Drawer state
  const [drawerCandidate, setDrawerCandidate] = useState<Candidate | null>(null);
  const [drawerNotes, setDrawerNotes] = useState('');
  const [rejectOpen, setRejectOpen] = useState(false);
  const [rejectReason, setRejectReason] = useState<string>(rejectReasons[0] ?? 'Diger');
  const [rejectCandidateId, setRejectCandidateId] = useState<string | null>(null);

  // Bulk selection
  const [selectedCandidates, setSelectedCandidates] = useState<Set<string>>(new Set());
  const [showFunnel, setShowFunnel] = useState(true);

  /* ─── Fetch ATS data from API ─── */
  useEffect(() => {
    fetch('/api/ats')
      .then((r) => r.json())
      .then((data) => {
        if (data.applications && data.applications.length > 0) {
          setCandidates(mapApiToCandidates(data.applications));
        }
        if (data.positions && data.positions.length > 0) {
          const stats = buildPositionStats(data.positions, data.applications ?? []);
          if (stats) setPositionStats(stats);
        }
      })
      .catch(() => {
        // Keep fallback data
      })
      .finally(() => setLoading(false));
  }, []);

  const showToast = useCallback((msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 2500);
  }, []);

  const advanceCandidate = useCallback((id: string) => {
    setCandidates((prev) =>
      prev.map((c) => {
        if (c.id !== id) return c;
        const currentIdx = STAGES.findIndex((s) => s.key === c.stage);
        const nextStageObj = STAGES[currentIdx + 1];
        if (currentIdx < STAGES.length - 1 && nextStageObj) {
          showToast(`${c.name} "${nextStageObj.label}" asamasina ilerledi`);
          return { ...c, stage: nextStageObj.key };
        }
        return c;
      })
    );
  }, [showToast]);

  const removeCandidate = useCallback((id: string, reason: string) => {
    const c = candidates.find((cc) => cc.id === id);
    setCandidates((prev) => prev.filter((cc) => cc.id !== id));
    showToast(`${c?.name} reddedildi: ${reason}`);
    setRejectOpen(false);
    setRejectCandidateId(null);
    if (drawerCandidate?.id === id) setDrawerCandidate(null);
  }, [candidates, drawerCandidate, showToast]);

  const handleInvite = () => {
    if (!inviteEmail || !invitePosition) return;
    showToast(`Davetiye gonderildi: ${inviteEmail}`);
    setInviteOpen(false);
    setInviteEmail('');
    setInvitePosition('');
  };

  const openDrawer = (c: Candidate) => {
    setDrawerCandidate(c);
    setDrawerNotes(c.detail.notes);
  };

  const saveNotes = () => {
    if (!drawerCandidate) return;
    setCandidates((prev) =>
      prev.map((c) =>
        c.id === drawerCandidate.id
          ? { ...c, detail: { ...c.detail, notes: drawerNotes } }
          : c
      )
    );
    showToast('Notlar kaydedildi');
  };

  const toggleSelect = (id: string) => {
    setSelectedCandidates((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const bulkAdvance = () => {
    selectedCandidates.forEach((id) => advanceCandidate(id));
    setSelectedCandidates(new Set());
  };

  const bulkReject = () => {
    const names = candidates.filter((c) => selectedCandidates.has(c.id)).map((c) => c.name);
    setCandidates((prev) => prev.filter((c) => !selectedCandidates.has(c.id)));
    showToast(`${names.length} aday reddedildi`);
    setSelectedCandidates(new Set());
  };

  /* ─── Pipeline analytics (funnel) ─── */
  const funnel = useMemo(() => {
    const counts = STAGES.map((s) => ({
      ...s,
      count: candidates.filter((c) => c.stage === s.key).length,
    }));
    // average days per stage (simulated)
    const avgDays = [2, 3, 5, 4, 2, 0];
    return counts.map((c, i) => ({
      ...c,
      avgDays: avgDays[i] ?? 0,
      conversionRate: i > 0 && (counts[i - 1]?.count ?? 0) > 0
        ? Math.round((c.count / (counts[i - 1]?.count ?? 1)) * 100)
        : 100,
    }));
  }, [candidates]);

  if (loading) {
    return (
      <div className="flex flex-col gap-8" style={{ fontFamily: 'Inter, sans-serif' }}>
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-[#0A0A0A]">Degerlendirmeler</h1>
          <p className="mt-1 text-sm text-[#525252]">Veriler yukleniyor...</p>
        </div>
        <div className="h-16 animate-pulse rounded-xl border border-[#EDEDED] bg-[#F5F5F5]" />
        <div className="grid gap-4 sm:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-20 animate-pulse rounded-xl border border-[#EDEDED] bg-[#F5F5F5]" />
          ))}
        </div>
        <div className="hidden gap-3 lg:grid lg:grid-cols-6">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="h-64 animate-pulse rounded-xl border border-[#EDEDED] bg-[#F5F5F5]" />
          ))}
        </div>
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
          <h1 className="text-2xl font-semibold tracking-tight text-[#0A0A0A]">Degerlendirmeler</h1>
          <p className="mt-1 text-sm text-[#525252]">
            Aday degerlendirme surecleri ve bilimsel temelli olcum araclari.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setInviteOpen(true)}
          className="inline-flex items-center gap-2 rounded-lg bg-[#0A0A0A] px-4 py-2.5 text-sm font-medium text-white transition-all hover:bg-[#262626] active:scale-[0.97]"
        >
          <Send className="h-4 w-4" />
          Davetiye Gonder
        </button>
      </div>

      {/* ─── Rich Position Detail Header ─── */}
      <div className="rounded-xl border border-[#EDEDED] bg-white p-5">
        {/* Top row: Position name + meta */}
        <div className="flex flex-wrap items-start justify-between gap-4 mb-4">
          <div>
            <h2 className="text-lg font-semibold text-[#0A0A0A]">{positionDetail.title}</h2>
            <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-[#525252]">
              <span className="inline-flex items-center gap-1"><Briefcase className="h-3 w-3" />{positionDetail.department}</span>
              <span className="text-[#D4D4D4]">|</span>
              <span className="inline-flex items-center gap-1"><MapPin className="h-3 w-3" />{positionDetail.location}</span>
              <span className="text-[#D4D4D4]">|</span>
              <span>{positionDetail.type}</span>
            </div>
            <p className="mt-1 text-[11px] text-[#A3A3A3]">Acilma: {positionDetail.openedDate} ({positionDetail.openedDaysAgo} gun once)</p>
          </div>
          <div className="flex items-center gap-3">
            <div className="text-right">
              <p className="text-[10px] font-medium text-[#A3A3A3]">SLA</p>
              <p className="text-sm font-semibold text-[#0A0A0A]">{positionStats.slaCurrent}/{positionStats.slaTotal} gun</p>
            </div>
            <div className="h-10 w-24 overflow-hidden rounded-lg bg-[#F5F5F5]">
              <div
                className="h-full rounded-lg transition-all"
                style={{
                  width: `${(positionStats.slaCurrent / positionStats.slaTotal) * 100}%`,
                  backgroundColor: positionStats.slaCurrent / positionStats.slaTotal < 0.5 ? '#059669' : positionStats.slaCurrent / positionStats.slaTotal < 0.8 ? '#D97706' : '#DC2626',
                }}
              />
            </div>
          </div>
        </div>

        {/* Stats row */}
        <div className="flex flex-wrap items-center gap-6 mb-4">
          <div>
            <p className="text-[10px] font-medium text-[#A3A3A3]">Hedef</p>
            <p className="text-sm font-semibold text-[#0A0A0A]">{positionDetail.targetHeadcount} kisi</p>
          </div>
          <div className="h-8 w-px bg-[#EDEDED]" />
          <div>
            <p className="text-[10px] font-medium text-[#A3A3A3]">Basvuru</p>
            <p className="text-sm font-semibold text-[#0A0A0A]">{positionDetail.applicationCount}</p>
          </div>
          <div className="h-8 w-px bg-[#EDEDED]" />
          <div>
            <p className="text-[10px] font-medium text-[#A3A3A3]">Conversion</p>
            <p className="text-sm font-semibold text-[#0A0A0A]">%{positionDetail.conversion}</p>
          </div>
          <div className="h-8 w-px bg-[#EDEDED]" />
          <div>
            <p className="text-[10px] font-medium text-[#A3A3A3]">Ort. Fit</p>
            <p className="text-sm font-semibold text-[#0A0A0A]">%{positionStats.avgFit}</p>
          </div>
        </div>

        {/* JD-R Profile */}
        <div className="rounded-lg bg-[#FAFAFA] border border-[#EDEDED] p-4">
          <div className="flex items-center gap-2 mb-3">
            <Target className="h-3.5 w-3.5 text-[#5E5CE6]" />
            <p className="text-xs font-semibold text-[#0A0A0A]">JD-R Profili (Talepler / Kaynaklar)</p>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-[10px] font-medium text-[#DC2626] mb-2">Talepler (Demands)</p>
              {positionDetail.jdrProfile.demands.map((d) => (
                <div key={d.label} className="flex items-center justify-between mb-1.5">
                  <span className="text-[10px] text-[#525252]">{d.label}</span>
                  <div className="flex items-center gap-1.5">
                    <div className="h-1.5 w-12 overflow-hidden rounded-full bg-[#F5F5F5]">
                      <div className="h-full rounded-full bg-[#DC2626]" style={{ width: `${d.score * 10}%` }} />
                    </div>
                    <span className="text-[10px] font-semibold tabular-nums text-[#DC2626]">{d.score}/10</span>
                  </div>
                </div>
              ))}
            </div>
            <div>
              <p className="text-[10px] font-medium text-[#059669] mb-2">Kaynaklar (Resources)</p>
              {positionDetail.jdrProfile.resources.map((r) => (
                <div key={r.label} className="flex items-center justify-between mb-1.5">
                  <span className="text-[10px] text-[#525252]">{r.label}</span>
                  <div className="flex items-center gap-1.5">
                    <div className="h-1.5 w-12 overflow-hidden rounded-full bg-[#F5F5F5]">
                      <div className="h-full rounded-full bg-[#059669]" style={{ width: `${r.score * 10}%` }} />
                    </div>
                    <span className="text-[10px] font-semibold tabular-nums text-[#059669]">{r.score}/10</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 sm:grid-cols-4">
        {[
          { label: 'Toplam Aday', value: candidates.length, icon: Users, color: '#5E5CE6' },
          { label: 'Bekleyen', value: candidates.filter((c) => c.stage === 'basvuru' || c.stage === 'on-eleme').length, icon: Clock, color: '#D97706' },
          { label: 'Assessment', value: candidates.filter((c) => c.stage === 'assessment' || c.stage === 'mulakat').length, icon: Star, color: '#2563EB' },
          { label: 'Ise Alinan', value: candidates.filter((c) => c.stage === 'ise-alim').length, icon: Check, color: '#059669' },
        ].map((stat) => {
          const Icon = stat.icon;
          return (
            <div key={stat.label} className="rounded-xl border border-[#EDEDED] bg-white p-5">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg" style={{ backgroundColor: `${stat.color}15` }}>
                  <Icon className="h-5 w-5" style={{ color: stat.color }} />
                </div>
                <div>
                  <p className="text-xs font-medium text-[#A3A3A3]">{stat.label}</p>
                  <p className="text-xl font-semibold tabular-nums text-[#0A0A0A]">{stat.value}</p>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Pipeline Funnel Analytics */}
      <div className="rounded-xl border border-[#EDEDED] bg-white p-5">
        <button
          type="button"
          onClick={() => setShowFunnel(!showFunnel)}
          className="flex w-full items-center justify-between"
        >
          <div className="flex items-center gap-2">
            <BarChart3 className="h-4 w-4 text-[#5E5CE6]" />
            <p className="text-sm font-semibold text-[#0A0A0A]">Pipeline Analitik</p>
          </div>
          {showFunnel ? <ChevronUp className="h-4 w-4 text-[#A3A3A3]" /> : <ChevronDown className="h-4 w-4 text-[#A3A3A3]" />}
        </button>

        {showFunnel && (
          <div className="mt-4 space-y-6">
            {/* Funnel visualization */}
            <div className="flex items-center gap-1 overflow-x-auto pb-2">
              {funnel.map((step, i) => (
                <div key={step.key} className="flex items-center gap-1">
                  <div className="flex flex-col items-center">
                    <div
                      className="flex items-center justify-center rounded-lg px-4 py-2 text-xs font-semibold text-white"
                      style={{
                        backgroundColor: step.color,
                        minWidth: `${Math.max(60, step.count * 12)}px`,
                      }}
                    >
                      {step.count}
                    </div>
                    <p className="mt-1 text-[10px] font-medium text-[#525252]">{step.label}</p>
                    {(step.avgDays ?? 0) > 0 && (
                      <p className="text-[10px] text-[#A3A3A3]">~{step.avgDays} gun</p>
                    )}
                  </div>
                  {i < funnel.length - 1 && (
                    <div className="flex flex-col items-center px-1">
                      <ArrowRight className="h-3.5 w-3.5 text-[#D4D4D4]" />
                      <span className="text-[9px] font-medium text-[#A3A3A3]">
                        {funnel[i + 1]?.conversionRate ?? 0}%
                      </span>
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* Stage Timings */}
            <div>
              <p className="mb-2 text-xs font-semibold text-[#525252]">Asamalar Arasi Ortalama Sure</p>
              <div className="space-y-1.5">
                {stageTimings.map((st) => (
                  <div key={st.from} className="flex items-center justify-between rounded-lg bg-[#FAFAFA] px-3 py-2 text-xs">
                    <span className="text-[#525252]">{st.from} &rarr; {st.to}</span>
                    <span className="font-semibold tabular-nums text-[#0A0A0A]">{st.avgDays} gun</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Bottleneck Detection */}
            {bottlenecks.length > 0 && (
              <div>
                <p className="mb-2 text-xs font-semibold text-[#525252]">Darbogaz Tespiti</p>
                <div className="space-y-2">
                  {bottlenecks.map((b) => (
                    <div key={b.stage} className={`flex items-start gap-2 rounded-lg p-3 ${
                      b.severity === 'high' ? 'bg-[#FEF3C7] border border-[#FDE68A]' : 'bg-[#FEF9C3] border border-[#FEF3C7]'
                    }`}>
                      <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#D97706]" />
                      <p className="text-xs text-[#92400E]">
                        <span className="font-semibold">{b.stage}</span> asamasinda darbogaz: ortalama <span className="font-semibold">{b.avgDays} gun</span> (hedef: {b.targetDays} gun)
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Source Quality */}
            <div>
              <p className="mb-2 text-xs font-semibold text-[#525252]">Kaynak Kalitesi</p>
              <div className="space-y-2">
                {sourceQuality.map((s) => (
                  <div key={s.source} className="flex items-center justify-between rounded-lg bg-[#FAFAFA] px-3 py-2.5">
                    <div className="flex items-center gap-2">
                      <span className={`h-2 w-2 rounded-full ${
                        s.quality === 'high' ? 'bg-[#059669]' : s.quality === 'medium' ? 'bg-[#D97706]' : 'bg-[#DC2626]'
                      }`} />
                      <span className="text-xs font-medium text-[#0A0A0A]">{s.source}</span>
                    </div>
                    <div className="flex items-center gap-4 text-[10px]">
                      <span className="text-[#A3A3A3]">%{s.applicationPct} basvuru</span>
                      <span className={`font-semibold ${s.quality === 'high' ? 'text-[#059669]' : s.quality === 'medium' ? 'text-[#D97706]' : 'text-[#DC2626]'}`}>
                        %{s.hirePct} ise alim
                      </span>
                      {s.quality === 'high' && <TrendingUp className="h-3 w-3 text-[#059669]" />}
                      {s.quality === 'low' && <TrendingDown className="h-3 w-3 text-[#DC2626]" />}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Rejection Reasons */}
            <div>
              <p className="mb-2 text-xs font-semibold text-[#525252]">Red Nedenleri Dagilimi</p>
              <div className="flex h-4 w-full overflow-hidden rounded-full bg-[#F5F5F5]">
                {rejectionReasons.map((r) => (
                  <div key={r.reason} className="h-full transition-all" style={{ width: `${r.pct}%`, backgroundColor: r.color }} />
                ))}
              </div>
              <div className="mt-2 flex flex-wrap gap-3">
                {rejectionReasons.map((r) => (
                  <div key={r.reason} className="flex items-center gap-1.5">
                    <span className="h-2.5 w-2.5 rounded-sm" style={{ backgroundColor: r.color }} />
                    <span className="text-[10px] text-[#525252]">{r.reason} %{r.pct}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Bulk Actions */}
      {selectedCandidates.size > 0 && (
        <div className="flex items-center justify-between rounded-xl border border-[#5E5CE6] bg-[#F5F3FF] px-5 py-3">
          <p className="text-sm font-medium text-[#5E5CE6]">{selectedCandidates.size} aday secili</p>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={bulkAdvance}
              className="inline-flex items-center gap-1.5 rounded-lg bg-[#0A0A0A] px-3 py-1.5 text-xs font-medium text-white transition-all hover:bg-[#262626]"
            >
              <ArrowRight className="h-3.5 w-3.5" />
              Secilenleri Ilerlet
            </button>
            <button
              type="button"
              onClick={bulkReject}
              className="inline-flex items-center gap-1.5 rounded-lg border border-[#DC2626] bg-white px-3 py-1.5 text-xs font-medium text-[#DC2626] transition-all hover:bg-[#FEE2E2]"
            >
              <XCircle className="h-3.5 w-3.5" />
              Secilenleri Reddet
            </button>
            <button
              type="button"
              onClick={() => setSelectedCandidates(new Set())}
              className="text-xs font-medium text-[#A3A3A3] hover:text-[#525252]"
            >
              Iptal
            </button>
          </div>
        </div>
      )}

      {/* Kanban - Desktop: horizontal, Mobile: stacked */}
      <div className="hidden gap-3 lg:grid lg:grid-cols-6">
        {STAGES.map((stage) => {
          const stageCandidates = candidates.filter((c) => c.stage === stage.key);
          return (
            <div key={stage.key} className="flex flex-col rounded-xl border border-[#EDEDED] bg-[#FAFAFA]">
              <div className="flex items-center justify-between border-b border-[#EDEDED] px-3 py-3">
                <div className="flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full" style={{ backgroundColor: stage.color }} />
                  <span className="text-xs font-semibold text-[#0A0A0A]">{stage.label}</span>
                </div>
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-white text-[11px] font-semibold text-[#525252]">
                  {stageCandidates.length}
                </span>
              </div>
              <div className="flex flex-col gap-2 p-2">
                {stageCandidates.length === 0 && (
                  <p className="py-6 text-center text-[11px] text-[#A3A3A3]">Aday yok</p>
                )}
                {stageCandidates.map((c) => {
                  const isLast = stage.key === 'ise-alim';
                  const isAssessed = stage.key === 'assessment' || stage.key === 'mulakat' || stage.key === 'teklif' || stage.key === 'ise-alim';
                  const risk = getRiskLevel(c.score);
                  const isSelected = selectedCandidates.has(c.id);
                  return (
                    <div
                      key={c.id}
                      className={`cursor-pointer rounded-lg border bg-white p-3 transition-all hover:shadow-sm ${isSelected ? 'border-[#5E5CE6]' : 'border-[#EDEDED]'}`}
                    >
                      <div className="flex items-center gap-2">
                        {/* Checkbox */}
                        <button
                          type="button"
                          onClick={(e) => { e.stopPropagation(); toggleSelect(c.id); }}
                          className={`flex h-4 w-4 shrink-0 items-center justify-center rounded border ${isSelected ? 'border-[#5E5CE6] bg-[#5E5CE6]' : 'border-[#D4D4D4]'}`}
                        >
                          {isSelected && <Check className="h-3 w-3 text-white" />}
                        </button>
                        <button type="button" onClick={() => openDrawer(c)} className="flex min-w-0 flex-1 items-center gap-2 text-left">
                          <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#F5F5F5] text-[10px] font-medium text-[#525252]">
                            {getInitials(c.name)}
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-xs font-medium text-[#0A0A0A]">{c.name}</p>
                            <p className="truncate text-[10px] text-[#A3A3A3]">{c.position}</p>
                          </div>
                        </button>
                      </div>
                      <div className="mt-2 flex items-center justify-between">
                        <div className="flex items-center gap-1.5">
                          <span
                            className="rounded-full px-1.5 py-0.5 text-[10px] font-semibold text-white tabular-nums"
                            style={{ backgroundColor: getScoreColor(c.score) }}
                          >
                            %{c.score}
                          </span>
                          {isAssessed && (
                            <span
                              className="text-[9px] font-medium"
                              style={{ color: risk.color }}
                            >
                              {risk.label}
                            </span>
                          )}
                        </div>
                        {!isLast && (
                          <button
                            type="button"
                            onClick={() => advanceCandidate(c.id)}
                            className="inline-flex items-center gap-0.5 rounded px-1.5 py-1 text-[10px] font-medium text-[#5E5CE6] transition-colors hover:bg-[#EEF0FD]"
                          >
                            Ilerlet
                            <ArrowRight className="h-3 w-3" />
                          </button>
                        )}
                        {isLast && (
                          <span className="inline-flex items-center gap-0.5 rounded bg-[#D1FAE5] px-1.5 py-1 text-[10px] font-semibold text-[#059669]">
                            <Check className="h-3 w-3" />
                            Tamamlandi
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      {/* Mobile: Accordion */}
      <div className="flex flex-col gap-3 lg:hidden">
        {STAGES.map((stage) => {
          const stageCandidates = candidates.filter((c) => c.stage === stage.key);
          const isExpanded = expandedStage === stage.key;
          return (
            <div key={stage.key} className="rounded-xl border border-[#EDEDED] bg-white">
              <button
                type="button"
                onClick={() => setExpandedStage(isExpanded ? null : stage.key)}
                className="flex w-full items-center justify-between px-4 py-3"
              >
                <div className="flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full" style={{ backgroundColor: stage.color }} />
                  <span className="text-sm font-semibold text-[#0A0A0A]">{stage.label}</span>
                  <span className="flex h-5 items-center rounded-full bg-[#F5F5F5] px-2 text-[11px] font-medium text-[#525252]">
                    {stageCandidates.length}
                  </span>
                </div>
                {isExpanded ? (
                  <ChevronUp className="h-4 w-4 text-[#A3A3A3]" />
                ) : (
                  <ChevronDown className="h-4 w-4 text-[#A3A3A3]" />
                )}
              </button>
              {isExpanded && (
                <div className="border-t border-[#EDEDED] px-4 py-3">
                  {stageCandidates.length === 0 && (
                    <p className="py-4 text-center text-xs text-[#A3A3A3]">Bu asamada aday yok</p>
                  )}
                  <div className="flex flex-col gap-2">
                    {stageCandidates.map((c) => {
                      const isLast = stage.key === 'ise-alim';
                      return (
                        <div key={c.id} className="flex items-center gap-3 rounded-lg border border-[#EDEDED] bg-[#FAFAFA] p-3">
                          <button
                            type="button"
                            onClick={() => toggleSelect(c.id)}
                            className={`flex h-4 w-4 shrink-0 items-center justify-center rounded border ${selectedCandidates.has(c.id) ? 'border-[#5E5CE6] bg-[#5E5CE6]' : 'border-[#D4D4D4]'}`}
                          >
                            {selectedCandidates.has(c.id) && <Check className="h-3 w-3 text-white" />}
                          </button>
                          <button type="button" onClick={() => openDrawer(c)} className="flex min-w-0 flex-1 items-center gap-3 text-left">
                            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#F5F5F5] text-xs font-medium text-[#525252]">
                              {getInitials(c.name)}
                            </div>
                            <div className="min-w-0 flex-1">
                              <p className="text-sm font-medium text-[#0A0A0A]">{c.name}</p>
                              <p className="text-xs text-[#A3A3A3]">{c.position} · %{c.score}</p>
                            </div>
                          </button>
                          {!isLast && (
                            <button
                              type="button"
                              onClick={() => advanceCandidate(c.id)}
                              className="inline-flex items-center gap-1 rounded-md bg-[#0A0A0A] px-3 py-1.5 text-xs font-medium text-white hover:bg-[#262626]"
                            >
                              Ilerlet
                              <ArrowRight className="h-3.5 w-3.5" />
                            </button>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* ─── Candidate Detail Drawer ─── */}
      {drawerCandidate && (
        <div className="fixed inset-0 z-50 flex justify-end bg-[#0A0A0A]/50">
          <div className="flex h-full w-full max-w-lg flex-col bg-white shadow-xl">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-[#EDEDED] px-6 py-4">
              <h3 className="text-base font-semibold text-[#0A0A0A]">Aday Detayi</h3>
              <button type="button" onClick={() => setDrawerCandidate(null)} className="text-[#A3A3A3] hover:text-[#525252]">
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-6">
              {/* Candidate info */}
              <div className="flex items-center gap-4">
                <div className="flex h-14 w-14 items-center justify-center rounded-full bg-[#F5F5F5] text-lg font-semibold text-[#525252]">
                  {getInitials(drawerCandidate.name)}
                </div>
                <div>
                  <p className="text-lg font-semibold text-[#0A0A0A]">{drawerCandidate.name}</p>
                  <p className="text-sm text-[#A3A3A3]">{drawerCandidate.detail.email}</p>
                  <p className="text-xs text-[#525252]">{drawerCandidate.position}</p>
                </div>
              </div>

              {/* Stage + Score */}
              <div className="mt-5 flex items-center gap-3">
                <span
                  className="inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold text-white"
                  style={{ backgroundColor: STAGES.find((s) => s.key === drawerCandidate.stage)?.color }}
                >
                  {STAGES.find((s) => s.key === drawerCandidate.stage)?.label}
                </span>
                <span
                  className="inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold text-white tabular-nums"
                  style={{ backgroundColor: getScoreColor(drawerCandidate.score) }}
                >
                  %{drawerCandidate.score} Uyum
                </span>
                <span
                  className="text-xs font-medium"
                  style={{ color: getRiskLevel(drawerCandidate.score).color }}
                >
                  {getRiskLevel(drawerCandidate.score).label}
                </span>
              </div>

              {/* Fit Breakdown */}
              <div className="mt-6">
                <p className="mb-3 text-sm font-semibold text-[#0A0A0A]">Yetkinlik Puanlari</p>
                <div className="space-y-3">
                  {drawerCandidate.detail.fitBreakdown.map((fb) => (
                    <div key={fb.label}>
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-[#525252]">{fb.label}</span>
                        <span className="font-semibold tabular-nums" style={{ color: getScoreColor(fb.score) }}>
                          %{fb.score}
                        </span>
                      </div>
                      <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-[#F5F5F5]">
                        <div
                          className="h-full rounded-full transition-all"
                          style={{ width: `${fb.score}%`, backgroundColor: getScoreColor(fb.score) }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Notes */}
              <div className="mt-6">
                <label className="mb-2 flex items-center gap-1.5 text-sm font-semibold text-[#0A0A0A]">
                  <MessageSquare className="h-4 w-4" />
                  Notlar
                </label>
                <textarea
                  value={drawerNotes}
                  onChange={(e) => setDrawerNotes(e.target.value)}
                  rows={4}
                  placeholder="Bu aday hakkinda not ekleyin..."
                  className="w-full rounded-lg border border-[#EDEDED] px-3 py-2.5 text-sm text-[#0A0A0A] outline-none focus:border-[#5E5CE6] focus:ring-1 focus:ring-[#5E5CE6]"
                />
                <button
                  type="button"
                  onClick={saveNotes}
                  className="mt-2 inline-flex items-center gap-1.5 rounded-lg bg-[#F5F5F5] px-3 py-1.5 text-xs font-medium text-[#525252] hover:bg-[#EDEDED]"
                >
                  <Check className="h-3.5 w-3.5" />
                  Kaydet
                </button>
              </div>

              {/* Assessment Results for assessed candidates */}
              {(drawerCandidate.stage === 'assessment' || drawerCandidate.stage === 'mulakat' || drawerCandidate.stage === 'teklif' || drawerCandidate.stage === 'ise-alim') && (
                <div className="mt-6 rounded-lg border border-[#EDEDED] bg-[#FAFAFA] p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <FileText className="h-4 w-4 text-[#5E5CE6]" />
                    <p className="text-sm font-semibold text-[#0A0A0A]">Assessment Sonuclari</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <div
                      className="flex h-12 w-12 items-center justify-center rounded-full text-sm font-bold text-white"
                      style={{ backgroundColor: getScoreColor(drawerCandidate.score) }}
                    >
                      {drawerCandidate.score}
                    </div>
                    <div>
                      <p className="text-xs text-[#525252]">Genel Uyum Skoru</p>
                      <p className="text-xs font-medium" style={{ color: getRiskLevel(drawerCandidate.score).color }}>
                        {getRiskLevel(drawerCandidate.score).label}
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => showToast('Rapor PDF aciliyor...')}
                    className="mt-3 inline-flex items-center gap-1.5 rounded-lg border border-[#5E5CE6] px-3 py-1.5 text-xs font-medium text-[#5E5CE6] hover:bg-[#EEF0FD]"
                  >
                    <FileText className="h-3.5 w-3.5" />
                    Raporu Gor
                  </button>
                </div>
              )}
            </div>

            {/* Footer actions */}
            <div className="flex items-center justify-between border-t border-[#EDEDED] px-6 py-4">
              <button
                type="button"
                onClick={() => {
                  setRejectCandidateId(drawerCandidate.id);
                  setRejectOpen(true);
                }}
                className="inline-flex items-center gap-1.5 rounded-lg border border-[#DC2626] px-4 py-2 text-sm font-medium text-[#DC2626] transition-colors hover:bg-[#FEE2E2]"
              >
                <XCircle className="h-4 w-4" />
                Reddet
              </button>
              {drawerCandidate.stage !== 'ise-alim' && (
                <button
                  type="button"
                  onClick={() => {
                    advanceCandidate(drawerCandidate.id);
                    setDrawerCandidate(null);
                  }}
                  className="inline-flex items-center gap-2 rounded-lg bg-[#0A0A0A] px-4 py-2 text-sm font-medium text-white transition-all hover:bg-[#262626] active:scale-[0.97]"
                >
                  Sonraki Asamaya Ilerlet
                  <ArrowRight className="h-4 w-4" />
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Reject Modal */}
      {rejectOpen && rejectCandidateId && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-[#0A0A0A]/50 p-4">
          <div className="w-full max-w-sm rounded-xl bg-white shadow-xl">
            <div className="flex items-center justify-between border-b border-[#EDEDED] px-6 py-4">
              <h3 className="text-base font-semibold text-[#0A0A0A]">Adayi Reddet</h3>
              <button type="button" onClick={() => setRejectOpen(false)} className="text-[#A3A3A3] hover:text-[#525252]">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="p-6">
              <p className="mb-3 text-sm text-[#525252]">
                {candidates.find((c) => c.id === rejectCandidateId)?.name} adayini reddetmek istediginize emin misiniz?
              </p>
              <label className="mb-1 block text-xs font-medium text-[#525252]">Red Nedeni</label>
              <div className="relative">
                <select
                  value={rejectReason}
                  onChange={(e) => setRejectReason(e.target.value)}
                  className="w-full appearance-none rounded-lg border border-[#EDEDED] bg-white px-3 py-2.5 text-sm text-[#0A0A0A] outline-none focus:border-[#5E5CE6] focus:ring-1 focus:ring-[#5E5CE6]"
                >
                  {rejectReasons.map((r) => (
                    <option key={r} value={r}>{r}</option>
                  ))}
                </select>
                <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#A3A3A3]" />
              </div>
            </div>
            <div className="flex justify-end gap-2 border-t border-[#EDEDED] px-6 py-4">
              <button
                type="button"
                onClick={() => setRejectOpen(false)}
                className="rounded-lg border border-[#EDEDED] px-4 py-2 text-sm font-medium text-[#525252] hover:bg-[#FAFAFA]"
              >
                Iptal
              </button>
              <button
                type="button"
                onClick={() => { if (rejectCandidateId) removeCandidate(rejectCandidateId, rejectReason); }}
                className="inline-flex items-center gap-1.5 rounded-lg bg-[#DC2626] px-4 py-2 text-sm font-medium text-white transition-all hover:bg-[#B91C1C]"
              >
                <XCircle className="h-4 w-4" />
                Reddet
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Invite Modal */}
      {inviteOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#0A0A0A]/50 p-4">
          <div className="w-full max-w-md rounded-xl bg-white shadow-xl">
            <div className="flex items-center justify-between border-b border-[#EDEDED] px-6 py-4">
              <h3 className="text-base font-semibold text-[#0A0A0A]">Davetiye Gonder</h3>
              <button type="button" onClick={() => setInviteOpen(false)} className="text-[#A3A3A3] hover:text-[#525252]">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="flex flex-col gap-4 p-6">
              <div>
                <label className="mb-1 block text-xs font-medium text-[#525252]">E-posta Adresi</label>
                <input
                  type="email"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  placeholder="aday@ornek.com"
                  className="w-full rounded-lg border border-[#EDEDED] px-3 py-2.5 text-sm text-[#0A0A0A] outline-none focus:border-[#5E5CE6] focus:ring-1 focus:ring-[#5E5CE6]"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-[#525252]">Pozisyon</label>
                <input
                  type="text"
                  value={invitePosition}
                  onChange={(e) => setInvitePosition(e.target.value)}
                  placeholder="Satis Uzmani"
                  className="w-full rounded-lg border border-[#EDEDED] px-3 py-2.5 text-sm text-[#0A0A0A] outline-none focus:border-[#5E5CE6] focus:ring-1 focus:ring-[#5E5CE6]"
                />
              </div>
            </div>
            <div className="flex justify-end gap-2 border-t border-[#EDEDED] px-6 py-4">
              <button
                type="button"
                onClick={() => setInviteOpen(false)}
                className="rounded-lg border border-[#EDEDED] px-4 py-2 text-sm font-medium text-[#525252] hover:bg-[#FAFAFA]"
              >
                Iptal
              </button>
              <button
                type="button"
                onClick={handleInvite}
                disabled={!inviteEmail || !invitePosition}
                className="inline-flex items-center gap-2 rounded-lg bg-[#0A0A0A] px-4 py-2 text-sm font-medium text-white transition-all hover:bg-[#262626] active:scale-[0.97] disabled:cursor-not-allowed disabled:opacity-40"
              >
                <Send className="h-4 w-4" />
                Gonder
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
