'use client';

import { useState, useMemo } from 'react';
import {
  Upload,
  FileText,
  File,
  Image,
  FileSpreadsheet,
  Download,
  Trash2,
  X,
  Check,
  Search,
  Eye,
  AlertTriangle,
  Shield,
  CheckCircle2,
  XCircle,
  Archive,
  History,
  Filter,
  Users,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';

type DocCategory = 'all' | 'sozlesme' | 'rapor' | 'kimlik' | 'sertifika' | 'diger';

interface DocVersion {
  version: number;
  date: string;
  current: boolean;
}

interface Document {
  id: string;
  name: string;
  category: DocCategory;
  employee: string;
  uploadDate: string;
  size: string;
  type: 'pdf' | 'doc' | 'xlsx' | 'png';
  versions: DocVersion[];
  expiryDate: string | null;
  retentionYears: number;
  retentionLaw: string;
  uploadYear: number;
}

const initialDocs: Document[] = [
  {
    id: '1', name: 'Is Sozlesmesi — Hasan Aker.pdf', category: 'sozlesme', employee: 'Hasan Aker',
    uploadDate: '2026-01-15', size: '2.4 MB', type: 'pdf',
    versions: [{ version: 3, date: '2026-01-15', current: true }, { version: 2, date: '2025-06-10', current: false }, { version: 1, date: '2024-03-01', current: false }],
    expiryDate: null, retentionYears: 7, retentionLaw: 'Is Kanunu', uploadYear: 2024,
  },
  {
    id: '2', name: 'NDA — Burak Arslan.pdf', category: 'sozlesme', employee: 'Burak Arslan',
    uploadDate: '2026-02-20', size: '1.1 MB', type: 'pdf',
    versions: [{ version: 1, date: '2026-02-20', current: true }],
    expiryDate: '2027-02-20', retentionYears: 5, retentionLaw: 'Ticaret Kanunu', uploadYear: 2026,
  },
  {
    id: '3', name: 'Yillik Performans Raporu 2025.xlsx', category: 'rapor', employee: 'IK',
    uploadDate: '2026-01-05', size: '4.8 MB', type: 'xlsx',
    versions: [{ version: 2, date: '2026-01-05', current: true }, { version: 1, date: '2025-12-20', current: false }],
    expiryDate: null, retentionYears: 5, retentionLaw: 'Is Kanunu', uploadYear: 2025,
  },
  {
    id: '4', name: 'BAT-12 Sonuclari — Q1 2026.pdf', category: 'rapor', employee: 'IK',
    uploadDate: '2026-03-30', size: '890 KB', type: 'pdf',
    versions: [{ version: 1, date: '2026-03-30', current: true }],
    expiryDate: null, retentionYears: 5, retentionLaw: 'Is Kanunu', uploadYear: 2026,
  },
  {
    id: '5', name: 'Kimlik Fotokopisi — Selin Ozturk.png', category: 'kimlik', employee: 'Selin Ozturk',
    uploadDate: '2026-03-10', size: '3.2 MB', type: 'png',
    versions: [{ version: 1, date: '2026-03-10', current: true }],
    expiryDate: '2026-04-20', retentionYears: 10, retentionLaw: 'KVKK', uploadYear: 2026,
  },
  {
    id: '6', name: 'Saglik Raporu — Elif Demir.pdf', category: 'diger', employee: 'Elif Demir',
    uploadDate: '2026-04-01', size: '512 KB', type: 'pdf',
    versions: [{ version: 1, date: '2026-04-01', current: true }],
    expiryDate: '2026-04-15', retentionYears: 10, retentionLaw: 'Saglik Mevzuati', uploadYear: 2026,
  },
  {
    id: '7', name: 'Izin Formu — Emre Sahin.doc', category: 'diger', employee: 'Emre Sahin',
    uploadDate: '2026-03-25', size: '245 KB', type: 'doc',
    versions: [{ version: 1, date: '2026-03-25', current: true }],
    expiryDate: null, retentionYears: 5, retentionLaw: 'Is Kanunu', uploadYear: 2026,
  },
  {
    id: '8', name: 'Maas Bordrosu — Mart 2026.xlsx', category: 'rapor', employee: 'Finans',
    uploadDate: '2026-04-02', size: '1.8 MB', type: 'xlsx',
    versions: [{ version: 1, date: '2026-04-02', current: true }],
    expiryDate: null, retentionYears: 10, retentionLaw: 'Vergi Mevzuati', uploadYear: 2026,
  },
  {
    id: '9', name: 'ISO 9001 Sertifikasi.pdf', category: 'sertifika', employee: 'IK',
    uploadDate: '2025-06-15', size: '1.5 MB', type: 'pdf',
    versions: [{ version: 2, date: '2025-06-15', current: true }, { version: 1, date: '2022-06-15', current: false }],
    expiryDate: '2026-06-15', retentionYears: 3, retentionLaw: 'ISO', uploadYear: 2022,
  },
  {
    id: '10', name: 'KVKK Riza Formu — Hasan Aker.pdf', category: 'sozlesme', employee: 'Hasan Aker',
    uploadDate: '2024-03-01', size: '340 KB', type: 'pdf',
    versions: [{ version: 1, date: '2024-03-01', current: true }],
    expiryDate: null, retentionYears: 7, retentionLaw: 'KVKK', uploadYear: 2024,
  },
  {
    id: '11', name: 'SGK Bildirimi — Hasan Aker.pdf', category: 'kimlik', employee: 'Hasan Aker',
    uploadDate: '2024-03-05', size: '280 KB', type: 'pdf',
    versions: [{ version: 1, date: '2024-03-05', current: true }],
    expiryDate: null, retentionYears: 10, retentionLaw: 'SGK Mevzuati', uploadYear: 2024,
  },
  {
    id: '12', name: 'AWS Solutions Architect Sertifikasi — Emre Sahin.pdf', category: 'sertifika', employee: 'Emre Sahin',
    uploadDate: '2025-11-01', size: '650 KB', type: 'pdf',
    versions: [{ version: 1, date: '2025-11-01', current: true }],
    expiryDate: '2026-05-01', retentionYears: 3, retentionLaw: 'Kurum Ici', uploadYear: 2025,
  },
];

/* ─── Required documents checklist per employee ─── */
interface RequiredDoc {
  name: string;
  present: boolean;
}

const requiredDocsChecklist: Record<string, RequiredDoc[]> = {
  'Hasan Aker': [
    { name: 'Is Sozlesmesi', present: true },
    { name: 'Kimlik Fotokopisi', present: false },
    { name: 'SGK Belgesi', present: true },
    { name: 'KVKK Riza Formu', present: true },
  ],
  'Burak Arslan': [
    { name: 'Is Sozlesmesi', present: true },
    { name: 'Kimlik Fotokopisi', present: false },
    { name: 'SGK Belgesi', present: false },
    { name: 'KVKK Riza Formu', present: false },
  ],
  'Selin Ozturk': [
    { name: 'Is Sozlesmesi', present: false },
    { name: 'Kimlik Fotokopisi', present: true },
    { name: 'SGK Belgesi', present: false },
    { name: 'KVKK Riza Formu', present: false },
  ],
  'Elif Demir': [
    { name: 'Is Sozlesmesi', present: false },
    { name: 'Kimlik Fotokopisi', present: false },
    { name: 'SGK Belgesi', present: false },
    { name: 'KVKK Riza Formu', present: false },
  ],
  'Emre Sahin': [
    { name: 'Is Sozlesmesi', present: false },
    { name: 'Kimlik Fotokopisi', present: false },
    { name: 'SGK Belgesi', present: false },
    { name: 'KVKK Riza Formu', present: false },
  ],
};

const categories: { key: DocCategory; label: string }[] = [
  { key: 'all', label: 'Tumu' },
  { key: 'sozlesme', label: 'Sozlesmeler' },
  { key: 'rapor', label: 'Raporlar' },
  { key: 'kimlik', label: 'Kimlik' },
  { key: 'sertifika', label: 'Sertifikalar' },
  { key: 'diger', label: 'Diger' },
];

/* ─── Category Detail Cards ─── */
interface CategoryDetail {
  key: DocCategory;
  label: string;
  count: number;
  lastUpdated: string;
  complianceStatus: 'ok' | 'warning' | 'error';
  complianceNote: string;
  icon: string;
  color: string;
}

const categoryDetails: CategoryDetail[] = [
  { key: 'sozlesme', label: 'Sozlesmeler', count: 12, lastUpdated: '15 Mart', complianceStatus: 'ok', complianceNote: 'Tumu guncel.', icon: 'sozlesme', color: '#5E5CE6' },
  { key: 'kimlik', label: 'Kimlik', count: 8, lastUpdated: '10 Ocak', complianceStatus: 'warning', complianceNote: '2 suresi dolmak uzere.', icon: 'kimlik', color: '#D97706' },
  { key: 'rapor', label: 'SGK Belgeleri', count: 10, lastUpdated: '01 Nisan', complianceStatus: 'ok', complianceNote: 'Tumu guncel.', icon: 'sgk', color: '#059669' },
  { key: 'sertifika', label: 'Egitim/Sertifika', count: 5, lastUpdated: '20 Subat', complianceStatus: 'error', complianceNote: '1 sertifika suresi dolmus.', icon: 'egitim', color: '#DC2626' },
  { key: 'diger', label: 'Saglik', count: 3, lastUpdated: '05 Mart', complianceStatus: 'ok', complianceNote: 'Tumu guncel.', icon: 'saglik', color: '#2563EB' },
];

/* ─── KVKK Compliance Detail per Document ─── */
interface KVKKDetail {
  retentionPeriod: string;
  retentionLaw: string;
  retentionRemaining: string;
  accessCount30d: number;
  lastAccessedBy: string;
  lastAccessedDate: string;
}

const getKVKKDetail = (doc: Document): KVKKDetail => {
  const currentYear = 2026;
  const endYear = doc.uploadYear + doc.retentionYears;
  const remainingYears = endYear - currentYear;
  const months = Math.floor(((doc.id.charCodeAt(0) ?? 0) % 12));
  const retentionRemaining = remainingYears <= 0 ? 'Suresi doldu' : `${remainingYears} yil ${months} ay`;

  const accessors = ['Ayse Kara', 'Hasan Aker', 'Selin Ozturk', 'Burak Arslan', 'Elif Demir'];
  const accessCount = ((doc.id.charCodeAt(0) ?? 0) % 8) + 1;
  const accessorIdx = (doc.id.charCodeAt(0) ?? 0) % accessors.length;

  return {
    retentionPeriod: `${doc.retentionYears} yil (${doc.retentionLaw})`,
    retentionLaw: `4857 Is Kanunu Madde 75`,
    retentionRemaining,
    accessCount30d: accessCount,
    lastAccessedBy: accessors[accessorIdx] ?? 'Hasan Aker',
    lastAccessedDate: '02 Nisan 2026',
  };
};

/* ─── Employee Document Completeness ─── */
interface EmployeeCompleteness {
  name: string;
  sozlesme: boolean;
  kimlik: boolean;
  sgk: boolean;
  kvkkRiza: boolean;
  pct: number;
}

const employeeCompleteness: EmployeeCompleteness[] = [
  { name: 'Ayse Yilmaz', sozlesme: true, kimlik: true, sgk: true, kvkkRiza: true, pct: 100 },
  { name: 'Mehmet Kaya', sozlesme: true, kimlik: true, sgk: false, kvkkRiza: true, pct: 75 },
  { name: 'Zeynep Arslan', sozlesme: true, kimlik: false, sgk: false, kvkkRiza: false, pct: 25 },
  { name: 'Hasan Aker', sozlesme: true, kimlik: false, sgk: true, kvkkRiza: true, pct: 75 },
  { name: 'Burak Arslan', sozlesme: true, kimlik: false, sgk: false, kvkkRiza: false, pct: 25 },
];

const typeIcons: Record<string, React.ReactNode> = {
  pdf: <FileText className="h-5 w-5 text-[#DC2626]" />,
  doc: <File className="h-5 w-5 text-[#2563EB]" />,
  xlsx: <FileSpreadsheet className="h-5 w-5 text-[#059669]" />,
  png: <Image className="h-5 w-5 text-[#D97706]" />,
};

const typeBgColors: Record<string, string> = {
  pdf: '#DC262615',
  doc: '#2563EB15',
  xlsx: '#05966915',
  png: '#D9770615',
};

const TODAY = '2026-04-04';

/* ─── Expiry helpers ─── */
const getDaysUntilExpiry = (expiryDate: string): number => {
  const exp = new Date(expiryDate);
  const today = new Date(TODAY);
  return Math.ceil((exp.getTime() - today.getTime()) / 86400000);
};

const getRetentionRemaining = (uploadYear: number, retentionYears: number): string => {
  const currentYear = 2026;
  const endYear = uploadYear + retentionYears;
  const remainingYears = endYear - currentYear;
  if (remainingYears <= 0) return 'Suresi doldu';
  const months = Math.floor(Math.random() * 12); // Simulated months
  return `${remainingYears} yil ${months} ay`;
};

const formatDateTR = (dateStr: string): string => {
  const months = ['Oca', 'Sub', 'Mar', 'Nis', 'May', 'Haz', 'Tem', 'Agu', 'Eyl', 'Eki', 'Kas', 'Ara'];
  const d = new Date(dateStr);
  return `${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear()}`;
};

export default function BelgelerPage() {
  const [docs, setDocs] = useState<Document[]>(initialDocs);
  const [activeCategory, setActiveCategory] = useState<DocCategory>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [uploadOpen, setUploadOpen] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [previewDoc, setPreviewDoc] = useState<Document | null>(null);
  const [selectedDocs, setSelectedDocs] = useState<Set<string>>(new Set());
  const [versionDoc, setVersionDoc] = useState<Document | null>(null);
  const [showChecklist, setShowChecklist] = useState(false);
  const [checklistEmployee, setChecklistEmployee] = useState('Hasan Aker');
  const [showCategoryCards, setShowCategoryCards] = useState(true);
  const [showCompleteness, setShowCompleteness] = useState(false);
  const [filterExpiring, setFilterExpiring] = useState(false);
  const [kvkkDetailDoc, setKvkkDetailDoc] = useState<Document | null>(null);

  // Upload form state
  const [uploadName, setUploadName] = useState('');
  const [uploadCategory, setUploadCategory] = useState<DocCategory>('diger');

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 2500);
  };

  const handleUpload = () => {
    if (!uploadName) return;
    const newDoc: Document = {
      id: String(Date.now()),
      name: uploadName,
      category: uploadCategory,
      employee: 'Hasan Aker',
      uploadDate: TODAY,
      size: '1.0 MB',
      type: 'pdf',
      versions: [{ version: 1, date: TODAY, current: true }],
      expiryDate: null,
      retentionYears: 7,
      retentionLaw: 'Is Kanunu',
      uploadYear: 2026,
    };
    setDocs((prev) => [newDoc, ...prev]);
    setUploadOpen(false);
    setUploadName('');
    showToast('Belge yuklendi');
  };

  const handleDelete = (id: string) => {
    const doc = docs.find((d) => d.id === id);
    setDocs((prev) => prev.filter((d) => d.id !== id));
    showToast(`"${doc?.name}" silindi`);
  };

  const toggleDocSelect = (id: string) => {
    setSelectedDocs((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const selectAll = () => {
    if (selectedDocs.size === filteredDocs.length) {
      setSelectedDocs(new Set());
    } else {
      setSelectedDocs(new Set(filteredDocs.map((d) => d.id)));
    }
  };

  const handleBulkDownload = () => {
    showToast(`${selectedDocs.size} belge ZIP olarak indiriliyor...`);
    setSelectedDocs(new Set());
  };

  const filteredDocs = useMemo(() => {
    return docs.filter((d) => {
      const matchCategory = activeCategory === 'all' || d.category === activeCategory;
      const matchSearch = d.name.toLowerCase().includes(searchQuery.toLowerCase()) || d.employee.toLowerCase().includes(searchQuery.toLowerCase());
      if (filterExpiring) {
        if (!d.expiryDate) return false;
        const daysLeft = getDaysUntilExpiry(d.expiryDate);
        return matchCategory && matchSearch && daysLeft <= 90;
      }
      return matchCategory && matchSearch;
    });
  }, [docs, activeCategory, searchQuery, filterExpiring]);

  /* ─── Category counts ─── */
  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    categories.forEach((c) => {
      if (c.key === 'all') counts[c.key] = docs.length;
      else counts[c.key] = docs.filter((d) => d.category === c.key).length;
    });
    return counts;
  }, [docs]);

  /* ─── Expiring soon docs ─── */
  const expiringDocs = useMemo(() => {
    return docs.filter((d) => d.expiryDate).map((d) => ({
      ...d,
      daysLeft: getDaysUntilExpiry(d.expiryDate as string),
    })).filter((d) => d.daysLeft <= 30).sort((a, b) => a.daysLeft - b.daysLeft);
  }, [docs]);

  const employees = Object.keys(requiredDocsChecklist);

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
          <h1 className="text-2xl font-semibold tracking-tight text-[#0A0A0A]">Belgeler</h1>
          <p className="mt-1 text-sm text-[#525252]">
            Calisan belgelerini guvenli bir sekilde saklayin ve yonetin.
          </p>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setShowChecklist(!showChecklist)}
            className="inline-flex items-center gap-2 rounded-lg border border-[#EDEDED] bg-white px-4 py-2.5 text-sm font-medium text-[#525252] transition-all hover:bg-[#FAFAFA]"
          >
            <CheckCircle2 className="h-4 w-4" />
            Eksik Belgeler
          </button>
          <button
            type="button"
            onClick={() => setUploadOpen(true)}
            className="inline-flex items-center gap-2 rounded-lg bg-[#0A0A0A] px-4 py-2.5 text-sm font-medium text-white transition-all hover:bg-[#262626] active:scale-[0.97]"
          >
            <Upload className="h-4 w-4" />
            Belge Yukle
          </button>
        </div>
      </div>

      {/* ─── Document Category Summary Cards ─── */}
      <div className="rounded-xl border border-[#EDEDED] bg-white">
        <button
          type="button"
          onClick={() => setShowCategoryCards(!showCategoryCards)}
          className="flex w-full items-center justify-between px-5 py-4"
        >
          <div className="flex items-center gap-2">
            <Shield className="h-4 w-4 text-[#5E5CE6]" />
            <p className="text-sm font-semibold text-[#0A0A0A]">Belge Kategorileri ve Uyumluluk</p>
          </div>
          {showCategoryCards ? <ChevronUp className="h-4 w-4 text-[#A3A3A3]" /> : <ChevronDown className="h-4 w-4 text-[#A3A3A3]" />}
        </button>

        {showCategoryCards && (
          <div className="border-t border-[#EDEDED] px-5 py-4">
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
              {categoryDetails.map((cat) => (
                <div
                  key={cat.key}
                  className="rounded-lg border border-[#EDEDED] p-4 transition-all hover:shadow-sm cursor-pointer"
                  onClick={() => setActiveCategory(cat.key)}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-semibold text-[#0A0A0A]">{cat.label}</span>
                    <span className="inline-flex h-6 w-6 items-center justify-center rounded-full text-[10px] font-bold text-white" style={{ backgroundColor: cat.color }}>
                      {cat.count}
                    </span>
                  </div>
                  <p className="text-[10px] text-[#A3A3A3] mb-2">Son guncelleme: {cat.lastUpdated}</p>
                  <div className={`flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                    cat.complianceStatus === 'ok' ? 'bg-[#D1FAE5] text-[#059669]'
                    : cat.complianceStatus === 'warning' ? 'bg-[#FEF3C7] text-[#D97706]'
                    : 'bg-[#FEE2E2] text-[#DC2626]'
                  }`}>
                    {cat.complianceStatus === 'ok' ? <CheckCircle2 className="h-3 w-3" /> : cat.complianceStatus === 'warning' ? <AlertTriangle className="h-3 w-3" /> : <XCircle className="h-3 w-3" />}
                    {cat.complianceNote}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Expiry Warnings */}
      {expiringDocs.length > 0 && (
        <div className="rounded-xl border border-[#FED7AA] bg-[#FFF7ED] p-4">
          <div className="flex items-center gap-2 mb-3">
            <AlertTriangle className="h-4 w-4 text-[#D97706]" />
            <p className="text-sm font-semibold text-[#92400E]">Suresi yaklasan belgeler</p>
          </div>
          <div className="space-y-2">
            {expiringDocs.map((d) => (
              <div key={d.id} className="flex items-center justify-between">
                <p className="text-xs text-[#525252]">{d.name}</p>
                {d.daysLeft <= 0 ? (
                  <span className="inline-flex items-center gap-1 rounded-full bg-[#FEE2E2] px-2 py-0.5 text-[11px] font-semibold text-[#DC2626]">
                    Suresi dolmus
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 rounded-full bg-[#FEF3C7] px-2 py-0.5 text-[11px] font-semibold text-[#D97706]">
                    {d.daysLeft} gun kaldi
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Required Documents Checklist */}
      {showChecklist && (
        <div className="rounded-xl border border-[#EDEDED] bg-white p-5">
          <div className="mb-4 flex items-center justify-between">
            <p className="text-sm font-semibold text-[#0A0A0A]">Zorunlu Belge Kontrolu</p>
            <select
              value={checklistEmployee}
              onChange={(e) => setChecklistEmployee(e.target.value)}
              className="rounded-lg border border-[#EDEDED] bg-white px-3 py-1.5 text-xs text-[#0A0A0A] outline-none focus:border-[#5E5CE6]"
            >
              {employees.map((emp) => (
                <option key={emp} value={emp}>{emp}</option>
              ))}
            </select>
          </div>
          <div className="space-y-2">
            {(requiredDocsChecklist[checklistEmployee] || []).map((item) => (
              <div key={item.name} className="flex items-center gap-3 rounded-lg border border-[#EDEDED] px-4 py-3">
                {item.present ? (
                  <CheckCircle2 className="h-5 w-5 text-[#059669]" />
                ) : (
                  <XCircle className="h-5 w-5 text-[#DC2626]" />
                )}
                <span className={`text-sm ${item.present ? 'text-[#525252]' : 'font-medium text-[#DC2626]'}`}>
                  {item.name} {!item.present && '(eksik!)'}
                </span>
              </div>
            ))}
          </div>
          <div className="mt-3 flex items-center gap-2 text-xs text-[#A3A3A3]">
            <Shield className="h-3.5 w-3.5" />
            <span>Eksik belgeler mevzuat uyumu icin tamamlanmalidir</span>
          </div>
        </div>
      )}

      {/* Search + Filters */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#A3A3A3]" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Belge veya calisan ara..."
            className="w-full rounded-lg border border-[#EDEDED] bg-white py-2.5 pl-10 pr-3 text-sm text-[#0A0A0A] outline-none focus:border-[#5E5CE6] focus:ring-1 focus:ring-[#5E5CE6]"
          />
        </div>
        <div className="flex flex-wrap gap-1.5">
          {categories.map((cat) => (
            <button
              key={cat.key}
              type="button"
              onClick={() => setActiveCategory(cat.key)}
              className={`rounded-full px-3.5 py-1.5 text-xs font-medium transition-colors ${
                activeCategory === cat.key
                  ? 'bg-[#0A0A0A] text-white'
                  : 'border border-[#EDEDED] bg-white text-[#525252] hover:bg-[#FAFAFA]'
              }`}
            >
              {cat.label} ({categoryCounts[cat.key]})
            </button>
          ))}
        </div>
      </div>

      {/* Batch Operations Bar */}
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => setFilterExpiring(!filterExpiring)}
          className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-medium transition-all ${
            filterExpiring ? 'bg-[#D97706] text-white' : 'border border-[#EDEDED] bg-white text-[#525252] hover:bg-[#FAFAFA]'
          }`}
        >
          <Filter className="h-3.5 w-3.5" />
          Suresi Dolan Belgeleri Filtrele
        </button>
        <button
          type="button"
          onClick={() => setShowCompleteness(!showCompleteness)}
          className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-medium transition-all ${
            showCompleteness ? 'bg-[#5E5CE6] text-white' : 'border border-[#EDEDED] bg-white text-[#525252] hover:bg-[#FAFAFA]'
          }`}
        >
          <Users className="h-3.5 w-3.5" />
          Eksik Belge Raporu
        </button>
      </div>

      {/* Employee Document Completeness Table */}
      {showCompleteness && (
        <div className="rounded-xl border border-[#EDEDED] bg-white p-5">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-[#5E5CE6]" />
              <p className="text-sm font-semibold text-[#0A0A0A]">Calisan Belge Tamamlanma Durumu</p>
            </div>
            <button type="button" onClick={() => setShowCompleteness(false)} className="text-[#A3A3A3] hover:text-[#525252]">
              <X className="h-4 w-4" />
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-[#EDEDED]">
                  <th className="py-2.5 text-left font-semibold text-[#525252]">Calisan</th>
                  <th className="py-2.5 text-center font-semibold text-[#525252]">Sozlesme</th>
                  <th className="py-2.5 text-center font-semibold text-[#525252]">Kimlik</th>
                  <th className="py-2.5 text-center font-semibold text-[#525252]">SGK</th>
                  <th className="py-2.5 text-center font-semibold text-[#525252]">KVKK Riza</th>
                  <th className="py-2.5 text-right font-semibold text-[#525252]">Tamamlanma</th>
                </tr>
              </thead>
              <tbody>
                {employeeCompleteness.map((emp) => (
                  <tr key={emp.name} className="border-b border-[#F5F5F5] hover:bg-[#FAFAFA]">
                    <td className="py-3 font-medium text-[#0A0A0A]">{emp.name}</td>
                    <td className="py-3 text-center">
                      {emp.sozlesme ? <CheckCircle2 className="inline h-4 w-4 text-[#059669]" /> : <XCircle className="inline h-4 w-4 text-[#DC2626]" />}
                    </td>
                    <td className="py-3 text-center">
                      {emp.kimlik ? <CheckCircle2 className="inline h-4 w-4 text-[#059669]" /> : <XCircle className="inline h-4 w-4 text-[#DC2626]" />}
                    </td>
                    <td className="py-3 text-center">
                      {emp.sgk ? <CheckCircle2 className="inline h-4 w-4 text-[#059669]" /> : <XCircle className="inline h-4 w-4 text-[#DC2626]" />}
                    </td>
                    <td className="py-3 text-center">
                      {emp.kvkkRiza ? <CheckCircle2 className="inline h-4 w-4 text-[#059669]" /> : <XCircle className="inline h-4 w-4 text-[#DC2626]" />}
                    </td>
                    <td className="py-3 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <div className="h-2 w-16 overflow-hidden rounded-full bg-[#F5F5F5]">
                          <div
                            className="h-full rounded-full transition-all"
                            style={{
                              width: `${emp.pct}%`,
                              backgroundColor: emp.pct === 100 ? '#059669' : emp.pct >= 75 ? '#D97706' : '#DC2626',
                            }}
                          />
                        </div>
                        <span className={`font-semibold tabular-nums ${
                          emp.pct === 100 ? 'text-[#059669]' : emp.pct >= 75 ? 'text-[#D97706]' : 'text-[#DC2626]'
                        }`}>
                          %{emp.pct} {emp.pct <= 25 && <AlertTriangle className="inline h-3 w-3 ml-0.5" />}
                        </span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="mt-3 flex items-center gap-2 text-[10px] text-[#A3A3A3]">
            <Shield className="h-3 w-3" />
            <span>Eksik belgeler 4857 Is Kanunu ve KVKK uyumu icin tamamlanmalidir</span>
          </div>
        </div>
      )}

      {/* Bulk Actions */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={selectAll}
            className="flex items-center gap-2 text-xs font-medium text-[#525252] hover:text-[#0A0A0A]"
          >
            <div className={`flex h-4 w-4 items-center justify-center rounded border ${selectedDocs.size === filteredDocs.length && filteredDocs.length > 0 ? 'border-[#5E5CE6] bg-[#5E5CE6]' : 'border-[#D4D4D4]'}`}>
              {selectedDocs.size === filteredDocs.length && filteredDocs.length > 0 && <Check className="h-3 w-3 text-white" />}
            </div>
            Tumunu Sec
          </button>
          <span className="text-xs text-[#A3A3A3]">{filteredDocs.length} belge</span>
        </div>
        {selectedDocs.size > 0 && (
          <div className="flex items-center gap-2">
            <span className="text-xs font-medium text-[#5E5CE6]">{selectedDocs.size} secili</span>
            <button
              type="button"
              onClick={handleBulkDownload}
              className="inline-flex items-center gap-1.5 rounded-lg bg-[#0A0A0A] px-3 py-1.5 text-xs font-medium text-white transition-all hover:bg-[#262626]"
            >
              <Archive className="h-3.5 w-3.5" />
              Toplu Indir (ZIP)
            </button>
          </div>
        )}
      </div>

      {/* Document Grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {filteredDocs.length === 0 && (
          <div className="col-span-full py-12 text-center text-sm text-[#A3A3A3]">
            Belge bulunamadi.
          </div>
        )}
        {filteredDocs.map((doc) => {
          const isSelected = selectedDocs.has(doc.id);
          const expiryDays = doc.expiryDate ? getDaysUntilExpiry(doc.expiryDate) : null;
          const retentionLeft = getRetentionRemaining(doc.uploadYear, doc.retentionYears);
          return (
            <div
              key={doc.id}
              className={`group rounded-xl border bg-white p-4 transition-all hover:shadow-sm ${isSelected ? 'border-[#5E5CE6] shadow-sm' : 'border-[#EDEDED] hover:border-[#D4D4D4]'}`}
            >
              {/* Selection checkbox + file info */}
              <div className="flex items-start gap-3">
                <button
                  type="button"
                  onClick={() => toggleDocSelect(doc.id)}
                  className={`mt-1 flex h-4 w-4 shrink-0 items-center justify-center rounded border ${isSelected ? 'border-[#5E5CE6] bg-[#5E5CE6]' : 'border-[#D4D4D4]'}`}
                >
                  {isSelected && <Check className="h-3 w-3 text-white" />}
                </button>
                <div
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg"
                  style={{ backgroundColor: typeBgColors[doc.type] }}
                >
                  {typeIcons[doc.type]}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-[#0A0A0A]">{doc.name}</p>
                  <p className="mt-0.5 text-xs text-[#A3A3A3]">{doc.employee}</p>
                </div>
              </div>

              {/* Metadata row */}
              <div className="mt-3 flex items-center justify-between">
                <div className="flex items-center gap-2 text-[11px] text-[#A3A3A3]">
                  <span>{formatDateTR(doc.uploadDate)}</span>
                  <span>·</span>
                  <span>{doc.size}</span>
                </div>
                {/* Version badge */}
                {doc.versions.length > 1 && (
                  <button
                    type="button"
                    onClick={() => setVersionDoc(doc)}
                    className="inline-flex items-center gap-1 rounded-full bg-[#F5F5F5] px-2 py-0.5 text-[10px] font-medium text-[#525252] hover:bg-[#EDEDED]"
                  >
                    <History className="h-3 w-3" />
                    v{doc.versions[0]?.version ?? 1}
                  </button>
                )}
              </div>

              {/* Expiry badge */}
              {expiryDays !== null && (
                <div className="mt-2">
                  {expiryDays <= 0 ? (
                    <span className="inline-flex items-center gap-1 rounded-full bg-[#FEE2E2] px-2 py-0.5 text-[10px] font-semibold text-[#DC2626]">
                      Suresi dolmus
                    </span>
                  ) : expiryDays <= 30 ? (
                    <span className="inline-flex items-center gap-1 rounded-full bg-[#FEF3C7] px-2 py-0.5 text-[10px] font-semibold text-[#D97706]">
                      {expiryDays} gun sonra sona eriyor
                    </span>
                  ) : null}
                </div>
              )}

              {/* KVKK Retention — Clickable for detail */}
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); setKvkkDetailDoc(doc); }}
                className="mt-2 flex w-full items-center gap-1.5 rounded-md bg-[#F5F5F5] px-2 py-1.5 text-left text-[10px] text-[#525252] transition-colors hover:bg-[#EDEDED]"
              >
                <Shield className="h-3 w-3 shrink-0 text-[#5E5CE6]" />
                <span className="flex-1">Saklama: {doc.retentionYears} yil ({doc.retentionLaw}). Kalan: {retentionLeft}</span>
                <Eye className="h-3 w-3 shrink-0 text-[#A3A3A3]" />
              </button>

              {/* Actions */}
              <div className="mt-3 flex gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                <button
                  type="button"
                  onClick={() => setPreviewDoc(doc)}
                  className="flex h-8 w-8 items-center justify-center rounded-md border border-[#EDEDED] text-[#525252] transition-colors hover:bg-[#FAFAFA]"
                >
                  <Eye className="h-3.5 w-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => showToast(`"${doc.name}" indirildi`)}
                  className="flex h-8 w-8 items-center justify-center rounded-md border border-[#EDEDED] text-[#525252] transition-colors hover:bg-[#FAFAFA]"
                >
                  <Download className="h-3.5 w-3.5" />
                </button>
                {doc.versions.length > 1 && (
                  <button
                    type="button"
                    onClick={() => setVersionDoc(doc)}
                    className="flex h-8 w-8 items-center justify-center rounded-md border border-[#EDEDED] text-[#525252] transition-colors hover:bg-[#FAFAFA]"
                  >
                    <History className="h-3.5 w-3.5" />
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => handleDelete(doc.id)}
                  className="flex h-8 w-8 items-center justify-center rounded-md border border-[#EDEDED] text-[#DC2626] transition-colors hover:bg-[#FEE2E2]"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Version History Modal */}
      {versionDoc && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#0A0A0A]/50 p-4">
          <div className="w-full max-w-md rounded-xl bg-white shadow-xl">
            <div className="flex items-center justify-between border-b border-[#EDEDED] px-6 py-4">
              <h3 className="text-base font-semibold text-[#0A0A0A]">Versiyon Gecmisi</h3>
              <button type="button" onClick={() => setVersionDoc(null)} className="text-[#A3A3A3] hover:text-[#525252]">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="p-6">
              <p className="mb-4 truncate text-sm font-medium text-[#525252]">{versionDoc.name}</p>
              <div className="space-y-3">
                {versionDoc.versions.map((v) => (
                  <div key={v.version} className={`flex items-center justify-between rounded-lg border p-3 ${v.current ? 'border-[#5E5CE6] bg-[#F5F3FF]' : 'border-[#EDEDED]'}`}>
                    <div>
                      <p className="text-sm font-medium text-[#0A0A0A]">
                        v{v.version} {v.current && <span className="ml-1 text-xs text-[#5E5CE6]">(Guncel)</span>}
                      </p>
                      <p className="text-xs text-[#A3A3A3]">{formatDateTR(v.date)}</p>
                    </div>
                    {!v.current && (
                      <button
                        type="button"
                        onClick={() => {
                          showToast(`v${v.version} indiriliyor...`);
                        }}
                        className="inline-flex items-center gap-1 text-xs font-medium text-[#5E5CE6] hover:underline"
                      >
                        <Download className="h-3.5 w-3.5" />
                        Indir
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
            <div className="flex justify-end border-t border-[#EDEDED] px-6 py-4">
              <button
                type="button"
                onClick={() => setVersionDoc(null)}
                className="rounded-lg border border-[#EDEDED] px-4 py-2 text-sm font-medium text-[#525252] hover:bg-[#FAFAFA]"
              >
                Kapat
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Preview Modal */}
      {previewDoc && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#0A0A0A]/50 p-4">
          <div className="w-full max-w-lg rounded-xl bg-white shadow-xl">
            <div className="flex items-center justify-between border-b border-[#EDEDED] px-6 py-4">
              <h3 className="text-base font-semibold text-[#0A0A0A]">Belge Onizleme</h3>
              <button type="button" onClick={() => setPreviewDoc(null)} className="text-[#A3A3A3] hover:text-[#525252]">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="p-6">
              <div className="flex items-center gap-4 rounded-lg border border-[#EDEDED] bg-[#FAFAFA] p-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-lg" style={{ backgroundColor: typeBgColors[previewDoc.type] }}>
                  {typeIcons[previewDoc.type]}
                </div>
                <div>
                  <p className="text-sm font-medium text-[#0A0A0A]">{previewDoc.name}</p>
                  <p className="mt-0.5 text-xs text-[#A3A3A3]">
                    {previewDoc.employee} · {formatDateTR(previewDoc.uploadDate)} · {previewDoc.size}
                  </p>
                </div>
              </div>

              {/* Version + retention info */}
              <div className="mt-4 space-y-2">
                <div className="flex items-center justify-between rounded-lg bg-[#F5F5F5] px-3 py-2 text-xs">
                  <span className="text-[#A3A3A3]">Versiyon</span>
                  <span className="font-medium text-[#0A0A0A]">v{previewDoc.versions[0]?.version ?? 1}</span>
                </div>
                <div className="flex items-center justify-between rounded-lg bg-[#F5F5F5] px-3 py-2 text-xs">
                  <span className="text-[#A3A3A3]">Saklama suresi</span>
                  <span className="font-medium text-[#0A0A0A]">{previewDoc.retentionYears} yil ({previewDoc.retentionLaw})</span>
                </div>
                {previewDoc.expiryDate && (
                  <div className="flex items-center justify-between rounded-lg bg-[#F5F5F5] px-3 py-2 text-xs">
                    <span className="text-[#A3A3A3]">Son gecerlilik</span>
                    <span className="font-medium text-[#0A0A0A]">{formatDateTR(previewDoc.expiryDate)}</span>
                  </div>
                )}
              </div>

              <div className="mt-4 flex h-48 items-center justify-center rounded-lg border border-dashed border-[#EDEDED] bg-[#FAFAFA]">
                <p className="text-sm text-[#A3A3A3]">Belge onizlemesi burada gorunecek</p>
              </div>
            </div>
            <div className="flex justify-end gap-2 border-t border-[#EDEDED] px-6 py-4">
              <button
                type="button"
                onClick={() => setPreviewDoc(null)}
                className="rounded-lg border border-[#EDEDED] px-4 py-2 text-sm font-medium text-[#525252] hover:bg-[#FAFAFA]"
              >
                Kapat
              </button>
              <button
                type="button"
                onClick={() => {
                  showToast(`"${previewDoc.name}" indirildi`);
                  setPreviewDoc(null);
                }}
                className="inline-flex items-center gap-2 rounded-lg bg-[#0A0A0A] px-4 py-2 text-sm font-medium text-white hover:bg-[#262626]"
              >
                <Download className="h-4 w-4" />
                Indir
              </button>
            </div>
          </div>
        </div>
      )}

      {/* KVKK Compliance Detail Modal */}
      {kvkkDetailDoc && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#0A0A0A]/50 p-4">
          <div className="w-full max-w-md rounded-xl bg-white shadow-xl">
            <div className="flex items-center justify-between border-b border-[#EDEDED] px-6 py-4">
              <div className="flex items-center gap-2">
                <Shield className="h-4 w-4 text-[#5E5CE6]" />
                <h3 className="text-base font-semibold text-[#0A0A0A]">KVKK Uyumluluk Detayi</h3>
              </div>
              <button type="button" onClick={() => setKvkkDetailDoc(null)} className="text-[#A3A3A3] hover:text-[#525252]">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="p-6">
              <p className="mb-4 truncate text-sm font-medium text-[#525252]">{kvkkDetailDoc.name}</p>
              {(() => {
                const detail = getKVKKDetail(kvkkDetailDoc);
                return (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between rounded-lg bg-[#F5F5F5] px-3 py-2.5 text-xs">
                      <span className="text-[#A3A3A3]">Saklama suresi</span>
                      <span className="font-medium text-[#0A0A0A]">{detail.retentionPeriod}</span>
                    </div>
                    <div className="flex items-center justify-between rounded-lg bg-[#F5F5F5] px-3 py-2.5 text-xs">
                      <span className="text-[#A3A3A3]">Yasal dayanak</span>
                      <span className="font-medium text-[#0A0A0A]">{detail.retentionLaw}</span>
                    </div>
                    <div className="flex items-center justify-between rounded-lg bg-[#F5F5F5] px-3 py-2.5 text-xs">
                      <span className="text-[#A3A3A3]">Kalan sure</span>
                      <span className={`font-semibold ${detail.retentionRemaining === 'Suresi doldu' ? 'text-[#DC2626]' : 'text-[#059669]'}`}>
                        {detail.retentionRemaining}
                      </span>
                    </div>
                    <div className="border-t border-[#EDEDED] my-2" />
                    <div className="flex items-center justify-between rounded-lg bg-[#F5F5F5] px-3 py-2.5 text-xs">
                      <span className="text-[#A3A3A3]">Son 30 gunde erisim</span>
                      <span className="font-medium text-[#0A0A0A]">{detail.accessCount30d} kez erisildi</span>
                    </div>
                    <div className="flex items-center justify-between rounded-lg bg-[#F5F5F5] px-3 py-2.5 text-xs">
                      <span className="text-[#A3A3A3]">Son erisen</span>
                      <span className="font-medium text-[#0A0A0A]">{detail.lastAccessedBy}, {detail.lastAccessedDate}</span>
                    </div>
                    {kvkkDetailDoc.expiryDate && (
                      <div className="flex items-center justify-between rounded-lg bg-[#FEF3C7] px-3 py-2.5 text-xs">
                        <span className="text-[#92400E]">Son gecerlilik</span>
                        <span className="font-semibold text-[#D97706]">{formatDateTR(kvkkDetailDoc.expiryDate)}</span>
                      </div>
                    )}
                  </div>
                );
              })()}
              <div className="mt-4 rounded-lg bg-[#F0F9FF] border border-[#BAE6FD] p-3">
                <p className="text-[10px] text-[#1E40AF]">
                  <span className="font-semibold">KVKK Notu:</span> Kisisel veriler, 6698 sayili KVKK kapsaminda islenme amaci sona erdikten sonra anonimlestirilmeli veya silinmelidir.
                </p>
              </div>
            </div>
            <div className="flex justify-end border-t border-[#EDEDED] px-6 py-4">
              <button
                type="button"
                onClick={() => setKvkkDetailDoc(null)}
                className="rounded-lg border border-[#EDEDED] px-4 py-2 text-sm font-medium text-[#525252] hover:bg-[#FAFAFA]"
              >
                Kapat
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Upload Modal */}
      {uploadOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#0A0A0A]/50 p-4">
          <div className="w-full max-w-md rounded-xl bg-white shadow-xl">
            <div className="flex items-center justify-between border-b border-[#EDEDED] px-6 py-4">
              <h3 className="text-base font-semibold text-[#0A0A0A]">Belge Yukle</h3>
              <button type="button" onClick={() => setUploadOpen(false)} className="text-[#A3A3A3] hover:text-[#525252]">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="flex flex-col gap-4 p-6">
              <div className="flex flex-col items-center gap-3 rounded-lg border-2 border-dashed border-[#EDEDED] p-8">
                <Upload className="h-8 w-8 text-[#A3A3A3]" />
                <p className="text-sm text-[#525252]">Dosyayi surukleyip birakin veya secin</p>
                <p className="text-xs text-[#A3A3A3]">PDF, DOC, XLSX, PNG — Maks. 10MB</p>
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-[#525252]">Belge Adi</label>
                <input
                  type="text"
                  value={uploadName}
                  onChange={(e) => setUploadName(e.target.value)}
                  placeholder="Ornek: Is Sozlesmesi.pdf"
                  className="w-full rounded-lg border border-[#EDEDED] px-3 py-2.5 text-sm text-[#0A0A0A] outline-none focus:border-[#5E5CE6] focus:ring-1 focus:ring-[#5E5CE6]"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-[#525252]">Kategori</label>
                <div className="flex flex-wrap gap-1.5">
                  {categories.filter((c) => c.key !== 'all').map((cat) => (
                    <button
                      key={cat.key}
                      type="button"
                      onClick={() => setUploadCategory(cat.key)}
                      className={`rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
                        uploadCategory === cat.key
                          ? 'bg-[#0A0A0A] text-white'
                          : 'border border-[#EDEDED] text-[#525252] hover:bg-[#FAFAFA]'
                      }`}
                    >
                      {cat.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
            <div className="flex justify-end gap-2 border-t border-[#EDEDED] px-6 py-4">
              <button
                type="button"
                onClick={() => setUploadOpen(false)}
                className="rounded-lg border border-[#EDEDED] px-4 py-2 text-sm font-medium text-[#525252] hover:bg-[#FAFAFA]"
              >
                Iptal
              </button>
              <button
                type="button"
                onClick={handleUpload}
                disabled={!uploadName}
                className="inline-flex items-center gap-2 rounded-lg bg-[#0A0A0A] px-4 py-2 text-sm font-medium text-white transition-all hover:bg-[#262626] active:scale-[0.97] disabled:cursor-not-allowed disabled:opacity-40"
              >
                <Upload className="h-4 w-4" />
                Yukle
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
