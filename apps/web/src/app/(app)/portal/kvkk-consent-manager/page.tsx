'use client';

/**
 * KVKK Rıza Yönetimi sayfası — shell.
 *
 * Tüm görsel ve veri-erişim mantığı `_components/` altında modüllere
 * ayrıldı:
 *   - types.ts            → tip re-exportları + format helpers
 *   - hooks.ts            → useConsentDecisions + usePrivacyAcceptance
 *   - ConsentCard.tsx     → tek rıza kartı + switch + status badge
 *   - AydinlatmaDialog.tsx → açık rıza beyanı modalı
 *   - HistoryDrawer.tsx   → değişiklik geçmişi drawer'ı
 *
 * Bu shell sadece state aggregation + layout yapar. Kural: shell <300 satır.
 */

import { useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, FileText, Info, Shield, ShieldCheck, XCircle } from 'lucide-react';
import { toast } from 'sonner';

import type { ConsentCatalogEntry, ConsentType } from './_components/types';
import {
  useKvkkConsents,
  useUpsertKvkkConsent,
  useConsentDecisions,
  usePrivacyAcceptance,
} from './_components/hooks';
import { ConsentCard } from './_components/ConsentCard';
import { AydinlatmaDialog } from './_components/AydinlatmaDialog';
import { HistoryDrawer } from './_components/HistoryDrawer';

export default function KvkkConsentManagerPage() {
  const consentsQuery = useKvkkConsents();
  const upsertMutation = useUpsertKvkkConsent();
  const privacy = usePrivacyAcceptance();

  const [historyType, setHistoryType] = useState<ConsentType | null>(null);

  const catalog = consentsQuery.data?.catalog ?? [];
  const decisions = useConsentDecisions(consentsQuery.data?.consents);

  const handleToggle = (entry: ConsentCatalogEntry, nextChecked: boolean) => {
    if (entry.required && !nextChecked) {
      toast.error('Bu rıza KVKK kapsamında zorunludur ve kapatılamaz.');
      return;
    }
    upsertMutation.mutate(
      {
        consent_type: entry.type,
        status: nextChecked ? 'granted' : 'declined',
        metadata: { source: 'portal.kvkk_consent_manager', locale: 'tr-TR' },
      },
      {
        onSuccess: (data) => {
          toast.success(
            data.status === 'granted'
              ? `${entry.title_tr}: rızanız kaydedildi.`
              : data.status === 'revoked'
                ? `${entry.title_tr}: rızanız geri çekildi.`
                : `${entry.title_tr}: rıza reddedildi.`,
          );
        },
        onError: (err) => {
          toast.error(`Kaydedilemedi: ${err.message || 'Sunucu hatası'}. Lütfen tekrar deneyin.`);
        },
      },
    );
  };

  return (
    <div className="flex flex-col gap-6">
      <div>
        <Link
          href="/portal"
          className="inline-flex items-center gap-1 text-[12px] text-ink-40 hover:underline"
        >
          <ArrowLeft className="h-3 w-3" />
          Portal
        </Link>
        <h1 className="mt-2 flex items-center gap-2 text-2xl font-semibold text-ink">
          <Shield className="h-5 w-5" />
          KVKK Rıza Yönetimi
        </h1>
        <p className="mt-1 max-w-3xl text-sm text-ink-60">
          Kişisel verilerinizin UpCore platformu tarafından hangi amaçlarla işleneceğine buradan
          karar verirsiniz. Her tercih değişikliği KVKK Madde 28 kapsamında denetim kaydına alınır
          (IP adresi + tarih + tarayıcı bilgisi). Rızanızı istediğiniz zaman geri çekebilirsiniz.
        </p>
      </div>

      <section className="flex items-start gap-3 rounded-xl border border-accent/30 bg-accent-soft p-4 text-[12px] text-accent">
        <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0" />
        <div>
          <p className="font-semibold">Aydınlatma metni ve yasal dayanak</p>
          <p className="mt-1 text-ink-80">
            UpCore, 6698 sayılı KVKK kapsamında veri sorumlusudur. Kişisel verileriniz aşağıda
            listelenen amaçlarla işlenir. İtiraz, erişim, düzeltme, silme haklarınız için{' '}
            <Link href="/portal" className="underline">
              KVKK Başvuru Portalı
            </Link>
            &apos;nı kullanabilirsiniz.
          </p>
          <button
            type="button"
            onClick={privacy.open}
            className="mt-2 inline-flex items-center gap-1 text-[12px] font-medium underline underline-offset-2"
          >
            <FileText className="h-3 w-3" />
            Tam metni oku
          </button>
        </div>
      </section>

      {consentsQuery.isLoading ? (
        <div
          aria-label="Rızalar yükleniyor"
          className="flex flex-col gap-3"
          data-testid="consents-loading"
        >
          {[0, 1, 2, 3, 4].map((i) => (
            <div key={i} className="h-24 animate-pulse rounded-xl border border-line bg-bg" />
          ))}
        </div>
      ) : consentsQuery.isError ? (
        <div
          role="alert"
          className="flex items-start gap-3 rounded-xl border border-red/40 bg-red-soft p-4 text-[13px] text-red"
        >
          <XCircle className="mt-0.5 h-4 w-4 shrink-0" />
          <div className="flex-1">
            <p className="font-semibold">Rızalarınız yüklenemedi</p>
            <p className="mt-1 text-ink-80">
              {consentsQuery.error?.message ?? 'Bilinmeyen hata'} — internet bağlantınızı kontrol
              edip tekrar deneyin.
            </p>
            <button
              type="button"
              onClick={() => consentsQuery.refetch()}
              className="mt-2 inline-flex items-center gap-1 rounded-md bg-red px-3 py-1.5 text-[12px] font-medium text-white hover:bg-red/90"
            >
              Tekrar dene
            </button>
          </div>
        </div>
      ) : catalog.length === 0 ? (
        <div className="rounded-xl border border-line bg-bg p-8 text-center text-sm text-ink-60">
          <Info className="mx-auto mb-2 h-6 w-6 text-ink-40" />
          Rıza kataloğu boş. Lütfen sistem yöneticiyle iletişime geçin.
        </div>
      ) : (
        <ul className="flex flex-col gap-3">
          {catalog.map((entry) => {
            const decision = decisions.get(entry.type);
            const checked = decision?.status === 'granted';
            return (
              <li key={entry.type}>
                <ConsentCard
                  entry={entry}
                  decision={decision}
                  checked={checked}
                  disabled={upsertMutation.isPending || privacy.showModal || entry.required}
                  onToggle={(next) => handleToggle(entry, next)}
                  onOpenHistory={() => setHistoryType(entry.type)}
                />
              </li>
            );
          })}
        </ul>
      )}

      {historyType && (
        <HistoryDrawer
          consentType={historyType}
          title={catalog.find((c) => c.type === historyType)?.title_tr ?? historyType}
          onClose={() => setHistoryType(null)}
        />
      )}

      {privacy.showModal && (
        <AydinlatmaDialog
          onAccept={() => {
            privacy.accept();
            toast.success('Aydınlatma metni kabul edildi.');
          }}
          onDecline={() => {
            privacy.decline();
            toast.info('Aydınlatma metnini kabul etmeden rıza kararlarınızı değiştiremezsiniz.');
          }}
        />
      )}
    </div>
  );
}
