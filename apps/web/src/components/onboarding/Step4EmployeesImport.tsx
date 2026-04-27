'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { saveStep } from '@/app/onboarding/actions';
import type { EmployeeRow, EmployeesData, OnboardingDraft } from '@/app/onboarding/draft';
import {
  parseCSV,
  validateEmployees,
  sampleEmployeesCSV,
  type EmployeeRowDraft,
  type EmployeeRowError,
} from '@/lib/csv';

interface Step4EmployeesImportProps {
  draft: OnboardingDraft | null;
  nextSlug: string | null;
}

type Mode = 'csv' | 'manual';

interface ManualRow {
  first_name: string;
  last_name: string;
  email: string;
  position: string;
}

const EMPTY_MANUAL: ManualRow = { first_name: '', last_name: '', email: '', position: '' };

function draftToRow(d: EmployeeRowDraft): EmployeeRow {
  const out: EmployeeRow = { first_name: d.first_name, last_name: d.last_name };
  if (d.email) out.email = d.email;
  if (d.tckn) out.tckn = d.tckn;
  if (d.position) out.position = d.position;
  if (d.department) out.department = d.department;
  if (d.hire_date) out.hire_date = d.hire_date;
  if (typeof d.salary === 'number') out.salary = d.salary;
  if (d.employee_no) out.employee_no = d.employee_no;
  return out;
}

export function Step4EmployeesImport({ draft, nextSlug }: Step4EmployeesImportProps) {
  const router = useRouter();
  const existing = draft?.data.employees;
  const [mode, setMode] = useState<Mode>(existing?.mode ?? 'manual');
  const [csvName, setCsvName] = useState(existing?.csv_name ?? '');
  const [csvRows, setCsvRows] = useState<EmployeeRow[]>(
    existing?.mode === 'csv' ? (existing.rows as EmployeeRow[]) : [],
  );
  const [csvErrors, setCsvErrors] = useState<EmployeeRowError[]>([]);
  const [manual, setManual] = useState<ManualRow[]>(() => {
    const seed: ManualRow[] =
      existing?.mode === 'manual'
        ? (existing.rows as EmployeeRow[]).map((r) => ({
            first_name: r.first_name ?? '',
            last_name: r.last_name ?? '',
            email: r.email ?? '',
            position: r.position ?? '',
          }))
        : [];
    return seed.length > 0 ? seed : [{ ...EMPTY_MANUAL }];
  });
  const [error, setError] = useState<string | null>(null);
  const [isPending, start] = useTransition();

  const handleFile = async (file: File) => {
    setError(null);
    setCsvErrors([]);
    setCsvName(file.name);
    try {
      const text = await file.text();
      const parsed = parseCSV(text);
      if (parsed.header.length === 0) {
        setError('CSV boş görünüyor.');
        return;
      }
      const res = validateEmployees(parsed.header, parsed.rows, { maxRows: 10_000 });
      setCsvErrors(res.errors);
      setCsvRows(res.valid.map(draftToRow));
      if (res.errors.length > 0 && res.valid.length === 0) {
        setError(`${res.errors.length} satırda hata var. Düzeltip tekrar yükleyin.`);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'CSV okunamadı.');
    }
  };

  const downloadSample = () => {
    const blob = new Blob(['\uFEFF' + sampleEmployeesCSV()], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'upcore-calisan-ornek.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  const updateManual = (idx: number, key: keyof ManualRow, val: string) => {
    setManual((prev) => {
      const next = [...prev];
      const current: ManualRow = { ...(next[idx] ?? EMPTY_MANUAL) };
      current[key] = val;
      next[idx] = current;
      return next;
    });
  };

  const addManual = () => {
    setManual((prev) => (prev.length >= 5 ? prev : [...prev, { ...EMPTY_MANUAL }]));
  };

  const removeManual = (idx: number) => {
    setManual((prev) => (prev.length <= 1 ? prev : prev.filter((_, i) => i !== idx)));
  };

  const onSave = () => {
    setError(null);
    let payload: EmployeesData;
    if (mode === 'csv') {
      if (csvRows.length === 0) {
        setError('Önce geçerli bir CSV yükleyin. (İsterseniz bu adımı atlayabilirsiniz.)');
        return;
      }
      payload = { mode: 'csv', rows: csvRows, csv_name: csvName };
    } else {
      // Manual: drop empties; enforce at least 1 complete row if user chose manual.
      const cleaned: EmployeeRow[] = manual
        .filter((r) => r.first_name.trim() && r.last_name.trim())
        .map((r) => ({
          first_name: r.first_name.trim(),
          last_name: r.last_name.trim(),
          ...(r.email.trim() ? { email: r.email.trim().toLowerCase() } : {}),
          ...(r.position.trim() ? { position: r.position.trim() } : {}),
        }));
      if (cleaned.length === 0) {
        // Allow skipping with an empty list.
        payload = { mode: 'manual', rows: [] };
      } else {
        // Check email uniqueness.
        const emails = new Set<string>();
        for (const r of cleaned) {
          if (!r.email) continue;
          if (emails.has(r.email)) {
            setError(`E-posta tekrarı: ${r.email}`);
            return;
          }
          emails.add(r.email);
        }
        payload = { mode: 'manual', rows: cleaned };
      }
    }
    start(async () => {
      const res = await saveStep(4, { employees: payload });
      if (!res.ok) {
        setError(res.error ?? 'Kaydedilemedi.');
        return;
      }
      if (nextSlug) router.push(`/onboarding/${nextSlug}`);
    });
  };

  const skip = () => {
    start(async () => {
      const res = await saveStep(4, { employees: { mode, rows: [] } });
      if (!res.ok) {
        setError(res.error ?? 'Kaydedilemedi.');
        return;
      }
      if (nextSlug) router.push(`/onboarding/${nextSlug}`);
    });
  };

  return (
    <div className="space-y-6">
      <div className="inline-flex rounded-md border border-line bg-bg p-1 text-sm">
        <button
          type="button"
          className={`px-4 py-1.5 ${mode === 'manual' ? 'rounded bg-ink text-bg' : 'text-ink-60'}`}
          onClick={() => setMode('manual')}
        >
          Manuel ekle (1-5)
        </button>
        <button
          type="button"
          className={`px-4 py-1.5 ${mode === 'csv' ? 'rounded bg-ink text-bg' : 'text-ink-60'}`}
          onClick={() => setMode('csv')}
        >
          CSV yükle
        </button>
      </div>

      {mode === 'csv' ? (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center gap-3">
            <label className="inline-flex cursor-pointer items-center gap-2 rounded-md border border-line bg-bg-2 px-4 py-2 text-sm hover:bg-bg">
              <input
                type="file"
                accept=".csv,text/csv"
                className="sr-only"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) handleFile(f);
                }}
              />
              Dosya seçin (.csv)
            </label>
            <button type="button" onClick={downloadSample} className="text-sm text-ink-60 underline">
              Örnek CSV&apos;yi indir
            </button>
            {csvName && <span className="text-xs text-ink-60">· {csvName}</span>}
          </div>

          <div className="rounded-md border border-line bg-bg-2 p-3 text-xs text-ink-60">
            <p className="font-medium text-ink">Kanonik sütunlar (Paraşüt uyumlu)</p>
            <p className="mt-1">
              sicil_no, <strong>ad</strong>, <strong>soyad</strong>, email, tckn, dogum_tarihi,{' '}
              <strong>ise_baslama_tarihi</strong>, departman, pozisyon, yonetici_email
            </p>
            <p className="mt-1 text-[11px] text-ink-40">
              İngilizce başlıklar da desteklenir: first_name / last_name / hire_date / position / department / salary.
              Örnek CSV&apos;yi indirip doldurabilirsiniz.
            </p>
          </div>

          {csvRows.length > 0 && (
            <div className="rounded-md border border-line bg-bg p-3 text-sm">
              <p className="font-medium text-ink">{csvRows.length} geçerli satır yüklendi</p>
              {csvErrors.length > 0 && (
                <p className="mt-1 text-xs text-ink-60">{csvErrors.length} satırda hata — atlandı.</p>
              )}
            </div>
          )}

          {csvErrors.length > 0 && (
            <div className="max-h-60 overflow-auto rounded-md border border-red-soft bg-red-soft/20 p-3 text-xs">
              <p className="mb-2 font-medium text-red">{csvErrors.length} satırda sorun:</p>
              <ul className="space-y-1">
                {csvErrors.slice(0, 40).map((e, i) => (
                  <li key={i} className="text-red">
                    · Satır {e.row}
                    {e.column ? ` / ${e.column}` : ''}: {e.message}
                    {e.value ? ` (${e.value})` : ''}
                  </li>
                ))}
                {csvErrors.length > 40 && <li className="text-ink-60">… ve {csvErrors.length - 40} hata daha</li>}
              </ul>
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {manual.map((row, idx) => (
            <div key={idx} className="grid gap-2 rounded-md border border-line bg-bg p-3 md:grid-cols-[1fr_1fr_1.5fr_1fr_auto]">
              <input
                placeholder="Ad"
                value={row.first_name}
                onChange={(e) => updateManual(idx, 'first_name', e.target.value)}
                className="rounded-md border border-line bg-bg px-3 py-2 text-sm"
              />
              <input
                placeholder="Soyad"
                value={row.last_name}
                onChange={(e) => updateManual(idx, 'last_name', e.target.value)}
                className="rounded-md border border-line bg-bg px-3 py-2 text-sm"
              />
              <input
                placeholder="E-posta"
                type="email"
                value={row.email}
                onChange={(e) => updateManual(idx, 'email', e.target.value)}
                className="rounded-md border border-line bg-bg px-3 py-2 text-sm"
              />
              <input
                placeholder="Pozisyon"
                value={row.position}
                onChange={(e) => updateManual(idx, 'position', e.target.value)}
                className="rounded-md border border-line bg-bg px-3 py-2 text-sm"
              />
              <button
                type="button"
                onClick={() => removeManual(idx)}
                className="rounded-md border border-line px-2 py-1 text-xs text-ink-60 hover:bg-bg-2"
                aria-label="Satırı sil"
                disabled={manual.length <= 1}
              >
                Sil
              </button>
            </div>
          ))}
          <button
            type="button"
            onClick={addManual}
            disabled={manual.length >= 5}
            className="text-sm text-accent disabled:opacity-50"
          >
            + Çalışan ekle ({manual.length}/5)
          </button>
        </div>
      )}

      {error && (
        <div className="rounded-md border border-red-soft bg-red-soft/40 p-3 text-sm text-red">{error}</div>
      )}

      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={onSave}
          disabled={isPending}
          className="inline-flex h-10 flex-1 items-center justify-center rounded-md bg-accent px-4 text-sm font-medium text-bg hover:bg-accent/90 disabled:opacity-60"
        >
          {isPending ? 'Kaydediliyor…' : 'Kaydet ve devam et'}
        </button>
        <button
          type="button"
          onClick={skip}
          disabled={isPending}
          className="text-xs text-ink-60 underline"
        >
          Bu adımı atla
        </button>
      </div>
    </div>
  );
}
