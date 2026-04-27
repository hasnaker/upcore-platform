'use client';

import { useState } from 'react';
import {
  AlertCircle, BellRing, Check, CheckCheck, Inbox, Loader2, Settings2,
} from 'lucide-react';
import { toast } from 'sonner';
import {
  useInAppNotifications,
  useMarkRead,
  useMarkAllRead,
  useMyNotificationPreferences,
  useUpdateMyPreferences,
  type InAppNotification,
} from '@/hooks/useNotifications';

/**
 * Bildirim Merkezi — services/notification gerçek veri:
 *   - In-app inbox (okundu/okunmadı, aksiyon url'leri)
 *   - Tercihler (email/sms/inapp kanal açık/kapalı, sessiz saatler)
 */
export default function BildirimlerPage() {
  const [tab, setTab] = useState<'inbox' | 'preferences'>('inbox');

  return (
    <div className="flex flex-col gap-6">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight text-[#0A0A0A]">
          Bildirim Merkezi
        </h1>
        <p className="mt-1 text-sm text-[#737373]">
          Tüm bildirimleriniz ve kanal tercihleri tek yerde.
        </p>
      </header>

      <div className="flex gap-1 rounded-xl border border-[#EDEDED] bg-[#FAFAFA] p-1">
        <TabButton active={tab === 'inbox'} onClick={() => setTab('inbox')} icon={Inbox}>
          Gelen Kutusu
        </TabButton>
        <TabButton active={tab === 'preferences'} onClick={() => setTab('preferences')} icon={Settings2}>
          Tercihler
        </TabButton>
      </div>

      {tab === 'inbox' ? <InboxPanel /> : <PreferencesPanel />}
    </div>
  );
}

function TabButton({
  active,
  onClick,
  icon: Icon,
  children,
}: {
  active: boolean;
  onClick: () => void;
  icon: typeof Inbox;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex flex-1 items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-[13px] font-medium transition-all ${
        active ? 'bg-white text-[#0A0A0A] shadow-sm' : 'text-[#737373] hover:text-[#0A0A0A]'
      }`}
    >
      <Icon className="h-4 w-4" />
      {children}
    </button>
  );
}

/* ─── Inbox ─── */

function InboxPanel() {
  const q = useInAppNotifications(100);
  const markAll = useMarkAllRead();
  const items = q.data?.items ?? [];
  const unread = items.filter((i) => !i.read_at).length;

  return (
    <section className="rounded-xl border border-[#EDEDED] bg-white p-5">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-sm font-semibold text-[#0A0A0A]">
            Gelen Kutusu {unread > 0 ? <span className="text-[#5E5CE6]">({unread} okunmamış)</span> : null}
          </h2>
          <p className="text-xs text-[#737373]">Son bildirimleriniz</p>
        </div>
        {unread > 0 ? (
          <button
            type="button"
            onClick={() =>
              markAll.mutate(
                {},
                {
                  onSuccess: (d) => toast.success(`${d.updated} bildirim okundu olarak işaretlendi`),
                  onError: (e) => toast.error(e.message),
                },
              )
            }
            disabled={markAll.isPending}
            className="inline-flex items-center gap-2 rounded-md border border-[#EDEDED] px-3 py-2 text-xs text-[#0A0A0A] hover:bg-[#FAFAFA] disabled:opacity-50"
          >
            {markAll.isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : <CheckCheck className="h-3 w-3" />}
            Tümünü okundu işaretle
          </button>
        ) : null}
      </div>

      {q.isLoading ? (
        <Loading />
      ) : q.error ? (
        <ErrorBanner message={q.error.message} />
      ) : items.length === 0 ? (
        <div className="mt-6 rounded-lg border border-dashed border-[#EDEDED] bg-[#FAFAFA] p-8 text-center">
          <BellRing className="mx-auto h-8 w-8 text-[#A3A3A3]" />
          <p className="mt-2 text-sm font-medium text-[#0A0A0A]">Gelen kutunuz boş</p>
          <p className="mt-1 text-xs text-[#737373]">
            Yeni bildirimler geldikçe burada listelenir.
          </p>
        </div>
      ) : (
        <ul className="mt-4 space-y-2">
          {items.map((n) => (
            <NotificationRow key={n.id} notification={n} />
          ))}
        </ul>
      )}
    </section>
  );
}

function NotificationRow({ notification }: { notification: InAppNotification }) {
  const markRead = useMarkRead(notification.id);
  const unread = !notification.read_at;
  const tone = toneFor(notification.severity);
  return (
    <li
      className={`group rounded-lg border p-4 transition ${
        unread ? 'border-[#5E5CE6] bg-[#EEF2FF]/50' : 'border-[#EDEDED] bg-white'
      }`}
    >
      <div className="flex items-start gap-3">
        <div
          className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${tone.bg}`}
        >
          <BellRing className={`h-4 w-4 ${tone.text}`} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <p className="truncate text-sm font-medium text-[#0A0A0A]">
              {notification.title_tr}
            </p>
            {unread ? (
              <span className="h-2 w-2 shrink-0 rounded-full bg-[#5E5CE6]" />
            ) : null}
          </div>
          <p className="mt-1 whitespace-pre-wrap text-xs text-[#525252]">
            {notification.body_tr}
          </p>
          <p className="mt-2 text-[11px] text-[#737373]">
            {notification.category} · {formatTime(notification.created_at)}
          </p>
        </div>
        <div className="flex shrink-0 flex-col gap-1">
          {notification.action_url ? (
            <a
              href={notification.action_url}
              className="inline-flex items-center justify-center rounded-md border border-[#5E5CE6] px-2.5 py-1.5 text-xs font-medium text-[#5E5CE6] hover:bg-[#EEF2FF]"
            >
              {notification.action_label_tr ?? 'Git'}
            </a>
          ) : null}
          {unread ? (
            <button
              type="button"
              onClick={() => markRead.mutate({})}
              disabled={markRead.isPending}
              className="inline-flex items-center justify-center gap-1 rounded-md border border-[#EDEDED] bg-white px-2.5 py-1.5 text-xs text-[#525252] hover:bg-[#FAFAFA] disabled:opacity-50"
            >
              <Check className="h-3 w-3" />
              Okundu
            </button>
          ) : null}
        </div>
      </div>
    </li>
  );
}

function toneFor(severity?: InAppNotification['severity']) {
  switch (severity) {
    case 'success':
      return { bg: 'bg-[#DCFCE7]', text: 'text-[#16A34A]' };
    case 'warning':
      return { bg: 'bg-[#FEF3C7]', text: 'text-[#D97706]' };
    case 'error':
      return { bg: 'bg-[#FEE2E2]', text: 'text-[#DC2626]' };
    default:
      return { bg: 'bg-[#EEF2FF]', text: 'text-[#5E5CE6]' };
  }
}

/* ─── Preferences ─── */

function PreferencesPanel() {
  const q = useMyNotificationPreferences();
  const update = useUpdateMyPreferences();
  const prefs = q.data;

  const toggle = (key: 'email_enabled' | 'sms_enabled' | 'inapp_enabled') => {
    if (!prefs) return;
    update.mutate({ [key]: !prefs[key] }, {
      onSuccess: () => toast.success('Tercih güncellendi'),
      onError: (e) => toast.error(e.message),
    });
  };

  return (
    <section className="rounded-xl border border-[#EDEDED] bg-white p-5">
      <h2 className="text-sm font-semibold text-[#0A0A0A]">Bildirim Tercihleri</h2>
      <p className="text-xs text-[#737373]">Hangi kanallardan bildirim almak istediğinizi seçin.</p>

      {q.isLoading ? (
        <Loading />
      ) : q.error ? (
        <ErrorBanner message={q.error.message} />
      ) : prefs ? (
        <ul className="mt-4 divide-y divide-[#EDEDED] rounded-lg border border-[#EDEDED]">
          <Toggle
            label="E-posta"
            desc="Haftalık özetler, önemli güncellemeler"
            on={prefs.email_enabled}
            onToggle={() => toggle('email_enabled')}
            pending={update.isPending}
          />
          <Toggle
            label="SMS"
            desc="Acil durum ve onay talepleri"
            on={prefs.sms_enabled}
            onToggle={() => toggle('sms_enabled')}
            pending={update.isPending}
          />
          <Toggle
            label="Uygulama İçi"
            desc="Panel üstündeki zil ikonunda görünür"
            on={prefs.inapp_enabled}
            onToggle={() => toggle('inapp_enabled')}
            pending={update.isPending}
          />
        </ul>
      ) : null}

      {prefs && (prefs.quiet_hours_start || prefs.quiet_hours_end) ? (
        <p className="mt-3 text-xs text-[#737373]">
          Sessiz saatler: {prefs.quiet_hours_start ?? '—'} → {prefs.quiet_hours_end ?? '—'}
        </p>
      ) : null}
    </section>
  );
}

function Toggle({
  label,
  desc,
  on,
  onToggle,
  pending,
}: {
  label: string;
  desc: string;
  on: boolean;
  onToggle: () => void;
  pending: boolean;
}) {
  return (
    <li className="flex items-center justify-between p-4">
      <div>
        <p className="text-sm font-medium text-[#0A0A0A]">{label}</p>
        <p className="text-xs text-[#737373]">{desc}</p>
      </div>
      <button
        type="button"
        onClick={onToggle}
        disabled={pending}
        className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors ${
          on ? 'bg-[#5E5CE6]' : 'bg-[#E5E5E5]'
        } disabled:opacity-50`}
      >
        <span
          className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
            on ? 'translate-x-6' : 'translate-x-1'
          }`}
        />
      </button>
    </li>
  );
}

/* ─── shared ─── */

function Loading() {
  return (
    <div className="mt-6 flex h-32 items-center justify-center text-sm text-[#737373]">
      <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Yükleniyor…
    </div>
  );
}

function ErrorBanner({ message }: { message: string }) {
  return (
    <div className="mt-4 flex items-start gap-2 rounded-md border border-[#FECACA] bg-[#FEF2F2] p-3 text-[12px] text-[#991B1B]">
      <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
      <span>{message}</span>
    </div>
  );
}

function formatTime(iso: string): string {
  try {
    const d = new Date(iso);
    const now = Date.now();
    const diffMin = Math.floor((now - d.getTime()) / 60_000);
    if (diffMin < 1) return 'Şimdi';
    if (diffMin < 60) return `${diffMin}dk önce`;
    const diffHr = Math.floor(diffMin / 60);
    if (diffHr < 24) return `${diffHr}sa önce`;
    return d.toLocaleDateString('tr-TR');
  } catch {
    return iso;
  }
}
