'use client';

import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useMemo, useState } from 'react';
import {
  AlertTriangle,
  ArrowLeft,
  BookOpen,
  Check,
  ChevronRight,
  Clock,
  TrendingUp,
  User,
  X,
} from 'lucide-react';
import { usePriorityActions, useActionFeedback, type RankedAction } from '@/hooks/useActions';

/**
 * /panel/aksiyon/[id] — tam sayfa karar akışı (Decision Flow).
 * Action-center'dan gelen öncelikli aksiyonlardan birini detaylı inceleyip
 * onay/red/ertele kararı verilir. Bir üst React Query cache'inden okunur
 * (Panel sayfasındaki usePriorityActions aynı query key'i paylaşır).
 */
export default function AksiyonDetayPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const actionId = params.id;

  const { data, isLoading, isError, error } = usePriorityActions();
  const feedback = useActionFeedback();

  const action: RankedAction | undefined = useMemo(
    () => data?.actions.find((a) => a.action_id === actionId),
    [data, actionId],
  );

  const [decisionTaken, setDecisionTaken] = useState<
    'complete' | 'dismiss' | 'snooze' | null
  >(null);

  const urgency = action ? urgencyFromScore(action.urgency) : 'info';
  const cfg = urgencyConfig[urgency];

  const onDecide = (type: 'complete' | 'dismiss' | 'snooze') => {
    if (!action) return;
    setDecisionTaken(type);
    feedback.mutate(
      {
        action_id: action.action_id,
        feedback_type: type,
        snooze_hours: type === 'snooze' ? 24 : undefined,
      },
      {
        onSuccess: () => {
          setTimeout(() => router.push('/panel'), 1200);
        },
        onError: () => {
          setDecisionTaken(null);
        },
      },
    );
  };

  if (isLoading) {
    return (
      <div className="flex flex-col gap-6">
        <div className="h-8 w-48 animate-pulse rounded-md bg-bg-3" />
        <div className="grid gap-6 lg:grid-cols-[360px_1fr]">
          <div className="h-96 animate-pulse rounded-xl border border-line bg-bg" />
          <div className="h-96 animate-pulse rounded-xl border border-line bg-bg" />
        </div>
      </div>
    );
  }

  if (isError || !data) {
    return (
      <div className="rounded-lg border border-red/30 bg-red-soft px-5 py-6 text-sm text-red">
        <p className="font-medium">Aksiyon bilgisi yüklenemedi.</p>
        <p className="mt-1 text-[12px] text-red">{error?.message ?? 'Bilinmeyen hata'}</p>
        <Link
          href="/panel"
          className="mt-3 inline-flex items-center gap-1 text-[13px] font-medium text-red underline"
        >
          <ArrowLeft className="h-3.5 w-3.5" /> Panel'e dön
        </Link>
      </div>
    );
  }

  if (!action) {
    return (
      <div className="rounded-lg border border-line bg-bg px-5 py-12 text-center">
        <p className="text-sm font-medium text-ink">Bu aksiyon artık mevcut değil</p>
        <p className="mt-1 text-xs text-ink-40">
          Muhtemelen süresi doldu ya da başka bir oturumda tamamlandı.
        </p>
        <Link
          href="/panel"
          className="mt-4 inline-flex items-center gap-1 text-sm font-medium text-accent"
        >
          <ArrowLeft className="h-4 w-4" /> Panel'e dön
        </Link>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-8">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-1 text-[12px] text-ink-40">
        <Link href="/panel" className="hover:text-ink-60">
          Panel
        </Link>
        <ChevronRight className="h-3 w-3" />
        <span className="text-ink-60">Aksiyon kararı</span>
      </nav>

      {/* Header */}
      <div className="flex flex-col gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <span
            className={`inline-flex h-6 items-center rounded px-2 text-[11px] font-semibold ${cfg.tagBg} ${cfg.tagText}`}
          >
            {cfg.label}
          </span>
          <span className="text-[11px] uppercase tracking-wider text-ink-40">
            Öncelik %{Math.round(action.priority_score * 100)}
          </span>
          <span className="text-[11px] text-ink-40">·</span>
          <span className="text-[11px] text-ink-40">
            {action.suggested_within_hours} saat içinde aksiyon önerilir
          </span>
        </div>
        <h1 className="text-[22px] font-semibold tracking-tight text-ink">
          {action.title_tr}
        </h1>
      </div>

      {/* Two-column layout */}
      <div className="grid gap-6 lg:grid-cols-[360px_1fr]">
        {/* Left: target (employee / team) snapshot */}
        <aside className="rounded-xl border border-line bg-bg p-5">
          <p className="mb-3 text-[11px] font-semibold uppercase tracking-widest text-ink-40">
            Hedef
          </p>

          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-bg-3">
              <User className="h-5 w-5 text-ink-60" />
            </div>
            <div>
              <p className="text-sm font-semibold text-ink">
                {action.target.name_masked || 'Anonim hedef'}
              </p>
              <p className="text-[11px] text-ink-40">
                {action.target.employee_id
                  ? 'Bireysel çalışan'
                  : action.target.team_id
                    ? 'Ekip / departman'
                    : 'Organizasyon geneli'}
              </p>
            </div>
          </div>

          {/* Priority breakdown */}
          <div className="mt-5 flex flex-col gap-2.5">
            <ScoreBar label="Aciliyet" value={action.urgency} color="red" />
            <ScoreBar label="Etki" value={action.impact} color="accent" />
            <ScoreBar label="Uygulanabilirlik" value={action.actionability} color="green" />
            <ScoreBar label="Sizinle ilgi" value={action.user_relevance} color="teal" />
          </div>

          {/* Supporting signals */}
          {action.supporting_signals.length > 0 && (
            <div className="mt-5 border-t border-line pt-4">
              <p className="mb-2 text-[11px] font-semibold uppercase tracking-widest text-ink-40">
                Destekleyen sinyaller
              </p>
              <ul className="flex flex-col gap-1.5">
                {action.supporting_signals.map((s, i) => (
                  <li key={i} className="flex items-start gap-2 text-[12px] text-ink-60">
                    <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-accent" />
                    {s}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </aside>

        {/* Right: rationale + decision buttons */}
        <section className="rounded-xl border border-line bg-bg p-5">
          <p className="mb-3 text-[11px] font-semibold uppercase tracking-widest text-ink-40">
            Neden öneriyoruz
          </p>

          <p className="whitespace-pre-line text-[14px] leading-relaxed text-ink-80">
            {action.rationale_tr}
          </p>

          {/* CTA from backend (if present) */}
          {action.cta.href && (
            <div className="mt-5 rounded-lg border border-accent/30 bg-accent-soft p-4">
              <p className="mb-2 text-[11px] font-semibold uppercase tracking-widest text-accent">
                İlgili bağlantı
              </p>
              <Link
                href={action.cta.href}
                className="inline-flex items-center gap-1 text-sm font-medium text-accent hover:underline"
              >
                {action.cta.label_tr ?? 'İncele'}
                <ChevronRight className="h-4 w-4" />
              </Link>
            </div>
          )}

          {/* Decision buttons */}
          <div className="mt-8 border-t border-line pt-6">
            <p className="mb-4 text-[13px] font-semibold text-ink">Kararınız</p>

            {decisionTaken ? (
              <DecisionResult type={decisionTaken} />
            ) : (
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => onDecide('complete')}
                  disabled={feedback.isPending}
                  className="inline-flex items-center gap-2 rounded-md bg-accent px-4 py-2.5 text-[13px] font-semibold text-white transition-colors hover:bg-accent/90 disabled:opacity-50"
                >
                  <Check className="h-4 w-4" />
                  Onayla ve başlat
                </button>
                <button
                  type="button"
                  onClick={() => onDecide('snooze')}
                  disabled={feedback.isPending}
                  className="inline-flex items-center gap-2 rounded-md border border-line bg-bg px-4 py-2.5 text-[13px] font-medium text-ink-60 transition-colors hover:border-ink-20 disabled:opacity-50"
                >
                  <Clock className="h-4 w-4" />
                  24 saat ertele
                </button>
                <button
                  type="button"
                  onClick={() => onDecide('dismiss')}
                  disabled={feedback.isPending}
                  className="inline-flex items-center gap-2 rounded-md border border-line bg-bg px-4 py-2.5 text-[13px] font-medium text-ink-60 transition-colors hover:border-ink-20 disabled:opacity-50"
                >
                  <X className="h-4 w-4" />
                  Reddet
                </button>
              </div>
            )}

            <p className="mt-4 text-[11px] text-ink-40">
              Kararınız action-center'a iletilir ve gelecekteki önerileri
              kalibre etmek için kullanılır.
            </p>
          </div>
        </section>
      </div>
    </div>
  );
}

/* ─── Yardımcı componentler ─── */

type UrgencyLevel = 'critical' | 'warning' | 'info';

const urgencyFromScore = (u: number): UrgencyLevel => {
  if (u >= 0.75) return 'critical';
  if (u >= 0.45) return 'warning';
  return 'info';
};

const urgencyConfig: Record<
  UrgencyLevel,
  { tagBg: string; tagText: string; label: string; icon: React.ReactNode }
> = {
  critical: {
    tagBg: 'bg-red-soft',
    tagText: 'text-red',
    label: 'ACİL',
    icon: <AlertTriangle className="h-4 w-4 text-red" />,
  },
  warning: {
    tagBg: 'bg-amber-soft',
    tagText: 'text-amber',
    label: 'UYARI',
    icon: <TrendingUp className="h-4 w-4 text-amber" />,
  },
  info: {
    tagBg: 'bg-accent-soft',
    tagText: 'text-accent',
    label: 'BİLGİ',
    icon: <BookOpen className="h-4 w-4 text-accent" />,
  },
};

const ScoreBar = ({
  label,
  value,
  color,
}: {
  label: string;
  value: number;
  color: 'red' | 'accent' | 'green' | 'teal';
}) => {
  const pct = Math.round(value * 100);
  const colorMap = {
    red: 'bg-red',
    accent: 'bg-accent',
    green: 'bg-green',
    teal: 'bg-teal',
  };
  return (
    <div>
      <div className="flex items-center justify-between text-[11px]">
        <span className="text-ink-60">{label}</span>
        <span className="font-semibold tabular-nums text-ink">%{pct}</span>
      </div>
      <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-bg-3">
        <div className={`h-full rounded-full ${colorMap[color]}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
};

const DecisionResult = ({ type }: { type: 'complete' | 'dismiss' | 'snooze' }) => {
  const config = {
    complete: {
      icon: <Check className="h-5 w-5 text-green" />,
      bg: 'bg-green-soft border-green/20',
      title: 'Onaylandı ve başlatıldı',
      desc: 'Aksiyon işleme alındı. Panel\'e yönlendiriliyorsunuz.',
    },
    dismiss: {
      icon: <X className="h-5 w-5 text-red" />,
      bg: 'bg-red-soft border-red/20',
      title: 'Aksiyon reddedildi',
      desc: 'Bu aksiyon listenizden çıkarıldı.',
    },
    snooze: {
      icon: <Clock className="h-5 w-5 text-amber" />,
      bg: 'bg-amber-soft border-amber/20',
      title: '24 saat ertelendi',
      desc: 'Aksiyon yarın tekrar listenize düşecek.',
    },
  }[type];

  return (
    <div className={`flex items-center gap-3 rounded-lg border p-4 ${config.bg}`}>
      {config.icon}
      <div>
        <p className="text-sm font-semibold text-ink">{config.title}</p>
        <p className="mt-0.5 text-[12px] text-ink-60">{config.desc}</p>
      </div>
    </div>
  );
};
