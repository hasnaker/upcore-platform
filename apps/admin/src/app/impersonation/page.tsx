'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { AlertTriangle, Clock, Play, ShieldCheck, Square } from 'lucide-react';
import { toast } from 'sonner';

type Session = {
  id: string;
  admin_user_id: string;
  target_tenant_id: string;
  target_user_id: string;
  reason: string;
  started_at: string;
  ended_at?: string;
  ip_address?: string;
};

export default function ImpersonationAdminPage() {
  const qc = useQueryClient();
  const [tenantID, setTenantID] = useState('');
  const [userID, setUserID] = useState('');
  const [reason, setReason] = useState('');

  const history = useQuery<{ items: Session[] }>({
    queryKey: ['impersonation', 'history'],
    queryFn: async () => {
      const r = await fetch('/api/admin/impersonation', { cache: 'no-store' });
      if (!r.ok) return { items: [] };
      return r.json();
    },
  });

  const start = useMutation<{ session_id: string }, Error, void>({
    mutationFn: async () => {
      const r = await fetch('/api/v1/admin/impersonation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          target_tenant_id: tenantID,
          target_user_id: userID,
          reason,
        }),
      });
      if (!r.ok) {
        const body = await r.json().catch(() => ({}));
        throw new Error(body.error || `HTTP ${r.status}`);
      }
      return r.json();
    },
    onSuccess: (res) => {
      toast.success(`Impersonation başladı (session: ${res.session_id.slice(0, 8)})`);
      qc.invalidateQueries({ queryKey: ['impersonation'] });
      setReason('');
    },
    onError: (e) => toast.error(`Başlatılamadı: ${String(e)}`),
  });

  const end = useMutation<void, Error, string>({
    mutationFn: async (sessionID) => {
      const r = await fetch(`/api/v1/admin/impersonation/${sessionID}/end`, { method: 'POST' });
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
    },
    onSuccess: () => {
      toast.success('Impersonation sonlandırıldı');
      qc.invalidateQueries({ queryKey: ['impersonation'] });
    },
  });

  const items = history.data?.items ?? [];
  const active = items.filter((s) => !s.ended_at);

  return (
    <main className="mx-auto max-w-5xl p-6">
      <h1 className="flex items-center gap-2 text-2xl font-semibold text-[#0A0A0A]">
        <ShieldCheck className="h-5 w-5 text-[#DC2626]" />
        Admin Impersonation
      </h1>
      <p className="mt-1 text-sm text-[#737373]">
        UpCore personeli olarak bir müşteri tenant'ına müşteri gibi girmek için. Her oturum audit
        edilir; KVKK + müşteri sözleşmesi kapsamında sadece destek ticket'ı bağlamında kullanılmalıdır.
      </p>

      <section className="mt-6 rounded-xl border border-[#FCA5A5] bg-[#FEF2F2] p-5">
        <h2 className="flex items-center gap-2 text-[13px] font-semibold uppercase tracking-widest text-[#DC2626]">
          <AlertTriangle className="h-3.5 w-3.5" />
          Yeni Oturum Başlat
        </h2>
        <div className="mt-3 grid gap-3 md:grid-cols-3">
          <label className="block">
            <span className="mb-1 block text-[11px] font-medium uppercase tracking-wider text-[#737373]">
              Hedef Tenant UUID
            </span>
            <input
              value={tenantID}
              onChange={(e) => setTenantID(e.target.value)}
              placeholder="00000000-0000-0000-0000-000000000000"
              className="w-full rounded-md border border-[#EDEDED] bg-white px-2 py-1.5 font-mono text-[11px]"
            />
          </label>
          <label className="block">
            <span className="mb-1 block text-[11px] font-medium uppercase tracking-wider text-[#737373]">
              Hedef Kullanıcı UUID
            </span>
            <input
              value={userID}
              onChange={(e) => setUserID(e.target.value)}
              placeholder="00000000-0000-0000-0000-000000000000"
              className="w-full rounded-md border border-[#EDEDED] bg-white px-2 py-1.5 font-mono text-[11px]"
            />
          </label>
          <label className="block">
            <span className="mb-1 block text-[11px] font-medium uppercase tracking-wider text-[#737373]">
              Sebep (zorunlu — ticket no)
            </span>
            <input
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="SUPPORT-1234"
              className="w-full rounded-md border border-[#EDEDED] bg-white px-2 py-1.5 text-sm"
            />
          </label>
        </div>
        <button
          type="button"
          onClick={() => start.mutate()}
          disabled={start.isPending || !tenantID || !userID || !reason}
          className="mt-4 inline-flex items-center gap-2 rounded-md bg-[#DC2626] px-4 py-2 text-sm font-medium text-white hover:bg-[#B91C1C] disabled:opacity-50"
        >
          <Play className="h-4 w-4" />
          Başlat (max 60 dk)
        </button>
      </section>

      <section className="mt-6 rounded-xl border border-[#EDEDED] bg-white">
        <div className="border-b border-[#EDEDED] p-4 text-[13px] font-semibold uppercase tracking-widest text-[#737373]">
          Aktif Oturumlar
        </div>
        {active.length === 0 ? (
          <div className="p-6 text-center text-sm text-[#737373]">Aktif oturum yok.</div>
        ) : (
          <ul>
            {active.map((s) => (
              <li key={s.id} className="flex items-center justify-between border-t border-[#EDEDED] p-4 first:border-t-0">
                <div>
                  <p className="font-mono text-[11px] text-[#525252]">{s.id}</p>
                  <p className="mt-1 text-[12px]">
                    <strong>Tenant:</strong> {s.target_tenant_id.slice(0, 8)}… ·
                    <strong> Reason:</strong> {s.reason}
                  </p>
                  <p className="flex items-center gap-1 text-[10px] text-[#737373]">
                    <Clock className="h-3 w-3" />
                    Başladı: {new Date(s.started_at).toLocaleString('tr-TR')}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => end.mutate(s.id)}
                  className="inline-flex items-center gap-1 rounded-md border border-[#EDEDED] bg-white px-3 py-1.5 text-[12px] font-medium text-[#525252] hover:border-[#0A0A0A]"
                >
                  <Square className="h-3 w-3" />
                  Bitir
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}
