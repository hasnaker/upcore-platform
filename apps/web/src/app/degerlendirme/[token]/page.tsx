'use client';

import { useParams } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import {
  AlertCircle,
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  Clock,
  Eye,
  Lock,
  ShieldCheck,
} from 'lucide-react';
import { apiFetch } from '@/lib/api-client';

// ============================================================================
// Aday Değerlendirme Portalı (public, token-authenticated)
// GET  /api/v1/assessments/candidate/{token}
// POST /api/v1/assessments/candidate/{token}/responses
// ============================================================================

interface AssessmentItem {
  code: string;
  question_tr: string;
  question_en?: string | null;
  scale_type?: string;
  scale_min?: number;
  scale_max?: number;
  order_index?: number;
  dimension?: string | null;
}

interface AssessmentPayload {
  assessment: {
    id: string;
    instrument_code: string;
    instrument_title_tr?: string;
    status: string;
    candidate_name?: string | null;
    expires_at?: string | null;
  };
  items: AssessmentItem[];
  session?: {
    id: string;
    started_at?: string;
    time_limit_seconds?: number | null;
  };
  already_completed?: boolean;
}

interface SubmitPayload {
  completed_at: string;
}

interface ResponseInput {
  item_code: string;
  item_index: number;
  response_value: number;
  time_spent_seconds: number;
}

const LIKERT_5 = ['Hiç uymuyor', 'Pek uymuyor', 'Kararsızım', 'Biraz uyuyor', 'Tam uyuyor'];

export default function DegerlendirmePage() {
  const params = useParams<{ token: string }>();
  const token = params.token;

  const [started, setStarted] = useState(false);
  const [answers, setAnswers] = useState<Record<string, { v: number; t: number }>>({});
  const [current, setCurrent] = useState(0);
  const [submittedAt, setSubmittedAt] = useState<string | null>(null);

  // Anti-cheating signals
  const [focusLost, setFocusLost] = useState(0);
  const startTime = useRef<number>(Date.now());
  const itemStartTime = useRef<number>(Date.now());

  // Fetch assessment
  const query = useQuery<AssessmentPayload, Error>({
    queryKey: ['assessment-candidate', token],
    queryFn: async () =>
      apiFetch<AssessmentPayload>(`/api/v1/assessments/candidate/${token}`, {
        method: 'GET',
      }),
    retry: (count, err) => !/not_found|expired|410/i.test(err.message) && count < 2,
  });

  const submit = useMutation<SubmitPayload, Error, void>({
    mutationFn: async () => {
      const elapsed = Math.round((Date.now() - startTime.current) / 1000);
      const responses: ResponseInput[] = Object.entries(answers).map(([code, a], i) => ({
        item_code: code,
        item_index: i,
        response_value: a.v,
        time_spent_seconds: a.t,
      }));
      return apiFetch<SubmitPayload>(
        `/api/v1/assessments/candidate/${token}/responses`,
        {
          method: 'POST',
          body: {
            responses,
            focus_lost_count: focusLost,
            elapsed_seconds: elapsed,
          },
        },
      );
    },
    onSuccess: (res) => setSubmittedAt(res.completed_at),
  });

  // Track visibility for anti-cheating
  useEffect(() => {
    if (!started) return;
    const onBlur = () => setFocusLost((n) => n + 1);
    const onVis = () => {
      if (document.hidden) setFocusLost((n) => n + 1);
    };
    window.addEventListener('blur', onBlur);
    document.addEventListener('visibilitychange', onVis);
    return () => {
      window.removeEventListener('blur', onBlur);
      document.removeEventListener('visibilitychange', onVis);
    };
  }, [started]);

  const items = query.data?.items ?? [];
  const answeredCount = Object.keys(answers).length;
  const progress = items.length > 0 ? Math.round((answeredCount / items.length) * 100) : 0;
  const allAnswered = items.length > 0 && answeredCount === items.length;

  // Time limit (countdown)
  const timeLimit = query.data?.session?.time_limit_seconds ?? null;
  const [timeLeft, setTimeLeft] = useState<number | null>(null);
  useEffect(() => {
    if (!started || !timeLimit) return;
    const start = Date.now();
    setTimeLeft(timeLimit);
    const tick = setInterval(() => {
      const elapsed = (Date.now() - start) / 1000;
      const remain = Math.max(0, Math.round(timeLimit - elapsed));
      setTimeLeft(remain);
      if (remain === 0) {
        clearInterval(tick);
        // Auto-submit partial on time up
        submit.mutate();
      }
    }, 1000);
    return () => clearInterval(tick);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [started, timeLimit]);

  const fmtTime = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m}:${String(s).padStart(2, '0')}`;
  };

  // Loading
  if (query.isLoading) {
    return (
      <div className="flex flex-col items-center gap-3 py-24 text-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-accent border-t-transparent" />
        <p className="text-sm text-ink-60">Değerlendirme hazırlanıyor…</p>
      </div>
    );
  }

  // Error
  if (query.isError) {
    const msg = query.error?.message ?? '';
    const isExpired = /expired|410|gone/i.test(msg);
    return (
      <ErrorCard
        icon={
          isExpired ? <Clock className="h-6 w-6 text-amber" /> : <Lock className="h-6 w-6 text-red" />
        }
        title={isExpired ? 'Değerlendirme süresi dolmuş' : 'Bağlantı geçersiz'}
        message={
          isExpired
            ? 'Bu değerlendirme için son tarih geçti. Lütfen ilanı gönderen kuruluma ulaşın.'
            : 'Bu bağlantı bulunamadı veya daha önce kullanıldı.'
        }
      />
    );
  }

  // Already submitted / submitted now
  if (submittedAt || query.data?.already_completed) {
    return (
      <SuccessCard
        submittedAt={submittedAt ?? new Date().toISOString()}
        alreadyExisted={!submittedAt && query.data?.already_completed}
      />
    );
  }

  const assessment = query.data?.assessment;
  if (!assessment) return null;

  // Intro screen
  if (!started) {
    return (
      <IntroCard
        title={assessment.instrument_title_tr ?? 'Psikometrik Değerlendirme'}
        instrumentCode={assessment.instrument_code}
        candidateName={assessment.candidate_name ?? null}
        itemCount={items.length}
        timeLimit={timeLimit}
        onStart={() => {
          setStarted(true);
          startTime.current = Date.now();
          itemStartTime.current = Date.now();
        }}
      />
    );
  }

  // Assessment screen — one question at a time
  const currentItem = items[current];
  if (!currentItem) return null;

  const onAnswer = (value: number) => {
    const t = (Date.now() - itemStartTime.current) / 1000;
    setAnswers((prev) => ({ ...prev, [currentItem.code]: { v: value, t } }));
  };

  const goNext = () => {
    if (current < items.length - 1) {
      setCurrent((c) => c + 1);
      itemStartTime.current = Date.now();
    }
  };

  const goPrev = () => {
    if (current > 0) {
      setCurrent((c) => c - 1);
      itemStartTime.current = Date.now();
    }
  };

  const onSubmit = () => submit.mutate();

  const max = currentItem.scale_max ?? 5;
  const min = currentItem.scale_min ?? 1;
  const options: number[] = [];
  for (let i = min; i <= max; i++) options.push(i);

  return (
    <div className="flex flex-col gap-6">
      {/* Timer + progress */}
      <div className="sticky top-0 z-10 rounded-lg border border-line bg-bg/95 p-3 backdrop-blur">
        <div className="flex items-center justify-between text-[12px]">
          <div className="flex items-center gap-3">
            <span className="text-ink-60">
              Soru {current + 1}/{items.length}
            </span>
            {focusLost > 0 && (
              <span className="inline-flex items-center gap-1 rounded-full bg-amber-soft px-2 py-0.5 text-[11px] font-medium text-amber">
                <Eye className="h-3 w-3" />
                Sekme değişimi: {focusLost}
              </span>
            )}
          </div>
          <div className="flex items-center gap-3">
            {timeLeft != null && (
              <span
                className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 font-semibold tabular-nums ${
                  timeLeft < 60
                    ? 'bg-red-soft text-red'
                    : timeLeft < 300
                      ? 'bg-amber-soft text-amber'
                      : 'bg-bg-2 text-ink-60'
                }`}
              >
                <Clock className="h-3 w-3" />
                {fmtTime(timeLeft)}
              </span>
            )}
            <span className="font-semibold tabular-nums text-accent">%{progress}</span>
          </div>
        </div>
        <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-bg-3">
          <div
            className="h-full rounded-full bg-accent transition-all duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      {/* Question card */}
      <div className="rounded-xl border border-line bg-bg p-6">
        {currentItem.dimension && (
          <p className="mb-2 text-[10px] uppercase tracking-widest text-ink-40">
            {currentItem.dimension}
          </p>
        )}
        <h2 className="text-lg font-semibold leading-relaxed text-ink">
          {currentItem.question_tr}
        </h2>

        <fieldset className="mt-6">
          <legend className="sr-only">
            Soru {current + 1} için yanıtınız
          </legend>
          <div className="grid gap-2 sm:grid-cols-5">
            {options.map((opt, i) => {
              const active = answers[currentItem.code]?.v === opt;
              const label =
                options.length === 5 ? LIKERT_5[i] : String(opt);
              return (
                <button
                  key={opt}
                  type="button"
                  onClick={() => onAnswer(opt)}
                  className={`flex flex-col items-center gap-1 rounded-md border px-3 py-3 text-[12px] font-medium transition-all ${
                    active
                      ? 'border-accent bg-accent-soft text-accent ring-2 ring-accent/30'
                      : 'border-line bg-bg text-ink-60 hover:border-ink-20'
                  }`}
                >
                  <span className="text-lg font-bold tabular-nums">{opt}</span>
                  <span className="text-center text-[11px] leading-tight">{label}</span>
                </button>
              );
            })}
          </div>
        </fieldset>
      </div>

      {/* Navigation */}
      <div className="flex items-center justify-between gap-3">
        <button
          type="button"
          onClick={goPrev}
          disabled={current === 0}
          className="inline-flex items-center gap-1 rounded-md border border-line bg-bg px-4 py-2 text-[13px] font-medium text-ink-60 disabled:opacity-40"
        >
          <ArrowLeft className="h-4 w-4" />
          Önceki
        </button>

        {current < items.length - 1 ? (
          <button
            type="button"
            onClick={goNext}
            disabled={!answers[currentItem.code]}
            className="inline-flex items-center gap-1 rounded-md bg-accent px-5 py-2 text-[13px] font-semibold text-white hover:bg-accent/90 disabled:opacity-50"
          >
            Sonraki
            <ArrowRight className="h-4 w-4" />
          </button>
        ) : (
          <button
            type="button"
            onClick={onSubmit}
            disabled={!allAnswered || submit.isPending}
            className="inline-flex items-center gap-1 rounded-md bg-accent px-5 py-2 text-[13px] font-semibold text-white hover:bg-accent/90 disabled:opacity-50"
          >
            {submit.isPending ? 'Gönderiliyor…' : 'Değerlendirmeyi Tamamla'}
            <CheckCircle2 className="h-4 w-4" />
          </button>
        )}
      </div>

      {submit.isError && (
        <div className="flex items-start gap-2 rounded-md border border-red/30 bg-red-soft p-3 text-[12px] text-red">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          <span>{submit.error?.message ?? 'Gönderim başarısız'}</span>
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════

const IntroCard = ({
  title,
  instrumentCode,
  candidateName,
  itemCount,
  timeLimit,
  onStart,
}: {
  title: string;
  instrumentCode: string;
  candidateName: string | null;
  itemCount: number;
  timeLimit: number | null;
  onStart: () => void;
}) => {
  return (
    <div className="flex flex-col gap-6 rounded-xl border border-line bg-bg p-8">
      <div className="flex flex-col items-center gap-3 text-center">
        <div className="flex h-14 w-14 items-center justify-center rounded-full bg-accent-soft">
          <ShieldCheck className="h-7 w-7 text-accent" />
        </div>
        <h1 className="text-2xl font-semibold tracking-tight text-ink">{title}</h1>
        <p className="text-[12px] uppercase tracking-widest text-ink-40">
          {instrumentCode.toUpperCase()}
        </p>
        {candidateName && (
          <p className="text-sm text-ink-60">
            Hoş geldin <strong className="text-ink">{candidateName}</strong>
          </p>
        )}
      </div>

      {/* Meta */}
      <div className="grid gap-3 sm:grid-cols-3">
        <MetaCard label="Soru sayısı" value={`${itemCount} adet`} />
        <MetaCard
          label="Tahmini süre"
          value={
            timeLimit ? `${Math.round(timeLimit / 60)} dk` : `${Math.max(5, Math.round(itemCount / 4))} dk`
          }
        />
        <MetaCard label="Oturum" value="Tek oturumda tamamla" />
      </div>

      {/* Rules */}
      <div className="rounded-lg border border-line bg-bg-2 p-5 text-[13px] leading-relaxed text-ink-80">
        <p className="font-semibold text-ink">Başlamadan önce:</p>
        <ul className="mt-2 flex list-disc flex-col gap-1 pl-5 text-ink-60">
          <li>Sessiz ve dikkat dağıtmayan bir ortamda yanıtlayın.</li>
          <li>Her soruyu içten yanıtlayın — &quot;doğru&quot; yanıt yoktur.</li>
          <li>
            Değerlendirme süresince başka sekmeye/uygulamaya geçişleriniz kaydedilir (anti-cheating
            sinyali).
          </li>
          <li>Sonuçlar yalnızca işveren İK ekibiyle paylaşılır, size özel olarak rapor döner.</li>
        </ul>
      </div>

      {/* KVKK consent */}
      <div className="flex items-start gap-2 rounded-md border border-accent/20 bg-accent-soft p-3 text-[12px] text-ink-80">
        <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-accent" />
        <div>
          <p className="font-semibold">KVKK onayı</p>
          <p className="mt-0.5 text-ink-60">
            Devam ederek kişisel verilerinizin UpCore üzerinden işverene aktarılmasına
            onay vermiş olursunuz. 6 ay sonra otomatik silinir.
          </p>
        </div>
      </div>

      <button
        type="button"
        onClick={onStart}
        className="mt-2 inline-flex items-center justify-center gap-2 rounded-md bg-accent px-6 py-3 text-[14px] font-semibold text-white hover:bg-accent/90"
      >
        Değerlendirmeye Başla
        <ArrowRight className="h-4 w-4" />
      </button>
    </div>
  );
};

const MetaCard = ({ label, value }: { label: string; value: string }) => (
  <div className="rounded-md border border-line bg-bg-2 p-3 text-center">
    <p className="text-[11px] uppercase tracking-widest text-ink-40">{label}</p>
    <p className="mt-1 text-sm font-semibold text-ink">{value}</p>
  </div>
);

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
      {alreadyExisted ? 'Zaten tamamlanmış' : 'Teşekkürler!'}
    </h2>
    <p className="mt-2 text-sm text-ink-60">
      {alreadyExisted
        ? 'Bu değerlendirme daha önce tamamlanmış. Her değerlendirme yalnızca bir kez yanıtlanabilir.'
        : 'Değerlendirmeniz tamamlandı. Sonuçlar işveren ile paylaşıldı. Bizimle iletişime geçilmesini beklerken KVKK hakkınız çerçevesinde verilerinize erişebilir, silinmesini talep edebilirsiniz.'}
    </p>
    <p className="mt-4 text-[11px] text-ink-40">
      Tamamlandı:{' '}
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
