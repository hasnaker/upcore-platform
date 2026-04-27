'use client';

import { useState } from 'react';
import { Loader2, Mail } from 'lucide-react';

type Status =
  | { kind: 'idle' }
  | { kind: 'loading' }
  | { kind: 'success'; message: string }
  | { kind: 'error'; message: string };

export function NewsletterCTA() {
  const [email, setEmail] = useState('');
  const [consent, setConsent] = useState(false);
  const [status, setStatus] = useState<Status>({ kind: 'idle' });

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!consent) {
      setStatus({
        kind: 'error',
        message: 'Devam etmek için KVKK aydınlatmasını onaylamalısınız.',
      });
      return;
    }
    setStatus({ kind: 'loading' });
    try {
      const res = await fetch('/api/newsletter', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, consent }),
      });
      const body = (await res.json().catch(() => null)) as {
        ok?: boolean;
        message?: string;
      } | null;
      if (!res.ok || !body?.ok) {
        setStatus({
          kind: 'error',
          message: body?.message ?? 'Abonelik kaydedilemedi, lütfen tekrar deneyin.',
        });
        return;
      }
      setStatus({
        kind: 'success',
        message:
          body?.message ??
          'Bir doğrulama e-postası gönderdik. Linke tıklayınca kaydınız aktifleşir.',
      });
      setEmail('');
      setConsent(false);
    } catch {
      setStatus({
        kind: 'error',
        message: 'Ağ hatası oluştu. Lütfen birkaç saniye sonra tekrar deneyin.',
      });
    }
  }

  return (
    <section
      className="my-10 rounded-lg border border-[#E5E7EB] bg-gradient-to-br from-[#FFF7F2] to-white p-6"
      aria-labelledby="newsletter-heading"
      data-testid="newsletter-cta"
    >
      <div className="flex items-start gap-4">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#FF5400]/10">
          <Mail className="h-5 w-5 text-[#FF5400]" aria-hidden="true" />
        </div>
        <div className="flex-1">
          <h2
            id="newsletter-heading"
            className="text-lg font-bold tracking-tight text-[#0F1419]"
          >
            2.000+ İK profesyoneli UpCore Bülten'ini takip ediyor
          </h2>
          <p className="mt-1 text-sm leading-relaxed text-[#374151]">
            Haftada bir; JD-R, BAT-TR, tükenmişlik araştırmaları ve ürün güncellemeleri.
            Spam yok, tek tıkla iptal.
          </p>
          <form onSubmit={handleSubmit} className="mt-4 flex flex-col gap-3">
            <div className="flex flex-col gap-2 sm:flex-row">
              <label htmlFor="newsletter-email" className="sr-only">
                E-posta adresiniz
              </label>
              <input
                id="newsletter-email"
                type="email"
                required
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="ad@kurum.com"
                className="h-10 flex-1 rounded-md border border-[#D1D5DB] bg-white px-3 text-sm text-[#0F1419] placeholder:text-[#9CA3AF] focus:border-[#FF5400] focus:outline-none focus:ring-2 focus:ring-[#FF5400]/20"
              />
              <button
                type="submit"
                disabled={status.kind === 'loading'}
                className="inline-flex h-10 items-center justify-center rounded-md bg-[#0F1419] px-5 text-sm font-semibold text-white transition-colors hover:bg-[#FF5400] disabled:opacity-60"
              >
                {status.kind === 'loading' ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Gönderiliyor
                  </>
                ) : (
                  'Abone Ol'
                )}
              </button>
            </div>
            <label className="flex items-start gap-2 text-xs text-[#4B5563]">
              <input
                type="checkbox"
                checked={consent}
                onChange={(e) => setConsent(e.target.checked)}
                className="mt-0.5 h-4 w-4 rounded border-[#D1D5DB] text-[#FF5400] focus:ring-[#FF5400]"
              />
              <span>
                6698 sayılı KVKK kapsamında e-posta adresimin UpCore pazarlama
                iletişimi için işlenmesine açık rıza veriyorum.{' '}
                <a
                  href="/kvkk"
                  className="underline decoration-dotted hover:text-[#FF5400]"
                >
                  Aydınlatma metni
                </a>
                .
              </span>
            </label>
            {status.kind === 'error' ? (
              <div
                role="alert"
                className="rounded-md border border-[#FECACA] bg-[#FEF2F2] px-3 py-2 text-xs text-[#991B1B]"
              >
                {status.message}
              </div>
            ) : null}
            {status.kind === 'success' ? (
              <div
                role="status"
                className="rounded-md border border-[#BBF7D0] bg-[#F0FDF4] px-3 py-2 text-xs text-[#166534]"
              >
                {status.message}
              </div>
            ) : null}
          </form>
        </div>
      </div>
    </section>
  );
}
