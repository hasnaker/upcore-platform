'use client';

import Link from 'next/link';
import { ArrowRight, Inbox, Plus, Shield } from 'lucide-react';

import { useAuthMe } from '@/hooks/useAuthMe';
import { useMy360Invitations, useMyCampaigns } from '@/hooks/usePerformance';

/* ─────────────────────────────────────────────────────────────
 * 360° Dashboard — yönetici kampanyaları + kişinin açık davetleri.
 * ───────────────────────────────────────────────────────────── */

export default function Survey360HomePage() {
  const me = useAuthMe();
  const myUserId = me.data?.id;
  const myInvitesQ = useMy360Invitations();
  const myCampaignsQ = useMyCampaigns(myUserId);

  const pendingInvitations = (myInvitesQ.data?.items ?? []).filter(
    (i) => i.status === 'pending' || i.status === 'sent',
  );

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-6 p-6">
      <header className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-[#0A0A0A]">
            360° Geri Bildirim
          </h1>
          <p className="mt-1 text-sm text-[#525252]">
            Çok yönlü değerlendirme kampanyaları başlat ve cevaplarını topla.
          </p>
        </div>
        <Link
          href="/performans/360/yeni"
          className="inline-flex items-center gap-2 rounded-lg bg-[#5E5CE6] px-4 py-2 text-sm font-medium text-white hover:bg-[#4B49B6]"
        >
          <Plus className="h-4 w-4" />
          Yeni Kampanya
        </Link>
      </header>

      <section className="rounded-xl border border-[#f0f0f0] bg-white p-5">
        <div className="mb-3 flex items-center gap-2">
          <Inbox className="h-4 w-4 text-[#5E5CE6]" />
          <h2 className="text-sm font-semibold text-[#0A0A0A]">Bekleyen Davetler</h2>
          <span className="ml-auto text-xs text-[#737373]">
            {pendingInvitations.length} aktif
          </span>
        </div>
        {myInvitesQ.isLoading ? (
          <p className="text-sm text-[#737373]">Yükleniyor...</p>
        ) : pendingInvitations.length === 0 ? (
          <p className="text-sm text-[#737373]">Bekleyen bir davet yok.</p>
        ) : (
          <ul className="divide-y divide-[#f5f5f5]">
            {pendingInvitations.map((inv) => (
              <li
                key={inv.id}
                className="flex items-center justify-between gap-4 py-3 text-sm"
              >
                <div className="flex items-center gap-3">
                  <Shield className="h-4 w-4 text-[#5E5CE6]" />
                  <span className="text-[#525252]">
                    İlişki: <strong>{inv.relation}</strong>
                  </span>
                </div>
                <Link
                  href={`/performans/360/cevapla/${inv.id}`}
                  className="inline-flex items-center gap-1 text-sm font-medium text-[#5E5CE6] hover:underline"
                >
                  Cevapla
                  <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="rounded-xl border border-[#f0f0f0] bg-white p-5">
        <h2 className="mb-3 text-sm font-semibold text-[#0A0A0A]">Benim Hakkımdaki Kampanyalar</h2>
        {myCampaignsQ.isLoading ? (
          <p className="text-sm text-[#737373]">Yükleniyor...</p>
        ) : (myCampaignsQ.data?.items ?? []).length === 0 ? (
          <p className="text-sm text-[#737373]">
            Henüz size yönelik 360° kampanya yok.
          </p>
        ) : (
          <ul className="divide-y divide-[#f5f5f5]">
            {(myCampaignsQ.data?.items ?? []).map((c) => (
              <li key={c.id} className="flex items-center justify-between gap-4 py-3 text-sm">
                <div>
                  <div className="font-medium text-[#0A0A0A]">
                    Kampanya {c.id.slice(0, 8)}
                  </div>
                  <div className="text-xs text-[#737373]">
                    {c.anonymity_mode === 'anonymous' ? 'Anonim' : 'İsimli'} · Son tarih{' '}
                    {c.due_date}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span
                    className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${
                      c.status === 'complete'
                        ? 'bg-[#ecfdf5] text-[#065f46]'
                        : 'bg-[#eef0ff] text-[#3730a3]'
                    }`}
                  >
                    {c.status}
                  </span>
                  <Link
                    href={`/performans/360/rapor/${c.id}`}
                    className="inline-flex items-center gap-1 text-sm font-medium text-[#5E5CE6] hover:underline"
                  >
                    Rapor
                    <ArrowRight className="h-3.5 w-3.5" />
                  </Link>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
