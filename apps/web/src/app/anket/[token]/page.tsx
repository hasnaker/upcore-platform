'use client';

import { useParams } from 'next/navigation';
import { useMemo, useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { AlertCircle, ArrowRight, CheckCircle2, Clock, Flame, Lock } from 'lucide-react';
import { apiFetch } from '@/lib/api-client';

// ============================================================================
// Pulse Survey (çalışan tarafı) — token-authenticated, public.
// GET  /api/v1/public/surveys/invitations/{token}
// POST /api/v1/public/surveys/invitations/{token}/submit
// ============================================================================

interface SurveyItem {
  id: string;
  code: string;
  question_tr: string;
  scale_type: string;
  scale_min?: number;
  scale_max?: number;
  dimension?: string;
  is_required?: boolean;
  order_index?: number;
}

interface SurveyMeta {
  id: string;
  code: string;
  title_tr: string;
  description_tr?: string;
  item_count?: number;
  estimated_duration_min?: number;
}

interface SurveyPayload {
  survey: SurveyMeta;
  items: SurveyItem[];
  closes_at: string | null;
  already_submitted: boolean;
}

interface SubmitPayload {
  submitted_at: string;
}

// BAT-12-TR Likert (Türkçe)
const LIKERT_LABELS = [
  'Hiçbir zaman',
  'Nadiren',
  'Bazen',
  'Sıklıkla',
  'Her zaman',
];

export default function AnketPage() {
  const params = useParams<{ token: string }>();
  const token = params.token;
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [submitted, setSubmitted] = useState<SubmitPayload | null>(null);

  const query = useQuery<SurveyPayload, Error>({
    queryKey: ['public-survey', token],
    queryFn: async () =>
      apiFetch<SurveyPayload>(`/api/v1/public/surveys/invitations/${token}`, {
        method: 'GET',
      }),
    retry: (count, err) => !/not_found|expired/i.test(err.message) && count < 2,
  });

  const submit = useMutation<SubmitPayload, Error, Record<string, number>>({
    mutationFn: async (answerMap) => {
      const body = {
        answers: Object.entries(answerMap).map(([code, val]) => ({
          item_code: code,
          value_int: val,
        })),
      };
      return apiFetch<SubmitPayload>(
        `/api/v1/public/surveys/invitations/${token}/submit`,
        { method: 'POST', body },
      );
    },
    onSuccess: (res) => setSubmitted(res),
  });

  const items = useMemo(() => query.data?.items ?? [], [query.data?.items]);
  const answeredCount = Object.keys(answers).length;
  const progress = items.length > 0 ? Math.round((answeredCount / items.length) * 100) : 0;
  const requiredItems = useMemo(
    () => items.filter((i) => i.is_required !== false),
    [items],
  );
  const allRequiredAnswered = requiredItems.every((i) => i.code in answers);

  // Loading
  if (query.isLoading) {
    return (
      <div className="flex flex-col items-center gap-3 py-16 text-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-accent border-t-transparent" />
        <p className="text-sm text-ink-60">Anket yükleniyor…</p>
      </div>
    );
  }

  // Invitation not found / expired
  if (query.isError) {
    const isExpired = /expired|gone/i.test(query.error?.message ?? '');
    const isNotFound = /not_found|404/i.test(query.error?.message ?? '');
    return (
      <ErrorCard
        icon={isExpired ? <Clock className="h-6 w-6 text-amber" /> : <Lock className="h-6 w-6 text-red" />}
        title={
          isExpired
            ? 'Anket süresi dolmuş'
            : isNotFound
              ? 'Geçersiz bağlantı'
              : 'Anket açılamadı'
        }
        message={
          isExpired
            ? 'Bu pulse anketi için son tarih geçti. İK ekibinize ulaşabilirsiniz.'
            : isNotFound
              ? 'Bu davet bağlantısı bulunamadı. E-postadaki linki yeniden kontrol edin.'
              : query.error?.message ?? 'Bilinmeyen hata.'
        }
      />
    );
  }

  // Already submitted
  if (submitted || query.data?.already_submitted) {
    return (
      <SuccessCard
        submittedAt={submitted?.submitted_at ?? new Date().toISOString()}
        alreadyExisted={!submitted && query.data?.already_submitted}
      />
    );
  }

  // Survey UI
  const survey = query.data?.survey;
  if (!survey) return null;

  const onSubmit = () => {
    submit.mutate(answers);
  };

  return (
    <div className="flex flex-col gap-8">
      {/* Header */}
      <div className="flex flex-col items-center gap-3 text-center">
        <div className="flex h-14 w-14 items-center justify-center rounded-full bg-accent-soft">
          <Flame className="h-7 w-7 text-accent" />
        </div>
        <h1 className="text-2xl font-semibold tracking-tight text-ink">
          {survey.title_tr}
        </h1>
        {survey.description_tr && (
          <p className="max-w-md text-sm text-ink-60">{survey.description_tr}</p>
        )}
        <div className="flex items-center gap-4 text-[12px] text-ink-40">
          <span>{items.length} soru</span>
          <span>·</span>
          <span>
            ≈ {survey.estimated_duration_min ?? Math.max(1, Math.round(items.length / 8))}{' '}
            dk
          </span>
          <span>·</span>
          <span>Anonim</span>
        </div>
      </div>

      {/* Progress */}
      <div className="sticky top-0 z-10 rounded-lg border border-line bg-bg/95 p-3 backdrop-blur">
        <div className="flex items-center justify-between text-[12px] text-ink-60">
          <span>
            {answeredCount}/{items.length} yanıtlandı
          </span>
          <span className="font-semibold tabular-nums text-accent">%{progress}</span>
        </div>
        <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-bg-3">
          <div
            className="h-full rounded-full bg-accent transition-all duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      {/* Questions */}
      <ol className="flex flex-col gap-4">
        {items.map((item, idx) => (
          <QuestionCard
            key={item.id}
            index={idx + 1}
            total={items.length}
            item={item}
            value={answers[item.code] ?? null}
            onChange={(v) => setAnswers((prev) => ({ ...prev, [item.code]: v }))}
          />
        ))}
      </ol>

      {/* Submit */}
      <div className="flex flex-col gap-3 rounded-xl border border-line bg-bg p-6">
        {submit.isError && (
          <div className="flex items-start gap-2 rounded-md border border-red/30 bg-red-soft p-3 text-[12px] text-red">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
            <span>{submit.error?.message ?? 'Gönderim başarısız'}</span>
          </div>
        )}
        <p className="text-[12px] text-ink-40">
          Yanıtlarınız <strong className="text-ink-60">anonim</strong> olarak kaydedilir —
          departman bazlı raporlar yalnızca min 5 kişilik gruplarda oluşturulur.
        </p>
        <button
          type="button"
          onClick={onSubmit}
          disabled={!allRequiredAnswered || submit.isPending}
          className="inline-flex items-center justify-center gap-2 rounded-md bg-accent px-6 py-3 text-[14px] font-semibold text-white transition-colors hover:bg-accent/90 disabled:bg-ink-20 disabled:cursor-not-allowed"
        >
          {submit.isPending ? (
            'Gönderiliyor…'
          ) : (
            <>
              Yanıtları Gönder
              <ArrowRight className="h-4 w-4" />
            </>
          )}
        </button>
        {!allRequiredAnswered && (
          <p className="text-center text-[11px] text-ink-40">
            Tüm zorunlu soruları yanıtladığınızda gönder butonu aktif olacak.
          </p>
        )}
      </div>
    </div>
  );
}

// ───────────────────────────────────────────────────────────────────────────

const QuestionCard = ({
  index,
  total,
  item,
  value,
  onChange,
}: {
  index: number;
  total: number;
  item: SurveyItem;
  value: number | null;
  onChange: (v: number) => void;
}) => {
  const min = item.scale_min ?? 1;
  const max = item.scale_max ?? 5;
  const options: number[] = [];
  for (let i = min; i <= max; i++) options.push(i);

  return (
    <li className="rounded-xl border border-line bg-bg p-5 transition-shadow focus-within:shadow-sm">
      <div className="flex items-start gap-3">
        <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-bg-3 text-[11px] font-semibold text-ink-60">
          {index}
        </span>
        <div className="flex-1">
          <p className="text-[13px] leading-relaxed text-ink">
            {item.question_tr}
            {item.is_required === false && (
              <span className="ml-1 text-[11px] text-ink-40">(opsiyonel)</span>
            )}
          </p>
          {item.dimension && (
            <p className="mt-1 text-[10px] uppercase tracking-widest text-ink-40">
              {item.dimension}
            </p>
          )}

          <fieldset className="mt-4">
            <legend className="sr-only">Soru {index}/{total} için yanıtınız</legend>
            <div className="flex flex-wrap gap-2">
              {options.map((opt, i) => {
                const active = value === opt;
                const label = max - min + 1 === 5 ? LIKERT_LABELS[i] : String(opt);
                return (
                  <button
                    key={opt}
                    type="button"
                    onClick={() => onChange(opt)}
                    className={`flex-1 min-w-[80px] rounded-md border px-3 py-2.5 text-[12px] font-medium transition-all ${
                      active
                        ? 'border-accent bg-accent-soft text-accent'
                        : 'border-line bg-bg text-ink-60 hover:border-ink-20'
                    }`}
                  >
                    <span className="block text-[10px] opacity-70">{opt}</span>
                    {label}
                  </button>
                );
              })}
            </div>
          </fieldset>
        </div>
      </div>
    </li>
  );
};

const SuccessCard = ({
  submittedAt,
  alreadyExisted,
}: {
  submittedAt: string;
  alreadyExisted?: boolean;
}) => (
  <div className="rounded-xl border border-green/30 bg-green-soft p-8 text-center">
    <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-white">
      <CheckCircle2 className="h-8 w-8 text-green" />
    </div>
    <h2 className="mt-4 text-xl font-semibold text-green">
      {alreadyExisted ? 'Bu anketi daha önce yanıtladınız' : 'Teşekkürler!'}
    </h2>
    <p className="mt-2 text-sm text-ink-60">
      {alreadyExisted
        ? 'Yanıtlarınız zaten kaydedilmiş. Her anketi yalnızca bir kez yanıtlayabilirsiniz.'
        : 'Yanıtlarınız güvenli şekilde kaydedildi. Departman-bazlı agregat raporlar İK ekibiyle paylaşılır, bireysel yanıtlarınız görünmez.'}
    </p>
    <p className="mt-4 text-[11px] text-ink-40">
      Gönderildi:{' '}
      {new Date(submittedAt).toLocaleString('tr-TR', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      })}
    </p>
  </div>
);

const ErrorCard = ({
  icon,
  title,
  message,
}: {
  icon: React.ReactNode;
  title: string;
  message: string;
}) => (
  <div className="rounded-xl border border-line bg-bg p-8 text-center">
    <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-bg-3">
      {icon}
    </div>
    <h2 className="mt-4 text-xl font-semibold text-ink">{title}</h2>
    <p className="mt-2 text-sm text-ink-60">{message}</p>
  </div>
);
