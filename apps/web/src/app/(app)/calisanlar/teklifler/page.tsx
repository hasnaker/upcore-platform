'use client';

import { useState } from 'react';
import Link from 'next/link';
import {
  ArrowRight,
  Briefcase,
  CheckCircle2,
  Clock,
  Download,
  FileCheck,
  Loader2,
  Mail,
  RefreshCw,
  UserPlus,
  XCircle,
} from 'lucide-react';
import { toast } from 'sonner';

import { useOffers, useTriggerOnboarding, type OfferLetter, type OfferStatus } from '@/hooks/useOffers';

const STATUS_META: Record<string, { label: string; tone: string }> = {
  draft: { label: 'Taslak', tone: 'bg-bg-2 text-ink-60' },
  sent: { label: 'Gönderildi', tone: 'bg-blue-50 text-blue-700' },
  viewed: { label: 'Görüntülendi', tone: 'bg-blue-50 text-blue-700' },
  accepted: { label: 'Kabul Edildi', tone: 'bg-green-soft text-green' },
  declined: { label: 'Reddedildi', tone: 'bg-red-soft text-red' },
  revoked: { label: 'Geri Çekildi', tone: 'bg-amber-soft text-amber' },
  expired: { label: 'Süresi Doldu', tone: 'bg-amber-soft text-amber' },
};

export default function TekliflerPage() {
  const [status, setStatus] = useState<string>('');
  const offers = useOffers({ status: (status || undefined) as OfferStatus | undefined, page: 0, limit: 50 });
  const [onboardOfferId, setOnboardOfferId] = useState<string | null>(null);

  const items = offers.data?.items ?? [];

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-ink">Teklif Mektupları</h1>
          <p className="mt-1 text-sm text-ink-60">
            Aday tekliflerini takip et, kabul edilen offer için "Personel'e Çevir" ile onboarding
            saga'yı tetikle (offer accept → employee create → onboarding → career event).
          </p>
        </div>
        <button
          type="button"
          onClick={() => offers.refetch()}
          className="inline-flex items-center gap-1.5 rounded-md border border-line bg-bg px-3 py-1.5 text-[12px] font-medium text-ink-60 hover:border-ink-20"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${offers.isFetching ? 'animate-spin' : ''}`} />
          Yenile
        </button>
      </div>

      <div className="flex flex-wrap gap-2">
        {['', 'accepted', 'sent', 'viewed', 'declined', 'revoked'].map((s) => (
          <button
            key={s || 'all'}
            type="button"
            onClick={() => setStatus(s)}
            className={`rounded-md px-3 py-1.5 text-[12px] font-medium transition-colors ${
              status === s
                ? 'bg-accent text-white'
                : 'border border-line bg-bg text-ink-60 hover:border-ink-20'
            }`}
          >
            {s === '' ? 'Tümü' : STATUS_META[s]?.label ?? s}
          </button>
        ))}
      </div>

      <section className="rounded-xl border border-line bg-bg">
        {offers.isLoading ? (
          <div className="flex items-center justify-center gap-2 p-10 text-sm text-ink-60">
            <Loader2 className="h-4 w-4 animate-spin" /> Yükleniyor…
          </div>
        ) : items.length === 0 ? (
          <div className="flex flex-col items-center gap-2 p-10 text-center">
            <Briefcase className="h-8 w-8 text-ink-40" />
            <p className="text-sm font-medium text-ink">Teklif yok</p>
            <p className="text-[12px] text-ink-40">
              ATS modülünden aday seçip teklif oluşturabilirsin.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-[12px]">
              <thead className="bg-bg-2 text-[10px] uppercase tracking-widest text-ink-40">
                <tr>
                  <th className="p-3 text-left">Aday</th>
                  <th className="p-3 text-left">Pozisyon</th>
                  <th className="p-3 text-right">Maaş</th>
                  <th className="p-3 text-left">Başlangıç</th>
                  <th className="p-3 text-left">Durum</th>
                  <th className="p-3 text-right">Aksiyon</th>
                </tr>
              </thead>
              <tbody>
                {items.map((o) => {
                  const meta = STATUS_META[o.status] ?? { label: o.status, tone: 'bg-bg-2 text-ink-60' };
                  return (
                    <tr key={o.id} className="border-t border-line hover:bg-bg-2">
                      <td className="p-3">
                        <p className="font-medium text-ink">{o.ad_soyad}</p>
                        <p className="flex items-center gap-1 text-[11px] text-ink-60">
                          <Mail className="h-3 w-3" />
                          {o.email}
                        </p>
                      </td>
                      <td className="p-3 text-ink-60">{o.position_title}</td>
                      <td className="p-3 text-right font-medium tabular-nums text-ink">
                        {o.salary_brut
                          ? new Intl.NumberFormat('tr-TR', {
                              style: 'currency',
                              currency: o.salary_currency || 'TRY',
                              maximumFractionDigits: 0,
                            }).format(o.salary_brut)
                          : '—'}
                      </td>
                      <td className="p-3 text-[11px] text-ink-60">
                        {new Date(o.start_date).toLocaleDateString('tr-TR')}
                      </td>
                      <td className="p-3">
                        <span
                          className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium ${meta.tone}`}
                        >
                          {meta.label}
                        </span>
                      </td>
                      <td className="p-3 text-right">
                        <button
                          type="button"
                          onClick={async () => {
                            try {
                              const r = await fetch(`/api/v1/offers/${o.id}/pdf`);
                              if (!r.ok) throw new Error(`HTTP ${r.status}`);
                              const blob = await r.blob();
                              const url = URL.createObjectURL(blob);
                              const a = document.createElement('a');
                              a.href = url;
                              a.download = `teklif_${o.ad_soyad.replace(/\s+/g, '_')}.pdf`;
                              a.click();
                              URL.revokeObjectURL(url);
                            } catch (err) {
                              toast.error(`PDF indirilemedi: ${String(err)}`);
                            }
                          }}
                          className="mr-2 inline-flex items-center gap-1 rounded-md border border-line bg-bg px-2.5 py-1 text-[11px] font-medium text-ink-60 hover:border-ink-20"
                        >
                          <Download className="h-3 w-3" />
                          PDF
                        </button>
                        {o.status === 'accepted' && !o.employee_id ? (
                          <button
                            type="button"
                            onClick={() => setOnboardOfferId(o.id)}
                            className="inline-flex items-center gap-1 rounded-md bg-[#0A0A0A] px-2.5 py-1 text-[11px] font-medium text-white hover:bg-[#333]"
                          >
                            <UserPlus className="h-3 w-3" />
                            Personel'e Çevir
                          </button>
                        ) : o.employee_id ? (
                          <Link
                            href={`/calisanlar/${o.employee_id}`}
                            className="inline-flex items-center gap-1 rounded-md border border-line bg-bg px-2.5 py-1 text-[11px] font-medium text-ink-60 hover:border-ink-20"
                          >
                            Çalışan →
                          </Link>
                        ) : (
                          <span className="text-[11px] text-ink-40">—</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <div className="rounded-md border border-accent/30 bg-accent-soft p-3 text-[11px] text-accent">
        <p className="font-semibold">Onboarding saga nasıl çalışır?</p>
        <p className="mt-1 text-ink-80">
          "Personel'e Çevir" butonu <code>onboarding_v1</code> saga'sını tetikler. 4 adım: offer
          accept → employee create → onboarding checklist → career event (hire). Herhangi bir
          adım başarısız olursa compensation chain devreye girer (employee soft-delete, offer
          revoke). Çalıştırılan saga'lar <Link className="underline" href="/ayarlar/saga">Ayarlar
          → Saga Orchestrator</Link> sayfasından izlenebilir.
        </p>
      </div>

      {onboardOfferId ? (
        <OnboardModal
          offer={items.find((i) => i.id === onboardOfferId)!}
          onClose={() => setOnboardOfferId(null)}
        />
      ) : null}
    </div>
  );
}

function OnboardModal({ offer, onClose }: { offer: OfferLetter; onClose: () => void }) {
  const trigger = useTriggerOnboarding(offer.id);
  const [employeeNo, setEmployeeNo] = useState(suggestEmployeeNo(offer));
  const [templateName, setTemplateName] = useState('standard_v1');
  const [hireDate, setHireDate] = useState(
    offer.start_date ? offer.start_date.slice(0, 10) : new Date().toISOString().slice(0, 10),
  );

  const canSubmit = employeeNo.trim().length > 0 && hireDate.length > 0;

  const submit = async () => {
    try {
      const res = await trigger.mutateAsync({
        employee_no: employeeNo.trim(),
        template_name: templateName,
        hire_date: hireDate,
      });
      toast.success(
        res.status === 'completed'
          ? `Saga tamamlandı: ${res.current_step}/${res.total_steps} adım başarılı`
          : `Saga başlatıldı (status: ${res.status})`,
      );
      onClose();
    } catch (err) {
      toast.error(`Saga başarısız: ${String(err)}`);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-lg rounded-xl border border-line bg-bg p-5 shadow-xl">
        <div className="flex items-start justify-between">
          <div>
            <h3 className="flex items-center gap-2 text-sm font-semibold text-ink">
              <UserPlus className="h-4 w-4" />
              Personel'e Çevir
            </h3>
            <p className="text-[12px] text-ink-60">
              Onboarding saga: offer accept → employee create → onboarding → career event
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md p-1 text-ink-40 hover:bg-bg-2 hover:text-ink"
          >
            <XCircle className="h-4 w-4" />
          </button>
        </div>

        <div className="mt-3 rounded-md border border-line bg-bg-2 p-3 text-[12px]">
          <p>
            <strong>Aday:</strong> {offer.ad_soyad}
          </p>
          <p>
            <strong>Pozisyon:</strong> {offer.position_title}
          </p>
          <p className="mt-1 flex items-center gap-1 text-ink-60">
            <CheckCircle2 className="h-3 w-3 text-green" />
            Teklif kabul edildi (
            {offer.decided_at ? new Date(offer.decided_at).toLocaleDateString('tr-TR') : '—'})
          </p>
        </div>

        <div className="mt-4 flex flex-col gap-3">
          <label className="block">
            <span className="mb-1 block text-[11px] font-medium uppercase tracking-wider text-ink-40">
              Personel Numarası
            </span>
            <input
              value={employeeNo}
              onChange={(e) => setEmployeeNo(e.target.value)}
              className="w-full rounded-md border border-line bg-bg px-2 py-1.5 font-mono text-sm"
            />
          </label>
          <label className="block">
            <span className="mb-1 block text-[11px] font-medium uppercase tracking-wider text-ink-40">
              Onboarding Şablonu
            </span>
            <select
              value={templateName}
              onChange={(e) => setTemplateName(e.target.value)}
              className="w-full rounded-md border border-line bg-bg px-2 py-1.5 text-sm"
            >
              <option value="standard_v1">Standart (14 gün)</option>
              <option value="executive_v1">Yönetici (30 gün)</option>
              <option value="technical_v1">Teknik (21 gün)</option>
              <option value="remote_v1">Remote (14 gün)</option>
            </select>
          </label>
          <label className="block">
            <span className="mb-1 block text-[11px] font-medium uppercase tracking-wider text-ink-40">
              İşe Başlama Tarihi
            </span>
            <input
              type="date"
              value={hireDate}
              onChange={(e) => setHireDate(e.target.value)}
              className="w-full rounded-md border border-line bg-bg px-2 py-1.5 text-sm"
            />
          </label>
        </div>

        <div className="mt-4 flex items-center gap-2 rounded-md border border-amber/30 bg-amber-soft p-2 text-[11px] text-amber">
          <Clock className="h-3 w-3 shrink-0" />
          Saga çalışma süresi ~2-5 saniye. Hata durumunda değişiklikler otomatik geri alınır.
        </div>

        {trigger.error ? (
          <p className="mt-3 text-xs text-red">{trigger.error.message}</p>
        ) : null}

        <div className="mt-4 flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="rounded-md border border-line bg-bg px-3 py-2 text-sm font-medium text-ink-60 hover:bg-bg-2"
          >
            İptal
          </button>
          <button
            type="button"
            onClick={submit}
            disabled={!canSubmit || trigger.isPending}
            className="inline-flex items-center gap-2 rounded-md bg-[#0A0A0A] px-3 py-2 text-sm font-medium text-white hover:bg-[#333] disabled:opacity-50"
          >
            {trigger.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <>
                <FileCheck className="h-4 w-4" />
                Saga'yı Başlat
                <ArrowRight className="h-3 w-3" />
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

function suggestEmployeeNo(offer: OfferLetter): string {
  const parts = offer.ad_soyad.trim().split(/\s+/);
  const initials = parts
    .map((p) => p[0]?.toUpperCase() ?? '')
    .join('')
    .slice(0, 3);
  const year = new Date().getFullYear();
  return `${initials}-${year}-${offer.id.slice(0, 4).toUpperCase()}`;
}
