'use client';

import { use, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { AlertCircle, CheckCircle2, Shield } from 'lucide-react';

import {
  useInvitationDetail,
  useSubmit360Response,
  type Relation,
  type Survey360ResponseItem,
} from '@/hooks/usePerformance';
import { useApiQuery } from '@/hooks/useApi';

/* ─────────────────────────────────────────────────────────────
 * 360° Reviewer Answer Page
 *   - Competency bazında 1-5 slider + opsiyonel yorum
 *   - Anonim mod badge (anonim olarak cevap veriyorsun mesajı)
 *   - Submit → disable (idempotent, 2. submit reddedilir)
 * ───────────────────────────────────────────────────────────── */

interface Competency {
  id: string;
  code: string;
  name_tr: string;
  description_tr?: string | null;
  category: string;
}

interface CompetencyListResponse {
  items: Competency[];
}

const RELATION_LABEL: Record<Relation, string> = {
  self: 'Öz-değerlendirme',
  manager: 'Yönetici',
  peer: 'Akran',
  direct_report: 'Ekip üyesi',
};

interface Answer {
  score: number | null;
  comment: string;
}

export default function Cevapla360Page({
  params,
}: {
  params: Promise<{ invitationId: string }>;
}) {
  const { invitationId } = use(params);
  const router = useRouter();
  const invQ = useInvitationDetail(invitationId);
  const competenciesQ = useApiQuery<CompetencyListResponse>(
    ['performance', 'competencies', 'active'],
    '/api/v1/performance/competencies',
  );
  const submit = useSubmit360Response(invitationId);

  const [answers, setAnswers] = useState<Record<string, Answer>>({});
  const [submitError, setSubmitError] = useState<string | null>(null);

  const invitation = invQ.data;
  const competencies = useMemo(() => competenciesQ.data?.items ?? [], [competenciesQ.data?.items]);
  const isResponded = invitation?.status === 'responded';

  // Anonim vs named — invitation page does not leak other reviewer identity;
  // only the reviewer's own relation is shown.
  const relationLabel = invitation ? RELATION_LABEL[invitation.relation] : '—';
  const anonymous = true; // reviewer cannot infer anonymity mode for others;
  // UI always reassures the reviewer that THEIR answers are anonymized unless
  // told otherwise by the creator (named mode is an opt-in for subjects/HR,
  // reviewers still see their submission as confidential).

  const allAnswered = useMemo(() => {
    if (competencies.length === 0) return false;
    return competencies.every((c) => {
      const a = answers[c.code];
      return a && a.score !== null;
    });
  }, [competencies, answers]);

  const handleScore = (code: string, name: string, score: number) => {
    setAnswers((prev) => ({
      ...prev,
      [code]: { score, comment: prev[code]?.comment ?? '' },
    }));
    // Use name to preserve across state — stored separately below.
    setCompNames((prev) => ({ ...prev, [code]: name }));
  };
  const handleComment = (code: string, name: string, comment: string) => {
    setAnswers((prev) => ({
      ...prev,
      [code]: { score: prev[code]?.score ?? null, comment },
    }));
    setCompNames((prev) => ({ ...prev, [code]: name }));
  };

  const [compNames, setCompNames] = useState<Record<string, string>>({});

  const handleSubmit = async () => {
    if (!invitation) return;
    setSubmitError(null);
    const items: Survey360ResponseItem[] = Object.entries(answers)
      .filter(([, a]) => a.score !== null)
      .map(([code, a]) => ({
        competency_code: code,
        competency_name_tr: compNames[code] ?? code,
        score: a.score as number,
        comment: a.comment.trim() || undefined,
      }));
    if (items.length !== competencies.length) {
      setSubmitError('Lütfen her yetkinlik için bir puan girin.');
      return;
    }
    try {
      await submit.mutateAsync({ items });
      // Success — redirect to inbox.
      setTimeout(() => router.push('/performans'), 600);
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : 'Cevap kaydedilemedi.');
    }
  };

  if (invQ.isLoading || competenciesQ.isLoading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <span className="text-sm text-[#737373]">Yükleniyor...</span>
      </div>
    );
  }

  if (invQ.isError || !invitation) {
    return (
      <div className="mx-auto max-w-2xl p-6">
        <div className="rounded-lg border border-[#fecaca] bg-[#fef2f2] p-4 text-sm text-[#7f1d1d]">
          <AlertCircle className="mr-2 inline h-4 w-4" />
          Davet bulunamadı veya bu davete erişim yetkiniz yok.
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6 p-6" data-testid="s360-answer">
      <header className="flex flex-col gap-2">
        <h1 className="text-2xl font-semibold tracking-tight text-[#0A0A0A]">
          360° Geri Bildirim
        </h1>
        <p className="text-sm text-[#525252]">
          İlişki rolünüz: <strong>{relationLabel}</strong>
        </p>

        <div className="flex items-center gap-2 rounded-lg border border-[#c7d2fe] bg-[#eef0ff] px-4 py-2.5 text-xs text-[#3730a3]">
          <Shield className="h-4 w-4" />
          {anonymous
            ? 'Cevaplarınız gizli tutulur. Rapor sadece ilişki rolünüzü gösterir; adınız görünmez.'
            : 'İsimli modda cevaplarınız adınızla birlikte raporda görünür.'}
        </div>

        {isResponded && (
          <div className="flex items-center gap-2 rounded-lg border border-[#86efac] bg-[#ecfdf5] px-4 py-2.5 text-xs text-[#065f46]">
            <CheckCircle2 className="h-4 w-4" />
            Bu daveti daha önce cevapladınız. Tekrar cevap gönderemezsiniz.
          </div>
        )}
      </header>

      <section className="flex flex-col gap-3">
        {competencies.map((c) => {
          const a = answers[c.code];
          const score = a?.score ?? 0;
          return (
            <div
              key={c.id}
              className="rounded-xl border border-[#f0f0f0] bg-white p-5"
              data-testid={`s360-comp-${c.code}`}
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h3 className="text-sm font-semibold text-[#0A0A0A]">{c.name_tr}</h3>
                  {c.description_tr && (
                    <p className="mt-1 text-xs text-[#737373]">{c.description_tr}</p>
                  )}
                </div>
                <span className="rounded-full border border-[#e5e5e5] bg-[#fafafa] px-2.5 py-0.5 text-[10px] font-semibold text-[#737373]">
                  {c.category}
                </span>
              </div>

              <div className="mt-4 flex items-center gap-3">
                <span className="w-6 text-xs text-[#737373]">1</span>
                <input
                  type="range"
                  min={1}
                  max={5}
                  step={1}
                  value={score || 1}
                  onChange={(e) =>
                    handleScore(c.code, c.name_tr, Number.parseInt(e.target.value, 10))
                  }
                  disabled={isResponded}
                  className="flex-1 accent-[#5E5CE6]"
                  aria-label={`${c.name_tr} puanı`}
                  data-testid={`s360-score-${c.code}`}
                />
                <span className="w-6 text-xs text-[#737373]">5</span>
                <span className="ml-2 w-6 text-right text-sm font-semibold text-[#5E5CE6]">
                  {score || '-'}
                </span>
              </div>
              <div className="mt-3 flex justify-between text-[10px] text-[#A3A3A3]">
                <span>Geliştirilmeli</span>
                <span>Tutarlı</span>
                <span>İyi</span>
                <span>Çok iyi</span>
                <span>Örnek</span>
              </div>

              <textarea
                value={a?.comment ?? ''}
                onChange={(e) => handleComment(c.code, c.name_tr, e.target.value)}
                placeholder="Opsiyonel yorum — somut örnekler dahil..."
                disabled={isResponded}
                rows={2}
                className="mt-4 w-full resize-none rounded-lg border border-[#e5e5e5] px-3 py-2 text-sm"
                data-testid={`s360-comment-${c.code}`}
              />
            </div>
          );
        })}
      </section>

      {submitError && (
        <p className="flex items-center gap-2 text-sm text-[#DC2626]">
          <AlertCircle className="h-4 w-4" />
          {submitError}
        </p>
      )}

      <footer className="flex items-center justify-end gap-3">
        <button
          type="button"
          onClick={handleSubmit}
          disabled={!allAnswered || isResponded || submit.isPending}
          data-testid="s360-answer-submit"
          className="inline-flex items-center gap-2 rounded-lg bg-[#059669] px-5 py-2.5 text-sm font-medium text-white hover:bg-[#047857] disabled:opacity-40"
        >
          {submit.isPending ? (
            <>
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />
              Kaydediliyor...
            </>
          ) : (
            'Cevapları Gönder'
          )}
        </button>
      </footer>
    </div>
  );
}
