'use client';

import { useState } from 'react';
import { Loader2 } from 'lucide-react';
import type { UserPrediction } from './types';

interface ObjectionDialogProps {
  prediction: UserPrediction | null;
  pending: boolean;
  onCancel: () => void;
  onSubmit: (reason: string) => void;
}

export function ObjectionDialog({
  prediction,
  pending,
  onCancel,
  onSubmit,
}: ObjectionDialogProps) {
  const [reason, setReason] = useState('');

  if (!prediction) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-40 flex items-end justify-center bg-black/40 p-4 md:items-center"
    >
      <div className="w-full max-w-lg rounded-xl border border-line bg-bg p-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="text-base font-semibold text-ink">
              Bu tahmine itiraz ediyorum
            </h2>
            <p className="mt-1 text-[12px] text-ink-60">
              KVKK Madde 22 — otomatik karar alma süreçlerine itiraz. Talebin 30
              gün içinde İK + veri bilimi ekibi tarafından incelenecektir.
            </p>
          </div>
          <button
            type="button"
            onClick={() => {
              setReason('');
              onCancel();
            }}
            className="text-ink-40 hover:text-ink"
            aria-label="Kapat"
          >
            ✕
          </button>
        </div>

        <div className="mt-4 rounded-md bg-bg-2 p-3 text-[12px] text-ink-80">
          <p>
            Tahmin:{' '}
            <span className="font-medium">
              %{Math.round(prediction.prediction_value * 100)}
            </span>{' '}
            · {prediction.horizon_days} gün · {prediction.model_version}
          </p>
        </div>

        <label className="mt-4 block text-[12px] font-medium text-ink">
          İtiraz gerekçesi <span className="text-red-600">*</span>
        </label>
        <textarea
          className="mt-1 h-28 w-full rounded-md border border-line bg-bg p-2 text-sm text-ink outline-none focus:border-accent"
          placeholder="Tahminin hangi kısmına neden itiraz ettiğini açıklar mısın? (ör. kullandığı veri eksik/yanlış, bağlamı yansıtmıyor…)"
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          minLength={5}
          maxLength={2000}
        />
        <p className="mt-1 text-right text-[11px] text-ink-40">
          {reason.length}/2000
        </p>

        <div className="mt-4 flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={() => {
              setReason('');
              onCancel();
            }}
            className="rounded-md border border-line bg-bg px-3 py-1.5 text-[12px] text-ink hover:border-accent/50"
          >
            Vazgeç
          </button>
          <button
            type="button"
            onClick={() => {
              onSubmit(reason.trim());
              setReason('');
            }}
            disabled={pending || reason.trim().length < 5}
            className="inline-flex items-center gap-1 rounded-md bg-accent px-3 py-1.5 text-[12px] font-medium text-bg hover:bg-accent/90 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {pending && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
            İtirazı gönder
          </button>
        </div>
      </div>
    </div>
  );
}
