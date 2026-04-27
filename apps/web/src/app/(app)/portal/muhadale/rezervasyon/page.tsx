'use client';

import { useMemo, useState } from 'react';
import Image from 'next/image';
import { Calendar, Video, Phone, MapPin, Star, Shield } from 'lucide-react';
import { useQuery, useMutation } from '@tanstack/react-query';

/* ────────────────────────────────────────────────────────────────────────────
 * /portal/muhadale/rezervasyon — Çalışan anonim rezervasyon portalı
 * Şirket faturalandırılır · Çalışan ödemez · KVKK: HR yalnızca aggregate görür
 * ──────────────────────────────────────────────────────────────────────────*/

interface Provider {
  id: string;
  full_name: string;
  title: string;
  specialties: string[];
  bio_tr?: string;
  photo_url?: string;
  languages: string[];
  session_type: 'video' | 'phone' | 'in_person' | 'hybrid';
  session_fee_try: number;
  avg_rating?: number;
  session_count: number;
}

interface Slot {
  start_at: string;
  end_at: string;
}

const specialtyLabels: Record<string, string> = {
  burnout: 'Tükenmişlik',
  anxiety: 'Kaygı',
  depression: 'Depresyon',
  'leadership-coach': 'Liderlik Koçluğu',
  'career-coach': 'Kariyer Koçluğu',
  relationship: 'İlişki',
  mindfulness: 'Mindfulness',
};

const sessionTypeIcon = {
  video: Video,
  phone: Phone,
  in_person: MapPin,
  hybrid: Video,
};

export default function RezervasyonPage() {
  const [specialty, setSpecialty] = useState<string>('');
  const [selectedProvider, setSelectedProvider] = useState<Provider | null>(null);

  const { data: providers, isLoading } = useQuery<{ providers: Provider[] }>({
    queryKey: ['referral-providers', specialty],
    queryFn: async () => {
      const qs = specialty ? `?specialty=${encodeURIComponent(specialty)}` : '';
      const res = await fetch(`/api/v1/interventions/referral/providers${qs}`);
      if (!res.ok) throw new Error('Uzman listesi alınamadı');
      return res.json();
    },
  });

  return (
    <div className="flex flex-col gap-8">
      <header className="flex flex-col gap-2">
        <div className="flex items-center gap-2">
          <Shield className="h-5 w-5 text-[#5E5CE6]" />
          <span className="text-[11px] font-semibold uppercase tracking-widest text-[#5E5CE6]">
            Anonim ve ücretsiz
          </span>
        </div>
        <h1 className="text-2xl font-semibold text-[#0A0A0A]">Uzman Desteği Rezervasyonu</h1>
        <p className="max-w-2xl text-sm text-[#525252]">
          Lisanslı psikolog ve koçlarla anonim görüşme ayarlayın. Şirketinize yalnızca
          kullanım adedi yansır — kimliğiniz, notlarınız, konu başlığınız kesinlikle
          paylaşılmaz.
        </p>
      </header>

      {/* Filtre çubuğu */}
      <div className="flex flex-wrap gap-2">
        {['', 'burnout', 'anxiety', 'depression', 'leadership-coach', 'career-coach'].map((s) => (
          <button
            key={s || 'all'}
            onClick={() => setSpecialty(s)}
            className={`rounded-full border px-3 py-1 text-[12px] font-medium transition-colors ${
              specialty === s
                ? 'border-[#0A0A0A] bg-[#0A0A0A] text-white'
                : 'border-[#EDEDED] bg-white text-[#525252] hover:border-[#0A0A0A]'
            }`}
          >
            {s ? specialtyLabels[s] ?? s : 'Tümü'}
          </button>
        ))}
      </div>

      {/* Uzman listesi */}
      {isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="h-44 animate-pulse rounded-lg border border-[#EDEDED] bg-white" />
          ))}
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {providers?.providers.map((p) => (
            <ProviderCard key={p.id} provider={p} onSelect={() => setSelectedProvider(p)} />
          ))}
        </div>
      )}

      {/* Rezervasyon paneli */}
      {selectedProvider && (
        <BookingPanel provider={selectedProvider} onClose={() => setSelectedProvider(null)} />
      )}
    </div>
  );
}

const ProviderCard = ({ provider, onSelect }: { provider: Provider; onSelect: () => void }) => {
  const Icon = sessionTypeIcon[provider.session_type] ?? Video;
  return (
    <button
      onClick={onSelect}
      className="flex flex-col gap-3 rounded-lg border border-[#EDEDED] bg-white p-5 text-left transition-colors hover:border-[#5E5CE6]"
    >
      <div className="flex items-start gap-3">
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-[#F5F4FF] text-[13px] font-semibold text-[#5E5CE6]">
          {provider.photo_url ? (
            <Image src={provider.photo_url} alt="" width={48} height={48} className="h-12 w-12 rounded-full object-cover" />
          ) : (
            provider.full_name.slice(0, 2).toUpperCase()
          )}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="truncate text-sm font-medium text-[#0A0A0A]">{provider.full_name}</span>
            {provider.avg_rating && (
              <span className="inline-flex items-center gap-0.5 text-[11px] text-[#A3A3A3]">
                <Star className="h-3 w-3 fill-[#F59E0B] text-[#F59E0B]" />
                {provider.avg_rating.toFixed(1)}
              </span>
            )}
          </div>
          <p className="text-[12px] text-[#525252]">{provider.title}</p>
        </div>
      </div>

      <div className="flex flex-wrap gap-1">
        {provider.specialties.slice(0, 3).map((s) => (
          <span key={s} className="rounded-full bg-[#F5F5F5] px-2 py-0.5 text-[11px] text-[#525252]">
            {specialtyLabels[s] ?? s}
          </span>
        ))}
      </div>

      {provider.bio_tr && <p className="line-clamp-2 text-[12px] text-[#525252]">{provider.bio_tr}</p>}

      <div className="flex items-center justify-between border-t border-[#F5F5F5] pt-3">
        <span className="inline-flex items-center gap-1 text-[11px] text-[#A3A3A3]">
          <Icon className="h-3.5 w-3.5" />
          {provider.session_type === 'video'
            ? 'Görüntülü'
            : provider.session_type === 'phone'
              ? 'Telefon'
              : 'Yüz yüze'}
        </span>
        <span className="text-[12px] font-medium text-[#0A0A0A]">Müsaitlik gör →</span>
      </div>
    </button>
  );
};

const BookingPanel = ({ provider, onClose }: { provider: Provider; onClose: () => void }) => {
  const from = new Date();
  const to = new Date(from.getTime() + 14 * 24 * 60 * 60 * 1000);

  const { data, isLoading } = useQuery<{ slots: Slot[] }>({
    queryKey: ['referral-slots', provider.id],
    queryFn: async () => {
      const res = await fetch(
        `/api/v1/interventions/referral/providers/${provider.id}/slots?from=${from.toISOString()}&to=${to.toISOString()}`,
      );
      if (!res.ok) throw new Error('Müsaitlik alınamadı');
      return res.json();
    },
  });

  const book = useMutation({
    mutationFn: async (slot: Slot) => {
      const res = await fetch('/api/v1/interventions/referral/bookings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          provider_id: provider.id,
          slot_start_at: slot.start_at,
          slot_end_at: slot.end_at,
        }),
      });
      if (!res.ok) throw new Error('Rezervasyon oluşturulamadı');
      return res.json();
    },
  });

  const groupedByDay = useMemo(() => {
    const groups: Record<string, Slot[]> = {};
    (data?.slots ?? []).forEach((s) => {
      const day = s.start_at.slice(0, 10);
      (groups[day] ??= []).push(s);
    });
    return groups;
  }, [data]);

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/30 sm:items-center">
      <div className="flex max-h-[85vh] w-full max-w-lg flex-col overflow-hidden rounded-t-2xl bg-white sm:rounded-2xl">
        <header className="flex items-center justify-between border-b border-[#EDEDED] px-6 py-4">
          <div>
            <h2 className="text-sm font-semibold text-[#0A0A0A]">{provider.full_name}</h2>
            <p className="text-[11px] text-[#A3A3A3]">{provider.title}</p>
          </div>
          <button
            onClick={onClose}
            className="rounded-md p-1 text-[#A3A3A3] transition-colors hover:bg-[#F5F5F5]"
          >
            Kapat
          </button>
        </header>

        <div className="flex-1 overflow-y-auto px-6 py-4">
          <div className="mb-4 rounded-lg bg-[#F5F4FF] px-3 py-2 text-[11px] text-[#5E5CE6]">
            <Calendar className="mr-1 inline h-3 w-3" />
            Sonraki 14 gün içinde müsaitlik
          </div>

          {book.isSuccess && (
            <div className="mb-4 rounded-lg border border-[#D1FAE5] bg-[#ECFDF5] px-4 py-3 text-[13px] text-[#047857]">
              Randevunuz alındı. Onay e-postası gizli adresinize gönderildi.
            </div>
          )}

          {isLoading && <p className="text-[13px] text-[#A3A3A3]">Müsaitlik yükleniyor…</p>}

          {!isLoading && Object.keys(groupedByDay).length === 0 && (
            <p className="py-8 text-center text-[13px] text-[#A3A3A3]">
              Bu dönemde müsait slot yok. Lütfen daha sonra tekrar deneyin.
            </p>
          )}

          {Object.entries(groupedByDay).map(([day, slots]) => (
            <div key={day} className="mb-5">
              <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-[#A3A3A3]">
                {new Date(day).toLocaleDateString('tr-TR', {
                  weekday: 'long',
                  day: 'numeric',
                  month: 'short',
                })}
              </p>
              <div className="flex flex-wrap gap-2">
                {slots.map((s) => (
                  <button
                    key={s.start_at}
                    onClick={() => book.mutate(s)}
                    disabled={book.isPending}
                    className="rounded-md border border-[#EDEDED] bg-white px-3 py-2 text-[12px] font-medium text-[#0A0A0A] transition-colors hover:border-[#5E5CE6] disabled:opacity-50"
                  >
                    {new Date(s.start_at).toLocaleTimeString('tr-TR', {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
