'use client';

import Link from 'next/link';
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Briefcase, MapPin, Sparkles } from 'lucide-react';

type Opportunity = {
  id: string;
  title: string;
  description?: string;
  location?: string;
  is_remote: boolean;
  opportunity_type: string;
  required_skills: string[];
  preferred_skills: string[];
  posted_at: string;
  closes_at?: string;
};

const TYPE_LABELS: Record<string, string> = {
  permanent: 'Kadrolu',
  rotation: 'Rotasyon',
  project: 'Proje',
  mentorship: 'Mentorluk',
  secondment: 'Geçici Atama',
};

export default function InternalMarketplacePage() {
  const [filter, setFilter] = useState<string>('');
  const q = useQuery<{ items: Opportunity[] }>({
    queryKey: ['marketplace', filter],
    queryFn: async () => {
      const r = await fetch(`/api/mobility/opportunities?type=${filter}`, { cache: 'no-store' });
      if (!r.ok) return { items: [] };
      return r.json();
    },
  });

  const items = q.data?.items ?? [];

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-ink">Kariyer Marketplace</h1>
          <p className="mt-1 text-sm text-ink-60">
            Şirket içi açık pozisyonlar. Kendinizi uygun görürseniz gizli başvuru yapabilirsiniz —
            yöneticinize haber gitmez.
          </p>
        </div>
        <Link
          href="/kariyer"
          className="rounded-md border border-line bg-bg px-3 py-1.5 text-[12px] font-medium text-ink-60 hover:border-ink-20"
        >
          Kariyer Paneli
        </Link>
      </div>

      <div className="flex flex-wrap gap-2">
        {['', 'permanent', 'rotation', 'project', 'mentorship'].map((t) => (
          <button
            key={t || 'all'}
            type="button"
            onClick={() => setFilter(t)}
            className={`rounded-md px-3 py-1.5 text-[12px] font-medium transition-colors ${
              filter === t
                ? 'bg-accent text-white'
                : 'border border-line bg-bg text-ink-60 hover:border-ink-20'
            }`}
          >
            {t === '' ? 'Tümü' : TYPE_LABELS[t] ?? t}
          </button>
        ))}
      </div>

      {q.isLoading ? (
        <div className="h-48 animate-pulse rounded-xl border border-line bg-bg" />
      ) : items.length === 0 ? (
        <div className="rounded-xl border border-line bg-bg p-10 text-center text-sm text-ink-60">
          Şu anda açık dahili pozisyon yok. Yeni bir fırsat çıktığında burada görünecek.
        </div>
      ) : (
        <div className="grid gap-3 md:grid-cols-2">
          {items.map((o) => (
            <article key={o.id} className="flex flex-col gap-2 rounded-xl border border-line bg-bg p-4">
              <div className="flex items-start justify-between">
                <h3 className="text-sm font-semibold text-ink">{o.title}</h3>
                <span className="inline-flex items-center rounded-full bg-accent-soft px-2 py-0.5 text-[11px] font-medium text-accent">
                  {TYPE_LABELS[o.opportunity_type] ?? o.opportunity_type}
                </span>
              </div>
              <div className="flex items-center gap-3 text-[11px] text-ink-60">
                <span className="flex items-center gap-1">
                  <Briefcase className="h-3 w-3" />
                  {o.required_skills?.[0] ?? 'Açık kadro'}
                </span>
                {o.location ? (
                  <span className="flex items-center gap-1">
                    <MapPin className="h-3 w-3" />
                    {o.location}
                  </span>
                ) : null}
                {o.is_remote ? (
                  <span className="rounded bg-green-soft px-1.5 text-[10px] font-medium text-green">Remote</span>
                ) : null}
              </div>
              {o.description ? (
                <p className="line-clamp-3 text-[12px] text-ink-60">{o.description}</p>
              ) : null}
              {o.required_skills?.length ? (
                <div className="flex flex-wrap gap-1">
                  {o.required_skills.slice(0, 4).map((s) => (
                    <span key={s} className="inline-flex h-5 items-center rounded-full bg-bg-2 px-2 text-[10px] text-ink-60">
                      {s}
                    </span>
                  ))}
                </div>
              ) : null}
              <div className="mt-2 flex items-center justify-between">
                <span className="flex items-center gap-1 text-[11px] text-ink-40">
                  <Sparkles className="h-3 w-3" />
                  AI eşleşme sıralaması açık
                </span>
                <Link
                  href={`/kariyer/marketplace/${o.id}`}
                  className="inline-flex items-center gap-1 rounded-md bg-[#0A0A0A] px-2.5 py-1 text-[11px] font-medium text-white hover:bg-[#333]"
                >
                  Detay →
                </Link>
              </div>
            </article>
          ))}
        </div>
      )}

      <div className="rounded-md border border-accent/30 bg-accent-soft p-3 text-[11px] text-accent">
        <p className="font-semibold">Gizlilik</p>
        <p className="mt-1 text-ink-80">
          Dahili başvurularınız varsayılan olarak gizlidir. Yöneticinize haber gitmez; yalnızca
          İK pozisyonun sahibi gördüğü kadarıyla işleme alır.
        </p>
      </div>
    </div>
  );
}
