'use client';

import { useState, useMemo } from 'react';

interface DocumentItem {
  id: string;
  title: string;
  type: string;
  typeLabel: string;
  employee?: string;
  uploadedAt: string;
  size: string;
  isConfidential: boolean;
  versions: number;
  format: 'pdf' | 'doc' | 'xls' | 'img' | 'other';
}

// Static data — will be replaced with API call when services are connected
const documents: DocumentItem[] = [
  { id: '1', title: 'Ahmet Yilmaz - Is Sozlesmesi', type: 'CONTRACT', typeLabel: 'Sozlesme', employee: 'Ahmet Yilmaz', uploadedAt: '2025-03-15', size: '245 KB', isConfidential: false, versions: 2, format: 'pdf' },
  { id: '2', title: 'Zeynep Demir - KVKK Onay Formu', type: 'KVKK_CONSENT', typeLabel: 'KVKK', employee: 'Zeynep Demir', uploadedAt: '2025-06-01', size: '120 KB', isConfidential: true, versions: 1, format: 'pdf' },
  { id: '3', title: 'Nisan 2026 Bordro Ozeti', type: 'PAYROLL', typeLabel: 'Bordro', uploadedAt: '2026-04-01', size: '890 KB', isConfidential: true, versions: 1, format: 'xls' },
  { id: '4', title: 'Can Celik - Performans Degerlendirmesi Q1', type: 'PERFORMANCE', typeLabel: 'Performans', employee: 'Can Celik', uploadedAt: '2026-04-02', size: '340 KB', isConfidential: false, versions: 1, format: 'pdf' },
  { id: '5', title: 'Elif Ozturk - Saglik Raporu', type: 'HEALTH', typeLabel: 'Saglik', employee: 'Elif Ozturk', uploadedAt: '2026-03-28', size: '180 KB', isConfidential: true, versions: 1, format: 'img' },
  { id: '6', title: 'Genel Guvenlik Egitimi Sertifikasi', type: 'TRAINING', typeLabel: 'Sertifika', uploadedAt: '2026-03-15', size: '520 KB', isConfidential: false, versions: 3, format: 'pdf' },
  { id: '7', title: 'Burak Aydin - Kimlik Fotokopisi', type: 'ID', typeLabel: 'Kimlik', employee: 'Burak Aydin', uploadedAt: '2025-01-10', size: '1.2 MB', isConfidential: true, versions: 1, format: 'img' },
  { id: '8', title: 'Fatma Korkmaz - Is Sozlesmesi', type: 'CONTRACT', typeLabel: 'Sozlesme', employee: 'Fatma Korkmaz', uploadedAt: '2025-09-01', size: '210 KB', isConfidential: false, versions: 1, format: 'doc' },
  { id: '9', title: 'Seda Acar - Yazilim Gelistirme Sertifikasi', type: 'TRAINING', typeLabel: 'Sertifika', employee: 'Seda Acar', uploadedAt: '2026-02-20', size: '380 KB', isConfidential: false, versions: 1, format: 'pdf' },
];

const typeFilters = [
  { value: 'all', label: 'Tumunu Goster' },
  { value: 'CONTRACT', label: 'Sozlesme' },
  { value: 'ID', label: 'Kimlik' },
  { value: 'TRAINING', label: 'Sertifika' },
  { value: 'PAYROLL', label: 'Bordro' },
  { value: 'HEALTH', label: 'Saglik' },
  { value: 'PERFORMANCE', label: 'Performans' },
  { value: 'KVKK_CONSENT', label: 'KVKK' },
];

const FormatIcon = ({ format }: { format: string }) => {
  const color = formatColor[format] ?? '#6B7280';
  return (
    <div
      className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg"
      style={{ backgroundColor: `${color}10`, color }}
    >
      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
      </svg>
    </div>
  );
};

const formatColor: Record<string, string> = {
  pdf: '#DC2626',
  doc: '#2563EB',
  xls: '#059669',
  img: '#D97706',
  other: '#6B7280',
};

export const DocumentList = () => {
  const [search, setSearch] = useState('');
  const [activeFilter, setActiveFilter] = useState('all');

  const filtered = useMemo(() => {
    let result = documents;
    if (search) {
      const q = search.toLocaleLowerCase('tr-TR');
      result = result.filter(
        (d) =>
          d.title.toLocaleLowerCase('tr-TR').includes(q) ||
          d.employee?.toLocaleLowerCase('tr-TR').includes(q),
      );
    }
    if (activeFilter !== 'all') {
      result = result.filter((d) => d.type === activeFilter);
    }
    return result;
  }, [search, activeFilter]);

  return (
    <div className="flex flex-col gap-5">
      {/* Search + filter chips */}
      <div className="flex flex-col gap-4">
        <div className="max-w-sm relative">
          <svg className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#888]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            type="text"
            placeholder="Belge adi veya calisan ile ara..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-10 w-full rounded-lg border border-[#f0f0f0] bg-white pl-10 pr-3 text-[14px] text-[#111] outline-none focus:border-[#5E5CE6] focus:ring-1 focus:ring-[#5E5CE6]"
          />
        </div>
        <div className="flex flex-wrap gap-2">
          {typeFilters.map((f) => (
            <button
              key={f.value}
              type="button"
              onClick={() => setActiveFilter(f.value)}
              className={`rounded-full px-3 py-1.5 text-[12px] font-medium transition-colors ${
                activeFilter === f.value
                  ? 'bg-[#111] text-white'
                  : 'bg-[#f0f0f0] text-[#555] hover:bg-[#e5e5e5]'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* Document grid */}
      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <svg className="h-10 w-10 text-[#888]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
          </svg>
          <p className="mt-3 text-[14px] font-medium text-[#111]">Belge bulunamadi</p>
          <p className="mt-1 text-[13px] text-[#888]">Arama kriterlerinize uygun belge bulunamadi.</p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((doc) => (
            <div
              key={doc.id}
              className="group rounded-xl border border-[#f0f0f0] bg-white p-5 transition-colors hover:border-[#d4d4d4]"
            >
              <div className="flex items-start justify-between gap-3">
                <FormatIcon format={doc.format} />
                <div className="flex items-center gap-1.5">
                  {doc.isConfidential && (
                    <svg className="h-3.5 w-3.5 text-[#D97706]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
                    </svg>
                  )}
                  <span className="inline-flex items-center rounded-full border border-[#f0f0f0] px-2 py-0.5 text-[11px] font-medium text-[#555]">
                    {doc.typeLabel}
                  </span>
                </div>
              </div>

              <div className="mt-3">
                <p className="text-[14px] font-medium leading-snug text-[#111] line-clamp-2">{doc.title}</p>
                {doc.employee && (
                  <p className="mt-0.5 text-[12px] text-[#888]">{doc.employee}</p>
                )}
              </div>

              <div className="mt-3 flex items-center justify-between text-[11px] text-[#888]">
                <span>{new Date(doc.uploadedAt).toLocaleDateString('tr-TR', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                <span>{doc.size}</span>
              </div>

              <div className="mt-4 flex items-center justify-between border-t border-[#f0f0f0] pt-3">
                <span className="text-[11px] text-[#888]">{doc.versions} versiyon</span>
                <div className="flex gap-1">
                  <button
                    type="button"
                    className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-[12px] font-medium text-[#555] hover:bg-[#fafafa]"
                  >
                    <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                    Goruntule
                  </button>
                  <button
                    type="button"
                    className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-[12px] font-medium text-[#555] hover:bg-[#fafafa]"
                  >
                    <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
                    </svg>
                    Indir
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
