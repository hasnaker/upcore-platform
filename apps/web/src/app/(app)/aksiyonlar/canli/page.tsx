'use client';

import { useMemo } from 'react';
import {
  AlertCircle, CheckCircle2, Clock, Loader2, SkipForward, Sparkles,
} from 'lucide-react';
import { toast } from 'sonner';
import {
  usePriorityActions,
  useWeeklyRecap,
  useActionFeedback,
  type RankedAction,
} from '@/hooks/useActions';

/**
 * Gerçek Action Center çıktısı — ML servisinden tenant+user+role bazlı
 * Top-5 aksiyon, weekly recap metrikleri, dismiss/complete/snooze akışı.
 */
export default function AksiyonlarCanliPage() {
  const next = usePriorityActions();
  const recap = useWeeklyRecap('7d');

  return (
    <div className="flex flex-col gap-6">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight text-[#0A0A0A]">
          Canlı Aksiyon Merkezi
        </h1>
        <p className="mt-1 text-sm text-[#737373]">
          ML Action Center&apos;den rolünüze özel öncelikli TOP-5 aksiyon + haftalık özet.
        </p>
      </header>

      <WeeklyRecap data={recap.data} loading={recap.isLoading} />

      <section className="rounded-xl border border-[#EDEDED] bg-white p-5">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-sm font-semibold text-[#0A0A0A]">Öncelikli Aksiyonlar</h2>
            <p className="text-xs text-[#737373]">
              urgency × impact × actionability sıralaması
            </p>
          </div>
          {next.isFetching ? (
            <Loader2 className="h-4 w-4 animate-spin text-[#737373]" />
          ) : null}
        </div>

        {next.isLoading ? (
          <div className="mt-6 flex h-32 items-center justify-center text-sm text-[#737373]">
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Aksiyonlar yükleniyor…
          </div>
        ) : next.error ? (
          <ErrorBanner message={next.error.message} />
        ) : (next.data?.actions.length ?? 0) === 0 ? (
          <div className="mt-6 rounded-lg border border-dashed border-[#EDEDED] bg-[#FAFAFA] p-8 text-center">
            <Sparkles className="mx-auto h-8 w-8 text-[#A3A3A3]" />
            <p className="mt-2 text-sm font-medium text-[#0A0A0A]">
              Şu anda bekleyen aksiyon yok
            </p>
            <p className="mt-1 text-xs text-[#737373]">
              Sinyaller toplanınca yeni öneriler burada listelenir.
            </p>
          </div>
        ) : (
          <ul className="mt-4 space-y-3">
            {(next.data?.actions ?? []).map((a) => (
              <ActionRow key={a.action_id} action={a} />
            ))}
          </ul>
        )}
        {next.data?.cached ? (
          <p className="mt-3 text-[11px] text-[#A3A3A3]">
            Cache&apos;li sonuç · {new Date(next.data.generated_at).toLocaleTimeString('tr-TR')}
          </p>
        ) : null}
      </section>
    </div>
  );
}

/* ─── Weekly Recap ─── */

function WeeklyRecap({
  data,
  loading,
}: {
  data: ReturnType<typeof useWeeklyRecap>['data'];
  loading: boolean;
}) {
  const metrics = data?.metrics ?? [];
  if (loading) {
    return (
      <section className="rounded-xl border border-[#EDEDED] bg-white p-5">
        <h2 className="text-sm font-semibold text-[#0A0A0A]">Bu Hafta</h2>
        <p className="mt-4 text-xs text-[#737373]">Yükleniyor…</p>
      </section>
    );
  }
  if (metrics.length === 0) return null;
  return (
    <section className="rounded-xl border border-[#EDEDED] bg-white p-5">
      <h2 className="text-sm font-semibold text-[#0A0A0A]">Bu Hafta</h2>
      <p className="text-xs text-[#737373]">Son 7 gün özeti — önceki hafta ile karşılaştırma</p>
      <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {metrics.map((m) => {
          const up = m.change_vs_prev > 0;
          const down = m.change_vs_prev < 0;
          return (
            <div key={m.key} className="rounded-lg border border-[#EDEDED] p-3">
              <p className="text-[11px] uppercase tracking-wider text-[#737373]">{m.label_tr}</p>
              <p className="mt-1 text-xl font-semibold tabular-nums text-[#0A0A0A]">{m.value}</p>
              {m.change_vs_prev !== 0 ? (
                <p
                  className={`text-[11px] ${up ? 'text-[#16A34A]' : down ? 'text-[#DC2626]' : 'text-[#737373]'}`}
                >
                  {up ? '▲' : '▼'} {Math.abs(m.change_vs_prev)}%
                </p>
              ) : null}
            </div>
          );
        })}
      </div>
    </section>
  );
}

/* ─── Action Row ─── */

function ActionRow({ action }: { action: RankedAction }) {
  const feedback = useActionFeedback();
  const tone = useMemo(() => scoreTone(action.priority_score), [action.priority_score]);

  const act = (type: 'dismiss' | 'complete' | 'snooze') => {
    feedback.mutate(
      {
        action_id: action.action_id,
        feedback_type: type,
        snooze_hours: type === 'snooze' ? 24 : undefined,
      },
      {
        onSuccess: () => {
          toast.success(
            type === 'complete'
              ? 'Aksiyon tamamlandı olarak işaretlendi'
              : type === 'snooze'
                ? 'Aksiyon 24 saat ertelendi'
                : 'Aksiyon kaldırıldı',
          );
        },
        onError: (e) => toast.error(e.message),
      },
    );
  };

  return (
    <li
      className="rounded-lg border p-4"
      style={{ borderColor: tone.border, background: tone.bg }}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span
              className="inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium"
              style={{ background: tone.pillBg, color: tone.pillText }}
            >
              Öncelik {Math.round(action.priority_score * 100)}
            </span>
            <span className="text-[11px] text-[#737373]">
              {action.type} · hedef {action.target.name_masked || '—'}
            </span>
          </div>
          <p className="mt-2 text-sm font-medium text-[#0A0A0A]">{action.title_tr}</p>
          <p className="mt-1 text-xs text-[#525252]">{action.rationale_tr}</p>
          {action.supporting_signals.length > 0 ? (
            <ul className="mt-2 flex flex-wrap gap-1">
              {action.supporting_signals.slice(0, 4).map((s, i) => (
                <li
                  key={i}
                  className="rounded bg-white/70 px-1.5 py-0.5 text-[10px] text-[#525252]"
                >
                  {s}
                </li>
              ))}
            </ul>
          ) : null}
          <p className="mt-2 text-[11px] text-[#737373]">
            <Clock className="mr-1 inline h-3 w-3" />
            Önerilen: {action.suggested_within_hours} saat içinde
          </p>
        </div>
        <div className="flex shrink-0 flex-col gap-1.5">
          <button
            type="button"
            onClick={() => act('complete')}
            disabled={feedback.isPending}
            className="inline-flex items-center gap-1 rounded-md bg-[#0A0A0A] px-2.5 py-1.5 text-xs font-medium text-white hover:bg-[#333] disabled:opacity-50"
          >
            <CheckCircle2 className="h-3 w-3" />
            Tamamla
          </button>
          <button
            type="button"
            onClick={() => act('snooze')}
            disabled={feedback.isPending}
            className="inline-flex items-center gap-1 rounded-md border border-[#EDEDED] bg-white px-2.5 py-1.5 text-xs text-[#525252] hover:bg-[#FAFAFA] disabled:opacity-50"
          >
            <SkipForward className="h-3 w-3" />
            Ertele
          </button>
          <button
            type="button"
            onClick={() => act('dismiss')}
            disabled={feedback.isPending}
            className="inline-flex items-center gap-1 rounded-md border border-[#EDEDED] bg-white px-2.5 py-1.5 text-xs text-[#525252] hover:bg-[#FAFAFA] disabled:opacity-50"
          >
            Kaldır
          </button>
          {action.cta.href ? (
            <a
              href={action.cta.href}
              className="inline-flex items-center justify-center rounded-md border border-[#5E5CE6] px-2.5 py-1.5 text-xs font-medium text-[#5E5CE6] hover:bg-[#EEF2FF]"
            >
              {action.cta.label_tr ?? 'Detay'}
            </a>
          ) : null}
        </div>
      </div>
    </li>
  );
}

/* ─── helpers ─── */

function scoreTone(score: number) {
  if (score >= 0.8) {
    return {
      bg: '#FEE2E2',
      border: '#FCA5A5',
      pillBg: '#DC2626',
      pillText: '#fff',
    };
  }
  if (score >= 0.5) {
    return {
      bg: '#FFFBEB',
      border: '#FDE68A',
      pillBg: '#D97706',
      pillText: '#fff',
    };
  }
  return {
    bg: '#EFF6FF',
    border: '#BFDBFE',
    pillBg: '#2563EB',
    pillText: '#fff',
  };
}

function ErrorBanner({ message }: { message: string }) {
  return (
    <div className="mt-4 flex items-start gap-2 rounded-md border border-[#FECACA] bg-[#FEF2F2] p-3 text-[12px] text-[#991B1B]">
      <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
      <span>{message}</span>
    </div>
  );
}
