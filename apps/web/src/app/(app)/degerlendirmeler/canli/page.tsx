'use client';

import { useMemo, useState } from 'react';
import {
  AlertCircle, ClipboardCheck, Copy, ExternalLink, FileText,
  Loader2, Plus, Send,
} from 'lucide-react';
import { toast } from 'sonner';
import {
  useAssessments,
  useCreateAssessment,
  useAssessmentResults,
  useTriggerReport,
  INSTRUMENT_CATALOG,
  instrumentLabel,
  type Assessment,
  type AssessmentStatus,
  type CreateAssessmentInput,
} from '@/hooks/useAssessments';

/**
 * Canlı Değerlendirme Yönetim Paneli — services/assessment gerçek veri:
 *   - Tenant'taki tüm değerlendirmeleri listele + durum filtrele
 *   - Yeni değerlendirme oluştur (instrument × aday/çalışan + expires_at)
 *   - Aday linkini kopyala (token-based public URL)
 *   - Tamamlanmış olanların sonuçlarını görüntüle + rapor tetikle
 */
export default function DegerlendirmelerCanliPage() {
  const [statusFilter, setStatusFilter] = useState<AssessmentStatus | ''>('');
  const [instrumentFilter, setInstrumentFilter] = useState('');
  const list = useAssessments({
    status: statusFilter || undefined,
    instrument_code: instrumentFilter || undefined,
  });
  const [selectedId, setSelectedId] = useState<string | null>(null);

  return (
    <div className="flex flex-col gap-6">
      <header className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-[#0A0A0A]">
            Canlı Değerlendirmeler
          </h1>
          <p className="mt-1 text-sm text-[#737373]">
            Psikometrik envanter atamaları, aday linkleri ve bilimsel skorlama sonuçları.
          </p>
        </div>
        <CreateButton />
      </header>

      <FilterBar
        statusFilter={statusFilter}
        onStatusChange={setStatusFilter}
        instrumentFilter={instrumentFilter}
        onInstrumentChange={setInstrumentFilter}
      />

      <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
        <AssessmentList
          loading={list.isLoading}
          error={list.error}
          items={list.data?.items ?? []}
          selectedId={selectedId}
          onSelect={setSelectedId}
        />
        {selectedId ? <ResultsPanel id={selectedId} /> : <EmptyRight />}
      </div>
    </div>
  );
}

/* ─── Filter bar ─── */

function FilterBar({
  statusFilter,
  onStatusChange,
  instrumentFilter,
  onInstrumentChange,
}: {
  statusFilter: AssessmentStatus | '';
  onStatusChange: (v: AssessmentStatus | '') => void;
  instrumentFilter: string;
  onInstrumentChange: (v: string) => void;
}) {
  return (
    <div className="flex flex-wrap items-center gap-3">
      <FilterSelect
        label="Durum"
        value={statusFilter}
        onChange={(v) => onStatusChange(v as AssessmentStatus | '')}
        options={[
          { v: '', label: 'Tümü' },
          { v: 'pending', label: 'Bekliyor' },
          { v: 'in_progress', label: 'Devam Ediyor' },
          { v: 'completed', label: 'Tamamlandı' },
          { v: 'scored', label: 'Skorlandı' },
          { v: 'expired', label: 'Süresi Doldu' },
          { v: 'cancelled', label: 'İptal' },
        ]}
      />
      <FilterSelect
        label="Envanter"
        value={instrumentFilter}
        onChange={onInstrumentChange}
        options={[
          { v: '', label: 'Tümü' },
          ...INSTRUMENT_CATALOG.map((i) => ({ v: i.code, label: i.name_tr })),
        ]}
      />
    </div>
  );
}

function FilterSelect({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: Array<{ v: string; label: string }>;
}) {
  return (
    <label className="flex items-center gap-2">
      <span className="text-xs font-medium uppercase tracking-wider text-[#737373]">{label}</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="rounded-md border border-[#EDEDED] bg-white px-3 py-1.5 text-sm text-[#0A0A0A] focus:border-[#5E5CE6] focus:outline-none"
      >
        {options.map((o) => (
          <option key={o.v} value={o.v}>{o.label}</option>
        ))}
      </select>
    </label>
  );
}

/* ─── List ─── */

function AssessmentList({
  loading,
  error,
  items,
  selectedId,
  onSelect,
}: {
  loading: boolean;
  error: Error | null;
  items: Assessment[];
  selectedId: string | null;
  onSelect: (id: string) => void;
}) {
  if (loading) return <SectionLoading />;
  if (error) return <SectionError message={error.message} />;
  if (items.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-[#EDEDED] bg-[#FAFAFA] px-6 py-10 text-center">
        <ClipboardCheck className="mx-auto h-8 w-8 text-[#A3A3A3]" />
        <p className="mt-2 text-sm font-medium text-[#0A0A0A]">Değerlendirme yok</p>
        <p className="mt-1 text-xs text-[#737373]">
          Yeni bir envanter ataması oluşturun — aday bir token ile tam anonim test alır.
        </p>
      </div>
    );
  }
  return (
    <section className="overflow-hidden rounded-xl border border-[#EDEDED] bg-white">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-[#EDEDED] bg-[#FAFAFA]">
            <Th>Aday/Çalışan</Th>
            <Th>Envanter</Th>
            <Th>Durum</Th>
            <Th>Bitiş</Th>
            <Th>İşlem</Th>
          </tr>
        </thead>
        <tbody>
          {items.map((a) => (
            <Row
              key={a.id}
              a={a}
              selected={a.id === selectedId}
              onSelect={() => onSelect(a.id)}
            />
          ))}
        </tbody>
      </table>
    </section>
  );
}

function Th({ children }: { children: React.ReactNode }) {
  return (
    <th className="px-3 py-2 text-left text-[11px] font-medium uppercase tracking-wider text-[#737373]">
      {children}
    </th>
  );
}

function Row({
  a,
  selected,
  onSelect,
}: {
  a: Assessment;
  selected: boolean;
  onSelect: () => void;
}) {
  const candidateUrl = useMemo(() => {
    if (typeof window === 'undefined') return '';
    return `${window.location.origin}/degerlendirme/${a.candidate_token}`;
  }, [a.candidate_token]);

  const copyLink = (e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(candidateUrl).then(
      () => toast.success('Aday linki kopyalandı'),
      () => toast.error('Kopyalanamadı'),
    );
  };

  return (
    <tr
      onClick={onSelect}
      className={`cursor-pointer border-b border-[#EDEDED] last:border-b-0 ${
        selected ? 'bg-[#EEF2FF]' : 'hover:bg-[#FAFAFA]'
      }`}
    >
      <td className="px-3 py-2">
        <p className="text-sm font-medium text-[#0A0A0A]">
          {a.candidate_name ?? a.candidate_email ?? (a.employee_id ? 'Çalışan' : 'Aday')}
        </p>
        <p className="text-[11px] text-[#737373]">
          {a.candidate_email ?? a.employee_id?.slice(0, 8)}
        </p>
      </td>
      <td className="px-3 py-2 text-[#525252]">{instrumentLabel(a.instrument_code)}</td>
      <td className="px-3 py-2"><StatusBadge status={a.status} /></td>
      <td className="px-3 py-2 text-[11px] text-[#737373]">
        {a.expires_at ? new Date(a.expires_at).toLocaleDateString('tr-TR') : '—'}
      </td>
      <td className="px-3 py-2">
        <div className="flex items-center gap-1">
          <button
            type="button"
            title="Aday linkini kopyala"
            onClick={copyLink}
            className="inline-flex items-center gap-1 rounded-md border border-[#EDEDED] bg-white px-2 py-1 text-[11px] text-[#525252] hover:bg-[#FAFAFA]"
          >
            <Copy className="h-3 w-3" />
            Link
          </button>
          <a
            href={candidateUrl}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => e.stopPropagation()}
            className="inline-flex items-center gap-1 rounded-md border border-[#EDEDED] bg-white px-2 py-1 text-[11px] text-[#525252] hover:bg-[#FAFAFA]"
          >
            <ExternalLink className="h-3 w-3" />
            Aç
          </a>
        </div>
      </td>
    </tr>
  );
}

function StatusBadge({ status }: { status: AssessmentStatus }) {
  const tone =
    status === 'scored' || status === 'completed'
      ? 'bg-[#DCFCE7] text-[#14532D]'
      : status === 'in_progress'
        ? 'bg-[#EEF2FF] text-[#5E5CE6]'
        : status === 'expired' || status === 'cancelled'
          ? 'bg-[#FEE2E2] text-[#7F1D1D]'
          : 'bg-[#FEF3C7] text-[#92400E]';
  const label =
    status === 'pending'
      ? 'Bekliyor'
      : status === 'in_progress'
        ? 'Devam'
        : status === 'completed'
          ? 'Tamamlandı'
          : status === 'scored'
            ? 'Skorlandı'
            : status === 'expired'
              ? 'Süresi Doldu'
              : 'İptal';
  return (
    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium ${tone}`}>
      {label}
    </span>
  );
}

/* ─── Create ─── */

function CreateButton() {
  const [open, setOpen] = useState(false);
  const create = useCreateAssessment();
  const [form, setForm] = useState<CreateAssessmentInput>({
    instrument_code: 'bat-12-tr',
    candidate_email: '',
    candidate_name: '',
  });

  const submit = () => {
    if (!form.candidate_email?.trim() || !form.instrument_code) return;
    const exp = new Date();
    exp.setDate(exp.getDate() + 14);
    create.mutate(
      { ...form, expires_at: exp.toISOString() },
      {
        onSuccess: (a) => {
          toast.success(`Değerlendirme oluşturuldu — link: /degerlendirme/${a.candidate_token}`);
          setOpen(false);
          setForm({ instrument_code: 'bat-12-tr', candidate_email: '', candidate_name: '' });
        },
        onError: (e) => toast.error(e.message),
      },
    );
  };

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="inline-flex items-center gap-2 rounded-md bg-[#5E5CE6] px-3 py-2 text-sm font-medium text-white hover:bg-[#4B49B6]"
      >
        <Plus className="h-4 w-4" />
        Yeni Değerlendirme
      </button>
      {open ? (
        <div className="absolute right-0 top-full z-50 mt-2 w-96 rounded-xl border border-[#EDEDED] bg-white p-4 shadow-lg">
          <p className="flex items-center gap-2 text-sm font-semibold text-[#0A0A0A]">
            <Send className="h-4 w-4" />
            Yeni Envanter Ataması
          </p>
          <div className="mt-3 space-y-3">
            <label className="block">
              <span className="mb-1 block text-[11px] font-medium uppercase tracking-wider text-[#737373]">
                Envanter *
              </span>
              <select
                value={form.instrument_code}
                onChange={(e) => setForm({ ...form, instrument_code: e.target.value })}
                className="w-full rounded-md border border-[#EDEDED] bg-white px-2 py-1.5 text-sm"
              >
                {INSTRUMENT_CATALOG.map((i) => (
                  <option key={i.code} value={i.code}>
                    {i.name_tr} · ~{i.duration_min}dk · {i.scale_count} boyut
                  </option>
                ))}
              </select>
              <p className="mt-1 text-[11px] text-[#737373]">
                {INSTRUMENT_CATALOG.find((i) => i.code === form.instrument_code)?.description_tr}
              </p>
            </label>
            <label className="block">
              <span className="mb-1 block text-[11px] font-medium uppercase tracking-wider text-[#737373]">
                Aday Adı
              </span>
              <input
                value={form.candidate_name ?? ''}
                onChange={(e) => setForm({ ...form, candidate_name: e.target.value })}
                className="w-full rounded-md border border-[#EDEDED] px-2 py-1.5 text-sm"
                placeholder="Ayşe Yılmaz"
              />
            </label>
            <label className="block">
              <span className="mb-1 block text-[11px] font-medium uppercase tracking-wider text-[#737373]">
                Aday E-posta *
              </span>
              <input
                type="email"
                value={form.candidate_email ?? ''}
                onChange={(e) => setForm({ ...form, candidate_email: e.target.value })}
                className="w-full rounded-md border border-[#EDEDED] px-2 py-1.5 text-sm"
                placeholder="aday@firma.com"
              />
            </label>
            <p className="text-[11px] text-[#737373]">
              Oluşturulduğunda aday linki kopyalanabilir. Geçerlilik: 14 gün.
            </p>
          </div>
          {create.error ? (
            <p className="mt-2 text-xs text-[#DC2626]">Hata: {create.error.message}</p>
          ) : null}
          <div className="mt-4 flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="rounded-md border border-[#EDEDED] bg-white px-3 py-1.5 text-sm text-[#525252] hover:bg-[#FAFAFA]"
            >
              İptal
            </button>
            <button
              type="button"
              onClick={submit}
              disabled={create.isPending || !form.candidate_email?.trim()}
              className="rounded-md bg-[#5E5CE6] px-3 py-1.5 text-sm font-medium text-white hover:bg-[#4B49B6] disabled:opacity-50"
            >
              {create.isPending ? 'Gönderiliyor…' : 'Oluştur'}
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}

/* ─── Results panel ─── */

function ResultsPanel({ id }: { id: string }) {
  const q = useAssessmentResults(id);
  const trigger = useTriggerReport(id);

  return (
    <aside className="rounded-xl border border-[#EDEDED] bg-white p-5">
      <h2 className="text-sm font-semibold text-[#0A0A0A]">Sonuçlar</h2>
      <p className="text-xs text-[#737373]">Psikometrik scoring çıktısı + rapor üretimi</p>

      {q.isLoading ? (
        <Loading />
      ) : q.error ? (
        <SectionError message={q.error.message} />
      ) : !q.data ? null : (
        <>
          <div className="mt-3 rounded-md border border-[#EDEDED] bg-[#FAFAFA] p-3 text-xs">
            <p className="font-medium text-[#0A0A0A]">
              {instrumentLabel(q.data.assessment.instrument_code)}
            </p>
            <p className="mt-1 text-[#737373]">
              {q.data.assessment.candidate_name ?? q.data.assessment.candidate_email ?? '—'}
              {' · '}
              <StatusBadge status={q.data.assessment.status} />
            </p>
          </div>

          {q.data.scores.length === 0 ? (
            <p className="mt-4 text-xs text-[#737373]">
              Aday henüz tamamlamadı — skor yok.
            </p>
          ) : (
            <ul className="mt-4 space-y-2">
              {q.data.scores.map((s) => (
                <li key={s.id} className="rounded-md border border-[#EDEDED] p-3">
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-medium text-[#0A0A0A]">{s.scale_name}</p>
                    {s.risk_level ? <RiskBadge level={s.risk_level} /> : null}
                  </div>
                  <div className="mt-2 flex items-end gap-3 text-[#525252]">
                    <span className="text-xs">Ham</span>
                    <span className="text-sm font-semibold tabular-nums text-[#0A0A0A]">
                      {s.raw_score.toFixed(2)}
                    </span>
                    {s.percentile != null ? (
                      <>
                        <span className="text-xs">· Persentil</span>
                        <span className="text-sm font-semibold tabular-nums text-[#0A0A0A]">
                          {Math.round(s.percentile)}
                        </span>
                      </>
                    ) : null}
                    {s.t_score != null ? (
                      <>
                        <span className="text-xs">· T</span>
                        <span className="text-sm font-semibold tabular-nums text-[#0A0A0A]">
                          {s.t_score.toFixed(1)}
                        </span>
                      </>
                    ) : null}
                  </div>
                </li>
              ))}
            </ul>
          )}

          <div className="mt-4 flex flex-col gap-2">
            {q.data.report_url ? (
              <a
                href={q.data.report_url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center gap-2 rounded-md border border-[#5E5CE6] px-3 py-2 text-xs font-medium text-[#5E5CE6] hover:bg-[#EEF2FF]"
              >
                <FileText className="h-3 w-3" />
                PDF Raporu Aç
              </a>
            ) : q.data.scores.length > 0 ? (
              <button
                type="button"
                onClick={() =>
                  trigger.mutate(
                    {},
                    {
                      onSuccess: () => toast.success('Rapor üretim kuyruğa alındı'),
                      onError: (e) => toast.error(e.message),
                    },
                  )
                }
                disabled={trigger.isPending}
                className="inline-flex items-center justify-center gap-2 rounded-md bg-[#0A0A0A] px-3 py-2 text-xs font-medium text-white hover:bg-[#333] disabled:opacity-50"
              >
                {trigger.isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : <FileText className="h-3 w-3" />}
                PDF Raporu Üret
              </button>
            ) : null}
          </div>
        </>
      )}
    </aside>
  );
}

function RiskBadge({ level }: { level: string }) {
  const l = level.toLowerCase();
  const tone =
    l.includes('critical') || l.includes('red') || l.includes('high')
      ? 'bg-[#FEE2E2] text-[#7F1D1D]'
      : l.includes('elevated') || l.includes('amber') || l.includes('yellow')
        ? 'bg-[#FEF3C7] text-[#92400E]'
        : 'bg-[#DCFCE7] text-[#14532D]';
  return (
    <span className={`inline-flex items-center rounded-full px-1.5 py-0.5 text-[10px] font-medium ${tone}`}>
      {level}
    </span>
  );
}

function EmptyRight() {
  return (
    <aside className="rounded-xl border border-dashed border-[#EDEDED] bg-[#FAFAFA] p-8 text-center">
      <ClipboardCheck className="mx-auto h-8 w-8 text-[#A3A3A3]" />
      <p className="mt-2 text-sm font-medium text-[#0A0A0A]">Değerlendirme seçin</p>
      <p className="mt-1 text-xs text-[#737373]">
        Soldaki listeden bir kayıt seçerek sonuçları görüntüleyin veya rapor üretin.
      </p>
    </aside>
  );
}

/* ─── shared ─── */

function Loading() {
  return (
    <div className="flex items-center gap-2 text-xs text-[#737373]">
      <Loader2 className="h-3 w-3 animate-spin" /> Yükleniyor…
    </div>
  );
}

function SectionLoading() {
  return (
    <div className="rounded-xl border border-[#EDEDED] bg-white p-8 text-center text-sm text-[#737373]">
      <Loader2 className="mx-auto h-5 w-5 animate-spin" />
    </div>
  );
}

function SectionError({ message }: { message: string }) {
  return (
    <div className="flex items-start gap-2 rounded-xl border border-[#FECACA] bg-[#FEF2F2] p-3 text-[12px] text-[#991B1B]">
      <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
      <span>{message}</span>
    </div>
  );
}
