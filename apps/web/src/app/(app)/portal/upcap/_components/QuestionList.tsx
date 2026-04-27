'use client';

/**
 * UpCap-TR 12-item Likert (1-6) cevaplama UI.
 *
 * Sorumluluk: madde listesi + radio (button) seçim + ilerleme barı +
 * sıfırla / hesapla butonları. Mutation parent'tan gelir.
 */
import { Loader2, Sparkles } from 'lucide-react';
import { ANCHORS, FACTOR_LABELS, ITEMS } from './types';

interface QuestionListProps {
  responses: Record<string, number>;
  onItemChange: (code: string, value: number) => void;
  onReset: () => void;
  onSubmit: () => void;
  submitting: boolean;
  errorMessage?: string | null;
}

export function QuestionList({
  responses,
  onItemChange,
  onReset,
  onSubmit,
  submitting,
  errorMessage,
}: QuestionListProps) {
  const filled = Object.keys(responses).length;
  const complete = filled === 12;

  return (
    <section className="rounded-xl border border-line bg-bg p-5">
      <div className="flex items-center justify-between">
        <h2 className="text-[13px] font-semibold uppercase tracking-widest text-ink-40">
          Yanıt ilerlemen
        </h2>
        <span className="text-[12px] text-ink-60">{filled} / 12 madde</span>
      </div>
      <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-bg-2">
        <div
          className="h-full rounded-full bg-accent transition-all"
          style={{ width: `${(filled / 12) * 100}%` }}
        />
      </div>

      <ol className="mt-5 flex flex-col gap-4">
        {ITEMS.map((item, idx) => (
          <li key={item.code} className="rounded-lg border border-line bg-bg-2 p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1">
                <p className="text-[11px] uppercase tracking-wider text-ink-40">
                  Soru {idx + 1} · {FACTOR_LABELS[item.factor]}
                  {item.reverse ? ' · ters puanlı' : ''}
                </p>
                <p className="mt-1 text-sm text-ink">{item.text}</p>
              </div>
            </div>
            <div className="mt-3 grid grid-cols-6 gap-1 sm:gap-2">
              {ANCHORS.map((label, i) => {
                const v = i + 1;
                const selected = responses[item.code] === v;
                return (
                  <button
                    key={v}
                    type="button"
                    onClick={() => onItemChange(item.code, v)}
                    className={[
                      'rounded-md border px-1 py-2 text-[11px] font-medium transition-colors',
                      selected
                        ? 'border-accent bg-accent text-white'
                        : 'border-line bg-bg hover:border-accent/60',
                    ].join(' ')}
                    aria-label={label}
                    title={label}
                  >
                    {v}
                  </button>
                );
              })}
            </div>
            <p className="mt-2 text-[10px] text-ink-40">
              1 · Kesinlikle katılmıyorum &nbsp;·&nbsp; 6 · Kesinlikle katılıyorum
            </p>
          </li>
        ))}
      </ol>

      <div className="mt-6 flex items-center justify-between">
        <button
          type="button"
          onClick={onReset}
          className="text-[12px] text-ink-40 underline hover:text-ink-60"
        >
          Sıfırla
        </button>
        <button
          type="button"
          disabled={!complete || submitting}
          onClick={onSubmit}
          className="inline-flex items-center gap-2 rounded-md bg-[#0A0A0A] px-4 py-2 text-[13px] font-medium text-white transition-colors hover:bg-[#333] disabled:cursor-not-allowed disabled:bg-[#AAA]"
        >
          {submitting ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" /> Hesaplanıyor…
            </>
          ) : (
            <>
              Skorumu hesapla <Sparkles className="h-4 w-4" />
            </>
          )}
        </button>
      </div>

      {errorMessage ? (
        <p className="mt-3 text-[12px] text-red">Skor hesaplanamadı: {errorMessage}</p>
      ) : null}
    </section>
  );
}
