'use client';

import { useState, useCallback } from 'react';
import { toast } from 'sonner';

interface DocumentUploadFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const documentTypes = [
  { value: 'CONTRACT', label: 'Sozlesme' },
  { value: 'ID', label: 'Kimlik' },
  { value: 'PAYROLL', label: 'Bordro' },
  { value: 'PERFORMANCE', label: 'Performans' },
  { value: 'TRAINING', label: 'Sertifika' },
  { value: 'OFFER_LETTER', label: 'Teklif Mektubu' },
  { value: 'HEALTH', label: 'Saglik' },
  { value: 'KVKK_CONSENT', label: 'KVKK Onay' },
  { value: 'OTHER', label: 'Diger' },
];

export const DocumentUploadForm = ({ open, onOpenChange }: DocumentUploadFormProps) => {
  const [file, setFile] = useState<File | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const [docType, setDocType] = useState('');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [isConfidential, setIsConfidential] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile) {
      setFile(droppedFile);
      if (!title) setTitle(droppedFile.name.replace(/\.[^.]+$/, ''));
    }
  }, [title]);

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
      if (!title) setTitle(selectedFile.name.replace(/\.[^.]+$/, ''));
    }
  }, [title]);

  const handleUpload = async () => {
    if (!file || !docType || !title) {
      toast.error('Lutfen tum zorunlu alanlari doldurun');
      return;
    }
    setIsUploading(true);
    try {
      // TODO: Replace with actual API call
      await new Promise((resolve) => setTimeout(resolve, 1500));
      toast.success('Belge basariyla yuklendi');
      setFile(null);
      setTitle('');
      setDescription('');
      setDocType('');
      setIsConfidential(false);
      onOpenChange(false);
    } catch {
      toast.error('Belge yuklenirken hata olustu');
    } finally {
      setIsUploading(false);
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/40"
        onClick={() => onOpenChange(false)}
      />
      {/* Dialog */}
      <div className="relative z-10 w-full max-w-lg rounded-xl border border-[#f0f0f0] bg-white p-6 shadow-lg">
        <div className="mb-4">
          <h2 className="text-[16px] font-semibold text-[#111]">Belge Yukle</h2>
          <p className="mt-1 text-[13px] text-[#888]">Sisteme yeni bir belge yukleyin.</p>
        </div>

        <div className="flex flex-col gap-4">
          {/* Drag & Drop area */}
          <div
            onDrop={handleDrop}
            onDragOver={(e) => { e.preventDefault(); setIsDragOver(true); }}
            onDragLeave={() => setIsDragOver(false)}
            className={`flex flex-col items-center justify-center gap-3 rounded-lg border-2 border-dashed p-8 text-center transition-colors ${
              isDragOver ? 'border-[#5E5CE6] bg-[#5E5CE6]/5' : 'border-[#f0f0f0] bg-[#fafafa]'
            }`}
          >
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#f0f0f0]">
              <svg className="h-6 w-6 text-[#888]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
              </svg>
            </div>
            {file ? (
              <div>
                <p className="text-[14px] font-medium text-[#111]">{file.name}</p>
                <p className="text-[12px] text-[#888]">{(file.size / 1024).toFixed(1)} KB</p>
              </div>
            ) : (
              <div>
                <p className="text-[14px] text-[#555]">Dosyayi buraya surukleyin</p>
                <p className="text-[12px] text-[#888]">veya bilgisayarinizdan secin</p>
              </div>
            )}
            <label className="cursor-pointer">
              <input type="file" className="hidden" onChange={handleFileSelect} />
              <span className="inline-flex h-8 items-center rounded-lg border border-[#f0f0f0] bg-white px-3 text-[12px] font-medium text-[#111] hover:bg-[#fafafa] transition-colors">
                Dosya Sec
              </span>
            </label>
          </div>

          {/* Title input */}
          <div className="flex flex-col gap-1.5">
            <label className="text-[12px] font-medium text-[#555]">
              Belge Basligi <span className="text-[#DC2626]">*</span>
            </label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="h-10 rounded-lg border border-[#f0f0f0] bg-white px-3 text-[14px] text-[#111] outline-none focus:border-[#5E5CE6] focus:ring-1 focus:ring-[#5E5CE6]"
            />
          </div>

          {/* Document type select */}
          <div className="flex flex-col gap-1.5">
            <label className="text-[12px] font-medium text-[#555]">
              Belge Turu <span className="text-[#DC2626]">*</span>
            </label>
            <select
              value={docType}
              onChange={(e) => setDocType(e.target.value)}
              className="h-10 rounded-lg border border-[#f0f0f0] bg-white px-3 text-[14px] text-[#111] outline-none focus:border-[#5E5CE6] focus:ring-1 focus:ring-[#5E5CE6]"
            >
              <option value="">Belge turu seciniz</option>
              {documentTypes.map((t) => (
                <option key={t.value} value={t.value}>{t.label}</option>
              ))}
            </select>
          </div>

          {/* Description */}
          <div className="flex flex-col gap-1.5">
            <label className="text-[12px] font-medium text-[#555]">Aciklama</label>
            <textarea
              placeholder="Belge hakkinda kisa aciklama..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="min-h-[80px] rounded-lg border border-[#f0f0f0] bg-white px-3 py-2 text-[14px] text-[#111] outline-none focus:border-[#5E5CE6] focus:ring-1 focus:ring-[#5E5CE6]"
            />
          </div>

          {/* Confidential toggle */}
          <div className="flex items-center gap-3">
            <button
              type="button"
              role="switch"
              aria-checked={isConfidential}
              onClick={() => setIsConfidential(!isConfidential)}
              className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors ${
                isConfidential ? 'bg-[#5E5CE6]' : 'bg-[#f0f0f0]'
              }`}
            >
              <span
                className={`inline-block h-4 w-4 rounded-full bg-white transition-transform ${
                  isConfidential ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
            <label className="text-[13px] text-[#555]">Gizli belge olarak isaretle</label>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-6 flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            className="rounded-lg px-4 py-2 text-[13px] font-semibold text-[#555] hover:bg-[#fafafa]"
          >
            Iptal
          </button>
          <button
            type="button"
            onClick={handleUpload}
            disabled={!file || !docType || !title || isUploading}
            className="inline-flex items-center gap-2 rounded-lg bg-[#111] px-4 py-2 text-[13px] font-semibold text-white hover:bg-[#333] disabled:opacity-50"
          >
            {isUploading ? (
              <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
            ) : (
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
              </svg>
            )}
            Yukle
          </button>
        </div>
      </div>
    </div>
  );
};
