'use client';

/**
 * Tek bir rıza kategorisini gösteren kart.
 *
 * Sorumluluk: rıza özet metni + yasal dayanak + son güncelleme + toggle
 * + geçmiş bağlantısı. Toggle handler'ı parent'tan gelir; bu component
 * mutation katmanını bilmez (testability).
 */
import { Check, ChevronRight, Clock, FileText, History as HistoryIcon, ShieldAlert, X, XCircle } from 'lucide-react';
import type { ComponentType } from 'react';
import type { ConsentCatalogEntry, ConsentStatus, DataConsent } from './types';
import { formatTurkishDateTime } from './types';

interface ConsentCardProps {
  entry: ConsentCatalogEntry;
  decision: DataConsent | undefined;
  checked: boolean;
  disabled: boolean;
  onToggle: (next: boolean) => void;
  onOpenHistory: () => void;
}

export function ConsentCard({
  entry,
  decision,
  checked,
  disabled,
  onToggle,
  onOpenHistory,
}: ConsentCardProps) {
  return (
    <article className="rounded-xl border border-line bg-bg p-5">
      <div className="flex flex-wrap items-start gap-4">
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-base font-semibold text-ink">{entry.title_tr}</h2>
            {entry.required && (
              <span className="inline-flex items-center rounded-full bg-amber-soft px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-amber">
                Zorunlu
              </span>
            )}
            {entry.blocks_ai && (
              <span className="inline-flex items-center gap-1 rounded-full bg-accent-soft px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-accent">
                <ShieldAlert className="h-3 w-3" />
                AI kararı kapsamında
              </span>
            )}
          </div>
          <p className="mt-1 text-[13px] text-ink-80">{entry.summary_tr}</p>

          <div className="mt-3 flex items-start gap-2 rounded-md bg-bg-2 p-2.5 text-[11px] text-ink-60">
            <FileText className="mt-0.5 h-3.5 w-3.5 shrink-0 text-ink-40" />
            <div>
              <span className="font-medium text-ink-80">{entry.article}:</span> {entry.legal_basis}
            </div>
          </div>

          <div className="mt-2.5 flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-ink-40">
            <span>Metin versiyonu: v{entry.version}</span>
            {decision ? (
              <span className="inline-flex items-center gap-1">
                <Clock className="h-3 w-3" />
                Son güncelleme: {formatTurkishDateTime(decision.updated_at)}
              </span>
            ) : (
              <span className="text-ink-40">Henüz karar verilmedi</span>
            )}
            <StatusBadge status={decision?.status} />
          </div>
        </div>

        <div className="flex shrink-0 flex-col items-end gap-2">
          <ConsentSwitch
            checked={checked}
            disabled={disabled}
            onChange={onToggle}
            label={`${entry.title_tr} için rızam`}
          />
          <button
            type="button"
            onClick={onOpenHistory}
            className="inline-flex items-center gap-1 text-[11px] text-ink-40 hover:text-accent hover:underline"
          >
            <HistoryIcon className="h-3 w-3" />
            Geçmiş
            <ChevronRight className="h-3 w-3" />
          </button>
        </div>
      </div>
    </article>
  );
}

interface ConsentSwitchProps {
  checked: boolean;
  disabled?: boolean;
  onChange: (next: boolean) => void;
  label: string;
}

function ConsentSwitch({ checked, disabled = false, onChange, label }: ConsentSwitchProps) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={[
        'relative inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full',
        'border-2 border-transparent transition-colors duration-150 ease-out',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2',
        'disabled:cursor-not-allowed disabled:opacity-50',
        checked ? 'bg-accent' : 'bg-ink-20',
      ].join(' ')}
    >
      <span
        aria-hidden="true"
        className={[
          'pointer-events-none block h-5 w-5 rounded-full bg-white shadow-sm ring-0',
          'transition-transform duration-150 ease-out',
          checked ? 'translate-x-5' : 'translate-x-0',
        ].join(' ')}
      />
    </button>
  );
}

function StatusBadge({ status }: { status: ConsentStatus | undefined }) {
  if (!status) return null;
  const map: Record<ConsentStatus, { label: string; cls: string; icon: ComponentType<{ className?: string }> }> = {
    granted: { label: 'Rıza verildi', cls: 'bg-green-soft text-green', icon: Check },
    declined: { label: 'Reddedildi', cls: 'bg-bg-2 text-ink-60', icon: X },
    revoked: { label: 'Geri çekildi', cls: 'bg-red-soft text-red', icon: XCircle },
  };
  const cfg = map[status];
  const Icon = cfg.icon;
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide ${cfg.cls}`}
    >
      <Icon className="h-3 w-3" />
      {cfg.label}
    </span>
  );
}
