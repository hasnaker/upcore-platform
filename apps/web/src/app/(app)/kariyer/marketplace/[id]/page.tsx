'use client';

import { useMemo, useState, use } from 'react';
import Link from 'next/link';
import { Briefcase, Calendar, MapPin, Sparkles, Lock, Send, CheckCircle2, XCircle, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';

import { useAuthMe } from '@/hooks/useAuthMe';
import {
  useOpportunityDetail,
  useOpportunityFit,
  useApplyOpportunity,
  useMyApplications,
  fitBadgeVariant,
  type ApplicationStatus,
} from '@/hooks/useMobility';

type Props = { params: Promise<{ id: string }> };

const OPP_TYPE_LABELS: Record<string, string> = {
  permanent: 'Kadrolu',
  rotation: 'Rotasyon',
  project: 'Proje',
  mentorship: 'Mentorluk',
  secondment: 'Geçici Atama',
};

const APP_STATUS_LABELS: Record<ApplicationStatus, string> = {
  applied: 'Gönderildi',
  under_review: 'İncelemede',
  shortlisted: 'Kısa liste',
  interview: 'Görüşmede',
  offered: 'Teklif yapıldı',
  accepted: 'Kabul edildi',
  rejected: 'Reddedildi',
  withdrawn: 'Geri çekildi',
};

function FitBadge({ score }: { score: number }) {
  const variant = fitBadgeVariant(score);
  const pct = Math.round(score * 100);
  const cls =
    variant === 'green'
      ? 'bg-green-soft text-green border-green/30'
      : variant === 'amber'
        ? 'bg-amber-soft text-amber border-amber/30'
        : 'bg-red-soft text-red border-red/30';
  const label =
    variant === 'green' ? 'Yüksek uyum' : variant === 'amber' ? 'Orta uyum' : 'Düşük uyum';
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-medium ${cls}`}
      aria-label={`JD-R uyum skoru ${pct} yüzde, ${label}`}
    >
      <Sparkles className="h-3 w-3" /> JD-R uyum %{pct} · {label}
    </span>
  );
}

function ApplicationStatusBadge({ status }: { status: ApplicationStatus }) {
  const label = APP_STATUS_LABELS[status] ?? status;
  const Icon =
    status === 'accepted'
      ? CheckCircle2
      : status === 'rejected' || status === 'withdrawn'
        ? XCircle
        : AlertTriangle;
  const cls =
    status === 'accepted'
      ? 'bg-green-soft text-green'
      : status === 'rejected'
        ? 'bg-red-soft text-red'
        : status === 'withdrawn'
          ? 'bg-ink-10 text-ink-60'
          : 'bg-accent-soft text-accent';
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium ${cls}`}>
      <Icon className="h-3 w-3" /> {label}
    </span>
  );
}

export default function OpportunityDetailPage({ params }: Props) {
  const { id } = use(params);
  const me = useAuthMe();
  const myId = me.data?.id ?? null;

  const oppQ = useOpportunityDetail(id);
  const fitQ = useOpportunityFit(id, myId);
  const appsQ = useMyApplications(myId);
  const applyMut = useApplyOpportunity(id);

  const [coverNote, setCoverNote] = useState('');
  const [skills, setSkills] = useState('');
  const [confidential, setConfidential] = useState(true);

  const existingApplication = useMemo(
    () => appsQ.data?.items.find((a) => a.opportunity_id === id) ?? null,
    [appsQ.data, id],
  );

  if (oppQ.isLoading) {
    return <div className="h-64 animate-pulse rounded-xl border border-line bg-bg" />;
  }
  if (oppQ.error || !oppQ.data) {
    return (
      <div className="rounded-xl border border-red/30 bg-red-soft p-6 text-sm text-red">
        Pozisyon yüklenemedi. <Link href="/kariyer/marketplace" className="underline">Geri dön</Link>
      </div>
    );
  }
  const o = oppQ.data;
  const closed = o.status !== 'open' || (o.closes_at ? new Date(o.closes_at) < new Date() : false);

  const handleApply = () => {
    applyMut.mutate(
      {
        cover_note: coverNote.trim() || undefined,
        candidate_skills: skills.split(',').map((s) => s.trim()).filter(Boolean),
        confidential,
      },
      {
        onSuccess: (res) => {
          const pct = res.match_score != null ? ` — eşleşme %${Math.round(res.match_score * 100)}` : '';
          toast.success(`Başvuru gönderildi${pct}`);
        },
        onError: (err) => {
          const status = (err as Error & { status?: number }).status;
          if (status === 409) {
            toast.error('Bu ilana zaten başvurmuşsunuz.');
          } else {
            toast.error(`Başvuru başarısız: ${err.message}`);
          }
        },
      },
    );
  };

  return (
    <div className="flex flex-col gap-6">
      <div>
        <Link href="/kariyer/marketplace" className="text-[12px] text-ink-40 hover:underline">
          ← Marketplace
        </Link>
        <div className="mt-2 flex items-start justify-between gap-4">
          <h1 className="text-2xl font-semibold text-ink">{o.title}</h1>
          <div className="flex flex-col items-end gap-1">
            {fitQ.data ? <FitBadge score={fitQ.data.score} /> : null}
            {existingApplication ? <ApplicationStatusBadge status={existingApplication.status} /> : null}
          </div>
        </div>
        <div className="mt-2 flex flex-wrap items-center gap-3 text-[12px] text-ink-60">
          <span className="flex items-center gap-1">
            <Briefcase className="h-3 w-3" />
            {OPP_TYPE_LABELS[o.opportunity_type] ?? o.opportunity_type}
          </span>
          {o.location ? (
            <span className="flex items-center gap-1">
              <MapPin className="h-3 w-3" />
              {o.location}
            </span>
          ) : null}
          {o.is_remote ? (
            <span className="rounded-full bg-green-soft px-2 py-0.5 text-[10px] font-medium text-green">
              Remote
            </span>
          ) : null}
          {o.closes_at ? (
            <span className="flex items-center gap-1">
              <Calendar className="h-3 w-3" />
              Son başvuru: {new Date(o.closes_at).toLocaleDateString('tr-TR')}
            </span>
          ) : null}
          {closed ? (
            <span className="rounded-full bg-red-soft px-2 py-0.5 text-[10px] font-medium text-red">
              Kapalı
            </span>
          ) : null}
        </div>
      </div>

      <section className="rounded-xl border border-line bg-bg p-5">
        <h2 className="text-[13px] font-semibold uppercase tracking-widest text-ink-40">Pozisyon Açıklaması</h2>
        {o.description ? (
          <p className="mt-3 whitespace-pre-line text-sm text-ink-80">{o.description}</p>
        ) : (
          <p className="mt-3 text-sm italic text-ink-40">Açıklama eklenmemiş.</p>
        )}
      </section>

      {o.required_skills?.length ? (
        <section className="rounded-xl border border-line bg-bg p-5">
          <h2 className="text-[13px] font-semibold uppercase tracking-widest text-ink-40">Gerekli Yetkinlikler</h2>
          <div className="mt-3 flex flex-wrap gap-2">
            {o.required_skills.map((s) => (
              <span key={s} className="rounded-full bg-bg-2 px-2.5 py-1 text-[11px] text-ink-60">
                {s}
              </span>
            ))}
          </div>
          {o.preferred_skills?.length ? (
            <>
              <h3 className="mt-4 text-[11px] uppercase tracking-widest text-ink-40">Tercih Edilen</h3>
              <div className="mt-2 flex flex-wrap gap-2">
                {o.preferred_skills.map((s) => (
                  <span
                    key={s}
                    className="rounded-full border border-dashed border-line px-2.5 py-1 text-[11px] text-ink-40"
                  >
                    {s}
                  </span>
                ))}
              </div>
            </>
          ) : null}
          {fitQ.data?.missing_skills?.length ? (
            <div className="mt-4 rounded-md border border-amber/30 bg-amber-soft p-3 text-[12px] text-amber">
              <p className="font-semibold">Gelişim önerisi</p>
              <p className="mt-1 text-ink-80">
                Bu pozisyon için henüz sahip olmadığınız yetkinlikler:{' '}
                <span className="font-medium">{fitQ.data.missing_skills.join(', ')}</span>
              </p>
            </div>
          ) : null}
        </section>
      ) : null}

      {existingApplication ? (
        <section className="rounded-xl border border-green/30 bg-green-soft p-5">
          <h2 className="flex items-center gap-2 text-[13px] font-semibold uppercase tracking-widest text-green">
            <CheckCircle2 className="h-3.5 w-3.5" />
            Başvurunuz alındı
          </h2>
          <p className="mt-2 text-[12px] text-ink-80">
            Başvuru tarihi:{' '}
            <span className="font-medium">
              {new Date(existingApplication.applied_at).toLocaleDateString('tr-TR')}
            </span>
            . Durum: <ApplicationStatusBadge status={existingApplication.status} />
          </p>
          <p className="mt-2 text-[12px] text-ink-60">
            Güncel durum için{' '}
            <Link href="/kariyer/basvurularim" className="font-medium underline">
              Başvurularım
            </Link>{' '}
            sayfasına göz atın.
          </p>
        </section>
      ) : (
        <section className="rounded-xl border border-accent/30 bg-accent-soft p-5">
          <h2 className="flex items-center gap-2 text-[13px] font-semibold uppercase tracking-widest text-accent">
            <Sparkles className="h-3.5 w-3.5" />
            Başvur
          </h2>
          <p className="mt-2 text-[12px] text-ink-80">
            AI eşleşme skoru yetkinliklerinize göre hesaplanır. Gizli başvuru seçili ise mevcut
            yöneticinize bildirilmez.
          </p>

          <div className="mt-4 flex flex-col gap-3">
            <label className="block">
              <span className="mb-1 block text-[11px] font-medium uppercase tracking-wider text-ink-40">
                Kısa Motivasyon Mektubu
              </span>
              <textarea
                value={coverNote}
                onChange={(e) => setCoverNote(e.target.value)}
                rows={4}
                className="w-full rounded-md border border-line bg-bg px-2 py-1.5 text-sm"
                placeholder="Bu rolde neden uygun olduğunuzu kısaca özetleyin…"
                data-testid="cover-note"
              />
            </label>
            <label className="block">
              <span className="mb-1 block text-[11px] font-medium uppercase tracking-wider text-ink-40">
                Yetkinlikleriniz (virgülle)
              </span>
              <input
                value={skills}
                onChange={(e) => setSkills(e.target.value)}
                placeholder="React, TypeScript, SaaS"
                className="w-full rounded-md border border-line bg-bg px-2 py-1.5 text-sm"
                data-testid="candidate-skills"
              />
            </label>
            <label className="flex items-center gap-2 text-[12px] text-ink-60">
              <input
                type="checkbox"
                checked={confidential}
                onChange={(e) => setConfidential(e.target.checked)}
                className="h-4 w-4 accent-[color:var(--color-accent)]"
                data-testid="confidential-toggle"
              />
              <Lock className="h-3 w-3" />
              Gizli başvuru (yöneticim görmez)
            </label>
          </div>

          <button
            type="button"
            onClick={handleApply}
            disabled={applyMut.isPending || closed || !myId}
            data-testid="apply-submit"
            className="mt-4 inline-flex items-center gap-2 rounded-md bg-[#0A0A0A] px-4 py-2 text-sm font-medium text-white hover:bg-[#333] disabled:opacity-50"
          >
            <Send className="h-4 w-4" />
            {applyMut.isPending ? 'Gönderiliyor…' : closed ? 'İlan kapalı' : 'Başvuruyu Gönder'}
          </button>
        </section>
      )}
    </div>
  );
}
