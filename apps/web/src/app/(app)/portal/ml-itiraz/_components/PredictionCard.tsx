'use client';

import { CheckCircle2, ChevronRight, Info, Scale } from 'lucide-react';
import { bandFor, formatDate, type UserPrediction } from './types';

interface PredictionCardProps {
  prediction: UserPrediction;
  onObject: () => void;
}

export function PredictionCard({ prediction, onObject }: PredictionCardProps) {
  const band = bandFor(prediction.prediction_value);
  const isObjected = Boolean(prediction.objected_at);

  return (
    <article className="flex flex-col gap-3 rounded-xl border border-line bg-bg p-4">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-[11px] uppercase tracking-widest text-ink-40">
            {prediction.horizon_days} günlük tahmin ·{' '}
            {formatDate(prediction.predicted_at)}
          </p>
          <p className="mt-1 text-lg font-semibold text-ink">
            %{Math.round(prediction.prediction_value * 100)} risk
          </p>
          <p className="text-[11px] text-ink-40">
            model: {prediction.model_version}
          </p>
        </div>
        <span
          className={`inline-flex items-center rounded-full border px-2.5 py-1 text-[11px] font-medium ${band.color}`}
        >
          {band.label}
        </span>
      </header>

      {prediction.top_drivers.length > 0 && (
        <div className="rounded-lg bg-bg-2 p-3">
          <p className="flex items-center gap-1 text-[11px] font-semibold uppercase tracking-widest text-ink-40">
            <Info className="h-3.5 w-3.5" />
            En etkili 5 etken (SHAP)
          </p>
          <ul className="mt-2 space-y-1.5">
            {prediction.top_drivers.slice(0, 5).map((d) => (
              <li
                key={d.feature}
                className="flex items-center justify-between gap-3 text-[12px]"
              >
                <span className="text-ink">{d.label_tr}</span>
                <span
                  className={
                    d.direction === 'positive'
                      ? 'font-medium text-red-700'
                      : 'font-medium text-emerald-700'
                  }
                >
                  {d.direction === 'positive' ? '+' : '−'}
                  {d.abs_shap.toFixed(3)}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}

      <footer className="flex flex-wrap items-center justify-between gap-2 border-t border-line pt-3">
        <p className="text-[11px] text-ink-40">
          Rıza durumu:{' '}
          <span className="font-medium text-ink-60">
            {prediction.consent_status}
          </span>
          {isObjected && (
            <>
              {' · '}
              <span className="inline-flex items-center gap-1 text-amber-700">
                <Scale className="h-3 w-3" />
                İtiraz {formatDate(prediction.objected_at!)}
              </span>
            </>
          )}
        </p>
        {!isObjected ? (
          <button
            type="button"
            onClick={onObject}
            className="inline-flex items-center gap-1 rounded-md border border-line bg-bg px-3 py-1.5 text-[12px] font-medium text-ink hover:border-accent/50 hover:text-accent"
          >
            Bu tahmine itiraz et
            <ChevronRight className="h-3.5 w-3.5" />
          </button>
        ) : (
          <span className="inline-flex items-center gap-1 text-[12px] text-emerald-700">
            <CheckCircle2 className="h-3.5 w-3.5" />
            İtiraz iletildi
          </span>
        )}
      </footer>
    </article>
  );
}
