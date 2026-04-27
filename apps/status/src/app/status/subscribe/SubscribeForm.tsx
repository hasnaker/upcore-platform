'use client';

import { useState } from 'react';
import { CheckCircle2, Loader2, AlertCircle } from 'lucide-react';

type Channel = 'email' | 'webhook' | 'rss';
type State =
  | { kind: 'idle' }
  | { kind: 'submitting' }
  | { kind: 'success'; message: string }
  | { kind: 'error'; message: string };

export function SubscribeForm() {
  const [channel, setChannel] = useState<Channel>('email');
  const [target, setTarget] = useState('');
  const [state, setState] = useState<State>({ kind: 'idle' });

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setState({ kind: 'submitting' });
    try {
      const res = await fetch('/api/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ channel, target }),
      });
      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as { error?: string; detail?: string };
        setState({
          kind: 'error',
          message:
            body.detail ?? body.error ?? `Abonelik başarısız (HTTP ${res.status})`,
        });
        return;
      }
      const body = (await res.json()) as { confirmation_required?: boolean };
      setState({
        kind: 'success',
        message: body.confirmation_required
          ? 'Onay bağlantısı e-posta adresinize gönderildi. Lütfen gelen kutunuzu kontrol edin.'
          : 'Abonelik başarıyla oluşturuldu.',
      });
      setTarget('');
    } catch (err) {
      setState({
        kind: 'error',
        message: err instanceof Error ? err.message : 'Beklenmeyen hata',
      });
    }
  }

  return (
    <form onSubmit={onSubmit} className="rounded-xl border border-line bg-bg p-5">
      <fieldset className="flex flex-wrap gap-2">
        <ChannelToggle current={channel} value="email" label="E-posta" onSelect={setChannel} />
        <ChannelToggle current={channel} value="webhook" label="Webhook" onSelect={setChannel} />
        <ChannelToggle current={channel} value="rss" label="RSS" onSelect={setChannel} />
      </fieldset>

      {channel !== 'rss' ? (
        <label className="mt-4 block">
          <span className="text-[12px] uppercase tracking-widest text-ink-40">
            {channel === 'email' ? 'E-posta adresi' : 'Webhook URL (HTTPS)'}
          </span>
          <input
            type={channel === 'email' ? 'email' : 'url'}
            required
            value={target}
            onChange={(e) => setTarget(e.target.value)}
            placeholder={
              channel === 'email' ? 'ornek@firma.com.tr' : 'https://firma.com/webhook/status'
            }
            className="mt-1 w-full rounded-md border border-line bg-bg px-3 py-2 text-sm text-ink focus:border-accent focus:outline-none"
          />
        </label>
      ) : (
        <div className="mt-4 rounded-md border border-line bg-bg-2 p-3 text-sm text-ink-60">
          RSS feed URL:{' '}
          <code className="rounded bg-bg-3 px-1.5 py-0.5 font-mono text-[12px]">
            https://status.upcore.io/api/rss
          </code>
        </div>
      )}

      <button
        type="submit"
        disabled={state.kind === 'submitting' || (channel !== 'rss' && !target)}
        className="mt-4 inline-flex items-center gap-2 rounded-md bg-accent px-4 py-2 text-[13px] font-semibold text-white hover:bg-accent/90 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {state.kind === 'submitting' && <Loader2 className="h-4 w-4 animate-spin" aria-hidden />}
        {channel === 'rss' ? 'Feed bağlantısını kopyala' : 'Abone ol'}
      </button>

      {state.kind === 'success' && (
        <div
          role="status"
          className="mt-4 flex items-start gap-2 rounded-md border border-green/30 bg-green-soft p-3 text-[12px] text-green"
        >
          <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
          {state.message}
        </div>
      )}
      {state.kind === 'error' && (
        <div
          role="alert"
          className="mt-4 flex items-start gap-2 rounded-md border border-red/30 bg-red-soft p-3 text-[12px] text-red"
        >
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
          {state.message}
        </div>
      )}
    </form>
  );
}

function ChannelToggle({
  current,
  value,
  label,
  onSelect,
}: {
  current: Channel;
  value: Channel;
  label: string;
  onSelect: (c: Channel) => void;
}) {
  const active = current === value;
  return (
    <button
      type="button"
      onClick={() => onSelect(value)}
      className={`rounded-md border px-3 py-1.5 text-[12px] font-medium transition-colors ${
        active
          ? 'border-accent bg-accent text-white'
          : 'border-line bg-bg text-ink hover:border-accent'
      }`}
    >
      {label}
    </button>
  );
}
