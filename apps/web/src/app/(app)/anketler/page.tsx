'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import {
  Activity,
  AlertCircle,
  CalendarDays,
  CheckCircle2,
  ChevronDown,
  Clock,
  FileText,
  Plus,
  TrendingUp,
  Users,
} from 'lucide-react';
import { toast } from 'sonner';
import {
  useCreateSurvey,
  useDistributions,
  useSurveys,
  type Survey,
  type SurveyStatus,
  type SurveyType,
} from '@/hooks/useSurveys';

const STATUS_FILTER: { value: SurveyStatus | 'all'; label: string }[] = [
  { value: 'all', label: 'Tümü' },
  { value: 'active', label: 'Aktif' },
  { value: 'scheduled', label: 'Planlandı' },
  { value: 'draft', label: 'Taslak' },
  { value: 'closed', label: 'Kapalı' },
];

const STATUS_PILL: Record<SurveyStatus, { bg: string; label: string }> = {
  active: { bg: 'bg-green-soft text-green', label: 'Aktif' },
  scheduled: { bg: 'bg-accent-soft text-accent', label: 'Planlandı' },
  draft: { bg: 'bg-bg-3 text-ink-60', label: 'Taslak' },
  closed: { bg: 'bg-ink-20 text-ink-60', label: 'Kapalı' },
  archived: { bg: 'bg-ink-20 text-ink-60', label: 'Arşiv' },
};

const TYPE_LABEL: Record<SurveyType, string> = {
  pulse: 'Pulse',
  onboarding: 'Onboarding',
  exit: 'Exit',
  engagement: 'Bağlılık',
  custom: 'Özel',
};

export default function AnketlerPage() {
  const [statusFilter, setStatusFilter] = useState<SurveyStatus | 'all'>('all');
  const [createOpen, setCreateOpen] = useState(false);

  const surveys = useSurveys(statusFilter === 'all' ? {} : { status: statusFilter });
  const distributions = useDistributions({ limit: 50 });

  const stats = useMemo(() => {
    const items = surveys.data?.items ?? [];
    return {
      total: items.length,
      active: items.filter((s) => s.status === 'active').length,
      scheduled: items.filter((s) => s.status === 'scheduled').length,
      closed: items.filter((s) => s.status === 'closed').length,
    };
  }, [surveys.data]);

  const avgResponseRate = useMemo(() => {
    const dists = distributions.data?.items ?? [];
    if (dists.length === 0) return null;
    const rates = dists
      .filter((d) => d.invitations_sent > 0)
      .map((d) => (d.responses_received / d.invitations_sent) * 100);
    if (rates.length === 0) return null;
    return Math.round(rates.reduce((a, b) => a + b, 0) / rates.length);
  }, [distributions.data]);

  return (
    <div className="flex flex-col gap-8">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-ink">Anketler</h1>
          <p className="mt-1 text-sm text-ink-60">
            BAT-12-TR pulse, COPSOQ-III-TR JD-R, eNPS ve özel anketler — canlı API.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setCreateOpen(true)}
          className="inline-flex items-center gap-1.5 rounded-md bg-accent px-4 py-2 text-[13px] font-semibold text-white transition-colors hover:bg-accent/90"
        >
          <Plus className="h-4 w-4" />
          Yeni Anket
        </button>
      </div>

      {/* Stats */}
      <div className="grid gap-3 sm:grid-cols-4">
        <StatCard
          icon={<FileText className="h-4 w-4" />}
          label="Toplam anket"
          value={stats.total}
        />
        <StatCard
          icon={<Activity className="h-4 w-4" />}
          label="Aktif"
          value={stats.active}
          tone="green"
        />
        <StatCard
          icon={<CalendarDays className="h-4 w-4" />}
          label="Planlandı"
          value={stats.scheduled}
          tone="accent"
        />
        <StatCard
          icon={<TrendingUp className="h-4 w-4" />}
          label="Ort. katılım"
          value={avgResponseRate != null ? `%${avgResponseRate}` : '—'}
          tone={
            avgResponseRate == null
              ? 'gray'
              : avgResponseRate >= 60
                ? 'green'
                : avgResponseRate >= 30
                  ? 'amber'
                  : 'red'
          }
        />
      </div>

      {/* Filter */}
      <div className="flex items-center gap-1 rounded-md border border-line bg-bg p-1 text-[12px]">
        {STATUS_FILTER.map((f) => (
          <button
            key={f.value}
            type="button"
            onClick={() => setStatusFilter(f.value)}
            className={`rounded px-3 py-1.5 font-medium transition-colors ${
              statusFilter === f.value
                ? 'bg-accent-soft text-accent'
                : 'text-ink-60 hover:text-ink'
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Survey list */}
      <section>
        {surveys.isLoading && <LoadingList />}

        {surveys.isError && (
          <div className="rounded-lg border border-red/30 bg-red-soft p-4 text-sm text-red">
            <p className="font-medium">Anketler yüklenemedi</p>
            <p className="mt-1 text-[12px]">{surveys.error?.message}</p>
            <button
              type="button"
              onClick={() => surveys.refetch()}
              className="mt-3 rounded bg-red px-3 py-1.5 text-[12px] font-medium text-white"
            >
              Yeniden dene
            </button>
          </div>
        )}

        {!surveys.isLoading && !surveys.isError && (surveys.data?.items.length ?? 0) === 0 && (
          <EmptyState onCreate={() => setCreateOpen(true)} />
        )}

        {!surveys.isLoading && !surveys.isError && (surveys.data?.items.length ?? 0) > 0 && (
          <div className="grid gap-3 md:grid-cols-2">
            {surveys.data!.items.map((s) => (
              <SurveyCard
                key={s.id}
                survey={s}
                distributions={distributions.data?.items ?? []}
              />
            ))}
          </div>
        )}
      </section>

      {createOpen && (
        <CreateSurveyModal onClose={() => setCreateOpen(false)} />
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════

const SurveyCard = ({
  survey,
  distributions,
}: {
  survey: Survey;
  distributions: Array<{
    survey_id: string;
    invitations_sent: number;
    responses_received: number;
    status: string;
  }>;
}) => {
  const dists = distributions.filter((d) => d.survey_id === survey.id);
  const invited = dists.reduce((s, d) => s + d.invitations_sent, 0);
  const responded = dists.reduce((s, d) => s + d.responses_received, 0);
  const rate = invited > 0 ? Math.round((responded / invited) * 100) : null;

  return (
    <article className="flex flex-col gap-3 rounded-xl border border-line bg-bg p-5 transition-colors hover:border-ink-20">
      <header className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span
              className={`inline-flex h-5 items-center rounded-full px-2 text-[11px] font-medium ${STATUS_PILL[survey.status].bg}`}
            >
              {STATUS_PILL[survey.status].label}
            </span>
            <span className="inline-flex h-5 items-center rounded-full bg-bg-3 px-2 text-[11px] font-medium text-ink-60">
              {TYPE_LABEL[survey.survey_type]}
            </span>
            {survey.is_anonymous && (
              <span className="text-[11px] text-ink-40">Anonim</span>
            )}
          </div>
          <h3 className="mt-2 text-sm font-semibold text-ink">{survey.title_tr}</h3>
          {survey.description_tr && (
            <p className="mt-1 line-clamp-2 text-[12px] text-ink-60">
              {survey.description_tr}
            </p>
          )}
        </div>
      </header>

      <div className="grid grid-cols-3 gap-3 border-t border-line pt-3 text-[11px]">
        <Metric icon={<Users className="h-3 w-3" />} label="Davet" value={invited} />
        <Metric icon={<CheckCircle2 className="h-3 w-3" />} label="Yanıt" value={responded} />
        <Metric
          icon={<TrendingUp className="h-3 w-3" />}
          label="Oran"
          value={rate != null ? `%${rate}` : '—'}
          highlight={rate != null && rate >= 60}
        />
      </div>

      {survey.ends_at && (
        <p className="flex items-center gap-1 text-[11px] text-ink-40">
          <Clock className="h-3 w-3" />
          Kapanış: {new Date(survey.ends_at).toLocaleDateString('tr-TR')}
        </p>
      )}

      <Link
        href={`/anketler/${survey.id}`}
        className="text-[12px] font-medium text-accent hover:underline"
      >
        Detay + analitik →
      </Link>
    </article>
  );
};

const Metric = ({
  icon,
  label,
  value,
  highlight,
}: {
  icon: React.ReactNode;
  label: string;
  value: number | string;
  highlight?: boolean;
}) => (
  <div>
    <div className="flex items-center gap-1 text-ink-40">
      {icon}
      {label}
    </div>
    <p
      className={`mt-0.5 font-semibold tabular-nums ${highlight ? 'text-green' : 'text-ink'}`}
    >
      {value}
    </p>
  </div>
);

const StatCard = ({
  icon,
  label,
  value,
  tone = 'gray',
}: {
  icon: React.ReactNode;
  label: string;
  value: number | string;
  tone?: 'green' | 'amber' | 'red' | 'accent' | 'gray';
}) => {
  const toneMap = {
    green: 'text-green',
    amber: 'text-amber',
    red: 'text-red',
    accent: 'text-accent',
    gray: 'text-ink',
  };
  return (
    <div className="rounded-lg border border-line bg-bg p-4">
      <div className="flex items-center gap-1.5 text-[11px] uppercase tracking-widest text-ink-40">
        {icon}
        {label}
      </div>
      <p className={`mt-2 text-2xl font-semibold tabular-nums ${toneMap[tone]}`}>
        {value}
      </p>
    </div>
  );
};

const LoadingList = () => (
  <div className="grid gap-3 md:grid-cols-2">
    {[0, 1, 2, 3].map((i) => (
      <div key={i} className="h-48 animate-pulse rounded-xl border border-line bg-bg" />
    ))}
  </div>
);

const EmptyState = ({ onCreate }: { onCreate: () => void }) => (
  <div className="flex flex-col items-center gap-3 rounded-xl border border-line bg-bg px-6 py-16 text-center">
    <div className="flex h-14 w-14 items-center justify-center rounded-full bg-accent-soft">
      <FileText className="h-7 w-7 text-accent" />
    </div>
    <p className="text-sm font-medium text-ink">Henüz anket yok</p>
    <p className="max-w-md text-xs text-ink-40">
      İlk pulse anketinizi oluşturun — BAT-12-TR haftalık tükenmişlik ölçümü varsayılan
      olarak UpCore'da hazırdır.
    </p>
    <button
      type="button"
      onClick={onCreate}
      className="mt-2 inline-flex items-center gap-1.5 rounded-md bg-accent px-4 py-2 text-[13px] font-semibold text-white transition-colors hover:bg-accent/90"
    >
      <Plus className="h-4 w-4" />
      İlk anketi oluştur
    </button>
  </div>
);

// ═══════════════════════════════════════════════════════════════════════════
// Create modal
// ═══════════════════════════════════════════════════════════════════════════

const INSTRUMENT_TEMPLATES = [
  {
    code: 'bat12_tr',
    title: 'BAT-12-TR (Tükenmişlik)',
    desc: '12 soru · Koçak 2022 · European norms',
    type: 'pulse' as SurveyType,
  },
  {
    code: 'copsoq_iii_tr',
    title: 'COPSOQ-III-TR (JD-R)',
    desc: '24 soru · Şahan 2019 · İş talepleri + kaynakları',
    type: 'pulse' as SurveyType,
  },
  {
    code: 'uwes9',
    title: 'UWES-9 (Bağlılık)',
    desc: '9 soru · Schaufeli 2006 · Vigor/dedication/absorption',
    type: 'engagement' as SurveyType,
  },
  {
    code: 'custom',
    title: 'Özel anket',
    desc: 'Kendi sorularınızla başlayın',
    type: 'custom' as SurveyType,
  },
];

function CreateSurveyModal({ onClose }: { onClose: () => void }) {
  const [selectedCode, setSelectedCode] = useState<string>('bat12_tr');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [anonymous, setAnonymous] = useState(true);
  const [startsAt, setStartsAt] = useState(() => new Date().toISOString().slice(0, 10));
  const create = useCreateSurvey();

  const template = INSTRUMENT_TEMPLATES.find((t) => t.code === selectedCode);

  const onSubmit = async () => {
    if (!template) return;
    try {
      const effectiveTitle = title.trim() || template.title;
      const result = await create.mutateAsync({
        title_tr: effectiveTitle,
        description_tr: description.trim() || undefined,
        survey_type: template.type,
        is_anonymous: anonymous,
        starts_at: startsAt ? new Date(startsAt).toISOString() : undefined,
        instrument_code: selectedCode === 'custom' ? undefined : selectedCode,
      });
      toast.success(`"${effectiveTitle}" oluşturuldu`, { icon: <CheckCircle2 className="h-4 w-4" /> });
      onClose();
      void result;
    } catch (err: unknown) {
      toast.error('Anket oluşturulamadı', {
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
        className="flex max-h-[85vh] w-full max-w-xl flex-col overflow-hidden rounded-xl border border-line bg-bg shadow-xl"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
      >
        <header className="flex items-center justify-between border-b border-line p-5">
          <h2 className="text-lg font-semibold text-ink">Yeni Anket Oluştur</h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md p-1 text-ink-40 hover:bg-bg-2 hover:text-ink"
            aria-label="Kapat"
          >
            ×
          </button>
        </header>

        <div className="flex-1 space-y-5 overflow-y-auto p-5">
          {/* Instrument picker */}
          <div>
            <p className="mb-2 text-[11px] font-semibold uppercase tracking-widest text-ink-40">
              Ölçek seçin
            </p>
            <div className="flex flex-col gap-2">
              {INSTRUMENT_TEMPLATES.map((tpl) => (
                <button
                  key={tpl.code}
                  type="button"
                  onClick={() => setSelectedCode(tpl.code)}
                  className={`flex items-start gap-3 rounded-lg border p-3 text-left transition-colors ${
                    selectedCode === tpl.code
                      ? 'border-accent bg-accent-soft'
                      : 'border-line bg-bg hover:border-ink-20'
                  }`}
                >
                  <ChevronDown
                    className={`mt-0.5 h-4 w-4 ${
                      selectedCode === tpl.code ? 'text-accent' : 'text-ink-40'
                    }`}
                  />
                  <div>
                    <p className="text-sm font-medium text-ink">{tpl.title}</p>
                    <p className="mt-0.5 text-[11px] text-ink-60">{tpl.desc}</p>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Fields */}
          <div className="grid gap-3">
            <label className="flex flex-col gap-1.5">
              <span className="text-[11px] font-medium text-ink-80">
                Anket adı (boş bırakılırsa şablon adı kullanılır)
              </span>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder={template?.title ?? ''}
                className="h-10 rounded-md border border-line bg-bg px-3 text-sm text-ink focus:border-accent focus:outline-none"
              />
            </label>

            <label className="flex flex-col gap-1.5">
              <span className="text-[11px] font-medium text-ink-80">Açıklama (opsiyonel)</span>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={2}
                className="rounded-md border border-line bg-bg p-2 text-sm text-ink focus:border-accent focus:outline-none"
              />
            </label>

            <label className="flex flex-col gap-1.5">
              <span className="text-[11px] font-medium text-ink-80">Başlangıç tarihi</span>
              <input
                type="date"
                value={startsAt}
                onChange={(e) => setStartsAt(e.target.value)}
                className="h-10 rounded-md border border-line bg-bg px-3 text-sm text-ink focus:border-accent focus:outline-none"
              />
            </label>

            <label className="flex items-center gap-2 rounded-md bg-bg-2 p-3">
              <input
                type="checkbox"
                checked={anonymous}
                onChange={(e) => setAnonymous(e.target.checked)}
                className="h-4 w-4 accent-[color:var(--color-accent)]"
              />
              <div className="flex-1">
                <p className="text-[12px] font-medium text-ink">Anonim yanıt</p>
                <p className="text-[11px] text-ink-40">
                  Min 5 yanıtta tek tek gösterim yapılmaz, yalnızca agregat rapor.
                </p>
              </div>
            </label>
          </div>

          {create.isError && (
            <div className="flex items-start gap-2 rounded-md border border-red/30 bg-red-soft p-3 text-[12px] text-red">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
              <span>{create.error?.message}</span>
            </div>
          )}
        </div>

        <footer className="flex items-center justify-between border-t border-line bg-bg-2 p-5">
          <p className="text-[11px] text-ink-40">
            Oluşturduktan sonra katılımcı listesi + dağıtım tarihi belirleyebilirsiniz.
          </p>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-md border border-line bg-bg px-4 py-2 text-[13px] font-medium text-ink-60"
            >
              Vazgeç
            </button>
            <button
              type="button"
              onClick={onSubmit}
              disabled={create.isPending}
              className="rounded-md bg-accent px-5 py-2 text-[13px] font-semibold text-white hover:bg-accent/90 disabled:opacity-50"
            >
              {create.isPending ? 'Oluşturuluyor…' : 'Oluştur'}
            </button>
          </div>
        </footer>
      </div>
    </div>
  );
}
