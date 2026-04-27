'use client';

import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { AlertOctagon, CheckCircle2, MessageSquarePlus } from 'lucide-react';
import { toast } from 'sonner';

import type { AdminIncident } from './types';

interface IncidentRowProps {
  incident: AdminIncident;
  active?: boolean;
}

export function IncidentRow({ incident, active }: IncidentRowProps) {
  const qc = useQueryClient();
  const [expanded, setExpanded] = useState(false);
  const [updateBody, setUpdateBody] = useState('');
  const [updateStatus, setUpdateStatus] = useState<AdminIncident['status']>('monitoring');
  const [postmortemURL, setPostmortemURL] = useState('');
  const [postmortemSummary, setPostmortemSummary] = useState('');

  const addUpdate = useMutation<void, Error, void>({
    mutationFn: async () => {
      const res = await fetch(
        `/api/v1/admin/status-proxy/incidents/${incident.id}/updates`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status: updateStatus, body: updateBody }),
        },
      );
      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as { detail?: string; error?: string };
        throw new Error(body.detail ?? body.error ?? `HTTP ${res.status}`);
      }
    },
    onSuccess: () => {
      toast.success('Update yayımlandı');
      setUpdateBody('');
      void qc.invalidateQueries({ queryKey: ['admin', 'status'] });
    },
    onError: (err) => toast.error(err.message),
  });

  const resolve = useMutation<void, Error, void>({
    mutationFn: async () => {
      if (!postmortemURL && !postmortemSummary) {
        throw new Error('Post-mortem URL veya özet zorunlu');
      }
      const res = await fetch(
        `/api/v1/admin/status-proxy/incidents/${incident.id}/resolve`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            postmortem_url: postmortemURL,
            postmortem_summary: postmortemSummary,
          }),
        },
      );
      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as { detail?: string; error?: string };
        throw new Error(body.detail ?? body.error ?? `HTTP ${res.status}`);
      }
    },
    onSuccess: () => {
      toast.success('Incident çözüldü');
      void qc.invalidateQueries({ queryKey: ['admin', 'status'] });
    },
    onError: (err) => toast.error(err.message),
  });

  const Icon = active ? AlertOctagon : CheckCircle2;
  const iconTone = active ? (incident.impact === 'critical' ? 'text-red' : 'text-amber') : 'text-green';

  return (
    <li className="px-5 py-3 text-sm">
      <div className="flex items-center gap-3">
        <Icon className={`h-4 w-4 shrink-0 ${iconTone}`} aria-hidden />
        <div className="min-w-0 flex-1">
          <p className="truncate font-medium text-ink">{incident.title}</p>
          <p className="text-[11px] text-ink-40">
            {incident.status} · {incident.impact} · başlangıç{' '}
            {new Date(incident.started_at).toLocaleString('tr-TR')}
            {incident.resolved_at
              ? ` · bitiş ${new Date(incident.resolved_at).toLocaleString('tr-TR')}`
              : ''}
          </p>
        </div>
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          className="rounded-md border border-line bg-bg px-2 py-1 text-[12px] text-ink hover:border-accent"
        >
          {expanded ? 'Kapat' : active ? 'Güncelle' : 'Detay'}
        </button>
      </div>

      {expanded && (
        <div className="mt-3 flex flex-col gap-3 rounded-md border border-line bg-bg-2 p-3">
          {active && (
            <>
              <div className="flex flex-col gap-1">
                <label className="text-[11px] uppercase tracking-widest text-ink-40">
                  Yeni update
                </label>
                <div className="flex gap-2">
                  <select
                    value={updateStatus}
                    onChange={(e) => setUpdateStatus(e.target.value as AdminIncident['status'])}
                    className="rounded-md border border-line bg-bg px-2 py-1 text-[12px]"
                  >
                    <option value="investigating">investigating</option>
                    <option value="identified">identified</option>
                    <option value="monitoring">monitoring</option>
                    <option value="resolved">resolved</option>
                  </select>
                  <textarea
                    value={updateBody}
                    onChange={(e) => setUpdateBody(e.target.value)}
                    placeholder="Duruma dair ilerleme…"
                    className="flex-1 rounded-md border border-line bg-bg px-2 py-1 text-[13px]"
                    rows={2}
                  />
                  <button
                    type="button"
                    disabled={!updateBody || addUpdate.isPending}
                    onClick={() => addUpdate.mutate()}
                    className="inline-flex items-center gap-1 rounded-md bg-accent px-3 py-1 text-[12px] font-semibold text-white hover:bg-accent/90 disabled:opacity-50"
                  >
                    <MessageSquarePlus className="h-3.5 w-3.5" aria-hidden />
                    Yayımla
                  </button>
                </div>
              </div>

              <div className="border-t border-line pt-3">
                <p className="mb-2 text-[11px] uppercase tracking-widest text-ink-40">
                  Çözüm + post-mortem (zorunlu)
                </p>
                <div className="flex flex-col gap-2">
                  <input
                    type="url"
                    value={postmortemURL}
                    onChange={(e) => setPostmortemURL(e.target.value)}
                    placeholder="https://status.upcore.io/post-mortems/..."
                    className="rounded-md border border-line bg-bg px-2 py-1 text-[13px]"
                  />
                  <textarea
                    value={postmortemSummary}
                    onChange={(e) => setPostmortemSummary(e.target.value)}
                    placeholder="Özet: kök neden, alınan aksiyonlar, müşteri etkisi…"
                    rows={3}
                    className="rounded-md border border-line bg-bg px-2 py-1 text-[13px]"
                  />
                  <button
                    type="button"
                    disabled={resolve.isPending}
                    onClick={() => resolve.mutate()}
                    className="self-start rounded-md bg-green px-3 py-1 text-[12px] font-semibold text-white hover:bg-green/90 disabled:opacity-50"
                  >
                    Resolve et
                  </button>
                </div>
              </div>
            </>
          )}

          {!active && incident.postmortem_summary && (
            <div className="text-[12px] text-ink-60">
              <p className="font-semibold text-ink">Post-mortem</p>
              <p className="whitespace-pre-wrap">{incident.postmortem_summary}</p>
              {incident.postmortem_url && (
                <a
                  href={incident.postmortem_url}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-1 inline-block text-accent hover:underline"
                >
                  Detay dokümanı
                </a>
              )}
            </div>
          )}
        </div>
      )}
    </li>
  );
}
