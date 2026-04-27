'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useRef, useState, type DragEvent } from 'react';
import {
  ArrowLeft,
  AlertCircle,
  CheckCircle2,
  Download,
  FileUp,
  FileText,
  X,
} from 'lucide-react';
import { toast } from 'sonner';
import { useImportEmployees, type ImportResult } from '@/hooks/useEmployees';

// Paraşüt uyumlu CSV şablon başlıkları (backend `parasutColumns` ile aynı sıra).
const CSV_TEMPLATE =
  'sicil_no,ad,soyad,email,tckn,dogum_tarihi,ise_baslama_tarihi,departman,pozisyon,yonetici_email\n' +
  '10001,Mehmet,Yılmaz,mehmet.yilmaz@ornek.com,12345678901,1990-05-14,2022-03-01,Satış,Satış Uzmanı,\n' +
  '10002,Ayşe,Demir,ayse.demir@ornek.com,,1988-11-22,2021-09-15,İK,İK Uzmanı,mehmet.yilmaz@ornek.com\n';

export default function CalisanImportPage() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [result, setResult] = useState<ImportResult | null>(null);

  const importMutation = useImportEmployees();

  const handleSelect = (f: File) => {
    if (!f.name.toLowerCase().endsWith('.csv')) {
      toast.error('Sadece .csv dosyaları kabul edilir');
      return;
    }
    if (f.size > 10 * 1024 * 1024) {
      toast.error('Dosya 10 MB sınırını aşıyor');
      return;
    }
    setFile(f);
    setResult(null);
  };

  const onDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    const f = e.dataTransfer.files[0];
    if (f) handleSelect(f);
  };

  const onUpload = async () => {
    if (!file) return;
    try {
      const res = await importMutation.mutateAsync(file);
      setResult(res);
      if (res.errors.length === 0) {
        toast.success(`${res.imported} çalışan başarıyla eklendi`);
      } else {
        toast.warning(
          `${res.imported} eklendi, ${res.errors.length} satırda hata var`,
        );
      }
    } catch (err: unknown) {
      toast.error('Yükleme başarısız', {
        description: err instanceof Error ? err.message : 'Bilinmeyen hata',
      });
    }
  };

  const downloadTemplate = () => {
    const blob = new Blob([CSV_TEMPLATE], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'upcore-calisan-sablonu.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  const reset = () => {
    setFile(null);
    setResult(null);
    importMutation.reset();
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  return (
    <div className="flex flex-col gap-6">
      <nav className="flex items-center gap-1 text-[12px] text-ink-40">
        <Link href="/calisanlar" className="hover:text-ink-60">
          Çalışanlar
        </Link>
        <span>›</span>
        <span className="text-ink-60">CSV içe aktar</span>
      </nav>

      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold tracking-tight text-ink">
          Toplu Çalışan İçe Aktarımı
        </h1>
        <p className="text-sm text-ink-60">
          Paraşüt uyumlu CSV dosyası yükleyin. Her satır bir çalışanı temsil eder.
          Maks. 10 MB, 10.000 satır.
        </p>
      </div>

      {/* Şablon indir + format açıklaması */}
      <div className="flex flex-col gap-4 rounded-lg border border-line bg-bg-2 p-5 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h3 className="text-sm font-semibold text-ink">CSV Formatı</h3>
          <p className="mt-1 max-w-lg text-[12px] leading-relaxed text-ink-60">
            Zorunlu alanlar: <strong>ad</strong>, <strong>soyad</strong>,{' '}
            <strong>ise_baslama_tarihi</strong> (YYYY-MM-DD). TCKN opsiyonel ama girildiyse
            11 haneli + mod-10/11 doğrulamasından geçmeli. E-posta benzersiz olmalı.
          </p>
        </div>
        <button
          type="button"
          onClick={downloadTemplate}
          className="inline-flex items-center gap-1.5 rounded-md border border-line bg-bg px-4 py-2 text-[13px] font-medium text-ink-60 transition-colors hover:border-ink-20"
        >
          <Download className="h-3.5 w-3.5" />
          Şablonu İndir
        </button>
      </div>

      {/* Drop zone */}
      {!result && (
        <div
          onDragOver={(e) => {
            e.preventDefault();
            setIsDragging(true);
          }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={onDrop}
          className={`flex flex-col items-center gap-3 rounded-xl border-2 border-dashed px-6 py-16 text-center transition-colors ${
            isDragging ? 'border-accent bg-accent-soft' : 'border-line bg-bg'
          }`}
        >
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-accent-soft">
            <FileUp className="h-6 w-6 text-accent" />
          </div>

          {file ? (
            <div className="flex flex-col items-center gap-2">
              <div className="inline-flex items-center gap-2 rounded-full bg-bg-2 px-3 py-1.5">
                <FileText className="h-4 w-4 text-ink-60" />
                <span className="text-sm font-medium text-ink">{file.name}</span>
                <span className="text-[11px] text-ink-40">
                  ({(file.size / 1024).toFixed(1)} KB)
                </span>
                <button
                  type="button"
                  onClick={reset}
                  className="ml-1 text-ink-40 hover:text-red"
                  aria-label="Kaldır"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
              <button
                type="button"
                onClick={onUpload}
                disabled={importMutation.isPending}
                className="inline-flex items-center gap-1.5 rounded-md bg-accent px-5 py-2.5 text-[13px] font-semibold text-white transition-colors hover:bg-accent/90 disabled:opacity-50"
              >
                {importMutation.isPending ? 'Yükleniyor…' : 'Yüklemeyi Başlat'}
              </button>
            </div>
          ) : (
            <>
              <p className="text-sm font-medium text-ink">
                Dosyayı buraya sürükleyin veya
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="ml-1 font-semibold text-accent hover:underline"
                >
                  seçmek için tıklayın
                </button>
              </p>
              <p className="text-[12px] text-ink-40">Maks. 10 MB · .csv formatı</p>
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv,text/csv"
                onChange={(e) => e.target.files?.[0] && handleSelect(e.target.files[0])}
                className="hidden"
              />
            </>
          )}
        </div>
      )}

      {/* Sonuç */}
      {result && (
        <ResultView
          result={result}
          onAnother={reset}
          onFinish={() => router.push('/calisanlar')}
        />
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------

const ResultView = ({
  result,
  onAnother,
  onFinish,
}: {
  result: ImportResult;
  onAnother: () => void;
  onFinish: () => void;
}) => {
  const hasErrors = result.errors.length > 0;
  const successRate = result.total > 0 ? Math.round((result.imported / result.total) * 100) : 0;

  return (
    <div className="flex flex-col gap-6">
      {/* Özet kart */}
      <div
        className={`rounded-xl border p-6 ${
          hasErrors ? 'border-amber/30 bg-amber-soft' : 'border-green/30 bg-green-soft'
        }`}
      >
        <div className="flex items-start gap-4">
          {hasErrors ? (
            <AlertCircle className="mt-0.5 h-6 w-6 shrink-0 text-amber" />
          ) : (
            <CheckCircle2 className="mt-0.5 h-6 w-6 shrink-0 text-green" />
          )}
          <div className="flex-1">
            <h3
              className={`text-base font-semibold ${hasErrors ? 'text-amber' : 'text-green'}`}
            >
              {hasErrors ? 'Kısmi başarı' : 'Yükleme tamamlandı'}
            </h3>
            <p className="mt-1 text-[13px] text-ink-60">
              {result.imported}/{result.total} satır işlendi (%{successRate} başarı,{' '}
              {(result.duration_ms / 1000).toFixed(1)}s içinde).
            </p>

            <div className="mt-4 grid gap-3 sm:grid-cols-3">
              <Stat label="Toplam" value={result.total} />
              <Stat label="Eklenen" value={result.imported} color="green" />
              <Stat label="Hatalı" value={result.errors.length} color={hasErrors ? 'red' : 'gray'} />
            </div>
          </div>
        </div>
      </div>

      {/* Hata listesi */}
      {hasErrors && (
        <div className="rounded-xl border border-line bg-bg">
          <div className="border-b border-line px-5 py-3">
            <h4 className="text-[11px] font-semibold uppercase tracking-widest text-ink-40">
              Satır Bazlı Hatalar ({result.errors.length})
            </h4>
          </div>
          <div className="max-h-96 overflow-y-auto">
            <table className="w-full text-sm">
              <thead className="sticky top-0 bg-bg-2 text-[11px] uppercase tracking-wider text-ink-40">
                <tr>
                  <th className="px-4 py-2 text-left font-semibold">Satır</th>
                  <th className="px-4 py-2 text-left font-semibold">Kolon</th>
                  <th className="px-4 py-2 text-left font-semibold">Değer</th>
                  <th className="px-4 py-2 text-left font-semibold">Hata</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {result.errors.map((err, i) => (
                  <tr key={i} className="hover:bg-bg-2">
                    <td className="px-4 py-2 tabular-nums text-ink-60">{err.row}</td>
                    <td className="px-4 py-2 text-ink-60">{err.column ?? '—'}</td>
                    <td className="px-4 py-2 font-mono text-[12px] text-ink-40">
                      {err.value ? `"${err.value}"` : '—'}
                    </td>
                    <td className="px-4 py-2 text-red">{err.message}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Aksiyonlar */}
      <div className="flex items-center justify-between border-t border-line pt-6">
        <button
          type="button"
          onClick={onAnother}
          className="inline-flex items-center gap-1 text-[13px] font-medium text-ink-60 hover:text-ink"
        >
          <ArrowLeft className="h-4 w-4" />
          Başka dosya yükle
        </button>
        <button
          type="button"
          onClick={onFinish}
          className="inline-flex items-center gap-1.5 rounded-md bg-accent px-5 py-2.5 text-[13px] font-semibold text-white transition-colors hover:bg-accent/90"
        >
          Çalışanlar listesine dön →
        </button>
      </div>
    </div>
  );
};

const Stat = ({
  label,
  value,
  color = 'ink',
}: {
  label: string;
  value: number;
  color?: 'green' | 'red' | 'ink' | 'gray';
}) => {
  const colorClass = {
    green: 'text-green',
    red: 'text-red',
    ink: 'text-ink',
    gray: 'text-ink-40',
  }[color];
  return (
    <div className="rounded-md border border-line bg-bg p-3">
      <p className="text-[11px] font-medium uppercase tracking-wider text-ink-40">{label}</p>
      <p className={`mt-1 text-2xl font-semibold tabular-nums ${colorClass}`}>{value}</p>
    </div>
  );
};
