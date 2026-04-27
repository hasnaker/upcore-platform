'use client';

/**
 * Belirli bir rıza tipine ait değişiklik geçmişini gösteren drawer.
 *
 * KVKK Madde 28 kapsamında her rıza değişikliği audit log'a alınır
 * (consent_history tablosu). Bu UI o tabloyu çalışan-tarafında okur ve
 * IP + User-Agent + neden + versiyon bilgilerini şeffaf şekilde sergiler.
 */
import { AlertTriangle, ChevronRight, Loader2, X } from 'lucide-react';
import type { ConsentStatus, ConsentType } from './types';
import { formatTurkishDateTime, mapChangeReason, consentStatusLabel } from './types';
import { useKvkkConsentHistory } from './hooks';

interface HistoryDrawerProps {
  consentType: ConsentType;
  title: string;
  onClose: () => void;
}

export function HistoryDrawer({ consentType, title, onClose }: HistoryDrawerProps) {
  const { data, isLoading, isError, error } = useKvkkConsentHistory(consentType);
  const entries = data?.entries ?? [];

  return (
    <div role="dialog" aria-modal="true" aria-label={`${title} geçmişi`} className="fixed inset-0 z-50 flex">
      <button
        type="button"
        aria-label="Geçmişi kapat"
        onClick={onClose}
        className="flex-1 bg-ink/40 backdrop-blur-[2px]"
      />
      <aside className="flex h-full w-full max-w-md flex-col border-l border-line bg-bg shadow-xl">
        <header className="flex items-center justify-between border-b border-line p-4">
          <div>
            <p className="text-[11px] uppercase tracking-widest text-ink-40">Rıza geçmişi</p>
            <h3 className="mt-0.5 text-base font-semibold text-ink">{title}</h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md p-1.5 text-ink-40 transition-colors hover:bg-bg-2 hover:text-ink"
            aria-label="Kapat"
          >
            <X className="h-4 w-4" />
          </button>
        </header>

        <div className="flex-1 overflow-y-auto p-4">
          {isLoading && (
            <div className="flex items-center justify-center py-12 text-ink-40">
              <Loader2 className="h-5 w-5 animate-spin" />
            </div>
          )}
          {isError && (
            <div role="alert" className="flex items-start gap-2 rounded-md border border-red/30 bg-red-soft p-3 text-[13px] text-red">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
              <div>
                <p className="font-semibold">Geçmiş yüklenemedi</p>
                <p className="mt-1 text-ink-80">{error?.message ?? 'Bilinmeyen hata'}</p>
              </div>
            </div>
          )}
          {!isLoading && !isError && entries.length === 0 && (
            <div className="rounded-md border border-dashed border-line bg-bg p-6 text-center text-[13px] text-ink-60">
              Bu rıza tipi için henüz bir işlem kaydı yok.
            </div>
          )}
          {!isLoading && !isError && entries.length > 0 && (
            <ol className="flex flex-col gap-3">
              {entries.map((e) => (
                <li key={e.id} className="rounded-lg border border-line bg-bg p-3 text-[12px]">
                  <div className="flex flex-wrap items-center gap-2">
                    <StatusTransition previous={e.previous_status} next={e.new_status} />
                    <span className="text-ink-40">·</span>
                    <time className="text-ink-60">{formatTurkishDateTime(e.changed_at)}</time>
                  </div>
                  <dl className="mt-2 grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-[11px] text-ink-60">
                    <dt className="text-ink-40">Neden</dt>
                    <dd>{mapChangeReason(e.change_reason)}</dd>
                    <dt className="text-ink-40">Versiyon</dt>
                    <dd>v{e.version}</dd>
                    {e.ip_addr && (
                      <>
                        <dt className="text-ink-40">IP</dt>
                        <dd className="font-mono">{e.ip_addr}</dd>
                      </>
                    )}
                    {e.user_agent && (
                      <>
                        <dt className="text-ink-40">Tarayıcı</dt>
                        <dd className="truncate" title={e.user_agent}>
                          {e.user_agent}
                        </dd>
                      </>
                    )}
                  </dl>
                </li>
              ))}
            </ol>
          )}
        </div>
      </aside>
    </div>
  );
}

function StatusTransition({ previous, next }: { previous: ConsentStatus | null; next: ConsentStatus }) {
  return (
    <span className="inline-flex items-center gap-1 text-[11px] font-medium text-ink-80">
      <span>{consentStatusLabel(previous)}</span>
      <ChevronRight className="h-3 w-3 text-ink-40" />
      <span>{consentStatusLabel(next)}</span>
    </span>
  );
}
