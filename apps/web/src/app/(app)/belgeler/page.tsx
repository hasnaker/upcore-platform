'use client';

import { useRef, useState, useMemo } from 'react';
import {
  AlertCircle,
  CheckCircle2,
  Download,
  FileText,
  Lock,
  Search,
  Shield,
  Trash2,
  Upload,
  X,
} from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@clerk/nextjs';
import {
  DOC_CATEGORY_LABEL,
  getDownloadURL,
  useDeleteDocument,
  useDocuments,
  useUploadDocument,
  type DocCategory,
  type UpcoreDocument,
} from '@/hooks/useDocuments';
import { useEmployees } from '@/hooks/useEmployees';

const CATEGORY_FILTER: Array<{ value: DocCategory | 'all'; label: string }> = [
  { value: 'all', label: 'Tümü' },
  { value: 'contract', label: 'Sözleşme' },
  { value: 'id_card', label: 'Kimlik' },
  { value: 'diploma', label: 'Diploma' },
  { value: 'certificate', label: 'Sertifika' },
  { value: 'performance_review', label: 'Performans' },
  { value: 'payslip', label: 'Bordro' },
  { value: 'medical', label: 'Sağlık' },
];

export default function BelgelerPage() {
  const [category, setCategory] = useState<DocCategory | 'all'>('all');
  const [search, setSearch] = useState('');
  const [uploadOpen, setUploadOpen] = useState(false);

  const docs = useDocuments(category === 'all' ? { limit: 200 } : { category, limit: 200 });

  const filtered = useMemo(() => {
    const items = docs.data?.items ?? [];
    if (!search.trim()) return items;
    const q = search.toLocaleLowerCase('tr-TR');
    return items.filter(
      (d) =>
        d.title.toLocaleLowerCase('tr-TR').includes(q) ||
        d.tags.some((t) => t.toLocaleLowerCase('tr-TR').includes(q)),
    );
  }, [docs.data, search]);

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-ink">Belgeler</h1>
          <p className="mt-1 text-sm text-ink-60">
            Sözleşme, kimlik, bordro ve diğer belgeler — Azure Blob + KVKK retention.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setUploadOpen(true)}
          className="inline-flex items-center gap-1.5 rounded-md bg-accent px-4 py-2 text-[13px] font-semibold text-white hover:bg-accent/90"
        >
          <Upload className="h-4 w-4" />
          Belge Yükle
        </button>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative flex-1 sm:max-w-md">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-40" />
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Başlık veya etiket ara…"
            className="h-10 w-full rounded-md border border-line bg-bg pl-9 pr-3 text-sm text-ink placeholder:text-ink-40 focus:border-accent focus:outline-none"
          />
        </div>
        <div className="flex flex-wrap items-center gap-1 rounded-md border border-line bg-bg p-1 text-[12px]">
          {CATEGORY_FILTER.map((f) => (
            <button
              key={f.value}
              type="button"
              onClick={() => setCategory(f.value)}
              className={`rounded px-3 py-1.5 font-medium transition-colors ${
                category === f.value
                  ? 'bg-accent-soft text-accent'
                  : 'text-ink-60 hover:text-ink'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {docs.isLoading && (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {[0, 1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="h-36 animate-pulse rounded-lg border border-line bg-bg" />
          ))}
        </div>
      )}

      {docs.isError && (
        <div className="rounded-lg border border-red/30 bg-red-soft p-4 text-sm text-red">
          <p className="font-medium">Belgeler yüklenemedi</p>
          <p className="mt-1 text-[12px]">{docs.error?.message}</p>
          <button
            type="button"
            onClick={() => docs.refetch()}
            className="mt-3 rounded bg-red px-3 py-1.5 text-[12px] font-medium text-white"
          >
            Yeniden dene
          </button>
        </div>
      )}

      {!docs.isLoading && !docs.isError && filtered.length === 0 && (
        <EmptyState onUpload={() => setUploadOpen(true)} />
      )}

      {!docs.isLoading && filtered.length > 0 && (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((doc) => (
            <DocCard key={doc.id} doc={doc} />
          ))}
        </div>
      )}

      {uploadOpen && <UploadModal onClose={() => setUploadOpen(false)} />}
    </div>
  );
}

const DocCard = ({ doc }: { doc: UpcoreDocument }) => {
  const { getToken } = useAuth();
  const del = useDeleteDocument();

  const onDownload = async () => {
    try {
      const url = await getDownloadURL(doc.id, () => getToken({ template: 'upcore' }));
      window.open(url, '_blank', 'noopener');
    } catch (err: unknown) {
      toast.error('İndirme başarısız', {
        description: err instanceof Error ? err.message : 'Bilinmeyen hata',
      });
    }
  };

  const onDelete = async () => {
    if (!confirm(`"${doc.title}" silinecek. Emin misiniz?`)) return;
    try {
      await del.mutateAsync(doc.id);
      toast.success('Belge silindi');
    } catch (err: unknown) {
      toast.error('Silme başarısız', {
        description: err instanceof Error ? err.message : 'Bilinmeyen hata',
      });
    }
  };

  return (
    <article className="flex flex-col gap-3 rounded-xl border border-line bg-bg p-4">
      <header className="flex items-start justify-between gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-accent-soft">
          <FileText className="h-5 w-5 text-accent" />
        </div>
        <div className="flex items-center gap-2">
          {doc.is_confidential && (
            <span className="inline-flex items-center gap-1 rounded-full bg-red-soft px-2 py-0.5 text-[10px] font-medium text-red">
              <Lock className="h-3 w-3" />
              Gizli
            </span>
          )}
          <span className="text-[10px] text-ink-40">v{doc.current_version}</span>
        </div>
      </header>

      <div>
        <h3 className="truncate text-sm font-semibold text-ink">{doc.title}</h3>
        <p className="mt-0.5 text-[11px] text-ink-40">
          {DOC_CATEGORY_LABEL[doc.category] ?? doc.category}
        </p>
        {doc.tags.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-1">
            {doc.tags.slice(0, 3).map((t) => (
              <span
                key={t}
                className="inline-flex h-5 items-center rounded bg-bg-2 px-1.5 text-[10px] text-ink-60"
              >
                {t}
              </span>
            ))}
          </div>
        )}
      </div>

      <footer className="flex items-center justify-between border-t border-line pt-2 text-[11px]">
        <span className="text-ink-40">
          {new Date(doc.created_at).toLocaleDateString('tr-TR', {
            day: 'numeric',
            month: 'short',
            year: 'numeric',
          })}
        </span>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={onDownload}
            className="inline-flex items-center gap-1 rounded border border-line bg-bg px-2 py-1 text-[11px] font-medium text-ink-60 hover:border-ink-20"
          >
            <Download className="h-3 w-3" />
            İndir
          </button>
          <button
            type="button"
            onClick={onDelete}
            disabled={del.isPending}
            className="inline-flex items-center gap-1 rounded border border-line bg-bg px-2 py-1 text-[11px] font-medium text-red hover:border-red/30 disabled:opacity-50"
          >
            <Trash2 className="h-3 w-3" />
          </button>
        </div>
      </footer>
    </article>
  );
};

const EmptyState = ({ onUpload }: { onUpload: () => void }) => (
  <div className="flex flex-col items-center gap-3 rounded-xl border border-line bg-bg px-6 py-16 text-center">
    <div className="flex h-14 w-14 items-center justify-center rounded-full bg-accent-soft">
      <FileText className="h-7 w-7 text-accent" />
    </div>
    <p className="text-sm font-medium text-ink">Bu kriterde belge yok</p>
    <p className="max-w-md text-xs text-ink-40">
      Sözleşme, kimlik, bordro veya diğer belgeleri Azure Blob üzerinden güvenli şekilde
      saklayabilir, KVKK retention sürelerine uygun otomatik silme ayarlayabilirsiniz.
    </p>
    <button
      type="button"
      onClick={onUpload}
      className="mt-2 inline-flex items-center gap-1.5 rounded-md bg-accent px-4 py-2 text-[13px] font-semibold text-white"
    >
      <Upload className="h-4 w-4" /> İlk belgeyi yükle
    </button>
  </div>
);

function UploadModal({ onClose }: { onClose: () => void }) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState<DocCategory>('contract');
  const [ownerEmployeeId, setOwnerEmployeeId] = useState('');
  const [description, setDescription] = useState('');
  const [confidential, setConfidential] = useState(false);

  const employees = useEmployees({ limit: 200 });
  const upload = useUploadDocument();

  const onSubmit = async () => {
    if (!file) return toast.error('Dosya seçin');
    if (!title.trim()) return toast.error('Başlık zorunlu');

    try {
      await upload.mutateAsync({
        file,
        title: title.trim(),
        category,
        owner_employee_id: ownerEmployeeId || undefined,
        description: description.trim() || undefined,
        is_confidential: confidential,
      });
      toast.success('Belge yüklendi', { icon: <CheckCircle2 className="h-4 w-4" /> });
      onClose();
    } catch (err: unknown) {
      toast.error('Yükleme başarısız', {
        description: err instanceof Error ? err.message : 'Bilinmeyen hata',
      });
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4 backdrop-blur-sm"
      onClick={onClose}
      role="presentation"
    >
      <div
        className="flex w-full max-w-lg flex-col gap-5 rounded-xl border border-line bg-bg p-6 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between">
          <h2 className="text-lg font-semibold text-ink">Belge Yükle</h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded p-1 text-ink-40 hover:bg-bg-2 hover:text-ink"
            aria-label="Kapat"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div
          onClick={() => fileRef.current?.click()}
          className="flex cursor-pointer flex-col items-center gap-2 rounded-md border-2 border-dashed border-line bg-bg-2 p-6 text-center hover:border-accent"
        >
          <Upload className="h-6 w-6 text-ink-40" />
          {file ? (
            <p className="text-sm font-medium text-ink">{file.name}</p>
          ) : (
            <>
              <p className="text-sm text-ink-60">Dosya seçmek için tıkla</p>
              <p className="text-[11px] text-ink-40">PDF, DOCX, JPG, PNG · Max 20 MB</p>
            </>
          )}
          <input
            ref={fileRef}
            type="file"
            accept=".pdf,.docx,.doc,.jpg,.jpeg,.png"
            onChange={(e) => e.target.files?.[0] && setFile(e.target.files[0])}
            className="hidden"
          />
        </div>

        <label className="flex flex-col gap-1">
          <span className="text-[11px] font-medium text-ink-80">Başlık *</span>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Örn: İş sözleşmesi - Ahmet Yılmaz"
            className="h-10 rounded-md border border-line bg-bg px-3 text-sm"
          />
        </label>

        <div className="grid grid-cols-2 gap-3">
          <label className="flex flex-col gap-1">
            <span className="text-[11px] font-medium text-ink-80">Kategori</span>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value as DocCategory)}
              className="h-10 rounded-md border border-line bg-bg px-3 text-sm"
            >
              {Object.entries(DOC_CATEGORY_LABEL).map(([v, l]) => (
                <option key={v} value={v}>
                  {l}
                </option>
              ))}
            </select>
          </label>

          <label className="flex flex-col gap-1">
            <span className="text-[11px] font-medium text-ink-80">Çalışan (opsiyonel)</span>
            <select
              value={ownerEmployeeId}
              onChange={(e) => setOwnerEmployeeId(e.target.value)}
              className="h-10 rounded-md border border-line bg-bg px-3 text-sm"
            >
              <option value="">— Şirkete ait —</option>
              {(employees.data?.items ?? []).map((e) => (
                <option key={e.id} value={e.id}>
                  {e.tamAd}
                </option>
              ))}
            </select>
          </label>
        </div>

        <label className="flex flex-col gap-1">
          <span className="text-[11px] font-medium text-ink-80">Açıklama (opsiyonel)</span>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={2}
            className="rounded-md border border-line bg-bg p-2 text-sm"
          />
        </label>

        <label className="flex items-center gap-2 rounded-md bg-bg-2 p-3">
          <input
            type="checkbox"
            checked={confidential}
            onChange={(e) => setConfidential(e.target.checked)}
            className="h-4 w-4 accent-[color:var(--color-accent)]"
          />
          <div className="flex-1">
            <p className="flex items-center gap-1 text-[12px] font-medium text-ink">
              <Shield className="h-3 w-3 text-red" />
              Gizli belge
            </p>
            <p className="text-[11px] text-ink-40">
              Yalnızca İK direktör ve yetkilendirilmiş kullanıcılar görebilir.
            </p>
          </div>
        </label>

        {upload.isError && (
          <div className="flex items-start gap-2 rounded-md border border-red/30 bg-red-soft p-2 text-[12px] text-red">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
            <span>{upload.error?.message}</span>
          </div>
        )}

        <div className="flex items-center justify-end gap-2 border-t border-line pt-4">
          <button
            type="button"
            onClick={onClose}
            className="rounded-md border border-line bg-bg px-3 py-1.5 text-[12px] text-ink-60"
          >
            Vazgeç
          </button>
          <button
            type="button"
            onClick={onSubmit}
            disabled={!file || !title.trim() || upload.isPending}
            className="rounded-md bg-accent px-4 py-1.5 text-[12px] font-semibold text-white hover:bg-accent/90 disabled:opacity-50"
          >
            {upload.isPending ? 'Yükleniyor…' : 'Yükle'}
          </button>
        </div>
      </div>
    </div>
  );
}
