'use client';

import { useState } from 'react';
import { Plus, Calendar, CheckCircle2, Users, Sparkles } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

/* ────────────────────────────────────────────────────────────────────────────
 * /performans/1-1 — UpCore güç-bazlı 1-1 rehberi
 * Çalışan + manager: görüşme listesi, şablon soruları, not kaydı
 * ──────────────────────────────────────────────────────────────────────────*/

interface Meeting {
  id: string;
  employee_id: string;
  manager_id: string;
  scheduled_at: string;
  completed_at?: string;
  duration_min: number;
  template_code: string;
  status: 'scheduled' | 'completed' | 'cancelled' | 'no_show';
  meeting_url?: string;
}

interface Section {
  code: string;
  title_tr: string;
  questions: string[];
  visibility: string;
}

interface Template {
  code: string;
  title: string;
  description: string;
  sections: Section[];
}

interface Note {
  id: string;
  meeting_id: string;
  author_id: string;
  author_role: 'employee' | 'manager';
  section: string;
  body_md: string;
  visibility: 'shared' | 'manager_only' | 'employee_only';
  created_at: string;
}

export default function OneOnOnePage() {
  const [selectedMeeting, setSelectedMeeting] = useState<Meeting | null>(null);

  const { data: meetings, isLoading } = useQuery<{ items: Meeting[] }>({
    queryKey: ['one-on-one-meetings'],
    queryFn: async () => {
      const res = await fetch('/api/v1/performance/one-on-one');
      if (!res.ok) throw new Error('Görüşmeler alınamadı');
      return res.json();
    },
  });

  return (
    <div className="flex flex-col gap-8">
      <header className="flex items-end justify-between">
        <div>
          <div className="mb-1 flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-[#5E5CE6]" />
            <span className="text-[11px] font-semibold uppercase tracking-widest text-[#5E5CE6]">
              UpCore güç-bazlı şablon
            </span>
          </div>
          <h1 className="text-2xl font-semibold text-[#0A0A0A]">1-1 Görüşmeler</h1>
          <p className="mt-1 max-w-xl text-sm text-[#525252]">
            Gallup Q12 + VIA 24 araştırmasına göre güç-bazlı 1-1&apos;ler bağlılığı %18, psikolojik
            güveni %24 artırır. Yıl boyu tüm görüşmeleriniz kronolojik olarak bu sayfada tutulur.
          </p>
        </div>
        <button
          onClick={() => {
            /* open schedule modal — placeholder */
          }}
          className="inline-flex items-center gap-2 rounded-md bg-[#0A0A0A] px-4 py-2 text-[13px] font-medium text-white transition-colors hover:bg-[#262626]"
        >
          <Plus className="h-4 w-4" />
          Yeni görüşme
        </button>
      </header>

      {/* Zaman çizelgesi */}
      {isLoading ? (
        <div className="flex flex-col gap-3">
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className="h-20 animate-pulse rounded-lg border border-[#EDEDED] bg-white"
            />
          ))}
        </div>
      ) : !meetings?.items || meetings.items.length === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-lg border border-dashed border-[#EDEDED] bg-[#FAFAFA] px-6 py-16 text-center">
          <Calendar className="h-10 w-10 text-[#A3A3A3]" />
          <p className="text-sm font-medium text-[#0A0A0A]">Henüz 1-1 planlanmamış</p>
          <p className="max-w-md text-[12px] text-[#A3A3A3]">
            Haftalık veya iki haftalık 1-1&apos;ler koçluk etkisini en çok artıran pratiktir. İlk
            görüşmenizi planlayın.
          </p>
        </div>
      ) : (
        <ul className="flex flex-col gap-2">
          {meetings.items.map((m) => (
            <li key={m.id}>
              <button
                onClick={() => setSelectedMeeting(m)}
                className="flex w-full items-center gap-4 rounded-lg border border-[#EDEDED] bg-white px-5 py-4 text-left transition-colors hover:border-[#0A0A0A]"
              >
                <div
                  className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${
                    m.status === 'completed'
                      ? 'bg-[#D1FAE5] text-[#047857]'
                      : 'bg-[#EDE9FE] text-[#5E5CE6]'
                  }`}
                >
                  {m.status === 'completed' ? (
                    <CheckCircle2 className="h-4 w-4" />
                  ) : (
                    <Calendar className="h-4 w-4" />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-[#0A0A0A]">
                    {new Date(m.scheduled_at).toLocaleDateString('tr-TR', {
                      day: 'numeric',
                      month: 'long',
                      year: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </p>
                  <p className="text-[12px] text-[#A3A3A3]">
                    {m.duration_min} dk · {m.template_code.replace('upcore_', '').replace('_', ' ')}
                  </p>
                </div>
                <span
                  className={`rounded-full px-2.5 py-1 text-[11px] font-medium ${
                    m.status === 'completed'
                      ? 'bg-[#D1FAE5] text-[#047857]'
                      : m.status === 'cancelled'
                        ? 'bg-[#FEE2E2] text-[#B91C1C]'
                        : 'bg-[#EDE9FE] text-[#5E5CE6]'
                  }`}
                >
                  {m.status === 'completed'
                    ? 'Tamamlandı'
                    : m.status === 'cancelled'
                      ? 'İptal'
                      : 'Planlandı'}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}

      {selectedMeeting && (
        <MeetingDetailPanel meeting={selectedMeeting} onClose={() => setSelectedMeeting(null)} />
      )}
    </div>
  );
}

const MeetingDetailPanel = ({
  meeting,
  onClose,
}: {
  meeting: Meeting;
  onClose: () => void;
}) => {
  const qc = useQueryClient();

  const { data: template } = useQuery<Template>({
    queryKey: ['one-on-one-template', meeting.template_code],
    queryFn: async () => {
      const res = await fetch(
        `/api/v1/performance/one-on-one/templates/${meeting.template_code}`,
      );
      if (!res.ok) throw new Error('Şablon alınamadı');
      return res.json();
    },
  });

  const { data: notesData } = useQuery<{ notes: Note[] }>({
    queryKey: ['one-on-one-notes', meeting.id],
    queryFn: async () => {
      const res = await fetch(`/api/v1/performance/one-on-one/${meeting.id}/notes`);
      if (!res.ok) throw new Error('Notlar alınamadı');
      return res.json();
    },
  });

  const addNote = useMutation({
    mutationFn: async (payload: { section: string; body_md: string; visibility: string }) => {
      const res = await fetch(`/api/v1/performance/one-on-one/${meeting.id}/notes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error('Not kaydedilemedi');
      return res.json();
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['one-on-one-notes', meeting.id] }),
  });

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/30 sm:items-center">
      <div className="flex max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden rounded-t-2xl bg-white sm:rounded-2xl">
        <header className="flex items-center justify-between border-b border-[#EDEDED] px-6 py-4">
          <div>
            <h2 className="text-sm font-semibold text-[#0A0A0A]">{template?.title ?? '1-1 Görüşme'}</h2>
            <p className="text-[11px] text-[#A3A3A3]">
              {new Date(meeting.scheduled_at).toLocaleDateString('tr-TR', {
                day: 'numeric',
                month: 'long',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
              })}
            </p>
          </div>
          <button
            onClick={onClose}
            className="rounded-md p-1 text-[#A3A3A3] transition-colors hover:bg-[#F5F5F5]"
          >
            Kapat
          </button>
        </header>

        <div className="flex-1 overflow-y-auto px-6 py-5">
          {template?.description && (
            <div className="mb-5 rounded-lg bg-[#F5F4FF] px-4 py-3 text-[12px] text-[#5E5CE6]">
              <Users className="mr-1 inline h-3 w-3" />
              {template.description}
            </div>
          )}

          {template?.sections.map((s) => (
            <SectionBlock
              key={s.code}
              section={s}
              notes={notesData?.notes.filter((n) => n.section === s.code) ?? []}
              onSubmit={(body, visibility) =>
                addNote.mutate({ section: s.code, body_md: body, visibility })
              }
            />
          ))}
        </div>
      </div>
    </div>
  );
};

const SectionBlock = ({
  section,
  notes,
  onSubmit,
}: {
  section: Section;
  notes: Note[];
  onSubmit: (body: string, visibility: string) => void;
}) => {
  const [draft, setDraft] = useState('');
  const [vis, setVis] = useState('shared');

  return (
    <section className="mb-7">
      <h3 className="mb-2 text-sm font-semibold text-[#0A0A0A]">{section.title_tr}</h3>
      <ul className="mb-3 flex flex-col gap-1 text-[12px] text-[#525252]">
        {section.questions.map((q, i) => (
          <li key={i} className="flex gap-2">
            <span className="text-[#A3A3A3]">·</span>
            {q}
          </li>
        ))}
      </ul>

      {notes.length > 0 && (
        <div className="mb-3 flex flex-col gap-2">
          {notes.map((n) => (
            <div
              key={n.id}
              className="rounded-lg border border-[#EDEDED] bg-[#FAFAFA] px-3 py-2 text-[13px] text-[#0A0A0A]"
            >
              <span className="mr-2 inline-flex rounded-full bg-white px-2 py-0.5 text-[10px] font-medium text-[#525252]">
                {n.author_role === 'manager' ? 'Yönetici' : 'Çalışan'}
              </span>
              {n.body_md}
            </div>
          ))}
        </div>
      )}

      <textarea
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        rows={2}
        placeholder="Not ekle…"
        className="w-full resize-none rounded-md border border-[#EDEDED] bg-white px-3 py-2 text-[13px] text-[#0A0A0A] focus:border-[#5E5CE6] focus:outline-none"
      />
      <div className="mt-2 flex items-center justify-between">
        <select
          value={vis}
          onChange={(e) => setVis(e.target.value)}
          className="rounded-md border border-[#EDEDED] bg-white px-2 py-1 text-[11px] text-[#525252]"
        >
          <option value="shared">Her iki taraf görür</option>
          <option value="manager_only">Sadece yönetici</option>
          <option value="employee_only">Sadece çalışan</option>
        </select>
        <button
          onClick={() => {
            if (!draft.trim()) return;
            onSubmit(draft, vis);
            setDraft('');
          }}
          className="rounded-md bg-[#0A0A0A] px-3 py-1.5 text-[12px] font-medium text-white transition-colors hover:bg-[#262626]"
        >
          Kaydet
        </button>
      </div>
    </section>
  );
};
