'use client';

import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { X } from 'lucide-react';
import { toast } from 'sonner';

import type { AdminComponent } from './types';

interface MaintenanceCreateDialogProps {
  open: boolean;
  components: AdminComponent[];
  onClose: () => void;
  onCreated: () => void;
}

export function MaintenanceCreateDialog({
  open,
  components,
  onClose,
  onCreated,
}: MaintenanceCreateDialogProps) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [start, setStart] = useState<string>(defaultStart());
  const [end, setEnd] = useState<string>(defaultEnd());
  const [selected, setSelected] = useState<string[]>([]);

  const create = useMutation<void, Error, void>({
    mutationFn: async () => {
      const res = await fetch('/api/v1/admin/status-proxy/maintenance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title,
          description,
          scheduled_start: new Date(start).toISOString(),
          scheduled_end: new Date(end).toISOString(),
          component_ids: selected,
        }),
      });
      if (!res.ok) {
        const rb = (await res.json().catch(() => ({}))) as { detail?: string; error?: string };
        throw new Error(rb.detail ?? rb.error ?? `HTTP ${res.status}`);
      }
    },
    onSuccess: () => {
      toast.success('Planlı bakım oluşturuldu');
      setTitle('');
      setDescription('');
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
      aria-label="Planlı bakım"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
    >
      <div className="w-full max-w-lg rounded-xl border border-line bg-bg p-6">
        <div className="flex items-start justify-between">
          <h2 className="text-lg font-semibold text-ink">Planlı bakım ekle</h2>
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
              className="rounded-md border border-line bg-bg px-3 py-2 text-sm"
            />
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-[11px] uppercase tracking-widest text-ink-40">Açıklama</span>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              className="rounded-md border border-line bg-bg px-3 py-2 text-sm"
            />
          </label>
          <div className="grid grid-cols-2 gap-3">
            <label className="flex flex-col gap-1">
              <span className="text-[11px] uppercase tracking-widest text-ink-40">Başlangıç</span>
              <input
                type="datetime-local"
                value={start}
                onChange={(e) => setStart(e.target.value)}
                className="rounded-md border border-line bg-bg px-3 py-2 text-sm"
              />
            </label>
            <label className="flex flex-col gap-1">
              <span className="text-[11px] uppercase tracking-widest text-ink-40">Bitiş</span>
              <input
                type="datetime-local"
                value={end}
                onChange={(e) => setEnd(e.target.value)}
                className="rounded-md border border-line bg-bg px-3 py-2 text-sm"
              />
            </label>
          </div>
          <div>
            <p className="text-[11px] uppercase tracking-widest text-ink-40">Etkilenen bileşenler</p>
            <div className="mt-2 max-h-40 overflow-y-auto rounded-md border border-line p-2">
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
                </label>
              ))}
            </div>
          </div>
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
            Oluştur
          </button>
        </div>
      </div>
    </div>
  );
}

function defaultStart(): string {
  const d = new Date();
  d.setMinutes(0, 0, 0);
  d.setDate(d.getDate() + 1);
  return isoLocal(d);
}

function defaultEnd(): string {
  const d = new Date();
  d.setMinutes(0, 0, 0);
  d.setDate(d.getDate() + 1);
  d.setHours(d.getHours() + 2);
  return isoLocal(d);
}

function isoLocal(d: Date): string {
  const pad = (n: number) => n.toString().padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}
