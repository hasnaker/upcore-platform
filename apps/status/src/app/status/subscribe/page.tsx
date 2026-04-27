import Link from 'next/link';
import { ArrowLeft, Rss, Mail, Webhook } from 'lucide-react';
import { SubscribeForm } from './SubscribeForm';

export const metadata = {
  title: 'Abone ol',
  description:
    'UpCore status güncellemelerinden e-posta, webhook veya RSS ile haberdar olun. Enterprise aboneler için SMS bildirimi.',
};

export default function SubscribePage() {
  return (
    <main className="mx-auto max-w-3xl p-6 md:p-10">
      <Link
        href="/status"
        className="mb-6 inline-flex items-center gap-1.5 text-sm text-ink-60 hover:text-ink"
      >
        <ArrowLeft className="h-4 w-4" aria-hidden />
        Status sayfasına dön
      </Link>

      <h1 className="text-2xl font-semibold tracking-tight text-ink">Bildirim aboneliği</h1>
      <p className="mt-1 text-sm text-ink-60">
        Incident ve planlı bakım duyurularına e-posta, webhook ya da RSS ile abone olun. E-posta
        abonelikleri KVKK uyumlu olarak çift onay (double opt-in) ile etkinleşir.
      </p>

      <div className="mt-6 grid gap-6 md:grid-cols-[1fr_320px]">
        <SubscribeForm />

        <aside className="flex flex-col gap-4">
          <ChannelHint
            icon={<Mail className="h-4 w-4" aria-hidden />}
            title="E-posta"
            description="Her incident ve planlı bakım için kısa bildirim. İstediğiniz zaman aboneliği iptal edin."
          />
          <ChannelHint
            icon={<Webhook className="h-4 w-4" aria-hidden />}
            title="Webhook"
            description="HTTPS endpoint'inize JSON POST. Slack veya PagerDuty ile uyumlu şema."
          />
          <ChannelHint
            icon={<Rss className="h-4 w-4" aria-hidden />}
            title="RSS / Atom"
            description="status.upcore.io/api/rss adresi ile doğrudan feed okuyucuya ekleyin."
          />
          <section className="rounded-xl border border-line bg-bg p-4 text-[12px] text-ink-60">
            <h2 className="text-[11px] font-semibold uppercase tracking-widest text-ink-40">SLA hedefleri</h2>
            <ul className="mt-2 space-y-1">
              <li>
                <span className="font-semibold text-green">Enterprise</span> · %99.9 uptime · SMS bildirim dahil
              </li>
              <li>
                <span className="font-semibold text-amber">Pro</span> · %99.5 uptime
              </li>
              <li>
                <span className="font-semibold text-accent">KOBİ</span> · %99.0 uptime
              </li>
            </ul>
          </section>
        </aside>
      </div>
    </main>
  );
}

function ChannelHint({
  icon,
  title,
  description,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
}) {
  return (
    <section className="rounded-xl border border-line bg-bg p-4">
      <div className="flex items-center gap-2 text-[13px] font-semibold uppercase tracking-widest text-ink-40">
        {icon}
        {title}
      </div>
      <p className="mt-2 text-[12px] text-ink-60">{description}</p>
    </section>
  );
}
