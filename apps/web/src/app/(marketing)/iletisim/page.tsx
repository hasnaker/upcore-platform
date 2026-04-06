import type { Metadata } from 'next';
import { Mail, MessageSquare, Phone } from 'lucide-react';

export const metadata: Metadata = {
  title: 'İletişim',
  description: 'Upcore ile iletişime geçin. Demo talebi, satış soruları ve destek için bize ulaşın.',
};

const contactMethods = [
  {
    icon: Mail,
    title: 'E-posta',
    value: 'merhaba@upcore.app',
    href: 'mailto:merhaba@upcore.app',
  },
  {
    icon: Phone,
    title: 'Telefon',
    value: '+90 (212) 000 00 00',
    href: 'tel:+902120000000',
  },
  {
    icon: MessageSquare,
    title: 'Demo Talebi',
    value: 'Ücretsiz 30 dakikalık demo',
    href: '/kayit',
  },
];

export default function IletisimPage() {
  return (
    <section className="mx-auto w-full max-w-[1024px] px-6 py-16">
      <div className="max-w-2xl">
        <h1 className="text-4xl font-semibold tracking-tight text-ink">İletişim</h1>
        <p className="mt-4 text-lg text-ink-60">
          Sorularınız, demo talebiniz veya iş birliği önerileriniz için aşağıdaki kanallardan
          bize ulaşabilirsiniz.
        </p>
      </div>

      <div className="mt-12 grid gap-4 md:grid-cols-3">
        {contactMethods.map((method) => {
          const Icon = method.icon;
          return (
            <a
              key={method.title}
              href={method.href}
              className="rounded-lg border border-line bg-bg p-6 transition-colors hover:border-ink-20"
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-md bg-accent-soft text-accent">
                <Icon className="h-5 w-5" aria-hidden="true" />
              </div>
              <h2 className="mt-4 text-sm font-semibold uppercase tracking-wide text-ink-60">
                {method.title}
              </h2>
              <p className="mt-1 text-base text-ink">{method.value}</p>
            </a>
          );
        })}
      </div>
    </section>
  );
}
