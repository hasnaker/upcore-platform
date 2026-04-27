'use client';

import { use, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { toast } from 'sonner';
import {
  BookOpen,
  Check,
  ChevronLeft,
  Clock,
  ExternalLink,
  FlaskConical,
  Heart,
  Lock,
  ShieldCheck,
  X,
} from 'lucide-react';
import { ApiError } from '@/lib/api-client';
import {
  statusMeta,
  useAssignment,
  useCatalogItem,
  useSubmitConsent,
  type AssignmentStatus,
  type ConsentAction,
} from '@/hooks/useConsent';
import {
  CATEGORY_LABEL,
  TIER_LABEL,
  type EvidenceTier,
} from '@/hooks/useInterventions';

interface Props {
  params: Promise<{ assignmentId: string }>;
}

const TIER_TONE: Record<EvidenceTier, string> = {
  A: 'bg-green-soft text-green',
  B: 'bg-accent-soft text-accent',
  C: 'bg-amber-soft text-amber',
};

const TONE_CLASS: Record<
  ReturnType<typeof statusMeta>['tone'],
  string
> = {
  amber: 'bg-amber-soft text-amber',
  green: 'bg-green-soft text-green',
  red: 'bg-red-soft text-red',
  gray: 'bg-bg-3 text-ink-60',
  accent: 'bg-accent-soft text-accent',
};

/**
 * Çalışan consent sayfası — ÇK`ya atanan bir müdahale için:
 *  - Müdahale detayı (bilimsel dayanak, süre, beklenen etki).
 *  - 3 buton: Kabul / Red / Daha sonra.
 *  - Ret gerekçesi (opsiyonel) + KVKK açık rıza checkbox.
 *  - Backend ownership check: assignment başkasına aitse 403 → erişim reddi.
 *
 * URL kalıbı: `/portal/muhadale/[assignmentId]`.
 */
export default function ConsentPage({ params }: Props) {
  const { assignmentId } = use(params);
  const router = useRouter();

  const assignmentQ = useAssignment(assignmentId);
  const catalogQ = useCatalogItem(assignmentQ.data?.intervention_id);
  const submit = useSubmitConsent();

  const [reason, setReason] = useState('');
  const [agreeKVKK, setAgreeKVKK] = useState(false);

  const meta = useMemo(() => {
    const s = assignmentQ.data?.status;
    return s ? statusMeta(s) : null;
  }, [assignmentQ.data?.status]);

  // Handle forbidden (wrong user)
  if (assignmentQ.error instanceof ApiError && assignmentQ.error.status === 403) {
    return <ForbiddenCard />;
  }
  if (assignmentQ.error instanceof ApiError && assignmentQ.error.status === 404) {
    return <NotFoundCard />;
  }

  if (assignmentQ.isLoading) {
    return <LoadingSkeleton />;
  }

  if (assignmentQ.isError || !assignmentQ.data) {
    return (
      <div className="rounded-xl border border-line bg-bg p-6">
        <h1 className="text-lg font-semibold text-ink">Yüklenemedi</h1>
        <p className="mt-2 text-sm text-ink-60">
          {assignmentQ.error?.message ?? 'Bilinmeyen hata'}
        </p>
      </div>
    );
  }

  const a = assignmentQ.data;
  const interv = catalogQ.data ?? a.catalog;
  const isTerminal: AssignmentStatus[] = ['declined', 'completed', 'cancelled', 'lapsed'];
  const alreadyAnswered =
    a.status !== 'assigned' || (a.status === 'assigned' && !!a.accepted_at);
  const locked = alreadyAnswered || isTerminal.includes(a.status);

  const doSubmit = async (action: ConsentAction) => {
    if (action !== 'declined' && !agreeKVKK) {
      toast.error('KVKK açık rıza onay kutusunu işaretlemelisin.');
      return;
    }
    try {
      await submit.mutateAsync({
        assignmentId,
        action,
        reason: action === 'declined' ? reason : undefined,
      });
      const label =
        action === 'granted'
          ? 'Müdahaleyi kabul ettin.'
          : action === 'declined'
            ? 'Müdahale reddedildi.'
            : 'Daha sonra karar vereceksin.';
      toast.success(label, {
        description: 'Yanıtın İK ekibine iletildi.',
        icon: <Check className="h-4 w-4" />,
      });
      router.push('/portal');
    } catch (err: unknown) {
      toast.error('Kayıt başarısız', {
        description: err instanceof Error ? err.message : 'Tekrar deneyin',
      });
    }
  };

  const onLater = () => {
    toast.info('İstediğin zaman e-postadaki bağlantıyı tekrar kullanabilirsin.');
    router.push('/portal');
  };

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-5">
      <Link
        href="/portal"
        className="inline-flex w-fit items-center gap-1 text-[12px] text-ink-60 hover:text-ink"
      >
        <ChevronLeft className="h-3.5 w-3.5" /> Portal'a dön
      </Link>

      {/* Üst başlık */}
      <div className="rounded-xl border border-line bg-bg p-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex-1">
            <p className="text-[11px] font-semibold uppercase tracking-widest text-ink-40">
              Sana özel bilim-temelli öneri
            </p>
            <h1 className="mt-1 text-xl font-semibold text-ink">
              {interv?.title_tr ?? 'Müdahale'}
            </h1>
            <p className="mt-2 text-sm text-ink-60">
              İK ekibi tükenmişlik risk sinyaline dayanarak bu müdahaleyi önerdi.
              Kabul etmek <strong>senin onayına</strong> bağlıdır — zorunlu değildir.
            </p>
          </div>
          {meta && (
            <span
              className={`inline-flex h-6 items-center rounded-full px-2 text-[11px] font-semibold ${TONE_CLASS[meta.tone]}`}
            >
              {meta.label}
            </span>
          )}
        </div>
      </div>

      {/* Bilimsel detay kartı */}
      {interv && (
        <div className="grid gap-4 rounded-xl border border-line bg-bg p-6">
          <div className="flex flex-wrap items-center gap-2">
            <span
              className={`inline-flex h-5 items-center rounded px-1.5 text-[10px] font-semibold ${TIER_TONE[interv.evidence_tier]}`}
            >
              {TIER_LABEL[interv.evidence_tier]}
            </span>
            <span className="inline-flex h-5 items-center rounded bg-bg-3 px-1.5 text-[10px] font-medium text-ink-60">
              {CATEGORY_LABEL[interv.category]}
            </span>
            {interv.delivery_mode && (
              <span className="inline-flex h-5 items-center rounded bg-bg-3 px-1.5 text-[10px] font-medium text-ink-60">
                {interv.delivery_mode}
              </span>
            )}
          </div>

          <p className="text-sm leading-relaxed text-ink">
            {interv.description_tr}
          </p>

          <div className="grid grid-cols-2 gap-3 rounded-lg bg-bg-2 p-4 md:grid-cols-4">
            <MetricCell
              icon={<Clock className="h-3.5 w-3.5" />}
              label="Süre"
              value={interv.duration_weeks ? `${interv.duration_weeks} hafta` : '—'}
            />
            <MetricCell
              icon={<FlaskConical className="h-3.5 w-3.5" />}
              label="Etki başlama"
              value={interv.time_to_effect_weeks ? `${interv.time_to_effect_weeks} hf` : '—'}
            />
            <MetricCell
              icon={<Heart className="h-3.5 w-3.5" />}
              label="Beklenen etki (d)"
              value={
                interv.expected_effect_size != null
                  ? interv.expected_effect_size.toFixed(2)
                  : '—'
              }
            />
            <MetricCell
              icon={<BookOpen className="h-3.5 w-3.5" />}
              label="Kanıt seviyesi"
              value={`Tier ${interv.evidence_tier}`}
            />
          </div>

          {/* Bilimsel dayanak linki */}
          <div className="rounded-lg border border-accent/30 bg-accent-soft p-4 text-[12px] text-accent">
            <div className="mb-1 flex items-center gap-2 font-semibold">
              <BookOpen className="h-3.5 w-3.5" />
              Bilimsel dayanak
            </div>
            <p className="text-ink-80">
              Bu müdahale meta-analizler ve randomize kontrollü çalışmalarla
              desteklenmektedir. Detay için:
            </p>
            <a
              href="https://doi.org/10.1080/02678370500385913"
              target="_blank"
              rel="noreferrer"
              className="mt-1 inline-flex items-center gap-1 text-accent underline"
            >
              JD-R Model — Bakker &amp; Demerouti (2007){' '}
              <ExternalLink className="h-3 w-3" />
            </a>
          </div>
        </div>
      )}

      {/* Sorumluluklar */}
      <div className="rounded-xl border border-line bg-bg p-6">
        <h2 className="mb-3 text-sm font-semibold text-ink">Sorumluluklar ve gizlilik</h2>
        <ul className="grid gap-2 text-[13px] text-ink-80">
          <li className="flex items-start gap-2">
            <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-green" />
            Bireysel yanıtların <strong>yalnızca</strong> İK ve bilim ekibiyle
            paylaşılır; yöneticine iletilmez.
          </li>
          <li className="flex items-start gap-2">
            <Lock className="mt-0.5 h-4 w-4 shrink-0 text-accent" />
            Katılımı istediğin zaman geri çekebilirsin (KVKK Md. 11).
          </li>
          <li className="flex items-start gap-2">
            <Clock className="mt-0.5 h-4 w-4 shrink-0 text-amber" />
            Süre: {interv?.duration_weeks ?? '—'} hafta, haftalık ~30 dk taahhüt.
          </li>
        </ul>
      </div>

      {locked ? (
        <AlreadyAnsweredCard status={a.status} acceptedAt={a.accepted_at} />
      ) : (
        <div className="flex flex-col gap-4 rounded-xl border border-line bg-bg p-6">
          {/* Ret gerekçesi */}
          <label className="flex flex-col gap-1.5">
            <span className="text-[11px] font-medium uppercase tracking-widest text-ink-40">
              Ret gerekçesi (opsiyonel — İK'nın uygunluğu ayarlamasına yardımcı olur)
            </span>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Örn: Q4 kapanışındayım, Ocak sonrası başlayabilirim."
              rows={3}
              className="rounded-md border border-line bg-bg p-2 text-sm text-ink placeholder:text-ink-40 focus:border-accent focus:outline-none"
            />
          </label>

          {/* KVKK açık rıza */}
          <label className="flex items-start gap-2 rounded-md bg-bg-2 p-3">
            <input
              type="checkbox"
              checked={agreeKVKK}
              onChange={(e) => setAgreeKVKK(e.target.checked)}
              className="mt-0.5 h-4 w-4 accent-accent"
            />
            <span className="text-[12px] leading-relaxed text-ink-80">
              <strong>KVKK açık rıza:</strong> Bu müdahale süresince
              tükenmişlik, iş yükü ve destek ölçümlerinin toplanmasına, İK ve
              bilim ekibi tarafından anonim biçimde analiz edilmesine rıza
              gösteriyorum. Verilerim 7 yıl KVKK kapsamında saklanacak; istediğim
              zaman geri çekebilirim.{' '}
              <Link href="/kvkk/aydinlatma" className="text-accent underline">
                Aydınlatma metni
              </Link>
              .
            </span>
          </label>

          <div className="flex flex-wrap items-center justify-between gap-2">
            <button
              type="button"
              onClick={onLater}
              className="inline-flex items-center gap-1.5 rounded-md border border-line bg-bg px-4 py-2 text-[13px] font-medium text-ink-80 hover:bg-bg-2"
              disabled={submit.isPending}
            >
              <Clock className="h-3.5 w-3.5" />
              Daha sonra kararla
            </button>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => doSubmit('declined')}
                disabled={submit.isPending}
                className="inline-flex items-center gap-1.5 rounded-md border border-red/30 bg-bg px-4 py-2 text-[13px] font-semibold text-red hover:bg-red-soft disabled:opacity-50"
              >
                <X className="h-3.5 w-3.5" />
                Reddediyorum
              </button>
              <button
                type="button"
                onClick={() => doSubmit('granted')}
                disabled={submit.isPending || !agreeKVKK}
                className="inline-flex items-center gap-1.5 rounded-md bg-accent px-5 py-2 text-[13px] font-semibold text-white transition-colors hover:bg-accent/90 disabled:opacity-50"
              >
                <Check className="h-3.5 w-3.5" />
                {submit.isPending ? 'Kaydediliyor…' : 'Kabul ediyorum'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ---------- subcomponents ----------

function LoadingSkeleton() {
  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-4">
      <div className="h-24 animate-pulse rounded-xl border border-line bg-bg-2" />
      <div className="h-64 animate-pulse rounded-xl border border-line bg-bg-2" />
      <div className="h-32 animate-pulse rounded-xl border border-line bg-bg-2" />
    </div>
  );
}

function ForbiddenCard() {
  return (
    <div className="mx-auto max-w-xl rounded-xl border border-red/30 bg-red-soft p-6 text-center">
      <Lock className="mx-auto h-8 w-8 text-red" />
      <h1 className="mt-3 text-lg font-semibold text-ink">
        Bu sayfa sana ait değil
      </h1>
      <p className="mt-2 text-sm text-ink-60">
        Bu müdahale kararı başka bir çalışanın. E-postadaki bağlantıyı kendi
        hesabınla açmayı dene.
      </p>
      <Link
        href="/portal"
        className="mt-4 inline-flex items-center gap-1.5 rounded-md bg-accent px-4 py-2 text-[13px] font-semibold text-white"
      >
        Portal'a dön
      </Link>
    </div>
  );
}

function NotFoundCard() {
  return (
    <div className="mx-auto max-w-xl rounded-xl border border-line bg-bg p-6 text-center">
      <h1 className="text-lg font-semibold text-ink">Müdahale bulunamadı</h1>
      <p className="mt-2 text-sm text-ink-60">
        Bağlantı süresi dolmuş veya atama silinmiş olabilir. İK ekibinle iletişime
        geç.
      </p>
      <Link
        href="/portal"
        className="mt-4 inline-flex items-center gap-1.5 rounded-md bg-accent px-4 py-2 text-[13px] font-semibold text-white"
      >
        Portal'a dön
      </Link>
    </div>
  );
}

function AlreadyAnsweredCard({
  status,
  acceptedAt,
}: {
  status: AssignmentStatus;
  acceptedAt?: string | null;
}) {
  const meta = statusMeta(status);
  return (
    <div className="rounded-xl border border-line bg-bg-2 p-6 text-center">
      <div
        className={`mx-auto flex h-10 w-10 items-center justify-center rounded-full ${TONE_CLASS[meta.tone]}`}
      >
        {status === 'declined' ? (
          <X className="h-5 w-5" />
        ) : (
          <Check className="h-5 w-5" />
        )}
      </div>
      <h2 className="mt-3 text-lg font-semibold text-ink">Zaten cevapladın</h2>
      <p className="mt-1 text-sm text-ink-60">
        Durum: <strong>{meta.label}</strong>
        {acceptedAt ? ` — ${new Date(acceptedAt).toLocaleDateString('tr-TR')}` : ''}
      </p>
      <p className="mt-2 text-[12px] text-ink-40">
        Bu karar sonuçlanmıştır, yeni bir yanıt kabul edilmiyor.
      </p>
      <Link
        href="/portal"
        className="mt-4 inline-flex items-center gap-1.5 rounded-md bg-accent px-4 py-2 text-[13px] font-semibold text-white"
      >
        Portal'a dön
      </Link>
    </div>
  );
}

function MetricCell({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="flex flex-col">
      <div className="flex items-center gap-1 text-[10px] font-semibold uppercase tracking-widest text-ink-40">
        {icon} {label}
      </div>
      <div className="mt-1 text-sm font-semibold text-ink">{value}</div>
    </div>
  );
}
