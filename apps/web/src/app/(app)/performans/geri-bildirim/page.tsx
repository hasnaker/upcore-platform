'use client';

import { useState } from 'react';
import {
  MessageCircle,
  ThumbsUp,
  Award,
  TrendingUp,
  AlertCircle,
  GraduationCap,
  Slack,
  CheckSquare,
  Square,
} from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

/* ────────────────────────────────────────────────────────────────────────────
 * /performans/geri-bildirim — sürekli geri bildirim timeline
 * Slack bot (/upcore-feedback @kişi mesaj) UI giriş + kronolojik liste
 * Yıl sonu review için manuel seçim
 * ──────────────────────────────────────────────────────────────────────────*/

type FeedbackType = 'kudos' | 'recognition' | 'development' | 'concern' | 'coaching';

interface FeedbackItem {
  id: string;
  from_user_id: string;
  to_employee_id: string;
  type: FeedbackType;
  channel: 'ui' | 'slack_bot' | 'teams_bot' | 'email';
  body_md: string;
  is_anonymous: boolean;
  include_in_review: boolean;
  review_period?: string;
  created_at: string;
}

const typeMeta: Record<
  FeedbackType,
  { label: string; color: string; Icon: typeof ThumbsUp }
> = {
  kudos: { label: 'Teşekkür', color: '#059669', Icon: ThumbsUp },
  recognition: { label: 'Takdir', color: '#F59E0B', Icon: Award },
  development: { label: 'Gelişim', color: '#5E5CE6', Icon: TrendingUp },
  concern: { label: 'Endişe', color: '#B91C1C', Icon: AlertCircle },
  coaching: { label: 'Koçluk', color: '#8B5CF6', Icon: GraduationCap },
};

export default function ContinuousFeedbackPage() {
  const [tab, setTab] = useState<'received' | 'given'>('received');
  const [showComposer, setShowComposer] = useState(false);

  return (
    <div className="flex flex-col gap-8">
      <header className="flex items-end justify-between">
        <div>
          <div className="mb-1 flex items-center gap-2">
            <MessageCircle className="h-4 w-4 text-[#5E5CE6]" />
            <span className="text-[11px] font-semibold uppercase tracking-widest text-[#5E5CE6]">
              Sürekli Geri Bildirim
            </span>
          </div>
          <h1 className="text-2xl font-semibold text-[#0A0A0A]">Geri Bildirim Akışı</h1>
          <p className="mt-1 max-w-xl text-sm text-[#525252]">
            Yıl içinde aldığınız ve verdiğiniz tüm geri bildirimler kronolojik olarak burada
            tutulur. Slack&apos;ten /upcore-feedback komutuyla da kayıt ekleyebilirsiniz.
          </p>
        </div>
        <button
          onClick={() => setShowComposer(true)}
          className="rounded-md bg-[#0A0A0A] px-4 py-2 text-[13px] font-medium text-white transition-colors hover:bg-[#262626]"
        >
          Geri bildirim ver
        </button>
      </header>

      <div className="flex items-center gap-3 rounded-lg border border-[#EDEDED] bg-[#FAFAFA] px-4 py-3 text-[12px] text-[#525252]">
        <Slack className="h-4 w-4 text-[#5E5CE6]" />
        <span>
          Slack&apos;te komut: <code className="rounded bg-white px-1">/upcore-feedback @kişi mesaj</code>
        </span>
      </div>

      {/* Sekme */}
      <div className="flex border-b border-[#EDEDED]">
        {(['received', 'given'] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`-mb-px border-b-2 px-4 py-2 text-[13px] font-medium transition-colors ${
              tab === t
                ? 'border-[#0A0A0A] text-[#0A0A0A]'
                : 'border-transparent text-[#A3A3A3] hover:text-[#525252]'
            }`}
          >
            {t === 'received' ? 'Alınan' : 'Verilen'}
          </button>
        ))}
      </div>

      <FeedbackTimeline mode={tab} />

      {showComposer && <ComposerModal onClose={() => setShowComposer(false)} />}
    </div>
  );
}

const FeedbackTimeline = ({ mode }: { mode: 'received' | 'given' }) => {
  const qc = useQueryClient();
  const { data, isLoading } = useQuery<{ items: FeedbackItem[] }>({
    queryKey: ['feedback-timeline', mode],
    queryFn: async () => {
      const res = await fetch(`/api/v1/performance/feedback/${mode}`);
      if (!res.ok) throw new Error('Liste alınamadı');
      return res.json();
    },
  });

  const toggleReview = useMutation({
    mutationFn: async (payload: { id: string; include: boolean }) => {
      const res = await fetch(
        `/api/v1/performance/feedback/${payload.id}/review-inclusion`,
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            include: payload.include,
            period: `${new Date().getFullYear()}Q4`,
          }),
        },
      );
      if (!res.ok) throw new Error('Güncellenemedi');
      return res.json();
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['feedback-timeline', mode] }),
  });

  if (isLoading) {
    return (
      <div className="flex flex-col gap-3">
        {[0, 1, 2].map((i) => (
          <div key={i} className="h-20 animate-pulse rounded-lg border border-[#EDEDED] bg-white" />
        ))}
      </div>
    );
  }

  if (!data?.items || data.items.length === 0) {
    return (
      <div className="flex flex-col items-center gap-3 rounded-lg border border-dashed border-[#EDEDED] bg-[#FAFAFA] px-6 py-16 text-center">
        <MessageCircle className="h-10 w-10 text-[#A3A3A3]" />
        <p className="text-sm font-medium text-[#0A0A0A]">Henüz geri bildirim yok</p>
      </div>
    );
  }

  return (
    <ol className="relative border-l-2 border-[#EDEDED] pl-6">
      {data.items.map((f) => {
        const meta = typeMeta[f.type] ?? typeMeta.kudos;
        const Icon = meta.Icon;
        return (
          <li key={f.id} className="mb-6">
            <span
              className="absolute -left-[9px] flex h-4 w-4 items-center justify-center rounded-full border-2 border-white"
              style={{ backgroundColor: meta.color }}
            />
            <div className="rounded-lg border border-[#EDEDED] bg-white p-4">
              <div className="mb-2 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Icon className="h-3.5 w-3.5" style={{ color: meta.color }} />
                  <span
                    className="rounded-full px-2 py-0.5 text-[11px] font-medium"
                    style={{ backgroundColor: `${meta.color}20`, color: meta.color }}
                  >
                    {meta.label}
                  </span>
                  {f.channel === 'slack_bot' && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-[#F5F5F5] px-2 py-0.5 text-[10px] text-[#525252]">
                      <Slack className="h-3 w-3" />
                      Slack
                    </span>
                  )}
                  {f.is_anonymous && (
                    <span className="rounded-full bg-[#F5F5F5] px-2 py-0.5 text-[10px] text-[#525252]">
                      Anonim
                    </span>
                  )}
                </div>
                <span className="text-[11px] text-[#A3A3A3]">
                  {new Date(f.created_at).toLocaleDateString('tr-TR', {
                    day: 'numeric',
                    month: 'short',
                  })}
                </span>
              </div>
              <p className="text-[13px] text-[#0A0A0A]">{f.body_md}</p>

              {mode === 'received' && (
                <div className="mt-3 flex items-center justify-between border-t border-[#F5F5F5] pt-3">
                  <button
                    onClick={() =>
                      toggleReview.mutate({ id: f.id, include: !f.include_in_review })
                    }
                    className="inline-flex items-center gap-1.5 text-[11px] font-medium text-[#525252] hover:text-[#0A0A0A]"
                  >
                    {f.include_in_review ? (
                      <CheckSquare className="h-3.5 w-3.5 text-[#5E5CE6]" />
                    ) : (
                      <Square className="h-3.5 w-3.5" />
                    )}
                    Yıl sonu değerlendirmede kullan
                  </button>
                </div>
              )}
            </div>
          </li>
        );
      })}
    </ol>
  );
};

const ComposerModal = ({ onClose }: { onClose: () => void }) => {
  const qc = useQueryClient();
  const [type, setType] = useState<FeedbackType>('kudos');
  const [body, setBody] = useState('');
  const [toEmpId, setToEmpId] = useState('');
  const [anon, setAnon] = useState(false);

  const submit = useMutation({
    mutationFn: async () => {
      const res = await fetch('/api/v1/performance/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to_employee_id: toEmpId,
          type,
          body_md: body,
          is_anonymous: anon,
        }),
      });
      if (!res.ok) throw new Error('Gönderilemedi');
      return res.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['feedback-timeline'] });
      onClose();
    },
  });

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/30 sm:items-center">
      <div className="flex w-full max-w-lg flex-col overflow-hidden rounded-t-2xl bg-white sm:rounded-2xl">
        <header className="border-b border-[#EDEDED] px-6 py-4">
          <h2 className="text-sm font-semibold text-[#0A0A0A]">Geri Bildirim Ver</h2>
        </header>
        <div className="flex flex-col gap-4 px-6 py-5">
          <label className="flex flex-col gap-1 text-[12px] text-[#525252]">
            Alıcı (çalışan ID)
            <input
              value={toEmpId}
              onChange={(e) => setToEmpId(e.target.value)}
              placeholder="uuid…"
              className="rounded-md border border-[#EDEDED] bg-white px-3 py-2 text-[13px] text-[#0A0A0A] focus:border-[#5E5CE6] focus:outline-none"
            />
          </label>

          <div>
            <p className="mb-1 text-[12px] text-[#525252]">Tür</p>
            <div className="flex flex-wrap gap-2">
              {(Object.entries(typeMeta) as [FeedbackType, (typeof typeMeta)[FeedbackType]][]).map(
                ([k, m]) => (
                  <button
                    key={k}
                    onClick={() => setType(k)}
                    className={`rounded-md border px-3 py-1.5 text-[12px] font-medium transition-colors ${
                      type === k
                        ? 'border-[#0A0A0A] bg-[#0A0A0A] text-white'
                        : 'border-[#EDEDED] bg-white text-[#525252] hover:border-[#0A0A0A]'
                    }`}
                  >
                    {m.label}
                  </button>
                ),
              )}
            </div>
          </div>

          <label className="flex flex-col gap-1 text-[12px] text-[#525252]">
            Mesaj
            <textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              rows={5}
              className="w-full resize-none rounded-md border border-[#EDEDED] bg-white px-3 py-2 text-[13px] text-[#0A0A0A] focus:border-[#5E5CE6] focus:outline-none"
            />
          </label>

          <label className="flex items-center gap-2 text-[12px] text-[#525252]">
            <input type="checkbox" checked={anon} onChange={(e) => setAnon(e.target.checked)} />
            Anonim gönder
          </label>
        </div>
        <footer className="flex justify-end gap-2 border-t border-[#EDEDED] px-6 py-4">
          <button
            onClick={onClose}
            className="rounded-md border border-[#EDEDED] bg-white px-4 py-2 text-[12px] font-medium text-[#525252] hover:border-[#0A0A0A]"
          >
            Vazgeç
          </button>
          <button
            onClick={() => submit.mutate()}
            disabled={!toEmpId || !body || submit.isPending}
            className="rounded-md bg-[#0A0A0A] px-4 py-2 text-[12px] font-medium text-white transition-colors hover:bg-[#262626] disabled:opacity-50"
          >
            Gönder
          </button>
        </footer>
      </div>
    </div>
  );
};
