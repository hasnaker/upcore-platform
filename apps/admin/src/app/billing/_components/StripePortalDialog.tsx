'use client';

import { useEffect, useState } from 'react';
import { ExternalLink, Loader2, X } from 'lucide-react';

import { TenantAutocomplete } from './TenantAutocomplete';

interface Props {
  open: boolean;
  busy: boolean;
  onClose: () => void;
  onSubmit: (tenantId: string) => void;
}

export function StripePortalDialog({ open, busy, onClose, onSubmit }: Props) {
  const [tenantId, setTenantId] = useState<string>('');
  const [tenantLabel, setTenantLabel] = useState<string>('');

  useEffect(() => {
    if (!open) {
      setTenantId('');
      setTenantLabel('');
    }
  }, [open]);

  if (!open) {
    return null;
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="stripe-portal-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-md rounded-xl border border-line bg-bg p-5 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          onClick={onClose}
          aria-label="Kapat"
          className="absolute right-3 top-3 rounded-md p-1 text-ink-40 hover:bg-bg-2 hover:text-ink"
        >
          <X className="h-4 w-4" />
        </button>

        <h2 id="stripe-portal-title" className="text-lg font-semibold text-ink">
          Stripe Portalı aç
        </h2>
        <p className="mt-1 text-[12px] text-ink-60">
          Seçtiğin tenant'ın Stripe Customer Portal oturumu oluşturulur ve yeni sekmede açılır.
          Müşteri kart bilgilerini güncelleyebilir, fatura indirebilir.
        </p>

        <div className="mt-4">
          <label className="block text-[11px] font-medium uppercase tracking-wider text-ink-40">
            Tenant
          </label>
          <div className="mt-1.5">
            <TenantAutocomplete
              value={tenantId}
              label={tenantLabel}
              onSelect={(id, label) => {
                setTenantId(id);
                setTenantLabel(label);
              }}
            />
          </div>
          <p className="mt-1 text-[10px] text-ink-40">
            Sadece <code className="rounded bg-bg-2 px-1">provider=stripe</code> aboneliği olan
            tenantlar için portal sessiyonu üretilir.
          </p>
        </div>

        <div className="mt-5 flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="rounded-md border border-line bg-bg px-3 py-2 text-[13px] font-medium text-ink hover:border-accent"
          >
            Vazgeç
          </button>
          <button
            type="button"
            onClick={() => tenantId && onSubmit(tenantId)}
            disabled={!tenantId || busy}
            className="inline-flex items-center gap-1.5 rounded-md bg-accent px-3 py-2 text-[13px] font-semibold text-white hover:bg-accent/90 disabled:opacity-50"
          >
            {busy ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <ExternalLink className="h-3.5 w-3.5" />
            )}
            Portal oluştur
          </button>
        </div>
      </div>
    </div>
  );
}
