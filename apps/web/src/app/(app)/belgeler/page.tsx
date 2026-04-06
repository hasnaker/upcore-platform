'use client';

import { useState, useMemo, useEffect } from 'react';
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
      return matchCategory && matchSearch;
    });
  }, [docs, activeCategory, searchQuery]);

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
              Tumunu Indir (ZIP)
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

              {/* KVKK Retention */}
              <div className="mt-2 flex items-center gap-1.5 text-[10px] text-[#A3A3A3]">
                <Shield className="h-3 w-3" />
                <span>Saklama: {doc.retentionYears} yil ({doc.retentionLaw}). Kalan: {retentionLeft}</span>
              </div>

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
