'use client';

import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { X } from 'lucide-react';
import { toast } from 'sonner';

import type { AdminComponent } from './types';

interface IncidentCreateDialogProps {
  open: boolean;
  components: AdminComponent[];
  onClose: () => void;
  onCreated: () => void;
}

export function IncidentCreateDialog({
  open,
  components,
  onClose,
  onCreated,
}: IncidentCreateDialogProps) {
  const [title, setTitle] = useState('');
  const [impact, setImpact] = useState<'minor' | 'major' | 'critical'>('minor');
  const [selected, setSelected] = useState<string[]>([]);
  const [body, setBody] = useState('');

  const create = useMutation<void, Error, void>({
    mutationFn: async () => {
      const res = await fetch('/api/v1/admin/status-proxy/incidents', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title,
          impact,
          component_ids: selected,
          initial_body: body,
        }),
      });
      if (!res.ok) {
        const rb = (await res.json().catch(() => ({}))) as { detail?: string; error?: string };
        throw new Error(rb.detail ?? rb.error ?? `HTTP ${res.status}`);
      }
    },
    onSuccess: () => {
      toast.success('Incident başlatıldı');
      setTitle('');
      setBody('');
      setSelected([]);
      onCreated();
    },
    onError: (err) => toast.error(err.message),
  });

  if (!open) return null;
  return (
    <div
      role="dialog"
      aria-modal
      aria-label="Incident başlat"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
    >
      <div className="w-full max-w-lg rounded-xl border border-line bg-bg p-6">
        <div className="flex items-start justify-between">
          <h2 className="text-lg font-semibold text-ink">Incident başlat</h2>
          <button type="button" onClick={onClose} aria-label="Kapat">
            <X className="h-4 w-4 text-ink-60" aria-hidden />
          </button>
        </div>

        <div className="mt-4 flex flex-col gap-3">
          <label className="flex flex-col gap-1">
            <span className="text-[11px] uppercase tracking-widest text-ink-40">Başlık</span>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Örn. API Gateway 5xx artışı"
              className="rounded-md border border-line bg-bg px-3 py-2 text-sm"
            />
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-[11px] uppercase tracking-widest text-ink-40">Etki</span>
            <select
              value={impact}
              onChange={(e) => setImpact(e.target.value as typeof impact)}
              className="rounded-md border border-line bg-bg px-3 py-2 text-sm"
            >
              <option value="minor">minor — tek servis, az müşteri</option>
              <option value="major">major — birden çok servis</option>
              <option value="critical">critical — tüm platform</option>
            </select>
          </label>
          <div>
            <p className="text-[11px] uppercase tracking-widest text-ink-40">Etkilenen bileşenler</p>
            <div className="mt-2 max-h-48 overflow-y-auto rounded-md border border-line p-2">
              {components.map((c) => (
                <label key={c.id} className="flex items-center gap-2 py-0.5 text-[13px]">
                  <input
                    type="checkbox"
                    checked={selected.includes(c.id)}
                    onChange={(e) => {
                      setSelected((prev) =>
                        e.target.checked ? [...prev, c.id] : prev.filter((x) => x !== c.id),
                      );
                    }}
                  />
                  <span>{c.name}</span>
                  <span className="text-[11px] text-ink-40">({c.category})</span>
                </label>
              ))}
            </div>
          </div>
          <label className="flex flex-col gap-1">
            <span className="text-[11px] uppercase tracking-widest text-ink-40">
              İlk update mesajı (opsiyonel)
            </span>
            <textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder="Ne gözlemleniyor? Hangi adım atılıyor?"
              rows={3}
              className="rounded-md border border-line bg-bg px-3 py-2 text-sm"
            />
          </label>
        </div>

        <div className="mt-6 flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="rounded-md border border-line bg-bg px-3 py-2 text-[13px] text-ink hover:border-accent"
          >
            Vazgeç
          </button>
          <button
            type="button"
            disabled={!title || create.isPending}
            onClick={() => create.mutate()}
            className="rounded-md bg-accent px-4 py-2 text-[13px] font-semibold text-white hover:bg-accent/90 disabled:opacity-50"
          >
            Başlat
          </button>
        </div>
      </div>
    </div>
  );
}
